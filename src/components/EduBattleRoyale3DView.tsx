import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Zap, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Users, 
  User, 
  Trophy, 
  HelpCircle, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Compass, 
  Award, 
  ShoppingBag, 
  Radio, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Maximize2, 
  Minimize2,
  Package,
  Flame,
  AlertTriangle,
  Shield,
  Wind,
  Target
} from 'lucide-react';
import { QuizQuestion, AuthUser, RewardItem, AppLanguage, CharacterSkin, RoomClassmate } from '../types';

interface EduBattleRoyale3DViewProps {
  questions: QuizQuestion[];
  currentUser: AuthUser | null;
  lang: AppLanguage;
  rewardItems: RewardItem[];
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onExit: () => void;
}

// =========================================================================
// 1. ADVANCED PROCEDURAL WEB AUDIO SYNTHESIZER (ZERO EXTERNAL 404S)
// =========================================================================
class BattleAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playStep() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(85, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {}
  }

  playJump() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }

  playChestOpen() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
      });
    } catch {}
  }

  playCorrect() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 554.37, 659.25, 880, 1108.7].forEach((freq, idx) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    } catch {}
  }

  playWrong() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.28);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  playAirdropSiren() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.linearRampToValueAtTime(700, now + 0.4);
      osc.frequency.linearRampToValueAtTime(380, now + 0.8);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.85);
    } catch {}
  }

  playPowerup() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [300, 450, 600, 900].forEach((freq, i) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.12, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.25);
      });
    } catch {}
  }

  playVictory() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.7);
      });
    } catch {}
  }
}

const battleAudio = new BattleAudioEngine();

// =========================================================================
// 2. CHARACTER SKINS CONFIGURATION
// =========================================================================
const SKINS: CharacterSkin[] = [
  {
    id: 'default',
    nameTh: 'นักสำรวจทะเลทราย (Desert Explorer)',
    nameEn: 'Desert Explorer',
    colorJacket: 0xc0392b,
    colorPants: 0x2c3e50,
    colorHat: 0x34495e,
    colorBackpack: 0xf39c12,
    speedMultiplier: 1.0,
    previewColor: 'bg-red-600'
  },
  {
    id: 'scout',
    nameTh: 'ชุดลูกเสือสามัญรุ่นใหญ่ (Boy Scout)',
    nameEn: 'Boy Scout Ranger',
    colorJacket: 0xa08354,
    colorPants: 0x8a6e3d,
    colorHat: 0x6e5229,
    colorBackpack: 0x3d5a28,
    speedMultiplier: 1.15,
    previewColor: 'bg-amber-700'
  },
  {
    id: 'sport',
    nameTh: 'ชุดพละสปีดเรซเซอร์ (Athletic Jersey)',
    nameEn: 'Athletic Runner',
    colorJacket: 0x10b981,
    colorPants: 0x111827,
    colorHat: 0x059669,
    colorBackpack: 0x06b6d4,
    speedMultiplier: 1.25,
    previewColor: 'bg-emerald-600'
  },
  {
    id: 'cyber',
    nameTh: 'ไซเบอร์สูท O-NET (Cyber Suit)',
    nameEn: 'Cyberpunk Scholar',
    colorJacket: 0x6366f1,
    colorPants: 0x1e1b4b,
    colorHat: 0x818cf8,
    colorBackpack: 0xec4899,
    speedMultiplier: 1.35,
    previewColor: 'bg-indigo-600'
  }
];

export const EduBattleRoyale3DView: React.FC<EduBattleRoyale3DViewProps> = ({
  questions,
  currentUser,
  rewardItems: _rewardItems,
  onEarnRewards,
  onExit
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout & Screen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Game UI State
  const [currentStage, setCurrentStage] = useState(1);
  const [totalStages] = useState(8);
  const [subjectTitle, setSubjectTitle] = useState('ศูนย์คณิตศาสตร์ & O-NET');
  const [isMuted, setIsMuted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(75);
  const [playerStreak, setPlayerStreak] = useState(0);
  const [totalExp, setTotalExp] = useState(0);
  const [totalGems, setTotalGems] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [correctCount, setCorrectCount] = useState(0);
  const [openedChestsCount, setOpenedChestsCount] = useState(0);
  const [totalChests] = useState(8);
  const [nearestChestDist, setNearestChestDist] = useState(250);
  const [compassHeading, setCompassHeading] = useState(0);
  const [nearChestId, setNearChestId] = useState<string | null>(null);
  const [nearAirdrop, setNearAirdrop] = useState<boolean>(false);

  // Safe Zone Storm System
  const [stormPhase, setStormPhase] = useState(1);
  const [stormRadius, setStormRadius] = useState(110);
  const [isOutsideStorm, setIsOutsideStorm] = useState(false);

  // Game Modes
  const [gameMode, setGameMode] = useState<'solo' | 'classroom'>('classroom');
  const [roomCode] = useState('ONET-401');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSkinShop, setShowSkinShop] = useState(false);
  const [selectedSkinId, setSelectedSkinId] = useState('default');

  // In-Game Power-Ups / Inventory
  const [activeBooster, setActiveBooster] = useState<{ radar: boolean; shield: boolean; nitro: boolean }>({
    radar: false,
    shield: true, // starts with 1 shield
    nitro: false
  });
  const [freezeCooldown, setFreezeCooldown] = useState(0);

  // Quiz Modal State
  const [activeQuestion, setActiveQuestion] = useState<QuizQuestion | null>(null);
  const [questionTimer, setQuestionTimer] = useState(20);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [questionFeedback, setQuestionFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isAirdropQuestion, setIsAirdropQuestion] = useState(false);

  // Floating Notification Banner
  const [hudAlert, setHudAlert] = useState<string | null>('🔥 เริ่มต้นแมตช์ O-NET Battle Royale! วิ่งหาหีบทองคำและแอร์ดรอป');

  // Victory / Game Over
  const [gameWon, setGameWon] = useState(false);

  // Live Classroom Rankings & Competitors
  const [classmates, setClassmates] = useState<RoomClassmate[]>([
    { id: 'c1', name: 'ธนาธร (STU-0842)', score: 320, chestsOpened: 2, alive: true, x: 20, z: -30, avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', status: 'วิ่งล่าหีบ O-NET' },
    { id: 'c2', name: 'พิมพ์ชนก (STU-6904)', score: 380, chestsOpened: 3, alive: true, x: -35, z: 25, avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', status: 'ทำคอมโบ 3x' },
    { id: 'c3', name: 'วรพล (STU-1102)', score: 210, chestsOpened: 1, alive: true, x: 55, z: 45, avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100', status: 'วิ่งเข้า Safe Zone' },
    { id: 'c4', name: 'ณิชาภัทร (STU-3301)', score: 190, chestsOpened: 1, alive: true, x: -20, z: -55, avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', status: 'เปิดหีบวิทย์ O-NET' }
  ]);

  const [liveBattleEvents, setLiveBattleEvents] = useState<Array<{ id: string; text: string; time: string }>>([
    { id: '1', text: '🎮 ทุกคนกระโดดร่มลงสู่เกาะ O-NET Oasis แล้ว!', time: '10:00' },
    { id: '2', text: '⚡ ด.ญ.พิมพ์ชนก เปิดหีบสมบัติ O-NET ปริศนา ตอบถูกต้อง! (+120 XP)', time: '10:01' }
  ]);

  // Input References
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchJoystickRef = useRef<{ active: boolean; startX: number; startY: number; currentX: number; currentY: number; deltaX: number; deltaY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0
  });
  const touchLookRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0
  });

  // Mobile Action Flags
  const mobileActionsRef = useRef<{ sprint: boolean; jump: boolean; crouch: boolean }>({
    sprint: false,
    jump: false,
    crouch: false
  });

  // Chests & Airdrop Refs
  interface ChestItem {
    id: string;
    stage: number;
    x: number;
    z: number;
    mesh: THREE.Group;
    beaconMesh: THREE.Mesh;
    opened: boolean;
    question: QuizQuestion;
  }
  const chestsRef = useRef<ChestItem[]>([]);
  const airdropRef = useRef<{
    mesh: THREE.Group;
    x: number;
    y: number;
    z: number;
    targetY: number;
    falling: boolean;
    claimed: boolean;
    question: QuizQuestion;
  } | null>(null);

  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const playerYawRef = useRef<number>(0);

  // Check device
  useEffect(() => {
    const check = () => {
      setIsMobileDevice(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Audio Toggle
  useEffect(() => {
    battleAudio.enabled = !isMuted;
  }, [isMuted]);

  // Alert dismiss
  useEffect(() => {
    if (!hudAlert) return;
    const t = setTimeout(() => setHudAlert(null), 4500);
    return () => clearTimeout(t);
  }, [hudAlert]);

  // Match Timer & Storm Logic
  useEffect(() => {
    if (gameWon) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });

      // Freeze Cooldown
      setFreezeCooldown(c => Math.max(0, c - 1));

      // Storm Radius shrinking
      setStormRadius(prevR => {
        const target = stormPhase === 1 ? 80 : stormPhase === 2 ? 45 : 20;
        if (prevR > target) return prevR - 0.4;
        return prevR;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameWon, stormPhase]);

  // Airdrop Drop Trigger every 35 seconds
  useEffect(() => {
    if (gameWon) return;
    const t = setInterval(() => {
      if (airdropRef.current && !airdropRef.current.falling && airdropRef.current.claimed) {
        // Spawn new airdrop
        const dropX = (Math.random() - 0.5) * 60;
        const dropZ = (Math.random() - 0.5) * 60;
        airdropRef.current.x = dropX;
        airdropRef.current.z = dropZ;
        airdropRef.current.y = 55;
        airdropRef.current.falling = true;
        airdropRef.current.claimed = false;
        airdropRef.current.mesh.position.set(dropX, 55, dropZ);
        airdropRef.current.mesh.visible = true;

        battleAudio.playAirdropSiren();
        setHudAlert('📦 แอร์ดรอปข้อสอบ O-NET พิเศษ กำลังถูกทิ้งร่มลงมา! รีบไปชิงสมบัติ');
        setLiveBattleEvents(prev => [
          { id: String(Date.now()), text: '📦 สัญญาณเตือน: แอร์ดรอปทองคำ O-NET พิเศษ กำลังลงสู่พื้น!', time: 'สด' },
          ...prev.slice(0, 5)
        ]);
      }
    }, 35000);
    return () => clearInterval(t);
  }, [gameWon]);

  // Question Timer Countdown
  useEffect(() => {
    if (!activeQuestion || questionFeedback !== null) return;
    const interval = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) {
          handleAnswer(-1); // time out = wrong
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuestion, questionFeedback]);

  // Current Skin
  const currentSkin = useMemo(() => {
    return SKINS.find(s => s.id === selectedSkinId) || SKINS[0];
  }, [selectedSkinId]);

  // Arena Questions
  const arenaQuestions: QuizQuestion[] = useMemo(() => {
    return questions.length > 0 ? questions : [
      {
        id: 'q-demo-1',
        subject: 'คณิตศาสตร์ (O-NET)',
        gradeLevel: 'ม.6',
        questionTh: 'ถ้าค่าเฉลี่ยเลขคณิตของข้อมูลชุดหนึ่งคือ 15 และมี 5 จำนวน แล้วผลรวมของข้อมูลชุดนี้มีค่าเท่ากับเท่าใด?',
        questionEn: 'If the mean of 5 numbers is 15, what is the sum of these numbers?',
        options: ['60', '75', '90', '100'],
        correctIndex: 1,
        explanationTh: 'ผลรวม = ค่าเฉลี่ย × จำนวน = 15 × 5 = 75',
        category: 'onet' as const,
        points: 150
      }
    ];
  }, [questions]);

  // Trigger Freeze Trap on Competitors
  const handleUseFreezeTrap = () => {
    if (freezeCooldown > 0) return;
    setFreezeCooldown(20);
    battleAudio.playPowerup();
    setHudAlert('❄️ เปิดใช้งาน Freeze Trap! แช่แข็งคู่แข่งในระยะ 20 เมตร เป็นเวลา 3 วินาที');

    setClassmates(prev => prev.map(c => ({
      ...c,
      status: '❄️ โดนแช่แข็ง (Freeze)!'
    })));

    setLiveBattleEvents(prev => [
      { id: String(Date.now()), text: '❄️ คุณใช้ Freeze Trap แช่แข็ง ด.ช.ธนาธร และเพื่อนรอบข้างสำเร็จ!', time: 'สด' },
      ...prev.slice(0, 5)
    ]);
  };

  // Trigger Nitro Boost
  const handleUseNitro = () => {
    if (activeBooster.nitro) return;
    setActiveBooster(prev => ({ ...prev, nitro: true }));
    battleAudio.playPowerup();
    setHudAlert('⚡ ไนโตรสปีดบูสต์ 1.8x ทำงาน! (วิ่งเร็วติดจรวด 8 วินาที)');
    setTimeout(() => {
      setActiveBooster(prev => ({ ...prev, nitro: false }));
    }, 8000);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // =========================================================================
  // 3. THREE.JS 3D SCENE & AAA GRAPHICS SETUP
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();

    // 1. Stylized Desert Oasis Sky
    scene.background = new THREE.Color(0xd99557); // Warm golden sunset
    scene.fog = new THREE.FogExp2(0xd99557, 0.0065);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1200);
    camera.position.set(0, 6, 10);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. High Quality Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfff5ea, 0x543d2b, 0.9);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffe8c2, 1.6);
    sunLight.position.set(50, 70, 35);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 250;
    const shadowD = 65;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Ambient Sky Fill
    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.4);
    fillLight.position.set(-40, 30, -30);
    scene.add(fillLight);

    // 3. Procedural Sky Dome & Sun Glow
    const skyGeo = new THREE.SphereGeometry(450, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      side: THREE.BackSide
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // Floating Low-Poly Stylized Clouds
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.85 });
    for (let c = 0; c < 14; c++) {
      const cMesh = new THREE.Group();
      const numPuffs = 4 + Math.floor(Math.random() * 3);
      for (let p = 0; p < numPuffs; p++) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + Math.random() * 4), cloudMat);
        puff.position.set((p - 2) * 6, Math.random() * 2, Math.random() * 3);
        cMesh.add(puff);
      }
      cMesh.position.set((Math.random() - 0.5) * 400, 70 + Math.random() * 30, (Math.random() - 0.5) * 400);
      cloudGroup.add(cMesh);
    }
    scene.add(cloudGroup);

    // 4. Procedural Terrain with Rolling Dunes & Oasis Basin
    const terrainGeo = new THREE.PlaneGeometry(350, 350, 72, 72);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;

    const getGroundHeight = (x: number, z: number): number => {
      // Distance from center oasis
      const distFromCenter = Math.hypot(x, z);
      let oasisBasin = 0;
      if (distFromCenter < 35) {
        oasisBasin = -Math.cos((distFromCenter / 35) * Math.PI) * 1.8;
      }
      // Gentle dunes
      const dune = Math.sin(x * 0.035) * 2.5 + Math.cos(z * 0.035) * 2.5 + Math.sin((x + z) * 0.018) * 1.8;
      return dune + oasisBasin;
    };

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, getGroundHeight(vx, vz));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xd4a366, // Rich golden sand
      roughness: 0.95,
      metalness: 0.05
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = !isSoftwareGl;
    scene.add(terrain);

    // 5. Central Oasis Pool (Reflective Crystalline Water)
    const waterGeo = new THREE.CircleGeometry(22, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.82
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(0, getGroundHeight(0, 0) + 0.3, 0);
    scene.add(waterMesh);

    // 6. Ancient Pyramids, Ruined Columns & Palm Trees
    const landmarksGroup = new THREE.Group();

    // Golden Great Pyramid
    const p1Geo = new THREE.ConeGeometry(12, 16, 4);
    const p1Mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6, metalness: 0.3 });
    const p1 = new THREE.Mesh(p1Geo, p1Mat);
    p1.position.set(45, 8, -35);
    p1.rotation.y = Math.PI / 4;
    p1.castShadow = !isSoftwareGl;
    landmarksGroup.add(p1);

    // Cyan High-Tech Obelisk with Glowing Runes
    const obeliskGeo = new THREE.CylinderGeometry(0.8, 1.8, 14, 4);
    const obeliskMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.8
    });
    const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
    obelisk.position.set(-35, 7, -25);
    obelisk.castShadow = !isSoftwareGl;
    landmarksGroup.add(obelisk);

    // Oasis Palm Trees (Stylized 5-8 part trees)
    const createPalmTree = (tx: number, tz: number) => {
      const tree = new THREE.Group();
      // Trunk
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 5.5, 8), trunkMat);
      trunk.position.y = 2.75;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      trunk.castShadow = !isSoftwareGl;
      tree.add(trunk);

      // Fronds / Leaves
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6, side: THREE.DoubleSide });
      for (let f = 0; f < 6; f++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.2, 5), leafMat);
        frond.position.set(0, 5.2, 0);
        frond.rotation.z = Math.PI / 3;
        frond.rotation.y = (f * Math.PI) / 3;
        tree.add(frond);
      }
      const ty = getGroundHeight(tx, tz);
      tree.position.set(tx, ty, tz);
      return tree;
    };

    const treeCoords = [
      [15, 12], [-14, 15], [18, -10], [-16, -12], [22, 5], [-8, 24]
    ];
    treeCoords.forEach(([tx, tz]) => {
      landmarksGroup.add(createPalmTree(tx, tz));
    });

    // Boulders
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.95 });
    for (let i = 0; i < 24; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.6), rockMat);
      const rx = (Math.random() - 0.5) * 220;
      const rz = (Math.random() - 0.5) * 220;
      rock.position.set(rx, getGroundHeight(rx, rz) + 0.6, rz);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = !isSoftwareGl;
      landmarksGroup.add(rock);
    }
    scene.add(landmarksGroup);

    // 7. Safe Zone Storm Boundary (Free Fire / PUBG Energy Barrier)
    const stormGeo = new THREE.CylinderGeometry(110, 110, 40, 36, 1, true);
    const stormMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    const stormMesh = new THREE.Mesh(stormGeo, stormMat);
    stormMesh.position.set(0, 20, 0);
    scene.add(stormMesh);

    // 8. Composite 3D Player Character (3-12 parts)
    const playerGroup = new THREE.Group();

    // Torso / Jacket
    const torsoMat = new THREE.MeshStandardMaterial({ color: currentSkin.colorJacket, roughness: 0.5 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.5), torsoMat);
    torso.position.y = 1.35;
    torso.castShadow = !isSoftwareGl;
    playerGroup.add(torso);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), headMat);
    head.position.y = 2.15;
    head.castShadow = !isSoftwareGl;
    playerGroup.add(head);

    // Explorer Cap / Visor
    const hatMat = new THREE.MeshStandardMaterial({ color: currentSkin.colorHat, roughness: 0.7 });
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.22, 16), hatMat);
    hat.position.y = 2.35;
    playerGroup.add(hat);

    // Backpack (Characteristic feature)
    const backpackMat = new THREE.MeshStandardMaterial({ color: currentSkin.colorBackpack, roughness: 0.6 });
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.38), backpackMat);
    backpack.position.set(0, 1.4, -0.38);
    backpack.castShadow = !isSoftwareGl;
    playerGroup.add(backpack);

    // High-Tech Wisdom Scanner Tool on Wrist
    const scannerMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0ea5e9, emissiveIntensity: 0.8 });
    const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.18), scannerMat);
    scanner.position.set(0.55, 1.0, 0.2);
    playerGroup.add(scanner);

    // Left & Right Legs
    const pantsMat = new THREE.MeshStandardMaterial({ color: currentSkin.colorPants, roughness: 0.8 });
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.85, 12), pantsMat);
    legL.position.set(-0.24, 0.5, 0);
    legL.castShadow = !isSoftwareGl;
    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.85, 12), pantsMat);
    legR.position.set(0.24, 0.5, 0);
    legR.castShadow = !isSoftwareGl;
    playerGroup.add(legL, legR);

    // Left & Right Arms
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.75, 10), torsoMat);
    armL.position.set(-0.55, 1.25, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.75, 10), torsoMat);
    armR.position.set(0.55, 1.25, 0);
    playerGroup.add(armL, armR);

    // Contact Shadow Plane
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({ color: 0x1f140a, transparent: true, opacity: 0.45, depthWrite: false })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.03;
    playerGroup.add(contactShadow);

    scene.add(playerGroup);

    // 9. Golden Treasure Chests with God-Ray Beams
    const chestLocations = [
      { id: 'chest-1', x: -16, z: -10, stage: 1 },
      { id: 'chest-2', x: 25, z: -22, stage: 2 },
      { id: 'chest-3', x: -38, z: 30, stage: 3 },
      { id: 'chest-4', x: 42, z: 35, stage: 4 },
      { id: 'chest-5', x: -8, z: -55, stage: 5 },
      { id: 'chest-6', x: 60, z: -40, stage: 6 },
      { id: 'chest-7', x: -55, z: -25, stage: 7 },
      { id: 'chest-8', x: 12, z: 65, stage: 8 }
    ];

    const chests: ChestItem[] = [];
    const chestMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.25 });
    const chestTrimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.2 });

    chestLocations.forEach((loc, idx) => {
      const cGroup = new THREE.Group();
      // Chest box
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 1.3), chestMat);
      box.position.y = 0.6;
      box.castShadow = !isSoftwareGl;
      cGroup.add(box);

      // Gold rim lid
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.0, 16, 1, false, 0, Math.PI), chestTrimMat);
      lid.rotation.z = Math.PI / 2;
      lid.position.y = 1.2;
      cGroup.add(lid);

      // Floating spinning question mark
      const prism = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55),
        new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xeab308, emissiveIntensity: 0.8, roughness: 0.2 })
      );
      prism.position.y = 2.4;
      cGroup.add(prism);

      // Point Light
      const pLight = new THREE.PointLight(0xf59e0b, 1.8, 10);
      pLight.position.y = 2.3;
      cGroup.add(pLight);

      // Sky God-Ray Light Beam (Iconic PUBG / Fortnite loot pillar)
      const beamGeo = new THREE.CylinderGeometry(0.15, 0.8, 45, 12, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.y = 23;
      cGroup.add(beamMesh);

      const groundY = getGroundHeight(loc.x, loc.z);
      cGroup.position.set(loc.x, groundY, loc.z);
      scene.add(cGroup);

      chests.push({
        id: loc.id,
        stage: loc.stage,
        x: loc.x,
        z: loc.z,
        mesh: cGroup,
        beaconMesh: beamMesh,
        opened: false,
        question: arenaQuestions[idx % arenaQuestions.length]
      });
    });
    chestsRef.current = chests;

    // 10. Supply Airdrop Crate with Red Smoke Beacon & Parachute
    const airdropGroup = new THREE.Group();
    // Red crate
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.4 });
    const crateBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), crateMat);
    crateBox.position.y = 1.3;
    crateBox.castShadow = !isSoftwareGl;
    airdropGroup.add(crateBox);

    // Blue tarp roof
    const tarp = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.4, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 })
    );
    tarp.position.y = 2.7;
    airdropGroup.add(tarp);

    // Red beacon flare
    const flare = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.5, 35, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    flare.position.y = 20;
    airdropGroup.add(flare);

    airdropGroup.position.set(10, getGroundHeight(10, -5), -5);
    scene.add(airdropGroup);

    airdropRef.current = {
      mesh: airdropGroup,
      x: 10,
      y: getGroundHeight(10, -5),
      z: -5,
      targetY: getGroundHeight(10, -5),
      falling: false,
      claimed: false,
      question: arenaQuestions[0]
    };

    // 11. Simulated Bot Classmate Characters (with overhead nametags)
    const classmateMeshes: Array<{
      group: THREE.Group;
      data: RoomClassmate;
      targetX: number;
      targetZ: number;
      speed: number;
      walkPhase: number;
    }> = [];

    classmates.forEach((cm) => {
      const cmGroup = new THREE.Group();
      const cmTorso = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.0, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 })
      );
      cmTorso.position.y = 1.3;
      cmTorso.castShadow = !isSoftwareGl;
      cmGroup.add(cmTorso);

      const cmHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffdbac })
      );
      cmHead.position.y = 2.05;
      cmGroup.add(cmHead);

      // Backpack
      const cmBag = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.7, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x10b981 })
      );
      cmBag.position.set(0, 1.3, -0.32);
      cmGroup.add(cmBag);

      const cmLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
      cmLegL.position.set(-0.2, 0.5, 0);
      const cmLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
      cmLegR.position.set(0.2, 0.5, 0);
      cmGroup.add(cmLegL, cmLegR);

      const gy = getGroundHeight(cm.x, cm.z);
      cmGroup.position.set(cm.x, gy, cm.z);
      scene.add(cmGroup);

      classmateMeshes.push({
        group: cmGroup,
        data: cm,
        targetX: cm.x + (Math.random() - 0.5) * 30,
        targetZ: cm.z + (Math.random() - 0.5) * 30,
        speed: 4.5 + Math.random() * 2.0,
        walkPhase: Math.random() * Math.PI
      });
    });

    // 12. Input Event Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyE') triggerInteraction();
      if (e.code === 'KeyQ' || e.code === 'Digit1') handleUseFreezeTrap();
      if (e.code === 'KeyF' || e.code === 'Digit2') handleUseNitro();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse Look Drag Listeners
    let isMouseDown = false;
    let prevMouseX = 0;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDown = true;
        prevMouseX = e.clientX;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - prevMouseX;
      prevMouseX = e.clientX;
      playerYaw -= dx * 0.006;
    };
    const onMouseUp = () => {
      isMouseDown = false;
    };
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Resize Handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Physics & Movement Loop Variables
    let animClock = new THREE.Clock();
    let playerPos = new THREE.Vector3(0, getGroundHeight(0, 0), 0);
    let playerYaw = 0;
    let walkPhase = 0;
    let jumpY = 0;
    let jumpVelocity = 0;
    const gravity = -25;
    let frameId = 0;

    const tick = () => {
      const dt = Math.min(animClock.getDelta(), 0.1);

      // 1. Calculate inputs (Keyboard + Touch Joystick)
      let moveForward = 0;
      let moveTurn = 0;

      // Keyboard
      if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) moveForward += 1;
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) moveForward -= 1;
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) moveTurn += 1;
      if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) moveTurn -= 1;

      // Touch Joystick
      if (touchJoystickRef.current.active) {
        moveForward -= touchJoystickRef.current.deltaY;
        moveTurn -= touchJoystickRef.current.deltaX;
      }

      const isSprint = keysRef.current['ShiftLeft'] || keysRef.current['ControlLeft'] || mobileActionsRef.current.sprint || activeBooster.nitro;
      const isCrouch = keysRef.current['KeyC'] || mobileActionsRef.current.crouch;
      const isJump = keysRef.current['Space'] || keysRef.current['KeyJ'] || mobileActionsRef.current.jump;

      // Rotate Character
      const rotSpeed = 2.8;
      playerYaw += moveTurn * rotSpeed * dt;
      playerYawRef.current = playerYaw;

      // Update Compass Heading
      let deg = Math.round(((-playerYaw * 180) / Math.PI) % 360);
      if (deg < 0) deg += 360;
      setCompassHeading(deg);

      // Speed
      let speed = 7.5;
      if (isSprint) speed *= 1.7;
      if (isCrouch) speed *= 0.55;
      speed *= currentSkin.speedMultiplier;
      if (activeBooster.nitro) speed *= 1.45;

      const moveDist = moveForward * speed * dt;
      const isMoving = Math.abs(moveDist) > 0.001;

      const forwardVec = new THREE.Vector3(0, 0, -1);
      forwardVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerYaw);
      playerPos.addScaledVector(forwardVec, moveDist);

      // Boundary clamp
      const boundary = 150;
      playerPos.x = Math.max(-boundary, Math.min(boundary, playerPos.x));
      playerPos.z = Math.max(-boundary, Math.min(boundary, playerPos.z));

      // Jump Physics
      if (isJump && jumpY <= 0.05) {
        jumpVelocity = 9.2;
        battleAudio.playJump();
        mobileActionsRef.current.jump = false;
      }
      jumpVelocity += gravity * dt;
      jumpY += jumpVelocity * dt;
      if (jumpY < 0) {
        jumpY = 0;
        jumpVelocity = 0;
      }

      const groundY = getGroundHeight(playerPos.x, playerPos.z);
      playerPos.y = groundY + jumpY;

      playerGroup.position.copy(playerPos);
      playerGroup.rotation.y = playerYaw;
      playerPosRef.current.copy(playerPos);

      // Limb swing animation
      if (isMoving && jumpY <= 0.05) {
        walkPhase += dt * (isSprint ? 19 : 11);
        const swing = Math.sin(walkPhase) * 0.58;
        legL.rotation.x = swing;
        legR.rotation.x = -swing;
        armL.rotation.x = -swing * 0.8;
        armR.rotation.x = swing * 0.8;

        if (Math.sin(walkPhase) > 0.95 && Math.random() < 0.28) {
          battleAudio.playStep();
        }
      } else {
        legL.rotation.x = 0;
        legR.rotation.x = 0;
        armL.rotation.x = 0;
        armR.rotation.x = 0;
      }

      // Crouch scaling
      if (isCrouch) {
        playerGroup.scale.set(1.0, 0.65, 1.0);
      } else {
        playerGroup.scale.set(1.0, 1.0, 1.0);
      }

      // Smooth Follow Camera
      const camDist = isCrouch ? 5.5 : 7.2;
      const camHeight = isCrouch ? 3.0 : 4.0;
      const camOffset = new THREE.Vector3(0, camHeight, camDist);
      camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerYaw);
      const targetCamPos = playerPos.clone().add(camOffset);
      camera.position.lerp(targetCamPos, 0.14);

      const lookTarget = playerPos.clone().add(new THREE.Vector3(0, 1.5, 0));
      camera.lookAt(lookTarget);

      // Safe Zone Storm Damage Check
      const distFromStormCenter = Math.hypot(playerPos.x, playerPos.z);
      const currentStormR = stormMesh.scale.x * 110;
      if (distFromStormCenter > currentStormR) {
        setIsOutsideStorm(true);
        // drain HP slowly
        setPlayerHp(hp => Math.max(0, hp - 0.15));
      } else {
        setIsOutsideStorm(false);
      }

      // Animate Safe Zone Scale
      if (stormMesh.scale.x > 0.3) {
        stormMesh.scale.x -= dt * 0.0025;
        stormMesh.scale.z -= dt * 0.0025;
      }

      // Animate Chest Beams & Find Nearest Chest
      let closestDist = 99999;
      let closeChest: ChestItem | null = null;

      chestsRef.current.forEach((c) => {
        if (!c.opened) {
          const prism = c.mesh.children[2];
          if (prism) {
            prism.rotation.y += dt * 2.2;
            prism.position.y = 2.4 + Math.sin(animClock.getElapsedTime() * 3.5 + c.stage) * 0.25;
          }
          const dist = Math.hypot(playerPos.x - c.x, playerPos.z - c.z);
          if (dist < closestDist) {
            closestDist = dist;
            closeChest = c;
          }
        }
      });

      setNearestChestDist(Math.round(closestDist * 2.5));

      if (closeChest && closestDist < 4.0) {
        setNearChestId((closeChest as ChestItem).id);
      } else {
        setNearChestId(null);
      }

      // Animate Airdrop Falling
      if (airdropRef.current && airdropRef.current.falling) {
        airdropRef.current.y -= dt * 7.5;
        if (airdropRef.current.y <= airdropRef.current.targetY) {
          airdropRef.current.y = airdropRef.current.targetY;
          airdropRef.current.falling = false;
        }
        airdropRef.current.mesh.position.y = airdropRef.current.y;
      }

      // Check near Airdrop
      if (airdropRef.current && !airdropRef.current.claimed && !airdropRef.current.falling) {
        const distAirdrop = Math.hypot(playerPos.x - airdropRef.current.x, playerPos.z - airdropRef.current.z);
        setNearAirdrop(distAirdrop < 4.5);
      } else {
        setNearAirdrop(false);
      }

      // Animate Bot Classmates
      classmateMeshes.forEach(cm => {
        const dx = cm.targetX - cm.group.position.x;
        const dz = cm.targetZ - cm.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 1.0) {
          const angle = Math.atan2(dx, dz);
          cm.group.position.x += Math.sin(angle) * cm.speed * dt;
          cm.group.position.z += Math.cos(angle) * cm.speed * dt;
          cm.group.position.y = getGroundHeight(cm.group.position.x, cm.group.position.z);
          cm.group.rotation.y = angle;

          cm.walkPhase += dt * 10;
          const legL = cm.group.children[3] as THREE.Mesh;
          const legR = cm.group.children[4] as THREE.Mesh;
          if (legL && legR) {
            legL.rotation.x = Math.sin(cm.walkPhase) * 0.45;
            legR.rotation.x = -Math.sin(cm.walkPhase) * 0.45;
          }
        } else {
          // Pick next chest or location
          const randomChest = chestsRef.current.find(c => !c.opened);
          if (randomChest && Math.random() < 0.6) {
            cm.targetX = randomChest.x + (Math.random() - 0.5) * 5;
            cm.targetZ = randomChest.z + (Math.random() - 0.5) * 5;
          } else {
            cm.targetX = (Math.random() - 0.5) * 120;
            cm.targetZ = (Math.random() - 0.5) * 120;
          }
        }
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
    };
  }, [currentSkin, arenaQuestions]);

  // Trigger Interaction (Chest or Airdrop)
  const triggerInteraction = () => {
    // 1. Airdrop claim
    if (nearAirdrop && airdropRef.current && !airdropRef.current.claimed) {
      battleAudio.playChestOpen();
      airdropRef.current.claimed = true;
      airdropRef.current.mesh.visible = false;
      setIsAirdropQuestion(true);
      setActiveQuestion(airdropRef.current.question);
      setQuestionTimer(25);
      setSelectedAnswerIndex(null);
      setQuestionFeedback(null);
      setHudAlert('🌟 แอร์ดรอปทองคำเปิดแล้ว! ตอบโจทย์พิเศษรับโบนัส EXP 2 เท่า');
      return;
    }

    // 2. Chest claim
    if (!nearChestId) return;
    const chest = chestsRef.current.find(c => c.id === nearChestId);
    if (!chest || chest.opened) return;

    battleAudio.playChestOpen();
    chest.opened = true;
    chest.beaconMesh.visible = false; // Turn off god-ray beam
    const box = chest.mesh.children[0] as THREE.Mesh;
    if (box && box.material) {
      (box.material as THREE.MeshStandardMaterial).color.setHex(0x555555);
    }
    const light = chest.mesh.children[3];
    if (light) light.visible = false;

    setOpenedChestsCount(prev => prev + 1);
    setCurrentStage(Math.min(totalStages, chest.stage));
    setIsAirdropQuestion(false);
    setActiveQuestion(chest.question);
    setQuestionTimer(20);
    setSelectedAnswerIndex(null);
    setQuestionFeedback(null);
  };

  // Handle Quiz Answer
  const handleAnswer = (index: number) => {
    if (selectedAnswerIndex !== null || !activeQuestion) return;
    setSelectedAnswerIndex(index);

    const isCorrect = index === activeQuestion.correctIndex;
    if (isCorrect) {
      battleAudio.playCorrect();
      setQuestionFeedback('correct');
      const bonusStreak = playerStreak + 1;
      setPlayerStreak(bonusStreak);
      setCorrectCount(prev => prev + 1);

      const multiplier = isAirdropQuestion ? 2.0 : 1.0;
      const expGain = Math.round((activeQuestion.points + bonusStreak * 30) * multiplier);
      const gemGain = Math.round((25 + bonusStreak * 6) * multiplier);

      setTotalExp(prev => prev + expGain);
      setTotalGems(prev => prev + gemGain);

      setHudAlert(`🎉 ถูกต้อง! +${expGain} XP, +${gemGain} เพชร ${isAirdropQuestion ? '🌟 โบนัสแอร์ดรอป x2!' : ''}`);

      if (currentUser) {
        onEarnRewards(currentUser.id, expGain, gemGain, false);
      }

      if (openedChestsCount + 1 >= totalChests) {
        setTimeout(() => {
          setGameWon(true);
          battleAudio.playVictory();
          if (currentUser) {
            onEarnRewards(currentUser.id, 600, 150, true);
          }
        }, 1200);
      }
    } else {
      battleAudio.playWrong();
      setQuestionFeedback('wrong');
      if (activeBooster.shield) {
        setActiveBooster(prev => ({ ...prev, shield: false }));
        setHudAlert('🛡️ โล่คุ้มครองปัญญาทำงาน! ป้องกันไม่ให้เสียแต้มหรือหลุดคอมโบ');
      } else {
        setPlayerStreak(0);
      }
    }

    setTimeout(() => {
      setActiveQuestion(null);
      setSelectedAnswerIndex(null);
      setQuestionFeedback(null);
      setIsAirdropQuestion(false);
    }, 2800);
  };

  // Compass Ribbon
  const compassRibbon = useMemo(() => {
    const headings = [
      { label: 'N', deg: 0 },
      { label: '15', deg: 15 },
      { label: '30', deg: 30 },
      { label: '45', deg: 45 },
      { label: '60', deg: 60 },
      { label: '75', deg: 75 },
      { label: 'E', deg: 90 },
      { label: '105', deg: 105 },
      { label: '120', deg: 120 },
      { label: '135', deg: 135 },
      { label: '150', deg: 150 },
      { label: '165', deg: 165 },
      { label: 'S', deg: 180 },
      { label: '195', deg: 195 },
      { label: '210', deg: 210 },
      { label: '225', deg: 225 },
      { label: '240', deg: 240 },
      { label: '255', deg: 255 },
      { label: 'W', deg: 270 },
      { label: '285', deg: 285 },
      { label: '300', deg: 300 },
      { label: '315', deg: 315 },
      { label: '330', deg: 330 },
      { label: '345', deg: 345 }
    ];

    const current = compassHeading;
    return headings.map(h => {
      let diff = (h.deg - current + 540) % 360 - 180;
      return { ...h, diff };
    }).filter(h => Math.abs(h.diff) <= 45);
  }, [compassHeading]);

  // Touch handlers for Virtual Joystick (Left Thumb)
  const handleTouchStartLeft = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchJoystickRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0
    };
  };

  const handleTouchMoveLeft = (e: React.TouchEvent) => {
    if (!touchJoystickRef.current.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchJoystickRef.current.startX;
    const dy = touch.clientY - touchJoystickRef.current.startY;
    const maxRadius = 45;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const normX = (Math.cos(angle) * clampedDist) / maxRadius;
    const normY = (Math.sin(angle) * clampedDist) / maxRadius;

    touchJoystickRef.current.currentX = touchJoystickRef.current.startX + Math.cos(angle) * clampedDist;
    touchJoystickRef.current.currentY = touchJoystickRef.current.startY + Math.sin(angle) * clampedDist;
    touchJoystickRef.current.deltaX = normX;
    touchJoystickRef.current.deltaY = normY;
  };

  const handleTouchEndLeft = () => {
    touchJoystickRef.current.active = false;
    touchJoystickRef.current.deltaX = 0;
    touchJoystickRef.current.deltaY = 0;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${isFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none' : 'h-[88vh] rounded-3xl'} bg-slate-950 select-none overflow-hidden font-sans text-white border border-slate-800 shadow-2xl flex flex-col`}
    >
      {/* ======================================================== */}
      {/* 1. TOP HEADER HUD BAR (Desktop & Mobile Adaptive) */}
      {/* ======================================================== */}
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-5 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        {/* Left: Title & Subject */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                {gameMode === 'solo' ? 'ล่าสมบัติ O-NET · Solo' : `Battle Royale · ${roomCode}`}
              </span>
              <button
                onClick={() => setSubjectTitle(p => p.includes('คณิต') ? 'ศูนย์วิทยาศาสตร์ & O-NET' : 'ศูนย์คณิตศาสตร์ & O-NET')}
                className="text-[10px] text-cyan-400 hover:underline cursor-pointer hidden sm:inline"
              >
                (เปลี่ยนวิชา)
              </button>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{subjectTitle}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                ด่าน {currentStage}/{totalStages}
              </span>
            </h1>
          </div>
        </div>

        {/* Center: Live Stats HUD */}
        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Player HP Bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
            <span className="text-[11px] font-bold text-rose-400">HP</span>
            <div className="w-20 h-2 bg-slate-950 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${playerHp > 50 ? 'bg-emerald-500' : playerHp > 20 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`}
                style={{ width: `${playerHp}%` }}
              />
            </div>
            <span className="font-mono text-[11px]">{Math.round(playerHp)}</span>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
            <span className="flex items-center gap-1 font-mono text-cyan-400 font-bold">
              <Clock className="w-3.5 h-3.5" />
              {timerSeconds}s
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold font-mono">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              {playerStreak > 0 ? `${(1 + playerStreak * 0.5).toFixed(1)}x` : '0x'}
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
              <Award className="w-3.5 h-3.5" />
              {totalExp} XP
            </span>
            <span className="flex items-center gap-1 text-violet-400 font-bold font-mono">
              💎 {totalGems}
            </span>
          </div>
        </div>

        {/* Right: Actions & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Locker / Skin Shop */}
          <button
            onClick={() => setShowSkinShop(!showSkinShop)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">สกินตัวละคร</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title={isFullscreen ? 'ย่อหน้าต่าง' : 'เต็มหน้าจอ'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit */}
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer"
          >
            ออก
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. 3D WEBGL VIEWPORT & IN-GAME BATTLE ROYALE HUD */}
      {/* ======================================================== */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Three.js canvas container */}
        <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Storm Warning Red Vignette when outside safe zone */}
        {isOutsideStorm && (
          <div className="absolute inset-0 z-10 pointer-events-none border-8 border-rose-600/70 bg-rose-950/20 animate-pulse flex items-center justify-center">
            <div className="px-4 py-2 bg-rose-600 text-white font-black text-sm rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
              <AlertTriangle className="w-5 h-5 text-yellow-300" />
              <span>⚠️ คุณอยู่นอกวงพายุหมอก O-NET! รีบวิ่งเข้าสู่ Safe Zone</span>
            </div>
          </div>
        )}

        {/* HUD Alert Banner */}
        {hudAlert && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-2 bg-slate-900/90 border border-amber-500/50 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{hudAlert}</span>
          </div>
        )}

        {/* Top-Center Real-Time Compass Tape */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center pointer-events-none">
          <div className="flex items-center gap-3 px-6 py-1 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700 shadow-xl font-mono text-xs">
            {compassRibbon.map((item, idx) => (
              <span
                key={idx}
                className={
                  item.label === 'N' 
                    ? 'text-rose-400 font-bold' 
                    : item.label === 'E' || item.label === 'S' || item.label === 'W' 
                      ? 'text-amber-400 font-semibold' 
                      : 'text-slate-400'
                }
              >
                {item.label}
              </span>
            ))}
          </div>
          <div className="mt-1 px-4 py-0.5 bg-slate-900/90 rounded-md border border-slate-800 text-[11px] font-bold text-cyan-300">
            ล่าสมบัติ {openedChestsCount}/{totalChests}
          </div>
        </div>

        {/* Top-Left: Live Classroom Leaderboard Widget */}
        <div className="absolute top-3 left-3 z-10 w-56 sm:w-64 bg-slate-900/85 backdrop-blur-md p-2.5 rounded-2xl border border-slate-700 shadow-xl pointer-events-none">
          <div className="flex items-center justify-between text-[11px] font-extrabold text-cyan-400 border-b border-slate-800 pb-1 mb-1.5">
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              อันดับสดในห้อง {roomCode}
            </span>
            <span>คะแนน</span>
          </div>
          <div className="space-y-1">
            {/* Player rank row */}
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-[10px] w-4 text-center">#1</span>
                <span>คุณ ({currentUser?.fullNameTh?.split(' ')[0] || 'Player'})</span>
              </span>
              <span className="font-mono">{totalExp} XP</span>
            </div>

            {/* Classmate bot rows */}
            {classmates.slice(0, 3).map((cm, i) => (
              <div key={cm.id} className="flex items-center justify-between text-[11px] text-slate-300 px-2 py-0.5">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="text-[10px] w-4 text-center text-slate-500">#{i + 2}</span>
                  <span className="truncate">{cm.name.split(' ')[0]}</span>
                </span>
                <span className="font-mono text-slate-400">{cm.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top-Right: Chest Tracker & Storm Warning */}
        <div className="absolute top-3 right-3 z-10 w-48 sm:w-56 bg-slate-900/85 backdrop-blur-md p-2.5 rounded-2xl border border-slate-700 shadow-xl pointer-events-none">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>กล่องคำถาม O-NET</span>
            <span className="font-mono text-cyan-400 font-bold">{nearestChestDist} m</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-300"
              style={{ width: `${(openedChestsCount / totalChests) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between text-slate-400">
            <span>วงพายุ Safe Zone</span>
            <span className="font-mono text-rose-400 font-bold">{Math.round(stormRadius)} m</span>
          </div>
        </div>

        {/* Center Interactive Chest Interaction Prompt */}
        {(nearChestId || nearAirdrop) && !activeQuestion && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
            <button
              onClick={triggerInteraction}
              className={`px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-2xl flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 ${
                nearAirdrop 
                  ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white border-red-300 shadow-red-500/60 animate-bounce' 
                  : 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-amber-200 shadow-amber-500/60'
              }`}
            >
              <Sparkles className="w-5 h-5 fill-current" />
              <span>{nearAirdrop ? '[E] เปิดแอร์ดรอป O-NET พิเศษ (2x EXP)' : '[E] เปิดหีบสมบัติ O-NET'}</span>
            </button>
            <div className="mt-2 text-xs text-amber-200 font-semibold drop-shadow-md">
              (หรือแตะที่ปุ่มเปิดบนหน้าจอ)
            </div>
          </div>
        )}

        {/* Mobile Left Touch Area (Virtual Floating Joystick) */}
        <div 
          className="absolute inset-y-0 left-0 w-1/2 z-20"
          onTouchStart={handleTouchStartLeft}
          onTouchMove={handleTouchMoveLeft}
          onTouchEnd={handleTouchEndLeft}
        >
          {touchJoystickRef.current.active && (
            <div 
              className="absolute w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400/50 bg-cyan-950/40 backdrop-blur-sm pointer-events-none flex items-center justify-center"
              style={{
                left: touchJoystickRef.current.startX,
                top: touchJoystickRef.current.startY
              }}
            >
              <div 
                className="w-12 h-12 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400 pointer-events-none"
                style={{
                  transform: `translate(${touchJoystickRef.current.deltaX * 35}px, ${touchJoystickRef.current.deltaY * 35}px)`
                }}
              />
            </div>
          )}
        </div>

        {/* Mobile Right Action Controls Cluster */}
        <div className="absolute bottom-16 right-3 z-30 flex flex-col items-end gap-2.5">
          {/* Quick Action: Open Chest / Airdrop */}
          {(nearChestId || nearAirdrop) && (
            <button
              onClick={triggerInteraction}
              className="w-16 h-16 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs shadow-2xl shadow-amber-500/50 flex flex-col items-center justify-center border-2 border-yellow-200 active:scale-90 transition-transform"
            >
              <Package className="w-6 h-6 mb-0.5" />
              <span>เปิดหีบ</span>
            </button>
          )}

          {/* Sprint / Turbo Nitro Button */}
          <button
            onClick={handleUseNitro}
            className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center active:scale-90 transition-transform ${
              activeBooster.nitro 
                ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-lg shadow-amber-500/50' 
                : 'bg-slate-900/80 text-amber-300 border-amber-500/40 backdrop-blur-md'
            }`}
          >
            <Wind className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">ไนโตร</span>
          </button>

          {/* Jump Button */}
          <button
            onClick={() => {
              mobileActionsRef.current.jump = true;
            }}
            className="w-14 h-14 rounded-2xl bg-cyan-600/90 hover:bg-cyan-500 text-white border border-cyan-400/50 shadow-xl flex flex-col items-center justify-center active:scale-90 transition-transform backdrop-blur-md"
          >
            <Zap className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">กระโดด</span>
          </button>

          {/* Freeze Trap Powerup Button */}
          <button
            disabled={freezeCooldown > 0}
            onClick={handleUseFreezeTrap}
            className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center active:scale-90 transition-transform backdrop-blur-md ${
              freezeCooldown === 0 
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/40' 
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            <Shield className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">{freezeCooldown > 0 ? `${freezeCooldown}s` : 'แช่แข็ง'}</span>
          </button>
        </div>

        {/* Bottom-Right Rounded Minimap Radar */}
        <div className="absolute bottom-16 left-3 z-20 w-44 h-28 bg-emerald-950/85 backdrop-blur-md rounded-2xl border-2 border-emerald-600/60 shadow-2xl relative overflow-hidden flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:12px_12px]" />
          <div className="absolute w-20 h-20 rounded-full border border-emerald-500/40" />

          {/* Player Dot */}
          <div className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-lg shadow-white z-10" />

          {/* Chest Blips */}
          {chestsRef.current.map((c, i) => {
            if (c.opened) return null;
            const mapX = (c.x / 140) * 60;
            const mapY = (c.z / 140) * 40;
            return (
              <div 
                key={i}
                className="absolute w-2 h-2 rounded-full bg-yellow-400 border border-amber-600 shadow-sm"
                style={{ transform: `translate(${mapX}px, ${mapY}px)` }}
              />
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM FOOTER CONTROLS & INFO BAR */}
      {/* ======================================================== */}
      <footer className="relative z-20 bg-slate-900 border-t border-slate-800 px-3 sm:px-5 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="hidden sm:inline">
            วิ่งเก็บหีบ O-NET · ชิงแอร์ดรอป · ระวังวงพายุ Safe Zone บีบพื้นที่!
          </span>
          <span className="sm:hidden text-[11px]">
            แตะจอซ้ายเดิน · แตะปุ่มขวากระโดด/เปิดหีบ
          </span>
        </div>

        {/* Controls Guide */}
        <div className="text-[11px] text-slate-400 font-mono hidden md:inline">
          WASD เดิน · Shift วิ่งไนโตร · Space กระโดด · E เปิดหีบ · Q แช่แข็งคู่แข่ง
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setGameMode('solo')}
              className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                gameMode === 'solo' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'
              }`}
            >
              Solo
            </button>
            <button
              onClick={() => setGameMode('classroom')}
              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                gameMode === 'classroom' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
              }`}
            >
              <Users className="w-3 h-3" />
              แข่งทั้งห้อง
            </button>
          </div>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs underline cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            คู่มือ
          </button>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 4. QUESTION POPUP MODAL */}
      {/* ======================================================== */}
      {activeQuestion && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`relative w-full max-w-xl bg-slate-900 border-2 ${isAirdropQuestion ? 'border-red-500 shadow-red-500/40' : 'border-amber-500/60'} rounded-3xl p-5 sm:p-7 shadow-2xl text-white animate-in fade-in zoom-in-95`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${isAirdropQuestion ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                  {isAirdropQuestion ? '📦 โบนัสแอร์ดรอป O-NET (2x EXP)' : activeQuestion.subject}
                </span>
                <span className="text-xs text-slate-400">
                  {activeQuestion.gradeLevel}
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs">
                <Clock className="w-4 h-4 text-rose-400 animate-pulse" />
                <span className={questionTimer <= 5 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {questionTimer}s
                </span>
              </div>
            </div>

            {/* Question */}
            <div className="mt-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 leading-relaxed">
                {activeQuestion.questionTh}
              </h2>
              {activeQuestion.questionEn && (
                <p className="mt-1 text-xs text-slate-400 italic">
                  {activeQuestion.questionEn}
                </p>
              )}
            </div>

            {/* Choices */}
            <div className="mt-5 space-y-2.5">
              {activeQuestion.options.map((option, idx) => {
                let btnStyle = 'bg-slate-800/80 border-slate-700 hover:bg-slate-750 text-slate-200';
                if (selectedAnswerIndex !== null) {
                  if (idx === activeQuestion.correctIndex) {
                    btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                  } else if (selectedAnswerIndex === idx) {
                    btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 font-semibold';
                  } else {
                    btnStyle = 'opacity-40 bg-slate-800/40 border-slate-800 text-slate-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={selectedAnswerIndex !== null}
                    onClick={() => handleAnswer(idx)}
                    className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-700/60 flex items-center justify-center font-mono font-bold text-xs text-slate-300">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </span>
                    {selectedAnswerIndex !== null && idx === activeQuestion.correctIndex && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                    {selectedAnswerIndex === idx && idx !== activeQuestion.correctIndex && (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation Feedback */}
            {questionFeedback && (
              <div className="mt-4 p-3 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
                <div className={`font-bold flex items-center gap-1.5 ${questionFeedback === 'correct' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {questionFeedback === 'correct' ? '🎉 ถูกต้องยอดเยี่ยม!' : '❌ คำตอบยังไม่ถูกต้อง'}
                </div>
                <div className="mt-1 text-slate-300">
                  <span className="text-slate-400 font-semibold">เฉลย: </span>
                  {activeQuestion.explanationTh}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. VICTORY ROYALE SCREEN */}
      {/* ======================================================== */}
      {gameWon && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-6 text-center shadow-2xl shadow-amber-500/30">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>
            <h1 className="mt-4 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 uppercase tracking-wider">
              VICTORY ROYALE!
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              🏆 คุณคว้าแชมป์การประลอง O-NET ประจำห้องเรียนสำเร็จ!
            </p>

            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <div className="text-[11px] text-slate-400">EXP ทั้งหมด</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">+{totalExp}</div>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <div className="text-[11px] text-slate-400">เพชรที่ได้รับ</div>
                <div className="text-lg font-bold text-violet-400 font-mono">💎 +{totalGems}</div>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <div className="text-[11px] text-slate-400">ตอบถูก</div>
                <div className="text-lg font-bold text-cyan-400 font-mono">{correctCount}/{totalStages}</div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setGameWon(false);
                  setOpenedChestsCount(0);
                  chestsRef.current.forEach(c => {
                    c.opened = false;
                    c.beaconMesh.visible = true;
                  });
                }}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-sm text-white shadow-lg cursor-pointer"
              >
                เล่นใหม่อีกครั้ง
              </button>
              <button
                onClick={onExit}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm text-slate-300 border border-slate-700 cursor-pointer"
              >
                กลับเมนูหลัก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CHARACTER SKINS & LOCKER */}
      {/* ======================================================== */}
      {showSkinShop && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">เลือกลุคตัวละคร 3D & อาวุธปัญญา</h3>
              </div>
              <button onClick={() => setShowSkinShop(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {SKINS.map((skin) => {
                const isSelected = selectedSkinId === skin.id;
                return (
                  <div
                    key={skin.id}
                    onClick={() => setSelectedSkinId(skin.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected ? 'bg-indigo-500/20 border-indigo-400' : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${skin.previewColor}`} />
                      <div className="font-semibold text-xs text-white truncate">{skin.nameTh}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      สปีด: {Math.round(skin.speedMultiplier * 100)}%
                    </div>
                    {isSelected && (
                      <div className="mt-2 text-[10px] text-indigo-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> สวมใส่อยู่
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. HOW TO PLAY MODAL */}
      {/* ======================================================== */}
      {showHowToPlay && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                คู่มือการเล่นเกมล่าสมบัติ O-NET
              </h3>
              <button onClick={() => setShowHowToPlay(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>📱 เล่นบนมือถือ:</strong> แตะและลากที่บริเวณครึ่งซ้ายของหน้าจอเพื่อควบคุมทิศทางการเดิน 360 องศา และแตะปุ่มทางขวาเพื่อกระโดดหรือกดเปิดหีบ
              </p>
              <p>
                <strong>💻 เล่นบนคอมพิวเตอร์:</strong> ใช้ปุ่ม <code>W, A, S, D</code> เพื่อเคลื่อนที่, คลิกและลากเมาส์เพื่อหมุนมุมมองกล้อง, <code>Shift</code> วิ่งเร็ว, <code>Space</code> กระโดด, <code>E</code> เปิดหีบ
              </p>
              <p>
                <strong>📦 แอร์ดรอป & วงพายุ:</strong> วิ่งเข้าหาเสาแสงสีทองและกล่องแอร์ดรอปสีแดง พร้อมระวังอย่าให้อยู่นอกวงพายุหมอก Safe Zone
              </p>
            </div>
            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-5 w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-xs"
            >
              เข้าใจแล้ว เริ่มผจญภัยเลย!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
