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
  Target,
  BookOpen,
  Menu,
  Settings,
  LogOut,
  ChevronRight,
  Gamepad2
} from 'lucide-react';
import { QuizQuestion, AuthUser, RewardItem, AppLanguage, CharacterSkin, RoomClassmate } from '../types';
import { 
  COMPREHENSIVE_QUESTION_BANK, 
  EXAM_CATEGORIES, 
  EXAM_GRADE_LEVELS, 
  ExamCategoryFilter, 
  ExamGradeFilter 
} from '../data/examQuestionBanks';

interface EduBattleRoyale3DViewProps {
  questions: QuizQuestion[];
  currentUser: AuthUser | null;
  lang: AppLanguage;
  rewardItems: RewardItem[];
  initialCategory?: ExamCategoryFilter;
  initialGrade?: ExamGradeFilter;
  initialGameMode?: 'solo' | 'classroom';
  roomCodeProp?: string;
  roomNameProp?: string;
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

  playClick() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  playSwoosh() {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  private ambientInterval: any = null;
  startAmbientMusic() {
    if (!this.enabled || this.ambientInterval) return;
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    this.ambientInterval = setInterval(() => {
      if (!this.enabled) return;
      const ctx = this.getCtx();
      if (!ctx) return;
      try {
        const freq = notes[Math.floor(Math.random() * notes.length)];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.1);
      } catch {}
    }, 1600);
  }

  stopAmbientMusic() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
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
    nameTh: 'ชุดเกราะปัญญาประดิษฐ์ (Cyber Scholar Suit)',
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
  lang: _lang,
  rewardItems: _rewardItems,
  initialCategory,
  initialGrade,
  initialGameMode = 'classroom',
  roomCodeProp,
  roomNameProp,
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
  const [subjectTitle, setSubjectTitle] = useState('ศูนย์คณิตศาสตร์และวิทยาการคำนวณ');
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

  // Game Modes & Match Setup Lobby (Requirement 3 & 4)
  const [gamePhase, setGamePhase] = useState<'lobby' | 'playing'>('lobby');
  const [playMode, setPlayMode] = useState<'solo' | 'friend' | 'teacher_room'>(
    initialGameMode === 'solo' ? 'solo' : 'teacher_room'
  );
  const [friendRoomInput, setFriendRoomInput] = useState<string>(roomCodeProp || 'ARENA-401');
  const [teacherActivityName, setTeacherActivityName] = useState<string>(
    roomNameProp || 'กิจกรรมแข่งขันวิชาการ & STEM ประจำสัปดาห์'
  );
  const [teacherRoomPin, setTeacherRoomPin] = useState<string>(
    roomCodeProp || String(Math.floor(100000 + Math.random() * 900000))
  );
  const [teacherChestCount, setTeacherChestCount] = useState<number>(8);
  const [teacherTimePerQuestion, setTeacherTimePerQuestion] = useState<number>(20);
  const [gameMode, setGameMode] = useState<'solo' | 'classroom'>('classroom');
  const [roomCode, setRoomCode] = useState(roomCodeProp || 'ARENA-401');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSkinShop, setShowSkinShop] = useState(false);
  const [selectedSkinId, setSelectedSkinId] = useState('default');
  const [showGameMenuDrawer, setShowGameMenuDrawer] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<'leaderboard' | 'storm_map' | 'boosters' | 'skins' | 'settings'>('leaderboard');

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

  // Question Bank & Exam Selector State (Multi-Subject Question Banks)
  const [selectedBankCategory, setSelectedBankCategory] = useState<ExamCategoryFilter>(initialCategory || 'all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<ExamGradeFilter>(initialGrade || 'all');
  const [showBankModal, setShowBankModal] = useState(false);
  const [useVirtualDpad, setUseVirtualDpad] = useState(true);

  // Floating Notification Banner
  const [hudAlert, setHudAlert] = useState<string | null>('🔥 เริ่มต้นแมตช์ล่าสมบัติ 3D! วิ่งหาหีบสมบัติและตอบคำถามชิงคะแนน');

  // Victory / Game Over
  const [gameWon, setGameWon] = useState(false);

  // Live Classroom Rankings & Competitors
  const [classmates, setClassmates] = useState<RoomClassmate[]>([
    { id: 'c1', name: 'ธนาธร (STU-0842)', score: 320, chestsOpened: 2, alive: true, x: 20, z: -30, avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', status: 'วิ่งล่าหีบความรู้' },
    { id: 'c2', name: 'พิมพ์ชนก (STU-6904)', score: 380, chestsOpened: 3, alive: true, x: -35, z: 25, avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', status: 'ทำคอมโบ 3x' },
    { id: 'c3', name: 'วรพล (STU-1102)', score: 210, chestsOpened: 1, alive: true, x: 55, z: 45, avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100', status: 'วิ่งเข้า Safe Zone' },
    { id: 'c4', name: 'ณิชาภัทร (STU-3301)', score: 190, chestsOpened: 1, alive: true, x: -20, z: -55, avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', status: 'เปิดหีบวิทยาศาสตร์' }
  ]);

  const [liveBattleEvents, setLiveBattleEvents] = useState<Array<{ id: string; text: string; time: string }>>([
    { id: '1', text: '🎮 ทุกคนเข้าสู่เกาะประลองปัญญา EduArena แล้ว!', time: '10:00' },
    { id: '2', text: '⚡ ด.ญ.พิมพ์ชนก เปิดหีบสมบัติปริศนา ตอบถูกต้อง! (+120 XP)', time: '10:01' }
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

  // Mobile Translucent D-Pad Flags
  const dpadRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false
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

  // Audio Toggle & Ambient Adventure Music
  useEffect(() => {
    battleAudio.enabled = !isMuted;
    if (!isMuted && !gameWon) {
      battleAudio.startAmbientMusic();
    } else {
      battleAudio.stopAmbientMusic();
    }
    return () => {
      battleAudio.stopAmbientMusic();
    };
  }, [isMuted, gameWon]);

  // Alert dismiss
  useEffect(() => {
    if (!hudAlert) return;
    const t = setTimeout(() => setHudAlert(null), 4500);
    return () => clearTimeout(t);
  }, [hudAlert]);

  // Match Timer & Storm Logic (Only active during playing phase)
  useEffect(() => {
    if (gameWon || gamePhase !== 'playing') return;
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
  }, [gameWon, gamePhase, stormPhase]);

  // Airdrop Drop Trigger every 35 seconds (Only during playing phase)
  useEffect(() => {
    if (gameWon || gamePhase !== 'playing') return;
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
        setHudAlert('📦 แอร์ดรอปกล่องสมบัติทองคำพิเศษ กำลังถูกทิ้งร่มลงมา! รีบไปชิงสมบัติ');
        setLiveBattleEvents(prev => [
          { id: String(Date.now()), text: '📦 สัญญาณเตือน: แอร์ดรอปทองคำพิเศษ กำลังลงสู่พื้น!', time: 'สด' },
          ...prev.slice(0, 5)
        ]);
      }
    }, 35000);
    return () => clearInterval(t);
  }, [gameWon, gamePhase]);

  // Start / Enter Match from Lobby
  const handleStartBattleMatch = () => {
    battleAudio.playClick();
    battleAudio.playVictory();

    if (playMode === 'teacher_room') {
      setRoomCode(teacherRoomPin);
      setGameMode('classroom');
      setSubjectTitle(teacherActivityName);
      setHudAlert(`🏆 กิจกรรมแข่งขันของครู "${teacherActivityName}" (รหัส PIN: ${teacherRoomPin}) เริ่มต้นแล้ว!`);
    } else if (playMode === 'friend') {
      setRoomCode(friendRoomInput || 'ROOM-88');
      setGameMode('classroom');
      setSubjectTitle(`ห้องประลองกับเพื่อน (${friendRoomInput || 'ROOM-88'})`);
      setHudAlert(`👥 เชื่อมต่อห้องเพื่อน ${friendRoomInput || 'ROOM-88'} สำเร็จ!`);
    } else {
      setRoomCode('SOLO-RANK');
      setGameMode('solo');
      setSubjectTitle('โหมดประลองเดี่ยว EduArena Challenge');
      setHudAlert('🌟 เริ่มต้นโหมดประลองเดี่ยว! ลุยเก็บหีบสมบัติและทำลายสถิติคะแนน');
    }

    setPlayerHp(100);
    setTimerSeconds(playMode === 'teacher_room' ? teacherTimePerQuestion * teacherChestCount + 30 : 90);
    setOpenedChestsCount(0);
    setCorrectCount(0);
    setTotalExp(0);
    setTotalGems(0);
    setPlayerStreak(0);
    setStormRadius(110);
    setStormPhase(1);
    setIsOutsideStorm(false);
    setGameWon(false);

    // Refresh chests with selected bank questions
    chestsRef.current.forEach((c, idx) => {
      c.opened = false;
      c.question = arenaQuestions[idx % arenaQuestions.length];
      if (c.mesh) {
        c.mesh.visible = true;
        c.mesh.position.y = 1.0;
        c.mesh.rotation.y = Math.PI / 4;
      }
    });

    setGamePhase('playing');
    if (!isMuted) {
      battleAudio.startAmbientMusic();
    }
  };

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

  // All available questions combining prop questions and comprehensive bank
  const allAvailableQuestions = useMemo(() => {
    return [...questions, ...COMPREHENSIVE_QUESTION_BANK];
  }, [questions]);

  // Arena Questions filtered by selected question bank and grade level
  const arenaQuestions: QuizQuestion[] = useMemo(() => {
    const filtered = allAvailableQuestions.filter(q => {
      // 1. Category Filter
      if (selectedBankCategory !== 'all') {
        if (selectedBankCategory === 'onet' && q.category !== 'onet') return false;
        if (selectedBankCategory === 'midterm_final' && q.category !== 'exam') return false;
        if (selectedBankCategory === 'stem' && !q.subject.includes('วิทย์') && !q.subject.includes('STEM') && !q.subject.includes('Science') && !q.subject.includes('หุ่นยนต์') && !q.subject.includes('AI') && !q.subject.includes('เคมี') && !q.subject.includes('ฟิสิกส์') && !q.subject.includes('ชีว')) return false;
        if (selectedBankCategory === 'math' && !q.subject.includes('คณิต') && !q.subject.includes('Math') && !q.subject.includes('ตรรก')) return false;
        if (selectedBankCategory === 'english' && !q.subject.includes('อังกฤษ') && !q.subject.includes('English') && !q.subject.includes('Idiom')) return false;
        if (selectedBankCategory === 'thai_social' && !q.subject.includes('ไทย') && !q.subject.includes('สังคม') && !q.subject.includes('ประวัติ') && !q.subject.includes('ภูมิศาสตร์')) return false;
        if (selectedBankCategory === 'general' && !q.subject.includes('ทั่วไป') && !q.subject.includes('ทักษะ') && !q.subject.includes('ปฐมพยาบาล') && !q.subject.includes('การเงิน')) return false;
      }
      // 2. Grade Level Filter
      if (selectedGradeFilter !== 'all') {
        if (selectedGradeFilter === 'primary' && !q.gradeLevel.includes('ประถม') && !q.gradeLevel.includes('ป.')) return false;
        if (selectedGradeFilter === 'm13' && !q.gradeLevel.includes('ม.1') && !q.gradeLevel.includes('ม.2') && !q.gradeLevel.includes('ม.3') && !q.gradeLevel.includes('ม.ต้น')) return false;
        if (selectedGradeFilter === 'm46' && !q.gradeLevel.includes('ม.4') && !q.gradeLevel.includes('ม.5') && !q.gradeLevel.includes('ม.6') && !q.gradeLevel.includes('ม.ปลาย')) return false;
      }
      return true;
    });

    return filtered.length > 0 ? filtered : allAvailableQuestions;
  }, [allAvailableQuestions, selectedBankCategory, selectedGradeFilter]);

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

    // 7. Safe Zone Storm Boundary (EduArena Energy Barrier)
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

      // Sky Beacon Light Beam (EduArena Beacon Light Pillar)
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

      // Keyboard & Translucent Virtual D-Pad
      if (keysRef.current['KeyW'] || keysRef.current['ArrowUp'] || dpadRef.current.up) moveForward += 1;
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown'] || dpadRef.current.down) moveForward -= 1;
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft'] || dpadRef.current.left) moveTurn += 1;
      if (keysRef.current['KeyD'] || keysRef.current['ArrowRight'] || dpadRef.current.right) moveTurn -= 1;

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
      {/* ======================================================== */}
      {/* 1. PRE-GAME MATCH SETUP & LOBBY SCREEN (โหมดเลือกล่วงหน้า) */}
      {/* ======================================================== */}
      {gamePhase === 'lobby' && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col overflow-y-auto p-4 sm:p-6 text-white animate-in fade-in">
          {/* Lobby Top Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                <Gamepad2 className="w-6 h-6 fill-slate-950 text-slate-950" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>EduBattle 3D • ตั้งค่าการแข่งขันก่อนเข้าเล่น</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                    PRE-MATCH LOBBY
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  เลือกหมวดข้อสอบ เลือกระดับชั้น และเลือกโหมดเล่นเดี่ยว / ชวนเพื่อน / ครูสร้างห้องแข่งขัน
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700 flex items-center gap-1.5"
            >
              <span>✕ ออกสู่ระบบ</span>
            </button>
          </div>

          {/* Lobby Configuration Grid */}
          <div className="flex-1 py-5 space-y-6 max-w-4xl mx-auto w-full">
            {/* STEP 1: SELECT EXAM CATEGORY & GRADE LEVEL */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                  <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-mono font-black border border-amber-400/30">1</span>
                  <span>เลือกหมวดคลังข้อสอบ (Select Question Bank)</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  พร้อมใช้งาน {arenaQuestions.length} ข้อสอบ
                </span>
              </div>

              {/* Category Pills/Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {EXAM_CATEGORIES.map((cat) => {
                  const isSelected = selectedBankCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        battleAudio.playClick();
                        setSelectedBankCategory(cat.id);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-br from-amber-500/25 to-yellow-500/10 border-amber-400 text-white shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/50'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{cat.icon}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div>
                        <p className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {cat.labelTh}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{cat.descriptionTh}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Grade Level Selector */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-400 block mb-1.5">เลือกระดับชั้นการศึกษา:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EXAM_GRADE_LEVELS.map((g) => {
                    const isSelected = selectedGradeFilter === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          battleAudio.playClick();
                          setSelectedGradeFilter(g.id);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {g.labelTh}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STEP 2: SELECT GAME MODE (เดี่ยว / ชวนเพื่อน / ครูสร้างห้อง) */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                <span className="w-6 h-6 rounded-lg bg-cyan-400/20 text-cyan-300 flex items-center justify-center text-xs font-mono font-black border border-cyan-400/30">2</span>
                <span>เลือกโหมดการเล่น (Select Game Mode)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Mode 1: Solo */}
                <button
                  type="button"
                  onClick={() => {
                    battleAudio.playClick();
                    setPlayMode('solo');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    playMode === 'solo'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      <User className="w-5 h-5" />
                    </span>
                    {playMode === 'solo' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-black">เลือกแล้ว</span>}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">1. เล่นคนเดียว (Solo Challenge)</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      วิ่งสำรวจล่าหีบสมบัติ 8 จุดในด่าน 3D ท้าทายจับเวลา ทำลายสถิติคะแนนส่วนตัว
                    </p>
                  </div>
                </button>

                {/* Mode 2: Friends */}
                <button
                  type="button"
                  onClick={() => {
                    battleAudio.playClick();
                    setPlayMode('friend');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    playMode === 'friend'
                      ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Users className="w-5 h-5" />
                    </span>
                    {playMode === 'friend' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-400 text-white font-black">เลือกแล้ว</span>}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">2. ชวนเพื่อนเล่น (Friend Lobby)</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      เข้าร่วมด้วยรหัสห้อง หรือแชร์รหัสห้องให้เพื่อนในกลุ่มเพื่อร่วมแข่งขัน
                    </p>
                  </div>
                </button>

                {/* Mode 3: Teacher Room */}
                <button
                  type="button"
                  onClick={() => {
                    battleAudio.playClick();
                    setPlayMode('teacher_room');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    playMode === 'teacher_room'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Trophy className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black animate-pulse">
                      ครูแนะนำ
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">3. ครูสร้างห้องพิเศษกิจกรรมแข่งขัน</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      จัดกิจกรรมแข่งขันในคาบเรียน สุ่มรหัส PIN พร้อม Live Leaderboard ฉายขึ้นจอ
                    </p>
                  </div>
                </button>
              </div>

              {/* Mode Sub-configuration Panel */}
              {playMode === 'friend' && (
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
                  <label className="text-xs font-bold text-indigo-300 block">รหัสห้องแข่งขัน (Room Code / PIN):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={friendRoomInput}
                      onChange={(e) => setFriendRoomInput(e.target.value.toUpperCase())}
                      placeholder="เช่น EDU-8821"
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-900 border border-indigo-500/40 text-white uppercase focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => setFriendRoomInput(`ROOM-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                    >
                      สุ่มรหัส
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    💡 แชร์รหัสห้องนี้ให้นักเรียนหรือเพื่อนในห้องเพื่อเข้าแข่งขันในแมตช์เดียวกัน
                  </p>
                </div>
              )}

              {playMode === 'teacher_room' && (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">⚙️ ตั้งค่าห้องกิจกรรมการแข่งขันของครู:</span>
                    <span className="font-mono text-xs text-amber-400 font-bold">PIN: {teacherRoomPin}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">ชื่อกิจกรรมการแข่งขัน *</label>
                      <input
                        type="text"
                        value={teacherActivityName}
                        onChange={(e) => setTeacherActivityName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white font-bold"
                        placeholder="เช่น ศึกประลองปัญหาวิทยาศาสตร์ ม.4 คาบ 2"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">รหัส PIN สำหรับนักเรียนเข้าร่วม</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={teacherRoomPin}
                          onChange={(e) => setTeacherRoomPin(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 font-mono text-amber-300 font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setTeacherRoomPin(String(Math.floor(100000 + Math.random() * 900000)))}
                          className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                        >
                          สุ่ม PIN
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">จำนวนข้อสอบ / หีบสมบัติในด่าน</label>
                      <select
                        value={teacherChestCount}
                        onChange={(e) => setTeacherChestCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white font-semibold"
                      >
                        <option value={5}>5 ข้อ (แบบด่วน 5 นาที)</option>
                        <option value={8}>8 ข้อ (มาตรฐานสนามประลอง EduArena)</option>
                        <option value={10}>10 ข้อ (การประลองเข้มข้น)</option>
                        <option value={15}>15 ข้อ (ทัวร์นาเมนต์เต็มรูปแบบ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">เวลาในการตอบคำถามต่อข้อ</label>
                      <select
                        value={teacherTimePerQuestion}
                        onChange={(e) => setTeacherTimePerQuestion(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white font-semibold"
                      >
                        <option value={15}>15 วินาที (สายสปีดด่วน)</option>
                        <option value={20}>20 วินาที (มาตรฐาน)</option>
                        <option value={30}>30 วินาที (โจทย์คำนวณ/อ่านยาว)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: CHARACTER SKIN SELECTION */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                  <span className="w-6 h-6 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center text-xs font-mono font-black border border-emerald-400/30">3</span>
                  <span>เลือกสกินตัวละคร (Select Character Skin)</span>
                </div>
                <span className="text-xs text-slate-400">
                  สกินที่เลือก: {SKINS.find(s => s.id === selectedSkinId)?.nameTh.split(' ')[0]}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {SKINS.map((skin) => {
                  const isSelected = selectedSkinId === skin.id;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => {
                        battleAudio.playClick();
                        setSelectedSkinId(skin.id);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl ${skin.previewColor} flex items-center justify-center text-white font-bold text-xs shadow shrink-0`}>
                        ★
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {skin.nameTh.split(' ')[0]}
                        </p>
                        <span className="text-[10px] text-emerald-400 font-mono block">
                          สปีด x{skin.speedMultiplier}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LAUNCH BUTTON */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                🎮 โหมดที่พร้อมเล่น: <strong className="text-white">{playMode === 'solo' ? 'เล่นเดี่ยว' : playMode === 'friend' ? `ห้องเพื่อน (${friendRoomInput})` : `ห้องครู (${teacherActivityName})`}</strong> • ข้อสอบ <strong className="text-amber-400">{EXAM_CATEGORIES.find(c => c.id === selectedBankCategory)?.labelTh}</strong>
              </div>

              <button
                type="button"
                onClick={handleStartBattleMatch}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-2xl shadow-amber-500/40 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer border-2 border-yellow-200"
              >
                <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
                <span>เริ่มเข้าสู่การแข่งขัน (Start Battle)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MINIMALIST MOBILE-FIRST FLOATING TOP BAR (เมื่อเล่นเกม) */}
      {/* ======================================================== */}
      {gamePhase === 'playing' && (
        <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-none gap-2">
          {/* Left: Mini Player Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 shadow-xl pointer-events-auto">
            <span className="text-rose-400 font-bold flex items-center gap-1 text-xs">
              ❤️ <span className="font-mono">{Math.round(playerHp)}</span>
            </span>
            <div className="w-12 sm:w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${playerHp > 50 ? 'bg-emerald-500' : playerHp > 20 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`}
                style={{ width: `${playerHp}%` }}
              />
            </div>
            <span className="text-amber-300 font-extrabold font-mono text-xs pl-1 border-l border-slate-700">
              🏆 {totalExp}
            </span>
            {playerStreak > 0 && (
              <span className="text-amber-400 font-bold font-mono text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-400/40 hidden sm:inline">
                🔥 {playerStreak}x
              </span>
            )}
          </div>

          {/* Center: Minimal Objective Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 shadow-xl text-xs font-mono pointer-events-auto">
            <span className="text-cyan-300 font-bold flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>{openedChestsCount}/{totalChests}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{timerSeconds}s</span>
            </span>
          </div>

          {/* Right: Sound, Fullscreen, and Prominent MENU Toggle */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (nextMuted) battleAudio.stopAmbientMusic();
                else {
                  battleAudio.playClick();
                  battleAudio.startAmbientMusic();
                }
              }}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 border border-slate-700/80 shadow-xl cursor-pointer"
              title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 border border-slate-700/80 shadow-xl cursor-pointer"
              title={isFullscreen ? 'ย่อหน้าต่าง' : 'เต็มหน้าจอ'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* MENU BUTTON (On-Demand Drawer) */}
            <button
              type="button"
              onClick={() => {
                battleAudio.playClick();
                setShowGameMenuDrawer(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer border border-yellow-200"
            >
              <Menu className="w-4 h-4" />
              <span>เมนูเกม</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. 3D WEBGL VIEWPORT (FULLSCREEN IMMERSIVE) */}
      {/* ======================================================== */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Three.js canvas container */}
        <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Storm Warning Red Vignette when outside safe zone */}
        {isOutsideStorm && (
          <div className="absolute inset-0 z-10 pointer-events-none border-8 border-rose-600/70 bg-rose-950/20 animate-pulse flex items-center justify-center">
            <div className="px-4 py-2 bg-rose-600 text-white font-black text-sm rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
              <AlertTriangle className="w-5 h-5 text-yellow-300" />
              <span>⚠️ คุณอยู่นอกวงพายุหมอก Safe Zone! รีบวิ่งเข้าสู่ Safe Zone</span>
            </div>
          </div>
        )}

        {/* HUD Alert Banner */}
        {hudAlert && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-2 bg-slate-900/90 border border-amber-500/50 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{hudAlert}</span>
          </div>
        )}

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
              <span>{nearAirdrop ? '[แตะ] เปิดแอร์ดรอปพิเศษ (2x EXP)' : '[แตะ] เปิดหีบสมบัติความรู้'}</span>
            </button>
            <div className="mt-2 text-xs text-amber-200 font-semibold drop-shadow-md">
              (หรือกดปุ่ม [E] บนคีย์บอร์ด)
            </div>
          </div>
        )}

        {/* Mobile Left Touch Area (Translucent Virtual Floating Joystick) */}
        <div 
          className="absolute inset-y-0 left-0 w-1/2 z-20 pointer-events-auto"
          onTouchStart={handleTouchStartLeft}
          onTouchMove={handleTouchMoveLeft}
          onTouchEnd={handleTouchEndLeft}
        >
          {touchJoystickRef.current.active && (
            <div 
              className="absolute w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35 bg-white/10 backdrop-blur-md pointer-events-none flex items-center justify-center shadow-2xl"
              style={{
                left: touchJoystickRef.current.startX,
                top: touchJoystickRef.current.startY
              }}
            >
              <div 
                className="w-12 h-12 rounded-full bg-white/60 border border-white/80 shadow-lg pointer-events-none"
                style={{
                  transform: `translate(${touchJoystickRef.current.deltaX * 35}px, ${touchJoystickRef.current.deltaY * 35}px)`
                }}
              />
            </div>
          )}
        </div>

        {/* Mobile Left: Optional Translucent D-Pad */}
        {useVirtualDpad && (
          <div className="md:hidden absolute bottom-6 left-3 z-30 flex flex-col items-center gap-1 select-none pointer-events-auto opacity-75 hover:opacity-100 transition-opacity">
            {/* D-Pad Up */}
            <button
              type="button"
              onTouchStart={(e) => { e.preventDefault(); battleAudio.playClick(); dpadRef.current.up = true; }}
              onTouchEnd={(e) => { e.preventDefault(); dpadRef.current.up = false; }}
              onMouseDown={() => { battleAudio.playClick(); dpadRef.current.up = true; }}
              onMouseUp={() => { dpadRef.current.up = false; }}
              className="w-11 h-11 rounded-2xl bg-white/15 active:bg-white/40 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform font-bold text-sm"
              aria-label="เดินหน้า"
            >
              ▲
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onTouchStart={(e) => { e.preventDefault(); battleAudio.playClick(); dpadRef.current.left = true; }}
                onTouchEnd={(e) => { e.preventDefault(); dpadRef.current.left = false; }}
                onMouseDown={() => { battleAudio.playClick(); dpadRef.current.left = true; }}
                onMouseUp={() => { dpadRef.current.left = false; }}
                className="w-11 h-11 rounded-2xl bg-white/15 active:bg-white/40 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform font-bold text-sm"
                aria-label="เลี้ยวซ้าย"
              >
                ◀
              </button>
              <button
                type="button"
                onTouchStart={(e) => { e.preventDefault(); battleAudio.playClick(); dpadRef.current.down = true; }}
                onTouchEnd={(e) => { e.preventDefault(); dpadRef.current.down = false; }}
                onMouseDown={() => { battleAudio.playClick(); dpadRef.current.down = true; }}
                onMouseUp={() => { dpadRef.current.down = false; }}
                className="w-11 h-11 rounded-2xl bg-white/15 active:bg-white/40 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform font-bold text-sm"
                aria-label="ถอยหลัง"
              >
                ▼
              </button>
              <button
                type="button"
                onTouchStart={(e) => { e.preventDefault(); battleAudio.playClick(); dpadRef.current.right = true; }}
                onTouchEnd={(e) => { e.preventDefault(); dpadRef.current.right = false; }}
                onMouseDown={() => { battleAudio.playClick(); dpadRef.current.right = true; }}
                onMouseUp={() => { dpadRef.current.right = false; }}
                className="w-11 h-11 rounded-2xl bg-white/15 active:bg-white/40 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform font-bold text-sm"
                aria-label="เลี้ยวขวา"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {/* Mobile Right Action Controls Cluster (Translucent Minimal Buttons) */}
        <div className="absolute bottom-6 right-3 z-30 flex flex-col items-end gap-2 pointer-events-auto">
          {/* Quick Action: Open Chest / Airdrop */}
          {(nearChestId || nearAirdrop) && (
            <button
              type="button"
              onClick={() => {
                battleAudio.playClick();
                triggerInteraction();
              }}
              className="w-16 h-16 rounded-2xl bg-amber-400/35 active:bg-amber-400/60 backdrop-blur-md text-amber-200 font-black text-xs shadow-xl shadow-amber-500/30 flex flex-col items-center justify-center border-2 border-amber-300 active:scale-90 transition-all cursor-pointer animate-pulse"
            >
              <Package className="w-6 h-6 mb-0.5 text-amber-300" />
              <span>เปิดหีบ</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {/* Sprint / Turbo Nitro Button */}
            <button
              type="button"
              onClick={() => {
                battleAudio.playClick();
                handleUseNitro();
              }}
              className={`w-13 h-13 rounded-2xl border flex flex-col items-center justify-center active:scale-90 transition-all backdrop-blur-md cursor-pointer ${
                activeBooster.nitro 
                  ? 'bg-amber-400/40 text-amber-200 border-amber-300 shadow-lg shadow-amber-500/40 font-bold animate-pulse' 
                  : 'bg-white/15 hover:bg-white/25 active:bg-white/35 text-amber-200 border-white/25 shadow-lg'
              }`}
              title="ไนโตร วิ่งเร็ว"
            >
              <Wind className="w-5 h-5 mb-0.5 text-amber-300" />
              <span className="text-[9px] font-bold">ไนโตร</span>
            </button>

            {/* Jump Button */}
            <button
              type="button"
              onClick={() => {
                battleAudio.playClick();
                mobileActionsRef.current.jump = true;
              }}
              className="w-13 h-13 rounded-2xl bg-white/15 hover:bg-white/25 active:bg-white/35 text-white border border-white/30 shadow-lg flex flex-col items-center justify-center active:scale-90 transition-all backdrop-blur-md cursor-pointer"
              title="กระโดด"
            >
              <Zap className="w-5 h-5 mb-0.5 text-cyan-300" />
              <span className="text-[9px] font-bold">กระโดด</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. COLLAPSIBLE ON-DEMAND HUD MENU DRAWER (เลือกเมนูแทนการแสดงตลอดเวลา) */}
      {/* ======================================================== */}
      {showGameMenuDrawer && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 text-white">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Menu className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white">เมนูการแข่งขัน & สถิติสด</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGameMenuDrawer(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Subtabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-1 overflow-x-auto no-scrollbar text-xs font-bold">
              <button
                type="button"
                onClick={() => setDrawerTab('leaderboard')}
                className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  drawerTab === 'leaderboard' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>อันดับสด</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('storm_map')}
                className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  drawerTab === 'storm_map' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>แผนที่พายุ</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('boosters')}
                className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  drawerTab === 'boosters' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>ไอเทม</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('skins')}
                className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  drawerTab === 'skins' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>สกิน</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('settings')}
                className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  drawerTab === 'settings' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>ออก/ตั้งค่า</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              {/* TAB 1: LEADERBOARD */}
              {drawerTab === 'leaderboard' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-300 font-bold block uppercase">รหัสห้องแข่งขัน</span>
                      <strong className="text-sm font-mono text-white">{roomCode}</strong>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black">
                      {gameMode === 'solo' ? 'เดี่ยว' : 'แข่งทั้งห้อง'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-300">ตารางคะแนนสดในห้องเรียน (Real-time Leaderboard)</h4>
                  <div className="space-y-1.5">
                    {/* Player Row */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center text-amber-300 font-mono">#1</span>
                        <img 
                          src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                          alt="avatar" 
                          className="w-7 h-7 rounded-lg object-cover border border-amber-400"
                        />
                        <span>คุณ ({currentUser?.fullNameTh?.split(' ')[0] || 'Player'})</span>
                      </div>
                      <span className="font-mono text-amber-300">{totalExp} XP</span>
                    </div>

                    {/* Classmate Rows */}
                    {classmates.map((cm, idx) => (
                      <div key={cm.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center text-slate-500 font-mono">#{idx + 2}</span>
                          <img src={cm.avatarUrl} alt={cm.name} className="w-6 h-6 rounded-lg object-cover" />
                          <span className="truncate">{cm.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-200">{cm.score}</span>
                          <span className="text-[10px] text-slate-400 block">{cm.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Live Feed */}
                  <div className="pt-2">
                    <h5 className="font-bold text-slate-400 text-[11px] mb-1.5">บันทึกเหตุการณ์สด (Live Events):</h5>
                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                      {liveBattleEvents.map(ev => (
                        <div key={ev.id} className="flex items-start gap-1.5">
                          <span className="text-slate-500 font-mono shrink-0">[{ev.time}]</span>
                          <span>{ev.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STORM MAP */}
              {drawerTab === 'storm_map' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-rose-300 font-bold block">รัศมีวงพายุ Safe Zone</span>
                      <strong className="text-sm font-mono text-white">{Math.round(stormRadius)} เมตร</strong>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-xl bg-rose-600 text-white font-bold">
                      {isOutsideStorm ? '⚠️ นอกวง' : '✓ ปลอดภัย'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-cyan-300 font-bold block">ระยะหีบสมบัติที่ใกล้ที่สุด</span>
                      <strong className="text-sm font-mono text-white">{nearestChestDist} เมตร</strong>
                    </div>
                    <span className="text-xs font-mono text-cyan-300 font-bold">
                      เปิดแล้ว {openedChestsCount}/{totalChests}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-slate-400 mb-2">เรดาร์สแกนแผนที่ 3D</span>
                    <div className="relative w-44 h-44 rounded-full border-2 border-emerald-500/40 bg-emerald-950/40 flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:12px_12px]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white shadow-lg z-10" />
                      {chestsRef.current.map((c, i) => {
                        if (c.opened) return null;
                        return (
                          <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-yellow-400 border border-amber-600 shadow"
                            style={{ transform: `translate(${(c.x / 140) * 70}px, ${(c.z / 140) * 70}px)` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BOOSTERS & ITEMS */}
              {drawerTab === 'boosters' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wind className="w-5 h-5 text-amber-400" />
                        <div>
                          <h5 className="font-bold text-white">ไนโตรสปีดเรซเซอร์ (Nitro Boost)</h5>
                          <p className="text-[11px] text-slate-400">วิ่งเร็วขึ้น 1.8x เป็นเวลา 8 วินาที</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleUseNitro();
                          setShowGameMenuDrawer(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        กดใช้ทันที
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h5 className="font-bold text-white">กับดักแช่แข็ง (Freeze Trap)</h5>
                          <p className="text-[11px] text-slate-400">แช่แข็งคู่แข่งรอบตัวเป็นเวลา 3 วินาที</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={freezeCooldown > 0}
                        onClick={() => {
                          handleUseFreezeTrap();
                          setShowGameMenuDrawer(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                          freezeCooldown === 0 ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {freezeCooldown > 0 ? `${freezeCooldown}s` : 'กดแช่แข็ง'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h5 className="font-bold text-white">เกราะป้องกันพายุสนามประลอง</h5>
                        <p className="text-[11px] text-emerald-300">ทำงานอัตโนมัติเมื่ออยู่นอก Safe Zone</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SKINS */}
              {drawerTab === 'skins' && (
                <div className="space-y-2.5">
                  <h4 className="font-bold text-slate-300">เปลี่ยนสกินตัวละครแบบเรียลไทม์:</h4>
                  <div className="space-y-2">
                    {SKINS.map((skin) => {
                      const isSelected = selectedSkinId === skin.id;
                      return (
                        <button
                          key={skin.id}
                          type="button"
                          onClick={() => {
                            battleAudio.playClick();
                            setSelectedSkinId(skin.id);
                          }}
                          className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-400 text-white'
                              : 'bg-slate-800/60 border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl ${skin.previewColor} flex items-center justify-center text-white font-bold text-xs`}>
                              ★
                            </div>
                            <div>
                              <p className="font-bold">{skin.nameTh}</p>
                              <span className="text-[10px] text-emerald-400 font-mono">ความเร็ว x{skin.speedMultiplier}</span>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: SETTINGS & EXIT */}
              {drawerTab === 'settings' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span>เสียงประกอบ & ดนตรีผจญภัย</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isMuted;
                        setIsMuted(next);
                        if (next) battleAudio.stopAmbientMusic();
                        else battleAudio.startAmbientMusic();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
                    >
                      {isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span>โหมดแสดงปุ่ม D-Pad เสมือนจริง</span>
                    <button
                      type="button"
                      onClick={() => setUseVirtualDpad(!useVirtualDpad)}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
                    >
                      {useVirtualDpad ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </button>
                  </div>

                  <div className="pt-3 space-y-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        battleAudio.playClick();
                        setGamePhase('lobby');
                        setShowGameMenuDrawer(false);
                      }}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>กลับสู่หน้าล็อบบี้ (เลือกหมวดข้อสอบใหม่)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        battleAudio.playClick();
                        setShowGameMenuDrawer(false);
                        onExit();
                      }}
                      className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ออกจากเกมสู่ระบบโรงเรียน</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGameMenuDrawer(false)}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                กลับสู่หน้าจอการเล่นเกม (Resume Fullscreen)
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {isAirdropQuestion ? '📦 โบนัสแอร์ดรอปทองคำ (2x EXP)' : activeQuestion.subject}
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
      {/* 5. QUESTION BANK & EXAM SELECTOR MODAL (Multi-Subject Question Banks) */}
      {/* ======================================================== */}
      {showBankModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl text-white my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">เลือกคลังข้อสอบ & การทดสอบ</h3>
                  <p className="text-xs text-slate-400">เลือกข้อสอบที่ต้องการใช้เปิดหีบสมบัติในเกม (เลือกได้ทุกกลุ่มสาระการเรียนรู้)</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowBankModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* 1. Grade Level Filter Tabs */}
            <div className="mt-4">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">เลือกระดับชั้นการศึกษา:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXAM_GRADE_LEVELS.map((g) => {
                  const isActive = selectedGradeFilter === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        battleAudio.playClick();
                        setSelectedGradeFilter(g.id);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {g.labelTh}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Exam Category Grid */}
            <div className="mt-5">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">เลือกหมวดหมู่ข้อสอบ & รายวิชา:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {EXAM_CATEGORIES.map((cat) => {
                  const isActive = selectedBankCategory === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => {
                        battleAudio.playClick();
                        setSelectedBankCategory(cat.id);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-slate-800/60 border-slate-800 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{cat.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs sm:text-sm text-white truncate">{cat.labelTh}</span>
                          {isActive && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{cat.descriptionTh}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions available count badge */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-300">
                พร้อมใช้งาน: <strong className="text-amber-400 font-mono text-sm">{arenaQuestions.length}</strong> ข้อสอบ
              </span>
              <span className="text-slate-400 text-[11px]">
                สุ่มบรรจุลงหีบสมบัติ 8 จุดในด่าน 3D
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  battleAudio.playClick();
                  setShowBankModal(false);
                  // Refresh chests with new active questions
                  chestsRef.current.forEach((c, idx) => {
                    c.question = arenaQuestions[idx % arenaQuestions.length];
                  });
                  setHudAlert(`✅ เปลี่ยนข้อสอบเป็น: ${EXAM_CATEGORIES.find(c => c.id === selectedBankCategory)?.labelTh} สำเร็จ!`);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                ยืนยันและนำมาใช้เล่นล่าสมบัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. VICTORY SCREEN (ล่าสมบัติ 3D) */}
      {/* ======================================================== */}
      {gameWon && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-6 text-center shadow-2xl shadow-amber-500/30">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>
            <h1 className="mt-4 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 uppercase tracking-wider">
              ภารกิจล่าสมบัติสำเร็จ!
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              🏆 คุณพิชิตการผจญภัยล่าสมบัติและตอบคำถามครบทุกหีบในเกาะสำเร็จ!
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
                type="button"
                onClick={() => {
                  battleAudio.playClick();
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
                type="button"
                onClick={() => {
                  battleAudio.playClick();
                  onExit();
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm text-slate-300 border border-slate-700 cursor-pointer"
              >
                ออกสู่ระบบโรงเรียน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. CHARACTER SKINS & LOCKER */}
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
                    onClick={() => {
                      battleAudio.playClick();
                      setSelectedSkinId(skin.id);
                    }}
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
      {/* 8. HOW TO PLAY MODAL */}
      {/* ======================================================== */}
      {showHowToPlay && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                คู่มือการเล่นเกมล่าสมบัติ 3D
              </h3>
              <button onClick={() => setShowHowToPlay(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>📱 เล่นบนมือถือ:</strong> แตะปุ่ม D-Pad โปร่งแสง หรือลากหน้าจอฝั่งซ้ายเพื่อเดิน และแตะปุ่มโปร่งแสงฝั่งขวาเพื่อกระโดดหรือกดเปิดหีบ
              </p>
              <p>
                <strong>💻 เล่นบนคอมพิวเตอร์:</strong> ใช้ปุ่ม <code>W, A, S, D</code> เพื่อเคลื่อนที่, คลิกและลากเมาส์เพื่อหมุนมุมมองกล้อง, <code>Shift</code> วิ่งเร็ว, <code>Space</code> กระโดด, <code>E</code> เปิดหีบ
              </p>
              <p>
                <strong>📦 เสาแสง & แอร์ดรอป:</strong> วิ่งเข้าหาเสาแสงสีทองเพื่อเปิดหีบข้อสอบ และแย่งกล่องแอร์ดรอปสีแดงเพื่อรับคะแนนโบนัส 2 เท่า!
              </p>
            </div>
            <button
              type="button"
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
