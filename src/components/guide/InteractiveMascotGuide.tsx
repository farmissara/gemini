import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Compass,
  EyeOff,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  MousePointerClick,
  Power,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { AppLanguage, AppProgramMode, UserRole } from '../../types';
import { NavTab } from '../layout/Sidebar';
import {
  INTERACTIVE_GUIDE_TOPICS,
  ROLE_WORKFLOW_STEPS,
  resolveInteractiveTopic,
} from '../../data/interactiveGuideTopics';
import { MascotAvatar } from './MascotAvatar';
import { GuideModuleId } from '../modals/ModuleGuideModal';

interface InteractiveMascotGuideProps {
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  currentRole: UserRole;
  currentTab: NavTab;
  programMode: AppProgramMode;
  lang: AppLanguage;
  onNavigateTab: (tab: NavTab) => void;
  onOpenFullGuide: (options?: {
    moduleId?: GuideModuleId;
    roleTab?: 'all' | 'teacher' | 'student';
  }) => void;
}

interface ActiveHoverTarget {
  topicId: string;
  rect: DOMRect;
  element: HTMLElement;
}

const POPUP_MAX_WIDTH = 340;
const VIEWPORT_MARGIN = 12;

export const InteractiveMascotGuide: React.FC<InteractiveMascotGuideProps> = ({
  enabled,
  onToggleEnabled,
  currentRole,
  currentTab,
  programMode,
  lang,
  onNavigateTab,
  onOpenFullGuide,
}) => {
  const [hoverTarget, setHoverTarget] = useState<ActiveHoverTarget | null>(null);
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRoleTab, setDrawerRoleTab] = useState<'student' | 'teacher' | 'topics'>(() =>
    currentRole === 'student' ? 'student' : 'teacher'
  );
  const [selectedTopicPreviewId, setSelectedTopicPreviewId] = useState<string | null>(null);
  const [bubbleMinimized, setBubbleMinimized] = useState(false);
  const [dockMinimizedWhenOff, setDockMinimizedWhenOff] = useState(false);

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const currentHoverElementRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Sync default role guide tab when user role changes
  useEffect(() => {
    if (currentRole === 'student') {
      setDrawerRoleTab('student');
    } else if (['teacher', 'admin', 'super_admin'].includes(currentRole)) {
      setDrawerRoleTab('teacher');
    }
  }, [currentRole]);

  // Turn off active hover popups immediately if navigation guide is disabled
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      currentHoverElementRef.current = null;
      setHoverTarget(null);
      setIsPopupHovered(false);
    } else {
      setDockMinimizedWhenOff(false);
    }
  }, [enabled, clearTimers]);

  // Global mouseover / focusin listener when guide is enabled
  useEffect(() => {
    if (!enabled) return;

    const findGuideElement = (target: EventTarget | null): { el: HTMLElement; topicId: string } | null => {
      if (!(target instanceof Element)) return null;
      if (target.closest('[data-mascot-chrome="true"]')) return null;
      const el = target.closest<HTMLElement>('[data-guide-id], [data-nav-tab]');
      if (!el) return null;
      const topicId = el.getAttribute('data-guide-id') || el.getAttribute('data-nav-tab');
      if (!topicId || !INTERACTIVE_GUIDE_TOPICS[topicId]) return null;
      return { el, topicId };
    };

    const scheduleClose = () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = window.setTimeout(() => {
        if (!isPopupHovered) {
          currentHoverElementRef.current = null;
          setHoverTarget(null);
        }
      }, 170);
    };

    const handlePointerOver = (event: MouseEvent) => {
      const matched = findGuideElement(event.target);
      if (!matched) {
        if (!event.target || !(event.target instanceof Element) || !event.target.closest('[data-mascot-chrome="true"]')) {
          if (currentHoverElementRef.current) {
            scheduleClose();
          }
        }
        return;
      }

      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      if (currentHoverElementRef.current === matched.el) {
        return;
      }

      if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
      openTimerRef.current = window.setTimeout(() => {
        if (!matched.el.isConnected) return;
        currentHoverElementRef.current = matched.el;
        setHoverTarget({
          topicId: matched.topicId,
          rect: matched.el.getBoundingClientRect(),
          element: matched.el,
        });
      }, 65);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearTimers();
        currentHoverElementRef.current = null;
        setHoverTarget(null);
      }
    };

    const handleScrollOrResize = () => {
      if (currentHoverElementRef.current && currentHoverElementRef.current.isConnected) {
        const el = currentHoverElementRef.current;
        const topicId = el.getAttribute('data-guide-id') || el.getAttribute('data-nav-tab');
        if (topicId) {
          setHoverTarget({ topicId, rect: el.getBoundingClientRect(), element: el });
        }
      }
    };

    document.addEventListener('mouseover', handlePointerOver, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      clearTimers();
      document.removeEventListener('mouseover', handlePointerOver, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [enabled, isPopupHovered, clearTimers]);

  // Keep popup hover state from closing immediately on exit
  useEffect(() => {
    if (!isPopupHovered && currentHoverElementRef.current) {
      // Let pointer over document handle dismissal cleanly
    }
  }, [isPopupHovered]);

  const resolvedHover = useMemo(() => {
    if (!hoverTarget) return null;
    return resolveInteractiveTopic(hoverTarget.topicId, currentRole, lang);
  }, [hoverTarget, currentRole, lang]);

  // Calculate viewport-clamped position for the hover popup
  const popupPosition = useMemo(() => {
    if (!hoverTarget || typeof window === 'undefined') return null;
    const { rect } = hoverTarget;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(POPUP_MAX_WIDTH, vw - VIEWPORT_MARGIN * 2);
    const estHeight = 235;

    let left = rect.right + 12;
    let top = rect.top - 8;

    // Prefer right side for left sidebar items; prefer below for top navbar items; otherwise smart flip
    if (rect.top < 80) {
      // Top navbar area: open below element
      top = rect.bottom + 10;
      left = rect.left + rect.width / 2 - width / 2;
    } else if (rect.right + 12 + width > vw - VIEWPORT_MARGIN) {
      // Not enough room on right -> try left side or below
      if (rect.left - 12 - width >= VIEWPORT_MARGIN) {
        left = rect.left - width - 12;
      } else {
        left = rect.left + rect.width / 2 - width / 2;
        top = rect.bottom + 10;
      }
    }

    // Clamp horizontally
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - width - VIEWPORT_MARGIN));
    // Clamp vertically
    if (top + estHeight > vh - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, rect.top - estHeight - 10);
    }
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - estHeight - VIEWPORT_MARGIN));

    return { left, top, width };
  }, [hoverTarget]);

  // Current active page/tab topic for the mascot speech bubble when idle
  const activeContextTopic = useMemo(() => {
    const contextId =
      programMode === 'lms_classroom'
        ? 'nav-program-lms_classroom'
        : programMode === 'parent_portal'
        ? 'nav-program-parent_portal'
        : currentTab;
    return (
      resolveInteractiveTopic(contextId, currentRole, lang) ||
      resolveInteractiveTopic('dashboard', currentRole, lang)
    );
  }, [programMode, currentTab, currentRole, lang]);

  const roleWorkflowSteps = useMemo(() => {
    const targetRole = drawerRoleTab === 'student' ? 'student' : 'teacher';
    return ROLE_WORKFLOW_STEPS.filter((s) => s.role === targetRole);
  }, [drawerRoleTab]);

  const topicCatalogList = useMemo(() => {
    return Object.values(INTERACTIVE_GUIDE_TOPICS).filter((t) => {
      if (currentRole === 'student') {
        return t.audience === 'all' || t.audience === 'student';
      }
      if (currentRole === 'parent') {
        return t.audience === 'all' || t.audience === 'parent';
      }
      return true;
    });
  }, [currentRole]);

  const previewTopic = useMemo(() => {
    if (!selectedTopicPreviewId) return null;
    return resolveInteractiveTopic(selectedTopicPreviewId, currentRole, lang);
  }, [selectedTopicPreviewId, currentRole, lang]);

  const roleLabel =
    currentRole === 'student'
      ? lang === 'th'
        ? 'โหมดคู่มือนักเรียน'
        : 'Student Guide'
      : currentRole === 'parent'
      ? lang === 'th'
        ? 'โหมดผู้ปกครอง'
        : 'Parent Guide'
      : lang === 'th'
      ? 'โหมดคู่มือคุณครู/บริหาร'
      : 'Teacher & Staff Guide';

  const audienceBadgeText = (audience: string) => {
    if (audience === 'teacher') return lang === 'th' ? 'คู่มือคุณครู' : 'Teacher';
    if (audience === 'student') return lang === 'th' ? 'คู่มือนักเรียน' : 'Student';
    if (audience === 'admin') return lang === 'th' ? 'ผู้บริหาร' : 'Admin';
    if (audience === 'parent') return lang === 'th' ? 'ผู้ปกครอง' : 'Parent';
    return lang === 'th' ? 'แนะนำการใช้งาน' : 'Feature Guide';
  };

  return (
    <>
      {/* 1. FLOATING HOVER-TO-EXPLAIN POPUP CARD (when Guide ON & hovering a tagged feature) */}
      {enabled && resolvedHover && popupPosition && (
        <div
          ref={popupRef}
          data-mascot-chrome="true"
          role="tooltip"
          onMouseEnter={() => {
            if (closeTimerRef.current !== null) {
              window.clearTimeout(closeTimerRef.current);
              closeTimerRef.current = null;
            }
            setIsPopupHovered(true);
          }}
          onMouseLeave={() => {
            setIsPopupHovered(false);
            currentHoverElementRef.current = null;
            setHoverTarget(null);
          }}
          style={{
            left: popupPosition.left,
            top: popupPosition.top,
            width: popupPosition.width,
          }}
          className="fixed z-50 rounded-2xl border border-[var(--color-primary)]/40 bg-[var(--color-card)]/98 backdrop-blur-md shadow-xl p-3.5 text-[var(--color-text-body)] transition-opacity duration-150"
        >
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 rounded-xl bg-[var(--color-primary-light)] p-1 border border-[var(--color-border)]">
              <MascotAvatar mood={resolvedHover.topic.mood} size={42} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary-text)]">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>{audienceBadgeText(resolvedHover.topic.audience)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearTimers();
                    currentHoverElementRef.current = null;
                    setHoverTarget(null);
                  }}
                  aria-label={lang === 'th' ? 'ปิดคำแนะนำ' : 'Dismiss hint'}
                  className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="text-xs font-extrabold text-[var(--color-text-title)] leading-snug mt-0.5">
                {resolvedHover.title}
              </h4>
              <p className="text-[11px] text-[var(--color-text-body)] leading-relaxed mt-1">
                {resolvedHover.summary}
              </p>
            </div>
          </div>

          {resolvedHover.howTo.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-[var(--color-border)] space-y-1">
              <div className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                <MousePointerClick className="w-3 h-3 text-[var(--color-primary-text)] shrink-0" />
                <span>{lang === 'th' ? 'วิธีใช้งานด่วน:' : 'Quick Steps:'}</span>
              </div>
              <ul className="space-y-1">
                {resolvedHover.howTo.slice(0, 3).map((step, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-snug">
                    <span className="mt-0.5 w-4 h-4 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold text-[10px] flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-[var(--color-text-body)]">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resolvedHover.tip && (
            <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 text-[10px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-300" />
              <span className="leading-snug">{resolvedHover.tip}</span>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleEnabled(false);
              }}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-text-muted)] hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer whitespace-nowrap"
            >
              <EyeOff className="w-3 h-3" />
              <span>{lang === 'th' ? 'ปิดการนำทาง' : 'Turn off guide'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              {resolvedHover.topic.guideModuleId && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenFullGuide({
                      moduleId: resolvedHover.topic.guideModuleId as GuideModuleId,
                      roleTab: currentRole === 'student' ? 'student' : 'teacher',
                    });
                    setHoverTarget(null);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[10px] font-bold transition cursor-pointer whitespace-nowrap"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>{lang === 'th' ? 'เปิดคู่มือเต็ม' : 'Full Guide'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. FLOATING CARTOON MASCOT NAVIGATOR DOCK (Bottom-Right Corner) */}
      <div
        data-mascot-chrome="true"
        className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]"
      >
        {/* Expandable In-Module Student & Teacher Guide Explorer */}
        {drawerOpen && (
          <div className="w-[min(410px,calc(100vw-2rem))] max-h-[76vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden text-[var(--color-text-body)]">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <MascotAvatar mood={enabled ? 'celebrate' : 'happy'} sleeping={!enabled} size={42} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-extrabold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? 'น้องเอดู · การ์ตูนนำทางวิธีใช้' : 'EduBuddy · Interactive Guide'}
                    </h3>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                    {enabled
                      ? lang === 'th'
                        ? 'เปิดอยู่ — เอาเมาส์ชี้เมนูหรือปุ่มเพื่อดูวิธีใช้ทันที'
                        : 'ON — Hover any menu or button to inspect tips'
                      : lang === 'th'
                      ? 'ปิดป๊อปอัปชี้เมาส์อยู่ (เปิดใหม่ได้ทุกเมื่อ)'
                      : 'Hover guide is OFF (re-enable anytime)'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={lang === 'th' ? 'พับหน้าต่างการ์ตูนนำทาง' : 'Collapse guide drawer'}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)] transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Mode ON/OFF Switch + Role Selector Tabs */}
            <div className="p-3 border-b border-[var(--color-border)] space-y-2.5 shrink-0 bg-[var(--color-card)]">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MousePointerClick className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? 'โหมดชี้เมาส์เพื่อแสดงคำอธิบาย' : 'Hover-to-Explain Popups'}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                      {lang === 'th' ? 'ชี้ที่ปุ่มหรือเมนูใดก็ได้แล้วจะเด้งแนะนำวิธีใช้' : 'Point at buttons or tabs for instant tips'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => onToggleEnabled(!enabled)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                    enabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{enabled ? (lang === 'th' ? 'เปิดอยู่' : 'ON') : lang === 'th' ? 'ปิดอยู่' : 'OFF'}</span>
                </button>
              </div>

              {/* Dedicated In-Module Student & Teacher Guide Switcher */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDrawerRoleTab('student')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition cursor-pointer whitespace-nowrap ${
                    drawerRoleTab === 'student'
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-xs'
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'th' ? 'คู่มือนักเรียน' : 'Student'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerRoleTab('teacher')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition cursor-pointer whitespace-nowrap ${
                    drawerRoleTab === 'teacher'
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-xs'
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'th' ? 'คู่มือคุณครู' : 'Teacher'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerRoleTab('topics')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition cursor-pointer whitespace-nowrap ${
                    drawerRoleTab === 'topics'
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-xs'
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'th' ? 'ทุกหัวข้อ' : 'All Topics'}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Body: Role Workflow Cards OR Interactive Topics */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
              {drawerRoleTab !== 'topics' ? (
                <>
                  <div className="text-[11px] font-semibold text-[var(--color-text-muted)] px-0.5">
                    {drawerRoleTab === 'student'
                      ? lang === 'th'
                        ? 'คู่มือนักเรียนฉบับในโมดูล — กดแต่ละขั้นเพื่อเปิดดูภาพหรือไปหน้าจริง'
                        : 'In-Module Student Guide — click any step to jump directly'
                      : lang === 'th'
                      ? 'คู่มือคุณครูฉบับในโมดูล — ครบทุกขั้นตอนตั้งแต่วันแรกจนถึงออกรายงาน'
                      : 'In-Module Teacher Guide — end-to-end classroom workflows'}
                  </div>

                  {roleWorkflowSteps.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2.5 space-y-2 hover:border-[var(--color-primary)] transition"
                    >
                      <div className="flex items-start gap-2.5">
                        <img
                          src={step.imageSrc}
                          alt={lang === 'th' ? step.captionTh : step.captionEn}
                          className="w-16 h-12 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-mono font-bold text-[var(--color-primary-text)]">
                            STEP {step.stepNumber}
                          </div>
                          <h4 className="text-xs font-bold text-[var(--color-text-title)] leading-snug">
                            {lang === 'th' ? step.titleTh : step.titleEn}
                          </h4>
                          <p className="text-[11px] text-[var(--color-text-body)] mt-0.5 leading-snug">
                            {lang === 'th' ? step.summaryTh : step.summaryEn}
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-1 pl-1">
                        {(lang === 'th' ? step.detailsTh : step.detailsEn).map((line, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-[var(--color-text-body)]">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>

                      {step.targetTab && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]">
                          <span className="text-[10px] text-[var(--color-text-muted)] truncate">
                            💡 {lang === 'th' ? step.tipTh : step.tipEn}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateTab(step.targetTab!);
                              setDrawerOpen(false);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[10px] font-bold shrink-0 cursor-pointer whitespace-nowrap"
                          >
                            <span>{lang === 'th' ? 'ไปเมนูนี้' : 'Go'}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="space-y-2">
                  {previewTopic && (
                    <div className="rounded-xl border border-[var(--color-primary)]/50 bg-[var(--color-primary-light)]/50 p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[var(--color-text-title)]">
                          {previewTopic.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedTopicPreviewId(null)}
                          className="text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-body)]">{previewTopic.summary}</p>
                      {previewTopic.topic.targetTab && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateTab(previewTopic.topic.targetTab!);
                            setDrawerOpen(false);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-primary)] text-white text-[10px] font-bold cursor-pointer"
                        >
                          <span>{lang === 'th' ? 'เปิดหน้านี้ทันที' : 'Open Module'}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {topicCatalogList.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopicPreviewId(topic.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                        selectedTopicPreviewId === topic.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/50'
                          : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--color-text-title)] truncate">
                          {lang === 'th' ? topic.titleTh : topic.titleEn}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                          {lang === 'th' ? topic.summaryTh : topic.summaryEn}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-2.5 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 shrink-0">
              <span className="text-[10px] font-semibold text-[var(--color-text-muted)] truncate">
                {roleLabel}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenFullGuide({
                    roleTab: drawerRoleTab === 'student' ? 'student' : 'teacher',
                  });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] text-[11px] font-bold text-[var(--color-primary-text)] cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เปิดคู่มือภาพประกอบเต็มจอ' : 'Open Full Guide'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Speech Bubble + Mascot Trigger Pill */}
        {!drawerOpen && (
          <div className="flex items-end gap-2">
            {/* Live Cartoon Speech Bubble when Guide is ON and not minimized */}
            {enabled && !bubbleMinimized && activeContextTopic && (
              <div className="hidden sm:flex flex-col max-w-[250px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-sm shadow-lg px-3 py-2 text-[var(--color-text-body)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold text-[var(--color-primary-text)] truncate">
                    {resolvedHover ? resolvedHover.title : activeContextTopic.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBubbleMinimized(true)}
                    aria-label={lang === 'th' ? 'ซ่อนกล่องข้อความ' : 'Hide speech bubble'}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] text-[10px] cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-[var(--color-text-body)] leading-snug mt-0.5 line-clamp-2">
                  {resolvedHover
                    ? resolvedHover.summary
                    : lang === 'th'
                    ? 'เอาเมาส์ชี้ปุ่มหรือเมนูใดก็ได้เพื่อดูวิธีใช้ หรือคลิกน้องเอดูเพื่อเปิดคู่มือครู/นักเรียน'
                    : 'Hover any button or menu for instant help, or click EduBuddy to open Student & Teacher Guides.'}
                </p>
              </div>
            )}

            {/* Compact Floating Cartoon Mascot Launcher */}
            {!enabled && dockMinimizedWhenOff ? (
              <button
                type="button"
                onClick={() => {
                  onToggleEnabled(true);
                  setDockMinimizedWhenOff(false);
                }}
                title={lang === 'th' ? 'เปิดตัวการ์ตูนนำทางวิธีใช้' : 'Turn ON Interactive Cartoon Guide'}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)]/90 px-3 py-1.5 text-[11px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary-text)] hover:border-[var(--color-primary)] shadow-md transition cursor-pointer whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                <span>{lang === 'th' ? 'เปิดการ์ตูนนำทาง' : 'Guide OFF'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                {!enabled && (
                  <button
                    type="button"
                    onClick={() => setDockMinimizedWhenOff(true)}
                    aria-label={lang === 'th' ? 'ย่อปุ่มการ์ตูน' : 'Minimize guide button'}
                    className="p-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] shadow-sm text-[10px] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(true);
                    setBubbleMinimized(false);
                  }}
                  title={
                    enabled
                      ? lang === 'th'
                        ? 'คลิกเพื่อเปิดคู่มือคุณครู & นักเรียน หรือสลับเปิด/ปิดการนำทาง'
                        : 'Open Student & Teacher Guides or toggle hover navigation'
                      : lang === 'th'
                      ? 'การนำทางปิดอยู่ — คลิกเพื่อเปิดดูคู่มือหรือเปิดใช้งานอีกครั้ง'
                      : 'Guide is OFF — click to open guides or re-enable'
                  }
                  className={`group relative flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 shadow-lg transition cursor-pointer ${
                    enabled
                      ? 'border-[var(--color-primary)]/50 bg-[var(--color-card)] hover:border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] opacity-90 hover:opacity-100'
                  }`}
                >
                  <MascotAvatar
                    mood={resolvedHover ? resolvedHover.topic.mood : 'happy'}
                    sleeping={!enabled}
                    size={42}
                  />
                  <div className="text-left pr-1">
                    <div className="text-[11px] font-extrabold text-[var(--color-text-title)] leading-tight whitespace-nowrap">
                      {lang === 'th' ? 'คู่มือนำทาง' : 'Guide'}
                    </div>
                    <div
                      className={`text-[10px] font-bold leading-tight whitespace-nowrap ${
                        enabled
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {enabled
                        ? lang === 'th'
                          ? 'เปิดอยู่'
                          : 'Hover ON'
                        : lang === 'th'
                        ? 'ปิดอยู่'
                        : 'OFF'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
