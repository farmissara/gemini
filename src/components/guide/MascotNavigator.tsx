import React, { useMemo, useState } from 'react';
import {
  Award,
  BellRing,
  BookOpen,
  Calendar,
  Compass,
  EyeOff,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Play,
  Power,
  QrCode,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { AppLanguage, UserRole } from '../../types';
import { MascotMood } from '../../data/interactiveGuideTopics';

const GUIDED_TOUR_MODULE_IDS = new Set([
  'dashboard',
  'system_settings',
  'students',
  'teachers',
  'courses',
  'timetable',
  'attendance',
  'mobile_checkin',
  'gradebook',
  'homework',
  'lms_classroom',
  'portfolio',
  'behavior_sdq',
  'infirmary',
  'announcements',
  'parent_portal',
]);

export type MascotBuddyMode = 'duo' | 'chaco' | 'mee';

interface DogAvatarProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
}

/**
 * ชาโค (Chaco): หมาดำ ตัวอ้วนมาก เขี้ยวข้างซ้ายเหยิน ฟันขาวมาก
 */
export const ChacoAvatar: React.FC<DogAvatarProps> = ({
  mood = 'happy',
  size = 52,
  className = '',
}) => {
  const isWinking = mood === 'celebrate' || mood === 'success';
  const isThinking = mood === 'thinking';
  const isPointing = mood === 'pointing';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ชาโค"
      className={`transition-transform duration-300 ${className}`}
    >
      {/* Ground shadow */}
      <ellipse cx="36" cy="63" rx="22" ry="3.5" fill="#0f172a" fillOpacity="0.16" />

      {/* Wagging black tail */}
      <path
        d="M55 47C62 44 65 37 61 33"
        stroke="#18181b"
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Extra chubby, round black dog body */}
      <ellipse cx="36" cy="43" rx="23.5" ry="18.5" fill="#18181b" stroke="#09090b" strokeWidth="1.6" />
      {/* Subtle glossy fur highlight */}
      <path
        d="M21 31C25 27 32 26 37 27"
        stroke="#3f3f46"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Floppy chubby black ears */}
      <ellipse cx="14.5" cy="24" rx="5.5" ry="9.5" transform="rotate(18 14.5 24)" fill="#111827" stroke="#09090b" strokeWidth="1.5" />
      <ellipse cx="57.5" cy="24" rx="5.5" ry="9.5" transform="rotate(-18 57.5 24)" fill="#111827" stroke="#09090b" strokeWidth="1.5" />

      {/* Round chubby head */}
      <ellipse cx="36" cy="26.5" rx="20.5" ry="17" fill="#1f2937" stroke="#09090b" strokeWidth="1.6" />

      {/* Cute little collar */}
      <path d="M21 39.5C27 42.5 45 42.5 51 39.5" stroke="#ef4444" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="36" cy="42.5" r="2.6" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />

      {/* Chubby front paws */}
      <ellipse cx="25.5" cy="58" rx="6" ry="4.5" fill="#18181b" stroke="#09090b" strokeWidth="1.4" />
      <ellipse cx="46.5" cy="58" rx="6" ry="4.5" fill="#18181b" stroke="#09090b" strokeWidth="1.4" />
      {isPointing && (
        <path
          d="M14 45C8 42 7 37 11 35C14 33.5 17 37 17 42Z"
          fill="#18181b"
          stroke="#09090b"
          strokeWidth="1.4"
        />
      )}

      {/* Expressive eyes */}
      {isWinking ? (
        <>
          <path d="M24 22.5C25.5 20 29.5 20 31 22.5" stroke="#f8fafc" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M41 22.5C42.5 20 46.5 20 48 22.5" stroke="#f8fafc" strokeWidth="2.3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="27.5" cy="22.5" r="4" fill="#ffffff" />
          <circle cx="44.5" cy="22.5" r="4" fill="#ffffff" />
          <circle cx={isThinking ? '28.5' : '27.8'} cy={isThinking ? '21.5' : '22.6'} r="2.3" fill="#09090b" />
          <circle cx={isThinking ? '45.5' : '44.8'} cy={isThinking ? '21.5' : '22.6'} r="2.3" fill="#09090b" />
          <circle cx="28.6" cy="21.6" r="0.9" fill="#ffffff" />
          <circle cx="45.6" cy="21.6" r="0.9" fill="#ffffff" />
        </>
      )}

      {/* Rosy cheeks */}
      <ellipse cx="20.5" cy="28" rx="2.7" ry="1.6" fill="#fb7185" fillOpacity="0.65" />
      <ellipse cx="51.5" cy="28" rx="2.7" ry="1.6" fill="#fb7185" fillOpacity="0.65" />

      {/* Plump muzzle */}
      <ellipse cx="36" cy="30.5" rx="11.5" ry="7.2" fill="#27272a" stroke="#09090b" strokeWidth="1.2" />
      {/* Shiny black nose */}
      <ellipse cx="36" cy="26.8" rx="4.2" ry="2.7" fill="#030712" />
      <ellipse cx="34.8" cy="26.1" rx="1.2" ry="0.6" fill="#6b7280" />

      {/* Wide toothy smile (ฟันขาวมาก) */}
      <path
        d="M25.5 32.2C29.5 36.2 42.5 36.2 46.5 32.2"
        stroke="#09090b"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="#be123c"
      />
      {/* Bright pure-white teeth row */}
      <rect x="29" y="32.1" width="14" height="3.2" rx="1.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
      <line x1="33.5" y1="32.2" x2="33.5" y2="35.1" stroke="#cbd5e1" strokeWidth="0.7" />
      <line x1="38.5" y1="32.2" x2="38.5" y2="35.1" stroke="#cbd5e1" strokeWidth="0.7" />

      {/* Prominent crooked bright-white LEFT canine fang (เขี้ยวข้างซ้ายเหยิน) */}
      <path
        d="M42.2 35.5L46.8 25.2L49.4 33.4Z"
        fill="#ffffff"
        stroke="#09090b"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Gleaming sparkle on the bright white fang */}
      <path d="M51 22L51.9 24.1L54 25L51.9 25.9L51 28L50.1 25.9L48 25L50.1 24.1Z" fill="#ffffff" stroke="#38bdf8" strokeWidth="0.5" />
    </svg>
  );
};

/**
 * หมี (Mee): หมาดำสี่ตา (มีจุดสีน้ำตาลตรงคิ้ว) อกขาว ข้อเท้าสีน้ำตาลทั้งสี่ขา ตัวยาวเหมือนไส้กรอก
 */
export const MeeAvatar: React.FC<DogAvatarProps> = ({
  mood = 'happy',
  size = 56,
  className = '',
}) => {
  const isWinking = mood === 'celebrate' || mood === 'success';
  const isThinking = mood === 'thinking';
  const isPointing = mood === 'pointing';

  return (
    <svg
      width={Math.round(size * 1.25)}
      height={size}
      viewBox="0 0 92 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="หมี"
      className={`transition-transform duration-300 ${className}`}
    >
      {/* Ground shadow */}
      <ellipse cx="48" cy="63" rx="34" ry="3.5" fill="#0f172a" fillOpacity="0.16" />

      {/* Happy wagging tail at rear right */}
      <path
        d="M78 36C85 31 87 24 83 20"
        stroke="#18181b"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Back-far leg (4th leg visible) with BROWN ankle/paw (ข้อเท้าสีน้ำตาลทั้งสี่ขา) */}
      <rect x="61" y="45" width="6.5" height="12" rx="3.2" fill="#18181b" />
      <rect x="60.5" y="52.5" width="7.2" height="6.5" rx="3.2" fill="#d97706" stroke="#78350f" strokeWidth="1" />

      {/* Front-far leg (2nd leg visible) with BROWN ankle/paw */}
      <rect x="34" y="46" width="6.5" height="12" rx="3.2" fill="#18181b" />
      <rect x="33.5" y="53" width="7.2" height="6.5" rx="3.2" fill="#d97706" stroke="#78350f" strokeWidth="1" />

      {/* Long sausage-shaped dachshund body (ตัวยาวเหมือนไส้กรอก) */}
      <rect x="19" y="29" width="60" height="22" rx="11" fill="#18181b" stroke="#09090b" strokeWidth="1.6" />
      <path d="M35 33H68" stroke="#3f3f46" strokeWidth="2.2" strokeLinecap="round" />

      {/* White chest patch (อกขาว) */}
      <path
        d="M19.5 34C19.5 34 29 34 31 41C32.2 45.2 28.5 50.5 23 50.5C19.5 50.5 19.5 43 19.5 34Z"
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth="0.9"
      />

      {/* Front-near leg (1st leg) with BROWN ankle/paw (ข้อเท้าสีน้ำตาลทั้งสี่ขา) */}
      <rect x="24" y="46" width="7.2" height="12" rx="3.5" fill="#1f2937" stroke="#09090b" strokeWidth="1.1" />
      <rect x="23.5" y="53.5" width="8" height="6.5" rx="3.2" fill="#d97706" stroke="#78350f" strokeWidth="1.1" />
      {isPointing && (
        <path
          d="M17 45L10 41.5"
          stroke="#d97706"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      )}

      {/* Back-near leg (3rd leg) with BROWN ankle/paw */}
      <rect x="69" y="45" width="7.2" height="12" rx="3.5" fill="#1f2937" stroke="#09090b" strokeWidth="1.1" />
      <rect x="68.5" y="53" width="8" height="6.5" rx="3.2" fill="#d97706" stroke="#78350f" strokeWidth="1.1" />

      {/* Dachshund Head */}
      <ellipse cx="23.5" cy="23.5" rx="14.5" ry="13" fill="#1f2937" stroke="#09090b" strokeWidth="1.5" />
      {/* Snout */}
      <ellipse cx="14" cy="26.8" rx="8.5" ry="5.5" fill="#18181b" stroke="#09090b" strokeWidth="1.3" />
      {/* Tan/brown muzzle highlight */}
      <ellipse cx="14" cy="28.5" rx="5.5" ry="2.8" fill="#d97706" fillOpacity="0.85" />
      {/* Cute nose */}
      <ellipse cx="8" cy="24.8" rx="2.8" ry="2.1" fill="#030712" />

      {/* Long floppy dachshund ear */}
      <path
        d="M29 17C35 17 38 25 36 33C34.5 36 29.5 35 28.5 30C27.5 25 26 17 29 17Z"
        fill="#111827"
        stroke="#09090b"
        strokeWidth="1.4"
      />

      {/* Four-eyed tan eyebrow dots (หมาดำสี่ตา คือมีจุดสีน้ำตาลตรงคิ้ว) */}
      <ellipse cx="16.5" cy="15.8" rx="2.6" ry="1.8" transform="rotate(-12 16.5 15.8)" fill="#f59e0b" stroke="#92400e" strokeWidth="0.7" />
      <ellipse cx="24.5" cy="15.8" rx="2.6" ry="1.8" transform="rotate(10 24.5 15.8)" fill="#f59e0b" stroke="#92400e" strokeWidth="0.7" />

      {/* Eyes */}
      {isWinking ? (
        <>
          <path d="M14 21.5C15.2 19.8 18 19.8 19.2 21.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 21.5C23.2 19.8 26 19.8 27.2 21.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="16.6" cy="21" r="3" fill="#ffffff" />
          <circle cx="24.4" cy="21" r="3" fill="#ffffff" />
          <circle cx={isThinking ? '17.3' : '16.5'} cy="21" r="1.7" fill="#09090b" />
          <circle cx={isThinking ? '25.1' : '24.3'} cy="21" r="1.7" fill="#09090b" />
          <circle cx="17.1" cy="20.2" r="0.7" fill="#ffffff" />
          <circle cx="24.9" cy="20.2" r="0.7" fill="#ffffff" />
        </>
      )}

      {/* Happy collar */}
      <path d="M19 32.5C24 34.2 31 33.5 34.5 31" stroke="#0ea5e9" strokeWidth="2.8" strokeLinecap="round" />

      {/* Happy smile */}
      <path d="M11 29.8C13.5 31.6 16.5 31.6 18.5 29.8" stroke="#09090b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

interface MascotAvatarProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
  animated?: boolean;
  character?: MascotBuddyMode;
}

/**
 * Displays either ชาโค, หมี, or both buddies side-by-side.
 */
export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mood = 'happy',
  size = 48,
  className = '',
  animated = true,
  character = 'chaco',
}) => {
  if (character === 'duo') {
    return (
      <span className={`inline-flex items-end -space-x-2 ${animated ? 'transition-transform duration-300' : ''} ${className}`}>
        <ChacoAvatar mood={mood} size={size} />
        <MeeAvatar mood={mood} size={Math.round(size * 0.92)} />
      </span>
    );
  }
  if (character === 'mee') {
    return <MeeAvatar mood={mood} size={size} className={className} />;
  }
  return <ChacoAvatar mood={mood} size={size} className={className} />;
};

interface QuickShortcut {
  id: string;
  labelTh: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_SHORTCUTS: Record<UserRole, QuickShortcut[]> = {
  super_admin: [
    { id: 'dashboard', labelTh: 'ภาพรวมโรงเรียน', labelEn: 'Overview', icon: LayoutDashboard },
    { id: 'timetable', labelTh: 'ตารางสอน', labelEn: 'Timetable', icon: Calendar },
    { id: 'students', labelTh: 'นักเรียน & คะแนน', labelEn: 'Students & Grades', icon: Users },
    { id: 'attendance', labelTh: 'เช็คชื่อ & QR', labelEn: 'Attendance', icon: QrCode },
    { id: 'system_settings', labelTh: 'ตั้งค่าระบบ', labelEn: 'Settings', icon: SlidersHorizontal },
  ],
  admin: [
    { id: 'dashboard', labelTh: 'ภาพรวมโรงเรียน', labelEn: 'Overview', icon: LayoutDashboard },
    { id: 'timetable', labelTh: 'ตารางสอน', labelEn: 'Timetable', icon: Calendar },
    { id: 'students', labelTh: 'นักเรียน & ปพ.', labelEn: 'Students & Grades', icon: Users },
    { id: 'attendance', labelTh: 'เช็คชื่อหน้าประตู', labelEn: 'Attendance', icon: QrCode },
    { id: 'system_settings', labelTh: 'ตั้งค่าระบบ', labelEn: 'Settings', icon: SlidersHorizontal },
  ],
  teacher: [
    { id: 'dashboard', labelTh: 'โต๊ะทำงานครู', labelEn: "Teacher's Desk", icon: LayoutDashboard },
    { id: 'timetable', labelTh: 'ตารางสอนวันนี้', labelEn: 'Timetable', icon: Calendar },
    { id: 'attendance', labelTh: 'เช็คชื่อนักเรียน', labelEn: 'Attendance', icon: QrCode },
    { id: 'students', labelTh: 'กรอกคะแนน & ปพ.', labelEn: 'Grades & Students', icon: Award },
    { id: 'homework', labelTh: 'การบ้าน & งาน', labelEn: 'Homework', icon: FileCheck2 },
  ],
  student: [
    { id: 'dashboard', labelTh: 'หน้าหลัก', labelEn: 'Home', icon: LayoutDashboard },
    { id: 'timetable', labelTh: 'ตารางเรียน', labelEn: 'Timetable', icon: Calendar },
    { id: 'homework', labelTh: 'การบ้านของฉัน', labelEn: 'Homework', icon: FileCheck2 },
    { id: 'gradebook', labelTh: 'ผลการเรียน', labelEn: 'Grades', icon: Award },
    { id: 'announcements', labelTh: 'ประกาศ', labelEn: 'News', icon: BellRing },
  ],
  parent: [
    { id: 'dashboard', labelTh: 'ภาพรวมบุตรหลาน', labelEn: 'Overview', icon: LayoutDashboard },
    { id: 'timetable', labelTh: 'ตารางเรียน', labelEn: 'Timetable', icon: Calendar },
    { id: 'gradebook', labelTh: 'ผลการเรียน', labelEn: 'Grades', icon: Award },
    { id: 'announcements', labelTh: 'ประกาศโรงเรียน', labelEn: 'News', icon: BellRing },
    { id: 'courses', labelTh: 'รายวิชาเรียน', labelEn: 'Courses', icon: BookOpen },
  ],
};

const MODULE_FRIENDLY_TIP: Record<string, { th: string; en: string }> = {
  dashboard: {
    th: 'โฮ่ง! ชาโคกับหมีรวมสรุปงานสำคัญวันนี้ไว้ให้ที่หน้านี้แล้วครับ',
    en: 'Woof! Chaco & Mee gathered your daily overview right here.',
  },
  timetable: {
    th: 'กด "มุมมองแนวนอน" หรือ "พิมพ์แนวนอน (A4)" ได้เลย ชาโคกับหมีจัดให้เต็มหน้า!',
    en: 'Try Wide Landscape or Print Landscape (A4) right from the toolbar!',
  },
  students: {
    th: 'จัดการทะเบียนนักเรียน คะแนนเก็บ และเอกสาร ปพ. ในหน้าเดียวเลยครับ',
    en: 'Manage student records, grades, and official forms in one spot.',
  },
  attendance: {
    th: 'เช็คชื่อด้วย QR, กล้องเร็ว หรือดูสถิติการมาเรียนรายวันได้ที่นี่ครับ',
    en: 'Check attendance via QR, rapid scanner, or daily logs here.',
  },
  homework: {
    th: 'ติดตามภาระงาน สั่งการบ้าน และตรวจให้คะแนนได้รวดเร็วครับ',
    en: 'Track homework, assign tasks, and grade submissions quickly.',
  },
  system_settings: {
    th: 'ตั้งค่า GPS, เวลาตัดสาย และบัญชีนักเรียนได้ครบที่นี่ครับ',
    en: 'Configure GPS gates, cutoff times, and accounts here.',
  },
};

interface FloatingMascotNavigatorProps {
  currentTab: string;
  currentRole: UserRole;
  lang: AppLanguage;
  isGuideEnabled: boolean;
  isTourActive: boolean;
  activeBuddy: MascotBuddyMode;
  onChangeBuddy: (buddy: MascotBuddyMode) => void;
  onToggleGuideEnabled: () => void;
  onStartModuleTour: (moduleId: string) => void;
  onEndTour: () => void;
  onNavigateModule: (moduleId: string) => void;
  onOpenFullGuide?: () => void;
  onHideMascot?: () => void;
}

export const FloatingMascotNavigator: React.FC<FloatingMascotNavigatorProps> = ({
  currentTab,
  currentRole,
  lang,
  isGuideEnabled,
  isTourActive,
  activeBuddy,
  onChangeBuddy,
  onToggleGuideEnabled,
  onStartModuleTour,
  onEndTour,
  onNavigateModule,
  onOpenFullGuide,
  onHideMascot,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);

  const hasTourForPage = GUIDED_TOUR_MODULE_IDS.has(currentTab);
  const shortcuts = useMemo(() => ROLE_SHORTCUTS[currentRole] || ROLE_SHORTCUTS.teacher, [currentRole]);

  // While the detailed step-by-step tour card is open at bottom-right, avoid double floating UI
  if (isTourActive) return null;

  const buddyTitle =
    activeBuddy === 'chaco'
      ? (lang === 'th' ? 'ชาโค (หมาดำอ้วนเขี้ยวขาว)' : 'Chaco')
      : activeBuddy === 'mee'
        ? (lang === 'th' ? 'หมี (ไส้กรอกดำสี่ตา)' : 'Mee')
        : (lang === 'th' ? 'ชาโค & หมี นำทาง' : 'Chaco & Mee Guide');

  const pageTip = MODULE_FRIENDLY_TIP[currentTab]?.[lang] || (
    lang === 'th'
      ? 'โฮ่ง! ชาโคกับหมีพร้อมช่วยนำทางและแนะนำการใช้งานหน้านี้ครับ'
      : 'Woof! Chaco & Mee are ready to guide you!'
  );

  return (
    <div className="fixed bottom-20 right-3 z-[95] print:hidden sm:right-5 md:bottom-5 flex flex-col items-end gap-2">
      {isOpen && (
        <div
          role="dialog"
          aria-label={lang === 'th' ? 'ชาโคและหมี ตัวการ์ตูนนำทางระบบ' : 'Chaco & Mee navigation assistant'}
          className="w-[min(21.5rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden animate-in fade-in duration-150"
        >
          {/* Mascot Header */}
          <div className="flex items-center justify-between gap-2 bg-[var(--color-primary-light)]/80 px-3.5 py-2.5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="px-2 py-1 rounded-xl bg-amber-50 dark:bg-slate-100 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0 shadow-xs">
                <MascotAvatar mood="happy" size={34} character={activeBuddy} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {buddyTitle}
                </p>
                <p className="text-[11px] text-[var(--color-primary-text)] truncate">
                  {lang === 'th' ? 'คู่หูตัวการ์ตูนนำทางระบบ' : 'Interactive dog guide duo'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={lang === 'th' ? 'ปิดหน้าต่างนำทาง' : 'Close mascot navigator'}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card)] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Buddy Switcher: Chaco / Mee / Duo */}
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-1 text-[11px] font-bold">
              {(
                [
                  { id: 'duo', labelTh: 'ชาโค & หมี', labelEn: 'Both' },
                  { id: 'chaco', labelTh: 'ชาโค', labelEn: 'Chaco' },
                  { id: 'mee', labelTh: 'หมี', labelEn: 'Mee' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChangeBuddy(option.id)}
                  className={`rounded-lg py-1.5 px-2 transition cursor-pointer truncate ${
                    activeBuddy === option.id
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                  }`}
                >
                  {lang === 'th' ? option.labelTh : option.labelEn}
                </button>
              ))}
            </div>

            {/* Contextual Speech Tip */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-body)] leading-relaxed">
              {pageTip}
            </div>

            {/* Page Guided Tour Button */}
            {hasTourForPage && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onStartModuleTour(currentTab);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {activeBuddy === 'mee'
                    ? (lang === 'th' ? 'ให้หมีพาทัวร์จุดสำคัญหน้านี้' : 'Start Tour with Mee')
                    : activeBuddy === 'chaco'
                      ? (lang === 'th' ? 'ให้ชาโคพาทัวร์จุดสำคัญหน้านี้' : 'Start Tour with Chaco')
                      : (lang === 'th' ? 'ให้ชาโค & หมีพาทัวร์หน้านี้' : 'Start Interactive Page Tour')}
                </span>
              </button>
            )}

            {/* Quick Navigation Shortcuts */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  <span>{lang === 'th' ? 'ทางลัดนำทางด่วน' : 'Quick Navigation'}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {shortcuts.map((item) => {
                  const Icon = item.icon;
                  const active = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigateModule(item.id);
                        setIsOpen(false);
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[11px] font-semibold transition cursor-pointer ${
                        active
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                          : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{lang === 'th' ? item.labelTh : item.labelEn}</span>
                    </button>
                  );
                })}
                {onOpenFullGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenFullGuide();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 text-left text-[11px] font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] transition cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary-text)]" />
                    <span className="truncate">{lang === 'th' ? 'คู่มือระบบ' : 'User Guide'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer Guide Toggle & Hide Mascot */}
            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isTourActive) onEndTour();
                  onToggleGuideEnabled();
                }}
                aria-pressed={isGuideEnabled}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] cursor-pointer transition"
              >
                <Power className={`w-3.5 h-3.5 ${isGuideEnabled ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`} />
                <span>
                  {lang === 'th'
                    ? `ตัวช่วยนำทาง: ${isGuideEnabled ? 'เปิด' : 'ปิด'}`
                    : `Guide: ${isGuideEnabled ? 'ON' : 'OFF'}`}
                </span>
              </button>
              <div className="flex items-center gap-2">
                {onHideMascot && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onHideMascot();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'ซ่อนการ์ตูน' : 'Hide mascot'}</span>
                  </button>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>⌘K</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Mascot Trigger Button + Dismissible Speech Bubble */}
      <div className="flex items-end gap-2">
        {!isOpen && showBubble && isGuideEnabled && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-2xl rounded-br-sm border border-[var(--color-primary)]/30 bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-title)] shadow-lg">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-left hover:text-[var(--color-primary-text)] cursor-pointer max-w-[210px] truncate"
            >
              {activeBuddy === 'chaco'
                ? (lang === 'th' ? 'ชาโคช่วยนำทางไหม?' : 'Ask Chaco!')
                : activeBuddy === 'mee'
                  ? (lang === 'th' ? 'หมีช่วยนำทางไหม?' : 'Ask Mee!')
                  : (lang === 'th' ? 'ชาโค & หมี ช่วยนำทางไหม?' : 'Need Chaco & Mee?')}
            </button>
            <button
              type="button"
              onClick={() => setShowBubble(false)}
              aria-label={lang === 'th' ? 'ซ่อนข้อความ' : 'Hide tip'}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label={lang === 'th' ? 'เปิดชาโคและหมี ตัวการ์ตูนนำทาง' : 'Open Chaco and Mee navigation guide'}
            className="group relative h-14 px-3 rounded-full border-2 border-[var(--color-primary)] bg-amber-50 dark:bg-slate-100 shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary)]/30"
          >
            <MascotAvatar mood={isOpen ? 'pointing' : 'happy'} size={42} character={activeBuddy} />
            {hasTourForPage && !isOpen && !onHideMascot && (
              <span
                className="absolute -top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[var(--color-card)]"
                aria-hidden="true"
              />
            )}
          </button>
          {onHideMascot && !isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onHideMascot();
              }}
              title={lang === 'th' ? 'ปิด/ซ่อนการ์ตูนนำทาง (เปิดคืนได้ที่เมนูมุมขวาบน)' : 'Hide mascot guide'}
              aria-label={lang === 'th' ? 'ปิดหรือซ่อนการ์ตูนนำทาง' : 'Hide mascot guide'}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-600 hover:border-rose-400 shadow-md flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
