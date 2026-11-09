import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Trophy, 
  Award, 
  Sparkles, 
  Share2, 
  Printer, 
  CheckCircle2, 
  QrCode, 
  Download, 
  Eye, 
  X, 
  RotateCw,
  Medal,
  Calendar,
  Search,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { HallOfFameTrophy, AppLanguage, School } from '../types';
import { INITIAL_HALL_OF_FAME_TROPHIES } from '../data/innovativeFeaturesData';

interface HallOfFame3DViewProps {
  lang?: AppLanguage;
  school?: School;
}

export const HallOfFame3DView: React.FC<HallOfFame3DViewProps> = ({
  lang = 'th',
  school
}) => {
  const [trophies, setTrophies] = useState<HallOfFameTrophy[]>(INITIAL_HALL_OF_FAME_TROPHIES);
  const [selectedTrophy, setSelectedTrophy] = useState<HallOfFameTrophy>(INITIAL_HALL_OF_FAME_TROPHIES[0]);
  const [selectedCertForModal, setSelectedCertForModal] = useState<HallOfFameTrophy | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const [trophyZoom, setTrophyZoom] = useState<number>(1.0);

  // 3D Canvas Ref
  const mountRef = useRef<HTMLDivElement>(null);
  const trophyGroupRef = useRef<THREE.Group | null>(null);
  const materialsRef = useRef<{ [key: string]: THREE.MeshStandardMaterial }>({});

  // Setup Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 340;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to blend with card UI

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.5);
    camera.lookAt(0, 0.8, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

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
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !trophyGroupRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      trophyGroupRef.current.rotation.y += deltaX * 0.01;
      trophyGroupRef.current.rotation.x = Math.max(-0.4, Math.min(0.4, trophyGroupRef.current.rotation.x + deltaY * 0.005));

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
  }, []);

  // Update 3D Trophy Material when selected trophy changes
  useEffect(() => {
    if (!materialsRef.current.trophyGold || !materialsRef.current.gem) return;

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
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-amber-600/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold">
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>{lang === 'th' ? '3D Interactive Hall of Fame & Digital Certificates' : '3D Hall of Fame & Verifiable Certificates'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {lang === 'th' ? 'หอเกียรติยศ 3 มิติ & เกียรติบัตรดิจิทัลตรวจสอบได้' : '3D Trophy Hall of Fame'}
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              {lang === 'th' 
                ? 'เชิดชูเกียรตินักเรียนผู้มีความเป็นเลิศทางวิชาการและทักษะรอบด้าน จัดแสดงถ้วยรางวัลสามมิติหมุนได้ 360 องศา พร้อมออกเกียรติบัตรดิจิทัลมี QR Code และรหัส Serial Number ยืนยันความถูกต้อง'
                : 'Celebrate exceptional student achievements with interactive 3D trophies, 360-degree rotation, and cryptographically verifiable digital certificates.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-xs text-amber-200 font-medium">
                {lang === 'th' ? 'ถ้วยเกียรติยศทั้งหมด' : 'Total Trophies'}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-amber-300">{trophies.length}</span>
                <span className="text-xs text-slate-300">{lang === 'th' ? 'รางวัล' : 'awards'}</span>
              </div>
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {lang === 'th' ? 'ตรวจสอบได้ทุกใบ' : '100% Verifiable'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 3D Trophy Showcase, Right Trophy Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Trophy Showcase */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'th' ? 'แท่นจัดแสดงถ้วยเกียรติยศ 3 มิติ' : '3D Trophy Showcase'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* 3D Trophy Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-1.5 py-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setTrophyZoom(prev => Math.max(0.6, Number((prev - 0.15).toFixed(2))))}
                    className="p-0.5 text-slate-600 dark:text-slate-300 hover:text-amber-500 cursor-pointer"
                    title="ซูมออก"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrophyZoom(1.0)}
                    className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold px-0.5 cursor-pointer"
                    title="รีเซ็ต 1.0x"
                  >
                    {trophyZoom}x
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrophyZoom(prev => Math.min(1.4, Number((prev + 0.15).toFixed(2))))}
                    className="p-0.5 text-slate-600 dark:text-slate-300 hover:text-amber-500 cursor-pointer"
                    title="ซูมเข้า"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <RotateCw className="w-3 h-3 text-indigo-500" />
                  {lang === 'th' ? 'หมุน 360°' : '360°'}
                </span>
              </div>
            </div>

            {/* 3D Canvas Mount Point */}
            <div 
              ref={mountRef}
              className="w-full h-80 rounded-xl bg-gradient-to-b from-slate-900 via-slate-850 to-slate-950 border border-slate-800 relative cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center shadow-inner"
            >
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold">
                {selectedTrophy.materialName}
              </div>
            </div>

            {/* Selected Trophy Info */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'th' ? selectedTrophy.titleTh : selectedTrophy.titleEn}
                  </h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                    {selectedTrophy.recipientName} ({selectedTrophy.studentRoom})
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    +{selectedTrophy.pointsEarned} EXP
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedTrophy.descriptionTh}
              </p>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {selectedTrophy.certificateCode}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedCertForModal(selectedTrophy)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'เปิดเกียรติบัตรทางการ' : 'View Certificate'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Trophy Category & Winners Directory */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-500" />
                  {lang === 'th' ? 'ทำเนียบผู้ได้รับถ้วยรางวัลเกียรติยศ' : 'Hall of Fame Honorees'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'th' ? 'คลิกที่การ์ดเพื่อสลับดูโมเดล 3 มิติ และตรวจเกียรติบัตร' : 'Click any card to load its 3D model and verifiable credentials'}
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">{lang === 'th' ? 'ทุกประเภทถ้วยรางวัล' : 'All Trophies'}</option>
                  <option value="grand_champion">{lang === 'th' ? 'Grand Champion' : 'Grand Champion'}</option>
                  <option value="master_chemist">{lang === 'th' ? 'Master Chemist' : 'Master Chemist'}</option>
                  <option value="orbital_astronaut">{lang === 'th' ? 'Orbital Astronaut' : 'Orbital Astronaut'}</option>
                  <option value="eduarena_mvp">{lang === 'th' ? 'EduArena MVP' : 'EduArena MVP'}</option>
                </select>
              </div>
            </div>

            {/* Honoree Cards List */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredTrophies.map((trophy) => {
                const isSelected = selectedTrophy.id === trophy.id;
                return (
                  <div
                    key={trophy.id}
                    onClick={() => setSelectedTrophy(trophy)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm ring-2 ring-amber-400/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={trophy.avatarUrl}
                        alt={trophy.recipientName}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 truncate">
                            {trophy.studentRoom}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3" />
                            {trophy.achievedDate.slice(0, 11)}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                          {trophy.recipientName}
                        </h4>
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 truncate">
                          {trophy.titleTh}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-slate-500 font-semibold truncate">
                        {trophy.certificateCode}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCertForModal(trophy);
                        }}
                        className="text-amber-700 dark:text-amber-400 hover:underline font-bold text-xs flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'ดูเกียรติบัตร' : 'Certificate'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Verifiable Digital Certificate Modal */}
      {selectedCertForModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border-4 border-amber-400/40 my-8">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedCertForModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Official Printable Certificate Layout */}
            <div className="border-4 border-double border-amber-600/60 p-6 sm:p-8 rounded-xl bg-radial from-amber-50/60 via-white to-amber-50/30 text-center space-y-4">
              {/* Header Crest */}
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                <Award className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-serif tracking-widest text-amber-800 font-bold uppercase">
                  {school?.nameTh || 'โรงเรียนสาธิตนวัตกรรมเอดูเวิร์ส'}
                </p>
                <h3 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 tracking-tight">
                  {lang === 'th' ? 'เกียรติบัตรเชิดชูเกียรติ' : 'CERTIFICATE OF EXCELLENCE'}
                </h3>
                <p className="text-xs text-slate-600 italic">
                  This official credential certifies that
                </p>
              </div>

              {/* Recipient Name */}
              <div className="py-2">
                <h4 className="text-2xl sm:text-3xl font-serif font-black text-amber-900 underline decoration-amber-500/50 underline-offset-8">
                  {selectedCertForModal.recipientName}
                </h4>
                <p className="text-xs text-slate-600 mt-2 font-medium">
                  {lang === 'th' ? `ชั้นมัธยมศึกษา (${selectedCertForModal.studentRoom})` : `Class: ${selectedCertForModal.studentRoom}`}
                </p>
              </div>

              {/* Achievement Description */}
              <div className="max-w-md mx-auto space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {selectedCertForModal.titleTh}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedCertForModal.descriptionTh}
                </p>
              </div>

              {/* Seal, QR & Signatures */}
              <div className="pt-6 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* QR Code Verification */}
                <div className="flex items-center gap-3 text-left">
                  <div className="p-1.5 bg-white border border-slate-300 rounded shadow-xs">
                    <QrCode className="w-12 h-12 text-slate-800" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Verification Code
                    </p>
                    <p className="text-xs font-mono font-black text-indigo-900">
                      {selectedCertForModal.certificateCode}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Digital Authenticated
                    </p>
                  </div>
                </div>

                {/* Date & Signature */}
                <div className="text-center sm:text-right">
                  <p className="text-xs text-slate-500">
                    {lang === 'th' ? 'ให้ไว้ ณ วันที่' : 'Issued on'} {selectedCertForModal.achievedDate}
                  </p>
                  <p className="font-serif font-bold text-sm text-slate-900 mt-1">
                    ผู้อำนวยการสถานศึกษา
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Director of Educational Innovation
                  </p>
                </div>
              </div>
            </div>

              {/* Action Toolbar */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-indigo-600" />
                    <span>{isCopiedShare ? (lang === 'th' ? 'คัดลอกลิงก์แล้ว!' : 'Copied!') : (lang === 'th' ? 'แชร์ลิงก์ตรวจสอบ' : 'Share Link')}</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  {lang === 'th' ? 'เกียรติบัตรเข้ารหัส SHA-256 ป้องกันการปลอมแปลง' : 'Cryptographically signed SHA-256'}
                </span>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};
