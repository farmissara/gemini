import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  EyeOff,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  MousePointerClick,
  Play,
  Power,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { AppLanguage, AppProgramMode, UserRole } from '../../types';
import { NavTab } from '../layout/Sidebar';
import {
  INTERACTIVE_GUIDE_TOPICS,
  MascotMood,
  ROLE_WORKFLOW_STEPS,
  resolveInteractiveTopic,
} from '../../data/interactiveGuideTopics';
import { MODULE_GUIDED_TOURS } from '../../data/moduleGuidedTours';
import {
  MascotAvatar,
  MascotCharacter,
  getSavedMascotCharacter,
  setSavedMascotCharacter,
} from './MascotAvatar';
import { useGuideTour } from './GuideTourContext';
import { GuideModuleId } from '../modals/ModuleGuideModal';

export type MascotDashboardEventType = 'success' | 'warning' | 'error';

export interface MascotDashboardEvent {
  id?: string;
  type: MascotDashboardEventType;
  titleTh: string;
  titleEn: string;
  messageTh: string;
  messageEn: string;
  durationMs?: number;
}

const MASCOT_DASHBOARD_EVENT = 'eduverse:mascot-dashboard-event';

export function emitMascotDashboardEvent(event: MascotDashboardEvent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<MascotDashboardEvent>(MASCOT_DASHBOARD_EVENT, {
      detail: {
        ...event,
        id:
          event.id ||
          `mascot-evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      },
    })
  );
}

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
  dashboardEvent?: MascotDashboardEvent | null;
}

interface ActiveHoverTarget {
  topicId: string;
  rect: DOMRect;
  element: HTMLElement;
}

const POPUP_MAX_WIDTH = 340;
const TOUR_CARD_WIDTH = 370;
const VIEWPORT_MARGIN = 12;
const MASCOT_EXIT_DURATION_MS = 200;
const BUBBLE_EXIT_DURATION_MS = 180;

export const InteractiveMascotGuide: React.FC<InteractiveMascotGuideProps> = ({
  enabled,
  onToggleEnabled,
  currentRole,
  currentTab,
  programMode,
  lang,
  onNavigateTab,
  onOpenFullGuide,
  dashboardEvent = null,
}) => {
  const tourCtx = useGuideTour();

  const [hoverTarget, setHoverTarget] = useState<ActiveHoverTarget | null>(null);
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerExiting, setDrawerExiting] = useState(false);
  const [drawerRoleTab, setDrawerRoleTab] = useState<'student' | 'teacher' | 'topics'>(() =>
    currentRole === 'student' ? 'student' : 'teacher'
  );
  const [selectedTopicPreviewId, setSelectedTopicPreviewId] = useState<string | null>(null);
  const [bubbleMinimized, setBubbleMinimized] = useState(false);
  const [dockMinimizedWhenOff, setDockMinimizedWhenOff] = useState(false);
  const [dockMascotExiting, setDockMascotExiting] = useState(false);
  const [tourTargetRect, setTourTargetRect] = useState<DOMRect | null>(null);
  const [mascotCharacter, setMascotCharacter] = useState<MascotCharacter>(() =>
    getSavedMascotCharacter()
  );
  const [activeDashboardEvent, setActiveDashboardEvent] =
    useState<MascotDashboardEvent | null>(null);

  const handleSelectCharacter = (next: MascotCharacter) => {
    setMascotCharacter(next);
    setSavedMascotCharacter(next);
  };

  const mascotDisplayNameTh =
    mascotCharacter === 'charcoal'
      ? 'ชาร์โคล'
      : mascotCharacter === 'mee'
      ? 'หมี'
      : 'ชาร์โคล & หมี';
  const mascotDisplayNameEn =
    mascotCharacter === 'charcoal'
      ? 'Charcoal'
      : mascotCharacter === 'mee'
      ? 'Mee'
      : 'Charcoal & Mee';

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const currentHoverElementRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const dashboardEventTimerRef = useRef<number | null>(null);
  const drawerExitTimerRef = useRef<number | null>(null);
  const dockExitTimerRef = useRef<number | null>(null);
  const hoverExitTimerRef = useRef<number | null>(null);
  const bubbleExitTimerRef = useRef<number | null>(null);

  const isTourRunning = Boolean(
    tourCtx?.activeTourModuleId && tourCtx.activeTourSteps.length > 0
  );
  const activeTourStep = isTourRunning
    ? tourCtx!.activeTourSteps[tourCtx!.activeTourStepIndex] || null
    : null;

  const activeModuleKey =
    programMode === 'lms_classroom'
      ? 'lms_classroom'
      : programMode === 'parent_portal'
      ? 'parent_portal'
      : currentTab;
  const currentModuleTourDef = MODULE_GUIDED_TOURS[activeModuleKey] || null;

  const triggerDashboardEvent = useCallback((evt: MascotDashboardEvent) => {
    if (dashboardEventTimerRef.current !== null) {
      window.clearTimeout(dashboardEventTimerRef.current);
      dashboardEventTimerRef.current = null;
    }
    setActiveDashboardEvent(evt);
    setBubbleMinimized(false);
    setDockMinimizedWhenOff(false);
    setDockMascotExiting(false);

    const ttl = Math.max(2000, evt.durationMs ?? 5500);
    dashboardEventTimerRef.current = window.setTimeout(() => {
      setActiveDashboardEvent(null);
      dashboardEventTimerRef.current = null;
    }, ttl);
  }, []);

  const dismissDashboardEvent = useCallback(() => {
    if (dashboardEventTimerRef.current !== null) {
      window.clearTimeout(dashboardEventTimerRef.current);
      dashboardEventTimerRef.current = null;
    }
    setActiveDashboardEvent(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent<MascotDashboardEvent>).detail;
      if (detail && (detail.type === 'success' || detail.type === 'warning' || detail.type === 'error')) {
        triggerDashboardEvent(detail);
      }
    };
    window.addEventListener(MASCOT_DASHBOARD_EVENT, handleEvent);
    return () => {
      window.removeEventListener(MASCOT_DASHBOARD_EVENT, handleEvent);
      if (dashboardEventTimerRef.current !== null) {
        window.clearTimeout(dashboardEventTimerRef.current);
      }
    };
  }, [triggerDashboardEvent]);

  useEffect(() => {
    if (dashboardEvent) {
      triggerDashboardEvent(dashboardEvent);
    }
  }, [dashboardEvent, triggerDashboardEvent]);

  const openDrawer = useCallback(() => {
    if (drawerExitTimerRef.current !== null) {
      window.clearTimeout(drawerExitTimerRef.current);
      drawerExitTimerRef.current = null;
    }
    setDrawerExiting(false);
    setDrawerOpen(true);
    setDrawerMounted(true);
    setBubbleMinimized(false);
  }, []);

  const closeDrawer = useCallback((afterClose?: () => void) => {
    if (drawerExitTimerRef.current !== null) {
      window.clearTimeout(drawerExitTimerRef.current);
      drawerExitTimerRef.current = null;
    }
    setDrawerOpen(false);
    setDrawerExiting(true);
    drawerExitTimerRef.current = window.setTimeout(() => {
      setDrawerMounted(false);
      setDrawerExiting(false);
      drawerExitTimerRef.current = null;
      afterClose?.();
    }, MASCOT_EXIT_DURATION_MS);
  }, []);

  const minimizeDockWhenOff = useCallback(() => {
    if (dockExitTimerRef.current !== null) {
      window.clearTimeout(dockExitTimerRef.current);
      dockExitTimerRef.current = null;
    }
    setDockMascotExiting(true);
    dockExitTimerRef.current = window.setTimeout(() => {
      setDockMascotExiting(false);
      setDockMinimizedWhenOff(true);
      dockExitTimerRef.current = null;
    }, MASCOT_EXIT_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (drawerExitTimerRef.current !== null) window.clearTimeout(drawerExitTimerRef.current);
      if (dockExitTimerRef.current !== null) window.clearTimeout(dockExitTimerRef.current);
      if (hoverExitTimerRef.current !== null) window.clearTimeout(hoverExitTimerRef.current);
      if (bubbleExitTimerRef.current !== null) window.clearTimeout(bubbleExitTimerRef.current);
    };
  }, []);

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

  // Turn off active hover popups immediately if navigation guide is disabled or tour starts
  useEffect(() => {
    if (!enabled || isTourRunning) {
      clearTimers();
      currentHoverElementRef.current = null;
      setHoverTarget(null);
      setIsPopupHovered(false);
    }
    if (enabled) {
      if (dockExitTimerRef.current !== null) {
        window.clearTimeout(dockExitTimerRef.current);
        dockExitTimerRef.current = null;
      }
      setDockMascotExiting(false);
      setDockMinimizedWhenOff(false);
    }
  }, [enabled, isTourRunning, clearTimers]);

  // Track Spotlight Guided Tour target element position + auto-scroll into view
  useEffect(() => {
    if (!isTourRunning || !activeTourStep) {
      setTourTargetRect(null);
      return;
    }

    const measureAndScroll = (shouldScroll: boolean) => {
      const el = document.querySelector<HTMLElement>(activeTourStep.selector);
      if (!el) {
        setTourTargetRect(null);
        return;
      }
      if (shouldScroll) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      setTourTargetRect(el.getBoundingClientRect());
    };

    measureAndScroll(true);
    const settleTimer = window.setTimeout(() => measureAndScroll(false), 260);

    const handleSync = () => measureAndScroll(false);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        tourCtx?.endTour();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        tourCtx?.nextTourStep();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        tourCtx?.prevTourStep();
      }
    };

    window.addEventListener('scroll', handleSync, true);
    window.addEventListener('resize', handleSync);
    document.addEventListener('keydown', handleKey);

    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('scroll', handleSync, true);
      window.removeEventListener('resize', handleSync);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isTourRunning, activeTourStep, tourCtx]);

  // Global mouseover listener when Hover Guide is enabled (paused during active Spotlight Tour)
  useEffect(() => {
    if (!enabled || isTourRunning) return;

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
  }, [enabled, isTourRunning, isPopupHovered, clearTimers]);

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

    if (rect.top < 80) {
      top = rect.bottom + 10;
      left = rect.left + rect.width / 2 - width / 2;
    } else if (rect.right + 12 + width > vw - VIEWPORT_MARGIN) {
      if (rect.left - 12 - width >= VIEWPORT_MARGIN) {
        left = rect.left - width - 12;
      } else {
        left = rect.left + rect.width / 2 - width / 2;
        top = rect.bottom + 10;
      }
    }

    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - width - VIEWPORT_MARGIN));
    if (top + estHeight > vh - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, rect.top - estHeight - 10);
    }
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - estHeight - VIEWPORT_MARGIN));

    return { left, top, width };
  }, [hoverTarget]);

  // Calculate viewport-clamped position for the Guided Tour Card next to spotlight
  const tourCardPosition = useMemo(() => {
    if (!isTourRunning || typeof window === 'undefined') return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(TOUR_CARD_WIDTH, vw - VIEWPORT_MARGIN * 2);
    const estHeight = 260;

    if (!tourTargetRect) {
      return {
        left: Math.max(VIEWPORT_MARGIN, vw / 2 - width / 2),
        top: Math.max(VIEWPORT_MARGIN, vh / 2 - estHeight / 2),
        width,
      };
    }

    const rect = tourTargetRect;
    // Prefer below target if space allows
    let left = rect.left + Math.min(24, rect.width / 4);
    let top = rect.bottom + 14;

    if (top + estHeight > vh - VIEWPORT_MARGIN) {
      // Try above target
      if (rect.top - estHeight - 14 >= VIEWPORT_MARGIN) {
        top = rect.top - estHeight - 14;
      } else if (rect.right + width + 16 <= vw - VIEWPORT_MARGIN) {
        // Place to the right
        left = rect.right + 16;
        top = rect.top;
      } else if (rect.left - width - 16 >= VIEWPORT_MARGIN) {
        // Place to the left
        left = rect.left - width - 16;
        top = rect.top;
      } else {
        // Bottom-center safe fallback (for very large target containers like histograms)
        top = vh - estHeight - VIEWPORT_MARGIN;
        left = vw / 2 - width / 2;
      }
    }

    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - width - VIEWPORT_MARGIN));
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - estHeight - VIEWPORT_MARGIN));
    return { left, top, width };
  }, [isTourRunning, tourTargetRect]);

  const activeContextTopic = useMemo(() => {
    return (
      resolveInteractiveTopic(activeModuleKey, currentRole, lang) ||
      resolveInteractiveTopic('dashboard', currentRole, lang)
    );
  }, [activeModuleKey, currentRole, lang]);

  // Manage CSS enter/exit transition state for the Floating Hover Popup Card
  const shouldShowHover = Boolean(enabled && !isTourRunning && resolvedHover && popupPosition);
  const [renderedHover, setRenderedHover] = useState<{
    topic: NonNullable<typeof resolvedHover>;
    pos: NonNullable<typeof popupPosition>;
  } | null>(null);
  const [hoverExiting, setHoverExiting] = useState(false);

  useEffect(() => {
    if (shouldShowHover && resolvedHover && popupPosition) {
      if (hoverExitTimerRef.current !== null) {
        window.clearTimeout(hoverExitTimerRef.current);
        hoverExitTimerRef.current = null;
      }
      setHoverExiting(false);
      setRenderedHover({ topic: resolvedHover, pos: popupPosition });
      return;
    }

    if (renderedHover) {
      setHoverExiting(true);
      if (hoverExitTimerRef.current !== null) {
        window.clearTimeout(hoverExitTimerRef.current);
      }
      hoverExitTimerRef.current = window.setTimeout(() => {
        setRenderedHover(null);
        setHoverExiting(false);
        hoverExitTimerRef.current = null;
      }, MASCOT_EXIT_DURATION_MS);
    }
  }, [shouldShowHover, resolvedHover, popupPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manage CSS enter/exit transition state for the Dock Speech / Event Bubble
  const shouldShowBubble = Boolean(
    !drawerMounted &&
      (activeDashboardEvent || (enabled && !bubbleMinimized && activeContextTopic))
  );
  const [bubbleMounted, setBubbleMounted] = useState(shouldShowBubble);
  const [bubbleExiting, setBubbleExiting] = useState(false);

  const liveBubbleSnapshot = useMemo(() => {
    if (activeDashboardEvent) {
      return {
        kind: 'event' as const,
        event: activeDashboardEvent,
      };
    }
    if (resolvedHover || activeContextTopic) {
      return {
        kind: 'guide' as const,
        title: resolvedHover ? resolvedHover.title : activeContextTopic!.title,
        summary: resolvedHover
          ? resolvedHover.summary
          : lang === 'th'
          ? `เอาเมาส์ชี้ปุ่มหรือเมนูใดก็ได้เพื่อดูวิธีใช้ หรือคลิก${mascotDisplayNameTh}เพื่อเริ่มทัวร์หน้านี้`
          : `Hover any button for hints or click ${mascotDisplayNameEn} to start this page’s Guided Tour.`,
      };
    }
    return null;
  }, [
    activeDashboardEvent,
    resolvedHover,
    activeContextTopic,
    lang,
    mascotDisplayNameTh,
    mascotDisplayNameEn,
  ]);

  const [renderedBubble, setRenderedBubble] = useState(liveBubbleSnapshot);

  useEffect(() => {
    if (shouldShowBubble && liveBubbleSnapshot) {
      if (bubbleExitTimerRef.current !== null) {
        window.clearTimeout(bubbleExitTimerRef.current);
        bubbleExitTimerRef.current = null;
      }
      setBubbleExiting(false);
      setBubbleMounted(true);
      setRenderedBubble(liveBubbleSnapshot);
      return;
    }

    if (bubbleMounted) {
      setBubbleExiting(true);
      if (bubbleExitTimerRef.current !== null) {
        window.clearTimeout(bubbleExitTimerRef.current);
      }
      bubbleExitTimerRef.current = window.setTimeout(() => {
        setBubbleMounted(false);
        setBubbleExiting(false);
        bubbleExitTimerRef.current = null;
      }, BUBBLE_EXIT_DURATION_MS);
    }
  }, [shouldShowBubble, liveBubbleSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  const dockMascotMood: MascotMood = activeDashboardEvent
    ? activeDashboardEvent.type
    : resolvedHover
    ? resolvedHover.topic.mood
    : 'happy';
  const dockMascotSleeping = !enabled && !activeDashboardEvent;

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
      {/* 0. INTERACTIVE STEP-BY-STEP SPOTLIGHT GUIDED TOUR */}
      {isTourRunning && activeTourStep && tourCtx && tourCardPosition && (
        <div data-mascot-chrome="true" className="fixed inset-0 z-50 pointer-events-none">
          {/* Spotlight Cutout Frame with subtle dark backdrop */}
          {tourTargetRect ? (
            <div
              aria-hidden="true"
              style={{
                left: Math.max(4, tourTargetRect.left - 6),
                top: Math.max(4, tourTargetRect.top - 6),
                width: Math.max(24, tourTargetRect.width + 12),
                height: Math.max(24, tourTargetRect.height + 12),
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.52)',
              }}
              className="fixed rounded-2xl ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transition-all duration-200 pointer-events-none"
            />
          ) : (
            <div className="fixed inset-0 bg-slate-900/45 pointer-events-none" />
          )}

          {/* Anchored Guided Tour Mascot Pop-up Card */}
          <div
            role="dialog"
            aria-modal="false"
            aria-label={lang === 'th' ? activeTourStep.titleTh : activeTourStep.titleEn}
            style={{
              left: tourCardPosition.left,
              top: tourCardPosition.top,
              width: tourCardPosition.width,
            }}
            className="fixed z-50 pointer-events-auto rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-card)] shadow-2xl p-4 text-[var(--color-text-body)] space-y-3 mascot-enter"
          >
            {/* Card Header with Animated Mascot & Step Counter */}
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-[var(--color-primary-light)] px-1.5 py-1 border border-[var(--color-border)] flex items-center justify-center">
                <MascotAvatar mood={activeTourStep.mood} character={mascotCharacter} size={42} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-primary-text)] tabular-nums">
                    <Compass className="w-3 h-3 shrink-0" />
                    <span>
                      {lang === 'th'
                        ? `ทัวร์นำทาง · ขั้นตอน ${tourCtx.activeTourStepIndex + 1}/${tourCtx.activeTourSteps.length}`
                        : `Guided Tour · Step ${tourCtx.activeTourStepIndex + 1}/${tourCtx.activeTourSteps.length}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={tourCtx.endTour}
                    aria-label={lang === 'th' ? 'ปิดทัวร์นำทาง' : 'Close tour'}
                    className="p-1 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="text-sm font-extrabold text-[var(--color-text-title)] leading-snug mt-0.5">
                  {lang === 'th' ? activeTourStep.titleTh : activeTourStep.titleEn}
                </h4>
              </div>
            </div>

            {/* Step Description & Hint */}
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                {lang === 'th' ? activeTourStep.descriptionTh : activeTourStep.descriptionEn}
              </p>

              {(activeTourStep.actionHintTh || activeTourStep.actionHintEn) && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-2 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
                  <span>
                    {lang === 'th' ? activeTourStep.actionHintTh : activeTourStep.actionHintEn}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Dots + Navigation Controls */}
            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {tourCtx.activeTourSteps.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => tourCtx.goToTourStep(idx)}
                    aria-label={`Step ${idx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === tourCtx.activeTourStepIndex
                        ? 'w-5 bg-[var(--color-primary)]'
                        : 'w-2 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    tourCtx.endTour();
                    onToggleEnabled(false);
                  }}
                  title={lang === 'th' ? 'ปิดการนำทางทั้งหมด' : 'Turn off navigation guide'}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[var(--color-card-subtle)] transition cursor-pointer whitespace-nowrap"
                >
                  {lang === 'th' ? 'ปิดนำทาง' : 'Turn Off'}
                </button>

                {tourCtx.activeTourStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={tourCtx.prevTourStep}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-xs font-bold text-[var(--color-text-title)] transition cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'ย้อนกลับ' : 'Back'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={tourCtx.nextTourStep}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
                >
                  {tourCtx.activeTourStepIndex + 1 >= tourCtx.activeTourSteps.length ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'เสร็จสิ้น' : 'Finish'}</span>
                    </>
                  ) : (
                    <>
                      <span>{lang === 'th' ? 'ถัดไป' : 'Next'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. FLOATING HOVER-TO-EXPLAIN POPUP CARD (when Guide ON, no tour running, & hovering a tagged feature) */}
      {renderedHover && (
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
            left: renderedHover.pos.left,
            top: renderedHover.pos.top,
            width: renderedHover.pos.width,
          }}
          className={`fixed z-50 rounded-2xl border border-[var(--color-primary)]/40 bg-[var(--color-card)]/98 backdrop-blur-md shadow-xl p-3.5 text-[var(--color-text-body)] ${
            hoverExiting ? 'mascot-exit' : 'mascot-enter'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 rounded-xl bg-[var(--color-primary-light)] px-1.5 py-1 border border-[var(--color-border)] flex items-center justify-center">
              <MascotAvatar mood={renderedHover.topic.topic.mood} character={mascotCharacter} size={38} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary-text)]">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>{audienceBadgeText(renderedHover.topic.topic.audience)}</span>
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
                {renderedHover.topic.title}
              </h4>
              <p className="text-[11px] text-[var(--color-text-body)] leading-relaxed mt-1">
                {renderedHover.topic.summary}
              </p>
            </div>
          </div>

          {renderedHover.topic.howTo.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-[var(--color-border)] space-y-1">
              <div className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                <MousePointerClick className="w-3 h-3 text-[var(--color-primary-text)] shrink-0" />
                <span>{lang === 'th' ? 'วิธีใช้งานด่วน:' : 'Quick Steps:'}</span>
              </div>
              <ul className="space-y-1">
                {renderedHover.topic.howTo.slice(0, 3).map((step, idx) => (
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

          {renderedHover.topic.tip && (
            <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 text-[10px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-300" />
              <span className="leading-snug">{renderedHover.topic.tip}</span>
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
              {renderedHover.topic.topic.guideModuleId && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenFullGuide({
                      moduleId: renderedHover.topic.topic.guideModuleId as GuideModuleId,
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
      {!isTourRunning && (
      <div
        data-mascot-chrome="true"
        className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]"
      >
        {/* Expandable In-Module Student & Teacher Guide Explorer */}
        {drawerMounted && (
          <div
            className={`w-[min(410px,calc(100vw-2rem))] max-h-[76vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden text-[var(--color-text-body)] ${
              drawerExiting ? 'mascot-exit' : 'mascot-enter'
            }`}
          >
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <MascotAvatar
                  mood={activeDashboardEvent ? activeDashboardEvent.type : enabled ? 'celebrate' : 'happy'}
                  sleeping={!enabled && !activeDashboardEvent}
                  character={mascotCharacter}
                  size={40}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-extrabold text-[var(--color-text-title)] truncate">
                      {lang === 'th' ? `${mascotDisplayNameTh} · สุนัขนำทางวิธีใช้` : `${mascotDisplayNameEn} · Guide Buddies`}
                    </h3>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                    {enabled
                      ? lang === 'th'
                        ? 'เปิดอยู่ — เอาเมาส์ชี้เมนู/ปุ่ม หรือกดเริ่มทัวร์หน้านี้ได้เลย'
                        : 'ON — Hover buttons or start a Guided Tour for this page'
                      : lang === 'th'
                      ? 'ปิดป๊อปอัปชี้เมาส์อยู่ (เปิดใหม่ได้ทุกเมื่อ)'
                      : 'Hover guide is OFF (re-enable anytime)'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => closeDrawer()}
                aria-label={lang === 'th' ? 'พับหน้าต่างการ์ตูนนำทาง' : 'Collapse guide drawer'}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-title)] transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Guided Tour Trigger for Current Page + Interactive ON/OFF Switch + Role Tabs */}
            <div className="p-3 border-b border-[var(--color-border)] space-y-2.5 shrink-0 bg-[var(--color-card)]">
              {currentModuleTourDef && tourCtx && (
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer(() => {
                      tourCtx.startModuleTour(activeModuleKey);
                    });
                  }}
                  className="w-full flex items-center justify-between gap-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-3 py-2.5 shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0 text-left">
                    <Play className="w-4 h-4 shrink-0 fill-current" />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold truncate">
                        {lang === 'th' ? currentModuleTourDef.titleTh : currentModuleTourDef.titleEn}
                      </div>
                      <div className="text-[10px] text-blue-100 truncate">
                        {lang === 'th' ? currentModuleTourDef.subtitleTh : currentModuleTourDef.subtitleEn}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              )}

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

              {/* Mascot Buddy Selector: Duo / Charcoal / Mee */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2 space-y-1.5">
                <div className="text-[10px] font-bold text-[var(--color-text-muted)] px-0.5">
                  {lang === 'th' ? 'เลือกน้องหมานำทาง' : 'Choose Guide Dog'}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectCharacter('duo')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer whitespace-nowrap ${
                      mascotCharacter === 'duo'
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-2xs'
                        : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {lang === 'th' ? 'ชาร์โคล & หมี' : 'Both Dogs'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectCharacter('charcoal')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer whitespace-nowrap ${
                      mascotCharacter === 'charcoal'
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-2xs'
                        : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {lang === 'th' ? 'ชาร์โคล (อ้วน)' : 'Charcoal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectCharacter('mee')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer whitespace-nowrap ${
                      mascotCharacter === 'mee'
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-2xs'
                        : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {lang === 'th' ? 'หมี (ไส้กรอก)' : 'Mee'}
                  </button>
                </div>
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
                              closeDrawer();
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
                            closeDrawer();
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
                  closeDrawer(() => {
                    onOpenFullGuide({
                      roleTab: drawerRoleTab === 'student' ? 'student' : 'teacher',
                    });
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
        {!drawerMounted && (
          <div className="flex items-end gap-2">
            {/* Live Cartoon Speech Bubble (Event reaction OR Hover/Context guide) */}
            {bubbleMounted && renderedBubble && (
              <div
                className={`hidden sm:flex flex-col max-w-[280px] rounded-2xl border backdrop-blur-sm shadow-lg px-3 py-2 text-[var(--color-text-body)] ${
                  renderedBubble.kind === 'event'
                    ? renderedBubble.event.type === 'success'
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/95 dark:bg-emerald-950/90'
                      : renderedBubble.event.type === 'warning'
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50/95 dark:bg-amber-950/90'
                      : 'border-rose-300 dark:border-rose-700 bg-rose-50/95 dark:bg-rose-950/90'
                    : 'border-[var(--color-border)] bg-[var(--color-card)]/95'
                } ${bubbleExiting ? 'mascot-bubble-exit' : 'mascot-bubble-enter'}`}
              >
                {renderedBubble.kind === 'event' ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-extrabold truncate ${
                          renderedBubble.event.type === 'success'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : renderedBubble.event.type === 'warning'
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {renderedBubble.event.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : renderedBubble.event.type === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {lang === 'th' ? renderedBubble.event.titleTh : renderedBubble.event.titleEn}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={dismissDashboardEvent}
                        aria-label={lang === 'th' ? 'ปิดการแจ้งเตือนจากน้องหมา' : 'Dismiss status message'}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] text-[10px] cursor-pointer shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-body)] leading-snug mt-0.5 line-clamp-2">
                      {lang === 'th' ? renderedBubble.event.messageTh : renderedBubble.event.messageEn}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-[var(--color-primary-text)] truncate">
                        {renderedBubble.title}
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
                      {renderedBubble.summary}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Compact Floating Cartoon Mascot Launcher */}
            {!enabled && dockMinimizedWhenOff && !activeDashboardEvent ? (
              <button
                type="button"
                onClick={() => {
                  onToggleEnabled(true);
                  setDockMinimizedWhenOff(false);
                }}
                title={lang === 'th' ? 'เปิดตัวการ์ตูนนำทางวิธีใช้' : 'Turn ON Interactive Cartoon Guide'}
                className="mascot-enter inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)]/90 px-3 py-1.5 text-[11px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary-text)] hover:border-[var(--color-primary)] shadow-md transition cursor-pointer whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                <span>{lang === 'th' ? 'เปิดการ์ตูนนำทาง' : 'Guide OFF'}</span>
              </button>
            ) : (
              <div
                className={`flex items-center gap-1.5 ${
                  dockMascotExiting ? 'mascot-exit' : 'mascot-enter'
                }`}
              >
                {!enabled && !activeDashboardEvent && (
                  <button
                    type="button"
                    onClick={minimizeDockWhenOff}
                    aria-label={lang === 'th' ? 'ย่อปุ่มการ์ตูน' : 'Minimize guide button'}
                    className="p-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] shadow-sm text-[10px] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={openDrawer}
                  title={
                    enabled
                      ? lang === 'th'
                        ? 'คลิกเพื่อเริ่มทัวร์หน้านี้ / ดูคู่มือคุณครู & นักเรียน'
                        : 'Click to launch Guided Tour or browse Student & Teacher guides'
                      : lang === 'th'
                      ? 'การนำทางปิดอยู่ — คลิกเพื่อเปิดดูคู่มือหรือเปิดใช้งานอีกครั้ง'
                      : 'Guide is OFF — click to open guides or re-enable'
                  }
                  className={`group relative flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 shadow-lg transition cursor-pointer ${
                    activeDashboardEvent?.type === 'success'
                      ? 'border-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/80'
                      : activeDashboardEvent?.type === 'warning'
                      ? 'border-amber-400 bg-amber-50/90 dark:bg-amber-950/80'
                      : activeDashboardEvent?.type === 'error'
                      ? 'border-rose-400 bg-rose-50/90 dark:bg-rose-950/80'
                      : enabled
                      ? 'border-[var(--color-primary)]/50 bg-[var(--color-card)] hover:border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] opacity-90 hover:opacity-100'
                  }`}
                >
                  <MascotAvatar
                    mood={dockMascotMood}
                    sleeping={dockMascotSleeping}
                    character={mascotCharacter}
                    size={38}
                  />
                  <div className="text-left pr-1">
                    <div className="text-[11px] font-extrabold text-[var(--color-text-title)] leading-tight whitespace-nowrap">
                      {lang === 'th' ? mascotDisplayNameTh : mascotDisplayNameEn}
                    </div>
                    <div
                      className={`text-[10px] font-bold leading-tight whitespace-nowrap ${
                        activeDashboardEvent?.type === 'success'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : activeDashboardEvent?.type === 'warning'
                          ? 'text-amber-700 dark:text-amber-300'
                          : activeDashboardEvent?.type === 'error'
                          ? 'text-rose-700 dark:text-rose-300'
                          : enabled
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {activeDashboardEvent
                        ? activeDashboardEvent.type === 'success'
                          ? lang === 'th'
                            ? 'สำเร็จ!'
                            : 'Success!'
                          : activeDashboardEvent.type === 'warning'
                          ? lang === 'th'
                            ? 'แจ้งเตือน'
                            : 'Warning'
                          : lang === 'th'
                          ? 'พบปัญหา'
                          : 'Error'
                        : enabled
                        ? lang === 'th'
                          ? 'เปิดอยู่'
                          : 'Tour ON'
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
      )}
    </>
  );
};
