import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Compass, Play, Power } from 'lucide-react';
import { AppLanguage, UserRole } from '../../types';
import { MODULE_GUIDED_TOURS, ModuleTourStep, resolveTourStepsForPage } from '../../data/moduleGuidedTours';

interface GuideTourContextValue {
  isGuideEnabled: boolean;
  setGuideEnabled: (next: boolean) => void;
  toggleGuideEnabled: () => void;
  activeTourModuleId: string | null;
  activeTourSteps: ModuleTourStep[];
  activeTourStepIndex: number;
  startModuleTour: (moduleId: string) => boolean;
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
  children: React.ReactNode;
}

export const GuideTourProvider: React.FC<GuideTourProviderProps> = ({
  currentRole,
  currentTab,
  lang,
  isGuideEnabled,
  onSetGuideEnabled,
  children,
}) => {
  const [activeTourModuleId, setActiveTourModuleId] = useState<string | null>(null);
  const [activeTourSteps, setActiveTourSteps] = useState<ModuleTourStep[]>([]);
  const [activeTourStepIndex, setActiveTourStepIndex] = useState(0);

  // Close tour automatically if user switches module tab or disables guide
  useEffect(() => {
    setActiveTourModuleId(null);
    setActiveTourSteps([]);
    setActiveTourStepIndex(0);
  }, [currentTab]);

  useEffect(() => {
    if (!isGuideEnabled) {
      setActiveTourModuleId(null);
      setActiveTourSteps([]);
      setActiveTourStepIndex(0);
    }
  }, [isGuideEnabled]);

  const toggleGuideEnabled = useCallback(() => {
    onSetGuideEnabled(!isGuideEnabled);
  }, [isGuideEnabled, onSetGuideEnabled]);

  const startModuleTour = useCallback(
    (moduleId: string) => {
      if (!isGuideEnabled) {
        onSetGuideEnabled(true);
      }
      // Allow DOM a tick if guide was just toggled ON
      const { steps } = resolveTourStepsForPage(moduleId, currentRole, lang);
      if (steps.length === 0) return false;
      setActiveTourModuleId(moduleId);
      setActiveTourSteps(steps);
      setActiveTourStepIndex(0);
      return true;
    },
    [currentRole, isGuideEnabled, lang, onSetGuideEnabled]
  );

  const endTour = useCallback(() => {
    setActiveTourModuleId(null);
    setActiveTourSteps([]);
    setActiveTourStepIndex(0);
  }, []);

  const nextTourStep = useCallback(() => {
    setActiveTourStepIndex((prev) => {
      if (prev + 1 >= activeTourSteps.length) {
        setActiveTourModuleId(null);
        setActiveTourSteps([]);
        return 0;
      }
      return prev + 1;
    });
  }, [activeTourSteps.length]);

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

  const value = useMemo<GuideTourContextValue>(
    () => ({
      isGuideEnabled,
      setGuideEnabled: onSetGuideEnabled,
      toggleGuideEnabled,
      activeTourModuleId,
      activeTourSteps,
      activeTourStepIndex,
      startModuleTour,
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
      startModuleTour,
      nextTourStep,
      prevTourStep,
      goToTourStep,
      endTour,
      currentRole,
      lang,
    ]
  );

  return <GuideTourContext.Provider value={value}>{children}</GuideTourContext.Provider>;
};

export function useGuideTour() {
  return useContext(GuideTourContext);
}

interface ModuleTourTriggerProps {
  moduleId: string;
  lang: AppLanguage;
  className?: string;
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
}) => {
  const ctx = useGuideTour();
  const hasTour = Boolean(MODULE_GUIDED_TOURS[moduleId]);
  if (!ctx || !hasTour) return null;

  const isThisTourActive = ctx.activeTourModuleId === moduleId;

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
            ? 'เริ่มระบบนำทางทีละขั้นตอนสำหรับฟังก์ชันในหน้านี้'
            : 'Start step-by-step guided tour for this page'
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
              ? 'ปิดการนำทางและป๊อปอัปชี้เมาส์'
              : 'Turn OFF interactive guide'
            : lang === 'th'
            ? 'เปิดการนำทางและป๊อปอัปชี้เมาส์'
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
