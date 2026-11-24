import React, { useMemo, useState } from 'react';
import {
  Award,
  BellRing,
  BookOpen,
  Calendar,
  Compass,
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
import { MODULE_GUIDED_TOURS } from '../../data/moduleGuidedTours';

interface MascotAvatarProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Illustrated SVG cartoon mascot ("น้องฮูกบ้านพักครู" / Kru Owl Buddy)
 * Crisp vector illustration that adapts cleanly to light and dark themes.
 */
export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mood = 'happy',
  size = 48,
  className = '',
  animated = true,
}) => {
  const accentColor =
    mood === 'celebrate' || mood === 'success'
      ? '#10b981'
      : mood === 'warning' || mood === 'concerned'
        ? '#f59e0b'
        : mood === 'error'
          ? '#ef4444'
          : '#2563eb';

  const isWinking = mood === 'celebrate' || mood === 'success';
  const isThinking = mood === 'thinking';
  const isPointing = mood === 'pointing';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`${animated ? 'transition-transform duration-300' : ''} ${className}`}
    >
      {/* Soft ambient aura */}
      <circle cx="32" cy="34" r="27" fill={accentColor} fillOpacity="0.14" />

      {/* Graduation mortarboard cap */}
      <path d="M16 14L32 7L48 14L32 21L16 14Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M23 17.5V22.5C23 24.5 27 26 32 26C37 26 41 24.5 41 22.5V17.5" fill="#334155" stroke="#0f172a" strokeWidth="1.4" />
      {/* Gold tassel */}
      <path d="M46 15V22" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="46" cy="23.5" r="2" fill="#f59e0b" />

      {/* Owl ears / tufts */}
      <path d="M15 24L20 19L23 25Z" fill="#1d4ed8" />
      <path d="M49 24L44 19L41 25Z" fill="#1d4ed8" />

      {/* Main rounded body */}
      <rect x="14" y="20" width="36" height="36" rx="18" fill="#2563eb" stroke="#1e40af" strokeWidth="1.6" />

      {/* Belly cream patch */}
      <ellipse cx="32" cy="43.5" rx="12" ry="10.5" fill="#eff6ff" />
      <path d="M26 42C27.5 43.2 29 43.2 30.5 42" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M33.5 42C35 43.2 36.5 43.2 38 42" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M29.5 46.5C31 47.7 33 47.7 34.5 46.5" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />

      {/* Left & Right Wings */}
      <path
        d={isPointing ? 'M14 35C9 32 7 28 10 25C13 23 16 28 16 34Z' : 'M14 32C9.5 34 9 42 13 46C15.5 44 16 38 15.5 32Z'}
        fill="#1d4ed8"
        stroke="#1e40af"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d={isWinking ? 'M50 34C55 30 57 25 53 23C50 22 48 27 48 34Z' : 'M50 32C54.5 34 55 42 51 46C48.5 44 48 38 48.5 32Z'}
        fill="#1d4ed8"
        stroke="#1e40af"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Big Owl Eye Circles */}
      <circle cx="24.5" cy="30.5" r="7.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
      <circle cx="39.5" cy="30.5" r="7.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />

      {/* Glasses bridge */}
      <path d="M31.5 30.5H32.5" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24.5" cy="30.5" r="7.4" stroke="#0f172a" strokeWidth="1.4" />
      <circle cx="39.5" cy="30.5" r="7.4" stroke="#0f172a" strokeWidth="1.4" />

      {/* Eyes by mood */}
      {isWinking ? (
        <>
          <path d="M21.5 31C22.5 29 26.5 29 27.5 31" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <path d="M36.5 31C37.5 29 41.5 29 42.5 31" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : isThinking ? (
        <>
          <circle cx="25.5" cy="29.5" r="2.8" fill="#0f172a" />
          <circle cx="40.5" cy="29.5" r="2.8" fill="#0f172a" />
          <circle cx="26.5" cy="28.5" r="1" fill="#ffffff" />
          <circle cx="41.5" cy="28.5" r="1" fill="#ffffff" />
          <path d="M20.5 24.5L27.5 25.5" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="25" cy="30.8" r="3" fill="#0f172a" />
          <circle cx="39" cy="30.8" r="3" fill="#0f172a" />
          <circle cx="26" cy="29.6" r="1.1" fill="#ffffff" />
          <circle cx="40" cy="29.6" r="1.1" fill="#ffffff" />
        </>
      )}

      {/* Rosy cheeks */}
      <ellipse cx="19" cy="35.5" rx="2.2" ry="1.3" fill="#fb7185" fillOpacity="0.65" />
      <ellipse cx="45" cy="35.5" rx="2.2" ry="1.3" fill="#fb7185" fillOpacity="0.65" />

      {/* Cute beak */}
      <path d="M29.5 33.5L34.5 33.5L32 37.5Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" strokeLinejoin="round" />

      {/* Little feet */}
      <path d="M24 55.5L22.5 58.5M26 55.5L26 59M28 55.5L29 58.5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M36 55.5L35 58.5M38 55.5L38 59M40 55.5L41.5 58.5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />

      {/* Sparkle star on celebrate */}
      {isWinking && (
        <path d="M55 11L56.2 13.8L59 15L56.2 16.2L55 19L53.8 16.2L51 15L53.8 13.8Z" fill="#fbbf24" />
      )}
    </svg>
  );
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
    th: 'สรุปงานสำคัญวันนี้และตัวชี้วัดหลักอยู่ที่นี่ครับ',
    en: 'Daily KPIs and your priority tasks are right here.',
  },
  timetable: {
    th: 'ดูตารางสอนแนวนอนเต็มจอ หรือกดพิมพ์ A4 แนวนอนได้เลยครับ!',
    en: 'Switch to wide landscape view or print in A4 landscape anytime!',
  },
  students: {
    th: 'จัดการทะเบียนนักเรียน คะแนนเก็บ และเอกสาร ปพ. ในหน้าเดียว',
    en: 'Manage student records, grades, and official forms in one place.',
  },
  attendance: {
    th: 'เช็คชื่อด้วย QR, กล้องเร็ว หรือตรวจสอบสถิติรายวันได้ที่นี่',
    en: 'Check attendance via QR, rapid scanner, or daily logs.',
  },
  homework: {
    th: 'ติดตามภาระงาน สั่งการบ้าน และตรวจให้คะแนนได้รวดเร็วครับ',
    en: 'Track homework, assign tasks, and grade submissions quickly.',
  },
  system_settings: {
    th: 'ตั้งค่า GPS, เวลาตัดสาย, LINE OA และบัญชีนักเรียนได้ครบที่นี่',
    en: 'Configure GPS gates, cutoff times, LINE OA, and accounts here.',
  },
};

interface FloatingMascotNavigatorProps {
  currentTab: string;
  currentRole: UserRole;
  lang: AppLanguage;
  isGuideEnabled: boolean;
  isTourActive: boolean;
  onToggleGuideEnabled: () => void;
  onStartModuleTour: (moduleId: string) => void;
  onEndTour: () => void;
  onNavigateModule: (moduleId: string) => void;
  onOpenFullGuide?: () => void;
}

export const FloatingMascotNavigator: React.FC<FloatingMascotNavigatorProps> = ({
  currentTab,
  currentRole,
  lang,
  isGuideEnabled,
  isTourActive,
  onToggleGuideEnabled,
  onStartModuleTour,
  onEndTour,
  onNavigateModule,
  onOpenFullGuide,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);

  const hasTourForPage = Boolean(MODULE_GUIDED_TOURS[currentTab]);
  const shortcuts = useMemo(() => ROLE_SHORTCUTS[currentRole] || ROLE_SHORTCUTS.teacher, [currentRole]);

  // While the detailed step-by-step tour card is open at bottom-right, avoid double floating UI
  if (isTourActive) return null;

  const pageTip = MODULE_FRIENDLY_TIP[currentTab]?.[lang] || (
    lang === 'th'
      ? 'สวัสดีครับ! น้องฮูกพร้อมช่วยนำทางและแนะนำหน้านี้'
      : 'Hi there! I am Kru Owl, ready to guide you!'
  );

  return (
    <div className="fixed bottom-20 right-3 z-[95] print:hidden sm:right-5 md:bottom-5 flex flex-col items-end gap-2">
      {isOpen && (
        <div
          role="dialog"
          aria-label={lang === 'th' ? 'ตัวการ์ตูนนำทางระบบ' : 'Cartoon navigation assistant'}
          className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden animate-in fade-in duration-150"
        >
          {/* Mascot Header */}
          <div className="flex items-center justify-between gap-2.5 bg-[var(--color-primary-light)]/75 px-3.5 py-2.5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-card)] border border-[var(--color-primary)]/25 flex items-center justify-center shrink-0 shadow-xs">
                <MascotAvatar mood="happy" size={36} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                  {lang === 'th' ? 'น้องฮูกนำทาง · บ้านพักครู' : 'Kru Owl Navigator'}
                </p>
                <p className="text-[11px] text-[var(--color-primary-text)] truncate">
                  {lang === 'th' ? 'ผู้ช่วยนำทางและสอนใช้งาน' : 'Interactive guide & shortcuts'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={lang === 'th' ? 'ปิดหน้าต่างน้องฮูก' : 'Close mascot navigator'}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card)] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-3">
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
                <span>{lang === 'th' ? 'ให้น้องฮูกพาทัวร์จุดสำคัญหน้านี้' : 'Start Interactive Page Tour'}</span>
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

            {/* Footer Guide Toggle */}
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
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>⌘K</span>
              </span>
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
              className="text-left hover:text-[var(--color-primary-text)] cursor-pointer max-w-[190px] truncate"
            >
              {lang === 'th' ? 'น้องฮูกช่วยนำทางไหม?' : 'Need Kru Owl guide?'}
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

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={lang === 'th' ? 'เปิดน้องฮูกนำทางและช่วยเหลือ' : 'Open Kru Owl navigation guide'}
          className="group relative w-13 h-13 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-card)] shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary)]/30"
        >
          <MascotAvatar mood={isOpen ? 'pointing' : 'happy'} size={44} />
          {hasTourForPage && !isOpen && (
            <span
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[var(--color-card)]"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </div>
  );
};
