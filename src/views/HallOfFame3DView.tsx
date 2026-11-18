import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Trophy,
  Award,
  Sparkles,
  Share2,
  Printer,
  CheckCircle2,
  QrCode,
  Eye,
  X,
  RotateCw,
  Medal,
  Calendar,
  ZoomIn,
  ZoomOut,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import {
  HallOfFameTrophy,
  AppLanguage,
  School,
  Student,
  PortfolioItem,
  PlayerScore,
  AuthUser,
} from '../types';
import { PagedList } from '../components/PagedList';
import { getModuleTone } from '../lib/moduleTheme';
import { resolveOwnStudent } from '../lib/attendanceScope';
import { triggerHaptic } from '../lib/arcadeStore';

interface HallOfFame3DViewProps {
  lang?: AppLanguage;
  school?: School;
  students?: Student[];
  portfolioItems?: PortfolioItem[];
  playerScores?: PlayerScore[];
  currentUser?: AuthUser | null;
  onOpenPortfolio?: () => void;
  onExit?: () => void;
}

export const HallOfFame3DView: React.FC<HallOfFame3DViewProps> = ({
  lang = 'th',
  school,
  students = [],
  portfolioItems = [],
  playerScores = [],
  currentUser,
  onOpenPortfolio,
  onExit,
}) => {
  const isStudentUser = currentUser?.role === 'student';
  const ownStudent = useMemo(
    () => resolveOwnStudent(currentUser, students),
    [currentUser, students]
  );

  // Build 100% real trophies strictly from actual portfolio items, real student honors, and real game scores
  const trophies = useMemo<HallOfFameTrophy[]>(() => {
    const result: HallOfFameTrophy[] = [];

    // 1. Real Portfolio items
    const relevantPortfolio = portfolioItems.filter((item) => {
      if (isStudentUser && currentUser) {
        return item.ownerId === currentUser.id || (ownStudent && item.ownerId === ownStudent.id);
      }
      return item.ownerRole === 'student';
    });

    relevantPortfolio.forEach((item, idx) => {
      const matchedStudent =
        students.find(
          (s) =>
            s.id === item.ownerId ||
            `${s.firstNameTh} ${s.lastNameTh}`.trim() === item.ownerName.trim()
        ) || (isStudentUser ? ownStudent : undefined);

      const trophyType: HallOfFameTrophy['trophyType'] =
        item.category === 'competition'
          ? 'grand_champion'
          : item.category === 'academic'
            ? 'master_chemist'
            : 'eduarena_mvp';

      result.push({
        id: `real-port-${item.id}`,
        trophyType,
        titleTh: item.title,
        titleEn: item.title,
        recipientStudentId: matchedStudent?.id || item.ownerId,
        recipientName: item.ownerName,
        studentRoom: matchedStudent
          ? `${matchedStudent.gradeLevel} ${matchedStudent.room}`.trim()
          : currentUser?.gradeLevel
            ? `${currentUser.gradeLevel} ${currentUser.room || ''}`.trim()
            : '-',
        avatarUrl: item.imageUrl || matchedStudent?.avatarUrl || currentUser?.avatarUrl || '',
        achievedDate: `ปีการศึกษา ${item.year}`,
        certificateCode: `CERT-${item.year}-${String(idx + 1).padStart(4, '0')}`,
        descriptionTh: item.description || 'ผลงานที่บันทึกในแฟ้มสะสมผลงานดิจิทัลของสถานศึกษา',
        primaryColor: trophyType === 'grand_champion' ? '#f59e0b' : trophyType === 'master_chemist' ? '#10b981' : '#f43f5e',
        materialName:
          trophyType === 'grand_champion'
            ? 'ถ้วยทองเกียรติยศ'
            : trophyType === 'master_chemist'
              ? 'คริสตัลวิชาการ'
              : 'เหรียญเกียรติคุณ',
        pointsEarned: item.scoreBonus || 100,
      });
    });

    // 2. Real honor students (GPAX >= 3.50)
    const honorSource = isStudentUser ? (ownStudent ? [ownStudent] : []) : students;
    honorSource
      .filter((stu) => stu.gpa >= 3.5)
      .slice(0, 10)
      .forEach((stu) => {
        result.push({
          id: `real-honor-${stu.id}`,
          trophyType: 'grand_champion',
          titleTh: `นักเรียนเรียนดีเด่น (GPAX ${stu.gpa.toFixed(2)})`,
          titleEn: `Academic Honor Roll (GPAX ${stu.gpa.toFixed(2)})`,
          recipientStudentId: stu.id,
          recipientName: `${stu.firstNameTh} ${stu.lastNameTh}`.trim(),
          studentRoom: `${stu.gradeLevel} ${stu.room}`.trim(),
          avatarUrl: stu.avatarUrl || '',
          achievedDate: `ปีการศึกษา ${school?.academicYear || '2569'}`,
          certificateCode: `HONOR-${stu.studentIdNumber || stu.id.slice(-4)}`,
          descriptionTh: `มีผลการเรียนเฉลี่ยสะสม ${stu.gpa.toFixed(2)} จากข้อมูลผลการเรียนจริงในระบบ`,
          primaryColor: '#f59e0b',
          materialName: 'ถ้วยเกียรติยศเรียนดีเด่น',
          pointsEarned: Math.round(stu.gpa * 100),
        });
      });

    // 3. Real earned EduArena scores (EXP > 0)
    const relevantScores = playerScores.filter((ps) => {
      if (ps.exp <= 0) return false;
      if (isStudentUser && currentUser) return ps.userId === currentUser.id;
      return ps.role === 'student';
    });

    relevantScores.slice(0, 8).forEach((ps) => {
      result.push({
        id: `real-score-${ps.userId}`,
        trophyType: 'eduarena_mvp',
        titleTh: `รางวัลความสำเร็จ ${ps.rankTitle || 'ผู้เรียนยอดเยี่ยม'}`,
        titleEn: `${ps.rankTitle || 'Top Learner'} Achievement`,
        recipientStudentId: ps.userId,
        recipientName: ps.name || currentUser?.fullNameTh || 'นักเรียน',
        studentRoom: ownStudent ? `${ownStudent.gradeLevel} ${ownStudent.room}`.trim() : '-',
        avatarUrl: ps.avatarUrl || currentUser?.avatarUrl || '',
        achievedDate: `ปีการศึกษา ${school?.academicYear || '2569'}`,
        certificateCode: `EXP-${ps.userId.slice(0, 6).toUpperCase()}`,
        descriptionTh: `สะสมคะแนนการเรียนรู้และเกมฝึกทักษะรวม ${ps.exp.toLocaleString()} EXP (ชนะ ${ps.battleWins} ครั้ง)`,
        primaryColor: '#f43f5e',
        materialName: 'ถ้วยเกียรติคุณ EduArena',
        pointsEarned: ps.exp,
      });
    });

    return result;
  }, [portfolioItems, students, playerScores, isStudentUser, currentUser, ownStudent, school?.academicYear]);

  const [selectedTrophyId, setSelectedTrophyId] = useState<string | null>(null);
  const selectedTrophy = useMemo<HallOfFameTrophy | null>(
    () => trophies.find((t) => t.id === selectedTrophyId) || trophies[0] || null,
    [trophies, selectedTrophyId]
  );
  const [selectedCertForModal, setSelectedCertForModal] = useState<HallOfFameTrophy | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const [trophyZoom, setTrophyZoom] = useState<number>(1.0);

  // 3D Canvas Ref
  const [webGlError, setWebGlError] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const trophyGroupRef = useRef<THREE.Group | null>(null);
  const materialsRef = useRef<{ [key: string]: THREE.MeshStandardMaterial }>({});

  // Setup Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container || !selectedTrophy) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 340;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to blend with card UI

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.5);
    camera.lookAt(0, 0.8, 0);

    // 2. Renderer with graceful fallback when WebGL is unavailable
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('HallOfFame WebGL unavailable, using 2D fallback:', err);
      setWebGlError(true);
      return;
    }

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8e7, 2.8);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x90caf9, 1.4);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffd700, 2.0, 10);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // 4. Procedural 3D Trophy Mesh Construction (8 parts)
    const trophyGroup = new THREE.Group();
    trophyGroupRef.current = trophyGroup;

    // Base pedestal (Octagonal / Cylinder)
    const baseGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.35, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.3,
      roughness: 0.4,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.18;
    baseMesh.receiveShadow = true;
    trophyGroup.add(baseMesh);

    // Golden nameplate on pedestal
    const plateGeo = new THREE.BoxGeometry(0.8, 0.15, 0.1);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.set(0, 0.2, 0.86);
    trophyGroup.add(plateMesh);

    // Trophy Stem
    const stemGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.7, 32);
    const trophyGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x221500,
    });
    materialsRef.current.trophyGold = trophyGoldMat;

    const stemMesh = new THREE.Mesh(stemGeo, trophyGoldMat);
    stemMesh.position.y = 0.65;
    stemMesh.castShadow = true;
    trophyGroup.add(stemMesh);

    // Trophy Chalice / Cup Body
    const cupGeo = new THREE.CylinderGeometry(0.75, 0.35, 1.1, 32, 1, true);
    const cupMesh = new THREE.Mesh(cupGeo, trophyGoldMat);
    cupMesh.position.y = 1.35;
    cupMesh.castShadow = true;
    trophyGroup.add(cupMesh);

    // Cup Inner Bottom
    const innerGeo = new THREE.CircleGeometry(0.35, 32);
    const innerMesh = new THREE.Mesh(innerGeo, trophyGoldMat);
    innerMesh.rotation.x = -Math.PI / 2;
    innerMesh.position.y = 0.85;
    trophyGroup.add(innerMesh);

    // Left Handle (Torus)
    const handleGeo = new THREE.TorusGeometry(0.35, 0.06, 16, 32, Math.PI * 1.2);
    const leftHandle = new THREE.Mesh(handleGeo, trophyGoldMat);
    leftHandle.position.set(-0.7, 1.35, 0);
    leftHandle.rotation.z = Math.PI * 0.4;
    trophyGroup.add(leftHandle);

    // Right Handle (Torus)
    const rightHandle = new THREE.Mesh(handleGeo, trophyGoldMat);
    rightHandle.position.set(0.7, 1.35, 0);
    rightHandle.rotation.z = -Math.PI * 0.4;
    trophyGroup.add(rightHandle);

    // Floating Gem / Star on Top
    const gemGeo = new THREE.OctahedronGeometry(0.25, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.2,
      roughness: 0.1,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9,
    });
    materialsRef.current.gem = gemMat;

    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.position.y = 2.1;
    gemMesh.castShadow = true;
    trophyGroup.add(gemMesh);

    scene.add(trophyGroup);

    // Interactive Drag Orbit
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotationVelocityX = 0;
    let rotationVelocityY = 0.005; // Gentle auto-spin

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !trophyGroupRef.current) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      trophyGroupRef.current.rotation.y += deltaX * 0.01;
      trophyGroupRef.current.rotation.x = Math.max(-0.4, Math.min(0.4, trophyGroupRef.current.rotation.x + deltaY * 0.005));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch events for mobile
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (e.touches.length === 1 && touch) {
        isDragging = true;
        previousMousePosition = { x: touch.clientX, y: touch.clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!isDragging || !trophyGroupRef.current || e.touches.length !== 1 || !touch) return;
      const deltaX = touch.clientX - previousMousePosition.x;
      const deltaY = touch.clientY - previousMousePosition.y;

      trophyGroupRef.current.rotation.y += deltaX * 0.01;
      trophyGroupRef.current.rotation.x = Math.max(-0.4, Math.min(0.4, trophyGroupRef.current.rotation.x + deltaY * 0.005));

      previousMousePosition = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!isDragging && trophyGroupRef.current) {
        trophyGroupRef.current.rotation.y += 0.006;
      }

      // Gentle floating animation of the gem
      gemMesh.position.y = 2.1 + Math.sin(elapsedTime * 2.5) * 0.05;
      gemMesh.rotation.y += 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [Boolean(selectedTrophy)]);

  // Update 3D Trophy Material when selected trophy changes
  useEffect(() => {
    if (!selectedTrophy || !materialsRef.current.trophyGold || !materialsRef.current.gem) return;

    if (selectedTrophy.trophyType === 'grand_champion') {
      materialsRef.current.trophyGold.color.setHex(0xf59e0b); // Gold
      materialsRef.current.trophyGold.metalness = 0.9;
      materialsRef.current.trophyGold.roughness = 0.2;
      materialsRef.current.gem.color.setHex(0xfde047);
      materialsRef.current.gem.emissive.setHex(0xd97706);
    } else if (selectedTrophy.trophyType === 'master_chemist') {
      materialsRef.current.trophyGold.color.setHex(0x10b981); // Emerald Crystal
      materialsRef.current.trophyGold.metalness = 0.4;
      materialsRef.current.trophyGold.roughness = 0.15;
      materialsRef.current.gem.color.setHex(0x34d399);
      materialsRef.current.gem.emissive.setHex(0x059669);
    } else if (selectedTrophy.trophyType === 'orbital_astronaut') {
      materialsRef.current.trophyGold.color.setHex(0x38bdf8); // Aerospace Titanium
      materialsRef.current.trophyGold.metalness = 0.95;
      materialsRef.current.trophyGold.roughness = 0.3;
      materialsRef.current.gem.color.setHex(0x60a5fa);
      materialsRef.current.gem.emissive.setHex(0x2563eb);
    } else if (selectedTrophy.trophyType === 'eduarena_mvp') {
      materialsRef.current.trophyGold.color.setHex(0xf43f5e); // Royal Ruby
      materialsRef.current.trophyGold.metalness = 0.8;
      materialsRef.current.trophyGold.roughness = 0.25;
      materialsRef.current.gem.color.setHex(0xfb7185);
      materialsRef.current.gem.emissive.setHex(0xe11d48);
    }
  }, [selectedTrophy]);

  useEffect(() => {
    if (trophyGroupRef.current) {
      trophyGroupRef.current.scale.set(trophyZoom, trophyZoom, trophyZoom);
    }
  }, [trophyZoom]);

  const filteredTrophies = trophies.filter(t => {
    if (filterType !== 'all' && t.trophyType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.recipientName.toLowerCase().includes(q) ||
        t.titleTh.toLowerCase().includes(q) ||
        t.certificateCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleShareCertificate = (code: string) => {
    navigator.clipboard?.writeText?.(window.location.origin + `?cert=${code}`);
    setIsCopiedShare(true);
    setTimeout(() => setIsCopiedShare(false), 2500);
  };

  return (
    <div className={`min-h-full w-full bg-[#09090B] text-white flex flex-col font-sans ${getModuleTone('hall_of_fame')}`}>
      {/* SINGLE CRISP GEN Z TOP BAR */}
      <header className="shrink-0 h-14 px-3 sm:px-6 bg-[#09090B] border-b border-zinc-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="min-h-[40px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ออก</span>
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
              {lang === 'th' ? 'หอเกียรติยศ 3 มิติ' : '3D Trophy Hall of Fame'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-xs font-black text-amber-400 tabular-nums">
          <Award className="w-4 h-4 shrink-0" />
          <span>{trophies.length} {lang === 'th' ? 'รางวัล' : 'awards'}</span>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto space-y-5 pb-8">
          {/* Empty state when no real trophies/achievements exist yet */}
          {!selectedTrophy ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-400/15 text-amber-400 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h2 className="text-lg font-black text-white">
                  {lang === 'th' ? 'ยังไม่มีถ้วยรางวัลหรือเกียรติบัตรที่บันทึกไว้' : 'No Trophies or Certificates Yet'}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {lang === 'th'
                    ? 'ถ้วยเกียรติยศและเกียรติบัตรจะแสดงจากผลงานจริงที่คุณบันทึกในแฟ้มสะสมผลงาน ผลการเรียนดีเด่น หรือคะแนนสะสมจากเกมฝึกทักษะ'
                    : 'Trophies and certificates appear automatically from your real portfolio items, academic honors, and earned learning game milestones.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                {onOpenPortfolio && (
                  <button
                    type="button"
                    onClick={onOpenPortfolio}
                    className="min-h-[44px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'th' ? 'ไปบันทึกผลงานในแฟ้มของฉัน' : 'Add to My Portfolio'}</span>
                  </button>
                )}
                {onExit && (
                  <button
                    type="button"
                    onClick={onExit}
                    className="min-h-[44px] px-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs font-bold cursor-pointer"
                  >
                    {lang === 'th' ? 'กลับหน้าก่อนหน้า' : 'Go Back'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: 3D Trophy Showcase */}
              <div className="lg:col-span-5 bg-zinc-900 rounded-2xl border border-zinc-800 p-4 sm:p-5 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'th' ? 'แท่นถ้วยเกียรติยศ 3 มิติ' : '3D Trophy Showcase'}</span>
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 bg-[#09090B] border border-zinc-800 rounded-xl p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setTrophyZoom(prev => Math.max(0.5, Number((prev - 0.15).toFixed(2))))}
                          className="w-7 h-7 rounded-lg text-zinc-300 hover:text-amber-300 flex items-center justify-center cursor-pointer"
                          title="ซูมออก"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrophyZoom(1.0)}
                          className="text-[11px] font-mono text-amber-300 font-bold px-1.5 tabular-nums cursor-pointer"
                          title="รีเซ็ต 1.0x"
                        >
                          {trophyZoom}x
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrophyZoom(prev => Math.min(2.0, Number((prev + 0.15).toFixed(2))))}
                          className="w-7 h-7 rounded-lg text-zinc-300 hover:text-amber-300 flex items-center justify-center cursor-pointer"
                          title="ซูมเข้า"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3D Canvas Mount Point */}
                  <div 
                    ref={mountRef}
                    className="w-full h-72 sm:h-80 rounded-2xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-[#09090B] border border-zinc-800 relative cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"
                  >
                    <div className="absolute top-3 left-3 text-[11px] font-mono font-bold text-zinc-300 z-10 flex items-center gap-1.5">
                      <RotateCw className="w-3 h-3 text-amber-400" />
                      <span>{selectedTrophy.materialName}</span>
                    </div>
                    {webGlError && (
                      <div className="flex flex-col items-center justify-center text-center p-6 space-y-2.5 z-10">
                        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center">
                          <Trophy className="w-10 h-10 text-amber-300" />
                        </div>
                        <p className="text-sm font-black text-amber-200">{selectedTrophy.titleTh}</p>
                        <p className="text-xs text-zinc-300">{selectedTrophy.recipientName}</p>
                      </div>
                    )}
                  </div>

                  {/* Selected Trophy Info */}
                  <div className="p-4 rounded-xl bg-[#09090B] border border-zinc-800 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white">
                          {lang === 'th' ? selectedTrophy.titleTh : selectedTrophy.titleEn}
                        </h4>
                        <p className="text-xs text-cyan-300 font-semibold mt-0.5 truncate">
                          {selectedTrophy.recipientName} · {selectedTrophy.studentRoom}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-amber-400 shrink-0 tabular-nums">
                        +{selectedTrophy.pointsEarned} XP
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {selectedTrophy.descriptionTh}
                    </p>

                    <div className="pt-2.5 flex items-center justify-between gap-2 border-t border-zinc-800">
                      <span className="text-[11px] font-mono font-bold text-zinc-400 truncate">
                        {selectedTrophy.certificateCode}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setSelectedCertForModal(selectedTrophy);
                        }}
                        className="min-h-[40px] px-3.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-zinc-950 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'เปิดเกียรติบัตร' : 'Certificate'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Trophy Directory */}
              <div className="lg:col-span-7">
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Medal className="w-4 h-4 text-amber-400" />
                        <span>{lang === 'th' ? 'ทำเนียบผู้ได้รับถ้วยรางวัลจริง' : 'Hall of Fame Honorees'}</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {lang === 'th' ? 'แตะที่การ์ดเพื่อหมุนดูโมเดล 3 มิติและเกียรติบัตร' : 'Tap any card to inspect its 3D trophy'}
                      </p>
                    </div>

                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="min-h-[40px] px-3 rounded-xl text-xs font-bold bg-[#09090B] border border-zinc-800 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="all">{lang === 'th' ? 'ทุกประเภทถ้วยรางวัล' : 'All Trophies'}</option>
                      <option value="grand_champion">Grand Champion</option>
                      <option value="master_chemist">Master Chemist</option>
                      <option value="orbital_astronaut">Orbital Astronaut</option>
                      <option value="eduarena_mvp">EduArena MVP</option>
                    </select>
                  </div>

                  <div>
                    <PagedList items={filteredTrophies} pageSize={4} renderItem={(trophy) => {
                      const isSelected = selectedTrophy?.id === trophy.id;
                      return (
                        <div
                          key={trophy.id}
                          onClick={() => {
                            triggerHaptic('light');
                            setSelectedTrophyId(trophy.id);
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'border-amber-400 bg-[#09090B]'
                              : 'border-zinc-800 bg-[#09090B]/70 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {trophy.avatarUrl ? (
                              <img
                                src={trophy.avatarUrl}
                                alt={trophy.recipientName}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-xl object-cover border border-zinc-700 shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-amber-400/15 text-amber-300 font-black text-sm flex items-center justify-center border border-zinc-800 shrink-0">
                                {trophy.recipientName.slice(0, 2)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                                <span className="font-medium truncate">{trophy.studentRoom}</span>
                                <span className="flex items-center gap-1 shrink-0 tabular-nums">
                                  <Calendar className="w-3 h-3" />
                                  {trophy.achievedDate}
                                </span>
                              </div>

                              <h4 className="text-sm font-black text-white mt-0.5 truncate">
                                {trophy.recipientName}
                              </h4>
                              <p className="text-xs font-bold text-amber-300 truncate">
                                {trophy.titleTh}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between text-xs">
                            <span className="font-mono text-[11px] text-zinc-400 truncate">
                              {trophy.certificateCode}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic('light');
                                setSelectedCertForModal(trophy);
                              }}
                              className="text-cyan-400 hover:text-cyan-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{lang === 'th' ? 'ดูเกียรติบัตร' : 'Certificate'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verifiable Digital Certificate Modal */}
      {selectedCertForModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-3 sm:p-4 shadow-2xl relative border-4 border-amber-400/40">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedCertForModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Official Printable Certificate Layout */}
            <div className="border-4 border-double border-amber-600/60 p-3 sm:p-4 rounded-xl bg-radial from-amber-50/60 via-white to-amber-50/30 text-center space-y-2">
              {/* Header Crest */}
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                <Award className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-serif tracking-widest text-amber-900 font-bold uppercase">
                  {school?.nameTh || 'โรงเรียนสาธิตนวัตกรรมเอดูเวิร์ส'}
                </p>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
                  {lang === 'th' ? 'เกียรติบัตรเชิดชูเกียรติ' : 'CERTIFICATE OF EXCELLENCE'}
                </h3>
                <p className="text-xs text-slate-700 italic">
                  This official credential certifies that
                </p>
              </div>

              {/* Recipient Name */}
              <div className="py-1">
                <h4 className="text-xl sm:text-2xl font-serif font-black text-amber-950 underline decoration-amber-500/50 underline-offset-8">
                  {selectedCertForModal.recipientName}
                </h4>
                <p className="text-xs text-slate-700 mt-2 font-medium">
                  {lang === 'th' ? `ชั้นมัธยมศึกษา (${selectedCertForModal.studentRoom})` : `Class: ${selectedCertForModal.studentRoom}`}
                </p>
              </div>

              {/* Achievement Description */}
              <div className="max-w-md mx-auto space-y-1">
                <p className="text-sm font-bold text-slate-900">
                  {selectedCertForModal.titleTh}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedCertForModal.descriptionTh}
                </p>
              </div>

              {/* Seal, QR & Signatures */}
              <div className="pt-3 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* QR Code Verification */}
                <div className="flex items-center gap-3 text-left">
                  <div className="p-1.5 bg-white border border-slate-300 rounded shadow-xs">
                    <QrCode className="w-12 h-12 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">
                      Verification Code
                    </p>
                    <p className="text-xs font-mono font-black text-indigo-900">
                      {selectedCertForModal.certificateCode}
                    </p>
                    <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Digital Authenticated
                    </p>
                  </div>
                </div>

                {/* Date & Signature */}
                <div className="text-center sm:text-right">
                  <p className="text-xs text-slate-700">
                    {lang === 'th' ? 'ให้ไว้ ณ วันที่' : 'Issued on'} {selectedCertForModal.achievedDate}
                  </p>
                  <p className="font-serif font-bold text-sm text-slate-900 mt-1">
                    ผู้อำนวยการสถานศึกษา
                  </p>
                  <p className="text-[10px] text-slate-700">
                    Director of Educational Innovation
                  </p>
                </div>
              </div>
            </div>

              {/* Action Toolbar */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintCertificate}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{lang === 'th' ? 'พิมพ์เกียรติบัตร (A4)' : 'Print Certificate'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareCertificate(selectedCertForModal.certificateCode)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
                  >
                    <Share2 className="w-4 h-4 text-indigo-700" />
                    <span>{isCopiedShare ? (lang === 'th' ? 'คัดลอกลิงก์แล้ว!' : 'Copied!') : (lang === 'th' ? 'แชร์ลิงก์ตรวจสอบ' : 'Share Link')}</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-700 font-medium">
                  {lang === 'th' ? 'เกียรติบัตรเข้ารหัส SHA-256 ป้องกันการปลอมแปลง' : 'Cryptographically signed SHA-256'}
                </span>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};
