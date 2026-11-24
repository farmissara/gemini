import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crosshair,
  Lightbulb,
  MapPin,
  Play,
  Power,
  X,
} from 'lucide-react';
import { AppLanguage, UserRole } from '../../types';
import {
  GUIDED_PLAYBOOKS,
  MODULE_GUIDED_TOURS,
  ModuleTourStep,
  resolveTourStepsForPage,
} from '../../data/moduleGuidedTours';

export interface TourNavigationTarget {
  moduleId: string;
  settingsTab?: string;
}

interface PendingTourRequest {
  moduleId: string;
  settingsTab?: string;
  playbookId?: string | null;
  playbookStepIndex?: number;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuideTourContextValue {
  isGuideEnabled: boolean;
  setGuideEnabled: (next: boolean) => void;
  toggleGuideEnabled: () => void;
  activeTourModuleId: string | null;
  activeTourSteps: ModuleTourStep[];
  activeTourStepIndex: number;
  activePlaybookId: string | null;
  activePlaybookStepIndex: number;
  startModuleTour: (moduleId: string) => boolean;
  startModuleTourAtTarget: (moduleId: string, settingsTab?: string) => void;
  startPlaybook: (playbookId: string, stepIndex?: number) => void;
  nextPlaybookStage: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  goToTourStep: (index: number) => void;
  endTour: () => void;
  currentRole: UserRole;
  lang: AppLanguage;
}

const GuideTourContext = createContext<GuideTourContextValue | null>(null);

interface GuideTourProviderProps {
  currentRole: UserRole;
  currentTab: string;
  lang: AppLanguage;
  isGuideEnabled: boolean;
  onSetGuideEnabled: (next: boolean) => void;
  onNavigateToTourTarget?: (target: TourNavigationTarget) => void;
  children: React.ReactNode;
}

export const GuideTourProvider: React.FC<GuideTourProviderProps> = ({
  currentRole,
  currentTab,
  lang,
  isGuideEnabled,
  onSetGuideEnabled,
  onNavigateToTourTarget,
  children,
}) => {
  const [activeTourModuleId, setActiveTourModuleId] = useState<string | null>(null);
  const [activeTourSteps, setActiveTourSteps] = useState<ModuleTourStep[]>([]);
  const [activeTourStepIndex, setActiveTourStepIndex] = useState(0);
  const [activePlaybookId, setActivePlaybookId] = useState<string | null>(null);
  const [activePlaybookStepIndex, setActivePlaybookStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  const pendingTourRef = useRef<PendingTourRequest | null>(null);
  const suppressTabResetRef = useRef(false);
  const onNavigateToTourTargetRef = useRef(onNavigateToTourTarget);
  useEffect(() => {
    onNavigateToTourTargetRef.current = onNavigateToTourTarget;
  }, [onNavigateToTourTarget]);

  const clearTourState = useCallback(() => {
    setActiveTourModuleId(null);
    setActiveTourSteps([]);
    setActiveTourStepIndex(0);
    setActivePlaybookId(null);
    setActivePlaybookStepIndex(0);
    setSpotlightRect(null);
    pendingTourRef.current = null;
  }, []);

  // Try launching any pending cross-module tour once target tab mounts
  const attemptPendingLaunch = useCallback(() => {
    const pending = pendingTourRef.current;
    if (!pending) return false;
    if (currentTab !== pending.moduleId) return false;

    const { steps } = resolveTourStepsForPage(pending.moduleId, currentRole, lang, {
      allowUnmountedSettingsTabSteps: true,
    });
    if (steps.length === 0) return false;

    let initialIdx = 0;
    if (pending.settingsTab) {
      const matchedIdx = steps.findIndex((s) => s.settingsTab === pending.settingsTab);
      if (matchedIdx >= 0) initialIdx = matchedIdx;
    }

    setActiveTourModuleId(pending.moduleId);
    setActiveTourSteps(steps);
    setActiveTourStepIndex(initialIdx);
    setActivePlaybookId(pending.playbookId ?? null);
    setActivePlaybookStepIndex(pending.playbookStepIndex ?? 0);
    pendingTourRef.current = null;
    return true;
  }, [currentRole, currentTab, lang]);

  // Close manual tours if user switches module tab, unless transitioning into a pending target
  useEffect(() => {
    if (suppressTabResetRef.current) {
      suppressTabResetRef.current = false;
      return;
    }

    const pending = pendingTourRef.current;
    if (pending && pending.moduleId === currentTab) {
      // Allow lazy-loaded view a brief window to mount its DOM nodes
      const delays = [0, 80, 220, 480, 850];
      const timers = delays.map((ms) =>
        window.setTimeout(() => {
          attemptPendingLaunch();
        }, ms)
      );
      return () => timers.forEach((id) => window.clearTimeout(id));
    }

    if (pending && pending.moduleId !== currentTab) {
      return;
    }

    clearTourState();
  }, [attemptPendingLaunch, clearTourState, currentTab]);

  useEffect(() => {
    if (!isGuideEnabled) {
      clearTourState();
    }
  }, [clearTourState, isGuideEnabled]);

  const currentStep = activeTourSteps[activeTourStepIndex] || null;
  const activePlaybook = activePlaybookId
    ? GUIDED_PLAYBOOKS.find((p) => p.id === activePlaybookId) || null
    : null;
  const hasNextPlaybookStage = Boolean(
    activePlaybook && activePlaybookStepIndex + 1 < activePlaybook.steps.length
  );

  // When a step specifies a settingsTab inside system_settings, ensure that sub-tab is opened
  useEffect(() => {
    if (!currentStep?.settingsTab || !activeTourModuleId) return;
    if (activeTourModuleId === 'system_settings') {
      onNavigateToTourTargetRef.current?.({
        moduleId: 'system_settings',
        settingsTab: currentStep.settingsTab,
      });
    }
  }, [activeTourModuleId, currentStep?.id, currentStep?.settingsTab]);

  const syncSpotlightForSelector = useCallback((selector: string | null, scrollIntoView: boolean) => {
    if (!selector || typeof document === 'undefined') {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      setSpotlightRect(null);
      return;
    }
    if (scrollIntoView) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      } catch {
        el.scrollIntoView();
      }
    }
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      setSpotlightRect(null);
      return;
    }
    const pad = 6;
    setSpotlightRect({
      top: Math.max(4, rect.top - pad),
      left: Math.max(4, rect.left - pad),
      width: Math.min(window.innerWidth - 8, rect.width + pad * 2),
      height: Math.min(window.innerHeight - 8, rect.height + pad * 2),
    });
  }, []);

  // Track highlighted element bounds during scroll, resize, and lazy sub-tab switches
  useEffect(() => {
    if (!currentStep) {
      setSpotlightRect(null);
      return;
    }

    syncSpotlightForSelector(currentStep.selector, true);

    const retryDelays = [90, 240, 500, 850];
    const timers = retryDelays.map((ms) =>
      window.setTimeout(() => {
        syncSpotlightForSelector(currentStep.selector, ms === 240);
      }, ms)
    );

    const handleViewportChange = () => {
      syncSpotlightForSelector(currentStep.selector, false);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [currentStep, syncSpotlightForSelector]);

  const toggleGuideEnabled = useCallback(() => {
    onSetGuideEnabled(!isGuideEnabled);
  }, [isGuideEnabled, onSetGuideEnabled]);

  const startModuleTour = useCallback(
    (moduleId: string) => {
      if (!isGuideEnabled) {
        onSetGuideEnabled(true);
      }
      const { steps } = resolveTourStepsForPage(moduleId, currentRole, lang, {
        allowUnmountedSettingsTabSteps: true,
      });
      if (steps.length === 0) return false;
      setActivePlaybookId(null);
      setActivePlaybookStepIndex(0);
      setActiveTourModuleId(moduleId);
      setActiveTourSteps(steps);
      setActiveTourStepIndex(0);
      return true;
    },
    [currentRole, isGuideEnabled, lang, onSetGuideEnabled]
  );

  const launchTarget = useCallback(
    (req: PendingTourRequest) => {
      if (!isGuideEnabled) {
        onSetGuideEnabled(true);
      }
      pendingTourRef.current = req;

      if (currentTab === req.moduleId) {
        if (req.settingsTab) {
          onNavigateToTourTargetRef.current?.({ moduleId: req.moduleId, settingsTab: req.settingsTab });
        }
        const launched = attemptPendingLaunch();
        if (!launched) {
          const delays = [80, 250, 600];
          delays.forEach((ms) => window.setTimeout(() => attemptPendingLaunch(), ms));
        }
        return;
      }

      if (onNavigateToTourTargetRef.current) {
        suppressTabResetRef.current = false;
        onNavigateToTourTargetRef.current({ moduleId: req.moduleId, settingsTab: req.settingsTab });
      }
    },
    [attemptPendingLaunch, currentTab, isGuideEnabled, onSetGuideEnabled]
  );

  const startModuleTourAtTarget = useCallback(
    (moduleId: string, settingsTab?: string) => {
      launchTarget({
        moduleId,
        settingsTab,
        playbookId: null,
        playbookStepIndex: 0,
      });
    },
    [launchTarget]
  );

  const startPlaybook = useCallback(
    (playbookId: string, stepIndex = 0) => {
      const playbook = GUIDED_PLAYBOOKS.find((p) => p.id === playbookId);
      if (!playbook || playbook.steps.length === 0) return;
      const safeIdx = Math.max(0, Math.min(stepIndex, playbook.steps.length - 1));
      const stage = playbook.steps[safeIdx];
      launchTarget({
        moduleId: stage.moduleId,
        settingsTab: stage.settingsTab,
        playbookId,
        playbookStepIndex: safeIdx,
      });
    },
    [launchTarget]
  );

  const nextPlaybookStage = useCallback(() => {
    if (!activePlaybook) {
      clearTourState();
      return;
    }
    const nextIdx = activePlaybookStepIndex + 1;
    if (nextIdx >= activePlaybook.steps.length) {
      clearTourState();
      return;
    }
    startPlaybook(activePlaybook.id, nextIdx);
  }, [activePlaybook, activePlaybookStepIndex, clearTourState, startPlaybook]);

  const endTour = useCallback(() => {
    clearTourState();
  }, [clearTourState]);

  const nextTourStep = useCallback(() => {
    if (activeTourStepIndex + 1 >= activeTourSteps.length) {
      if (hasNextPlaybookStage) {
        nextPlaybookStage();
      } else {
        clearTourState();
      }
      return;
    }
    setActiveTourStepIndex((prev) => prev + 1);
  }, [activeTourStepIndex, activeTourSteps.length, clearTourState, hasNextPlaybookStage, nextPlaybookStage]);

  const prevTourStep = useCallback(() => {
    setActiveTourStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToTourStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= activeTourSteps.length) return;
      setActiveTourStepIndex(index);
    },
    [activeTourSteps.length]
  );

  // Keyboard navigation: Escape closes, Left/Right moves steps unless typing in form control
  useEffect(() => {
    if (activeTourSteps.length === 0) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable);

      if (event.key === 'Escape') {
        clearTourState();
      } else if (!isTyping && event.key === 'ArrowRight') {
        event.preventDefault();
        nextTourStep();
      } else if (!isTyping && event.key === 'ArrowLeft') {
        event.preventDefault();
        prevTourStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTourSteps.length, clearTourState, nextTourStep, prevTourStep]);

  const value = useMemo<GuideTourContextValue>(
    () => ({
      isGuideEnabled,
      setGuideEnabled: onSetGuideEnabled,
      toggleGuideEnabled,
      activeTourModuleId,
      activeTourSteps,
      activeTourStepIndex,
      activePlaybookId,
      activePlaybookStepIndex,
      startModuleTour,
      startModuleTourAtTarget,
      startPlaybook,
      nextPlaybookStage,
      nextTourStep,
      prevTourStep,
      goToTourStep,
      endTour,
      currentRole,
      lang,
    }),
    [
      isGuideEnabled,
      onSetGuideEnabled,
      toggleGuideEnabled,
      activeTourModuleId,
      activeTourSteps,
      activeTourStepIndex,
      activePlaybookId,
      activePlaybookStepIndex,
      startModuleTour,
      startModuleTourAtTarget,
      startPlaybook,
      nextPlaybookStage,
      nextTourStep,
      prevTourStep,
      goToTourStep,
      endTour,
      currentRole,
      lang,
    ]
  );

  const checklist = currentStep
    ? lang === 'th'
      ? currentStep.checklistTh || []
      : currentStep.checklistEn || []
    : [];
  const actionHint = currentStep
    ? lang === 'th'
      ? currentStep.actionHintTh
      : currentStep.actionHintEn
    : undefined;
  const activeDefinition = activeTourModuleId ? MODULE_GUIDED_TOURS[activeTourModuleId] : null;
  const progressPct =
    activeTourSteps.length > 0
      ? Math.round(((activeTourStepIndex + 1) / activeTourSteps.length) * 100)
      : 0;

  return (
    <GuideTourContext.Provider value={value}>
      {children}

      {/* Live non-blocking visual spotlight over target element */}
      {currentStep && spotlightRect && (
        <>
          <div
            aria-hidden="true"
            className="fixed z-40 pointer-events-none rounded-2xl border-2 border-[var(--color-primary)] transition-all duration-200 print:hidden"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
              boxShadow:
                '0 0 0 9999px rgba(15, 23, 42, 0.42), 0 0 0 4px rgba(59, 130, 246, 0.28)',
            }}
          />
          <div
            aria-hidden="true"
            className="fixed z-40 pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-bold text-white shadow-lg print:hidden transition-all duration-200"
            style={{
              top: spotlightRect.top > 38 ? spotlightRect.top - 32 : spotlightRect.top + spotlightRect.height + 8,
              left: Math.min(Math.max(12, spotlightRect.left), Math.max(12, window.innerWidth - 210)),
            }}
          >
            <MapPin className="w-3 h-3 shrink-0" />
            <span>
              {lang === 'th'
                ? `ดูตรงนี้ · ขั้นที่ ${activeTourStepIndex + 1}/${activeTourSteps.length}`
                : `Look here · Step ${activeTourStepIndex + 1}/${activeTourSteps.length}`}
            </span>
          </div>
        </>
      )}

      {/* Detailed Hand-Holding Step-by-Step Guide Card */}
      {currentStep && (
        <aside
          role="dialog"
          aria-label={lang === 'th' ? 'คำแนะนำการใช้งานทีละขั้นตอน' : 'Step-by-step guide'}
          className="fixed bottom-4 right-4 z-50 w-[min(27rem,calc(100vw-1.5rem))] max-h-[82vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden print:hidden animate-in fade-in duration-150"
        >
          {/* Optional Playbook Journey Banner */}
          {activePlaybook && (
            <div className="px-4 py-2 bg-[var(--color-primary)] text-white flex items-center justify-between gap-2 text-[11px]">
              <div className="min-w-0">
                <span className="font-bold block truncate">
                  {lang === 'th' ? activePlaybook.titleTh : activePlaybook.titleEn}
                </span>
                <span className="opacity-90">
                  {lang === 'th'
                    ? `ด่านที่ ${activePlaybookStepIndex + 1} / ${activePlaybook.steps.length}: ${activePlaybook.steps[activePlaybookStepIndex]?.titleTh || ''}`
                    : `Stage ${activePlaybookStepIndex + 1} / ${activePlaybook.steps.length}: ${activePlaybook.steps[activePlaybookStepIndex]?.titleEn || ''}`}
                </span>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="h-1 w-full bg-[var(--color-card-subtle)] shrink-0">
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="p-4 space-y-3 overflow-y-auto min-h-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[var(--color-text-muted)] tabular-nums flex flex-wrap items-center gap-1.5">
                    <span>
                      {lang === 'th' ? 'ขั้นตอนที่' : 'Step'} {activeTourStepIndex + 1} / {activeTourSteps.length}
                    </span>
                    {activeDefinition && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">
                          {lang === 'th' ? activeDefinition.titleTh : activeDefinition.titleEn}
                        </span>
                      </>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-[var(--color-text-title)] leading-snug mt-0.5">
                    {lang === 'th' ? currentStep.titleTh : currentStep.titleEn}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => syncSpotlightForSelector(currentStep.selector, true)}
                  title={lang === 'th' ? 'ชี้จุดบนหน้าจออีกครั้ง' : 'Refocus highlighted element'}
                  aria-label={lang === 'th' ? 'ชี้จุดบนหน้าจออีกครั้ง' : 'Refocus element'}
                  className="p-1.5 rounded-lg text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)] transition cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={endTour}
                  aria-label={lang === 'th' ? 'ปิดทัวร์แนะนำ' : 'Close tour'}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
              {lang === 'th' ? currentStep.descriptionTh : currentStep.descriptionEn}
            </p>

            {/* Detailed numbered micro-checklist */}
            {checklist.length > 0 && (
              <div className="rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] p-3 space-y-2">
                <div className="text-[11px] font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{lang === 'th' ? 'ทำตามทีละขั้น:' : 'Step-by-step checklist:'}</span>
                </div>
                <ol className="space-y-1.5">
                  {checklist.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-[var(--color-text-body)] leading-relaxed"
                    >
                      <span className="w-4 h-4 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Highlighted actionable callout */}
            {actionHint && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2 leading-relaxed">
                <Lightbulb className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                <span>{actionHint}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={prevTourStep}
                disabled={activeTourStepIndex === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-body)] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ก่อนหน้า' : 'Prev'}</span>
              </button>

              <div className="flex items-center gap-1">
                {activeTourSteps.map((step, index) => (
                  <button
                    key={`${step.id || step.titleTh}-${index}`}
                    type="button"
                    onClick={() => goToTourStep(index)}
                    aria-label={`Step ${index + 1}`}
                    className={`h-1.5 rounded-full transition cursor-pointer ${
                      index === activeTourStepIndex
                        ? 'w-4 bg-[var(--color-primary)]'
                        : 'w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={nextTourStep}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 transition cursor-pointer whitespace-nowrap"
              >
                <span>
                  {activeTourStepIndex + 1 >= activeTourSteps.length
                    ? hasNextPlaybookStage
                      ? lang === 'th'
                        ? 'ไปโมดูลถัดไป'
                        : 'Next Module'
                      : lang === 'th'
                      ? 'เสร็จสิ้น'
                      : 'Done'
                    : lang === 'th'
                    ? 'ถัดไป'
                    : 'Next'}
                </span>
                {activeTourStepIndex + 1 < activeTourSteps.length ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : hasNextPlaybookStage ? (
                  <ArrowRight className="w-3.5 h-3.5" />
                ) : null}
              </button>
            </div>
          </div>
        </aside>
      )}
    </GuideTourContext.Provider>
  );
};

export function useGuideTour() {
  return useContext(GuideTourContext);
}

interface ModuleTourTriggerProps {
  moduleId: string;
  lang: AppLanguage;
  className?: string;
  floating?: boolean;
}

/**
 * Embedded per-module Guided Tour trigger & ON/OFF toggle control.
 * Lives directly inside each main module (Dashboard, Gradebook, Students, Attendance, etc.)
 * instead of the login screen.
 */
export const ModuleTourTrigger: React.FC<ModuleTourTriggerProps> = ({
  moduleId,
  lang,
  className = '',
  floating = false,
}) => {
  const ctx = useGuideTour();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasTour = Boolean(MODULE_GUIDED_TOURS[moduleId]);
  if (!ctx || !hasTour) return null;

  const isThisTourActive = ctx.activeTourModuleId === moduleId;

  if (floating) {
    return (
      <div className={`fixed bottom-20 right-3 z-[110] print:hidden sm:right-5 md:bottom-5 ${className}`}>
        {isMenuOpen && (
          <div
            role="group"
            aria-label={lang === 'th' ? 'เมนูทัวร์แนะนำ' : 'Guided tour menu'}
            className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 shadow-xl"
          >
            <p className="px-1 pb-2 text-xs font-bold text-[var(--color-text-title)]">
              {lang === 'th' ? 'ช่วยเหลือหน้านี้' : 'Page help'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (isThisTourActive) ctx.endTour();
                else ctx.startModuleTour(moduleId);
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]"
            >
              {isThisTourActive ? <Compass className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>
                {isThisTourActive
                  ? lang === 'th' ? 'จบทัวร์แนะนำ' : 'End guided tour'
                  : lang === 'th' ? 'ทัวร์วิธีใช้หน้านี้' : 'Guided tour'}
              </span>
            </button>
            <button
              type="button"
              onClick={ctx.toggleGuideEnabled}
              aria-pressed={ctx.isGuideEnabled}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]"
            >
              <Power className={`h-4 w-4 ${ctx.isGuideEnabled ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`} />
              <span>
                {lang === 'th'
                  ? `ทัวร์แนะนำ ${ctx.isGuideEnabled ? 'เปิด' : 'ปิด'} · กดเพื่อ${ctx.isGuideEnabled ? 'ปิด' : 'เปิด'}`
                  : `Guides ${ctx.isGuideEnabled ? 'on' : 'off'} · Click to ${ctx.isGuideEnabled ? 'turn off' : 'turn on'}`}
              </span>
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={lang === 'th' ? 'เปิดเมนูช่วยเหลือและทัวร์แนะนำ' : 'Open help and guided tour'}
          aria-expanded={isMenuOpen}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--color-primary)] bg-[var(--color-card)] px-3.5 text-xs font-bold text-[var(--color-primary-text)] shadow-lg transition hover:bg-[var(--color-primary-light)]"
        >
          {isMenuOpen ? <X className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
          <span>{lang === 'th' ? 'ช่วยเหลือ' : 'Help'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 print:hidden shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (isThisTourActive) {
            ctx.endTour();
          } else {
            ctx.startModuleTour(moduleId);
          }
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer whitespace-nowrap ${
          isThisTourActive
            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-xs'
            : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
        }`}
        title={
          lang === 'th'
            ? 'เริ่มระบบนำทางทีละขั้นตอนพร้อมชี้จุดบนหน้าจอ'
            : 'Start step-by-step guided tour with live screen spotlight'
        }
      >
        {isThisTourActive ? (
          <Compass className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Play className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>
          {isThisTourActive
            ? lang === 'th'
              ? 'กำลังนำทาง'
              : 'Touring'
            : lang === 'th'
            ? 'ทัวร์วิธีใช้หน้านี้'
            : 'Guided Tour'}
        </span>
      </button>

      <button
        type="button"
        onClick={ctx.toggleGuideEnabled}
        aria-pressed={ctx.isGuideEnabled}
        title={
          ctx.isGuideEnabled
            ? lang === 'th'
              ? 'ปิดการนำทางและป๊อปอัปชี้จุด'
              : 'Turn OFF interactive guide'
            : lang === 'th'
            ? 'เปิดการนำทางและป๊อปอัปชี้จุด'
            : 'Turn ON interactive guide'
        }
        className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
          ctx.isGuideEnabled
            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
            : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
        }`}
      >
        <Power className="w-3 h-3 shrink-0" />
        <span className="hidden sm:inline">
          {ctx.isGuideEnabled
            ? lang === 'th'
              ? 'เปิด'
              : 'ON'
            : lang === 'th'
            ? 'ปิด'
            : 'OFF'}
        </span>
      </button>
    </div>
  );
};
