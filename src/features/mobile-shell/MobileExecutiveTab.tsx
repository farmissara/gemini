import React from 'react';
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  GraduationCap,
  HeartPulse,
  Laptop,
  Monitor,
  Receipt,
  Sparkles,
  Users,
} from 'lucide-react';
import type { AppLanguage, School } from '../../types';
import type { ExecMetrics, MobileTab } from './types';

interface MobileExecutiveTabProps {
  activeSchool: School;
  lang: AppLanguage;
  execMetrics: ExecMetrics;
  canViewFinancialsMobile: boolean;
  pendingLeavesCount: number;
  onSwitchToDesktopMode: () => void;
  onSelectTab: (tab: MobileTab) => void;
}

export const MobileExecutiveTab: React.FC<MobileExecutiveTabProps> = ({
  activeSchool,
  lang,
  execMetrics,
  canViewFinancialsMobile,
  pendingLeavesCount,
  onSwitchToDesktopMode,
  onSelectTab,
}) => {
  return (
    <div className="flex flex-col gap-3 py-1 animate-in fade-in duration-200">
      {/* Header Card (Clean semantic token surface) */}
      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] flex items-center justify-center font-bold shrink-0">
              <Monitor className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                {lang === 'th' ? 'แดชบอร์ดสรุปผู้บริหาร · ผอ. / MIS' : 'Executive Summary · MIS'}
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                {activeSchool.nameTh || activeSchool.nameEn}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSwitchToDesktopMode}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
            title="สลับไปมุมมองคอมพิวเตอร์"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'จอใหญ่' : 'Desktop'}</span>
          </button>
        </div>
      </div>

      {/* 4 Core Executive Metric Cards (Vertical, Clean, Space-optimized) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Card 1: Attendance */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)]">การมาเรียนวันนี้</span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {execMetrics.attendanceRate}%
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              มา {execMetrics.presentCount} • สาย {execMetrics.lateCount} • ขาด {execMetrics.absentCount}
            </p>
          </div>
        </div>

        {/* Card 2: Academic GPAX */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)]">เกรดเฉลี่ย (GPAX)</span>
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
              {execMetrics.avgGpa}
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              เกียรตินิยม (&ge;3.5) {execMetrics.honorCount} คน
            </p>
          </div>
        </div>

        {/* Card 3: Infirmary & Care */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)]">ห้องพยาบาล &amp; SDQ</span>
            <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
              <HeartPulse className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono">
              {execMetrics.todayInfirmary} <span className="text-xs font-normal">เคส</span>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              กลุ่มเสี่ยง SDQ {execMetrics.riskCount} คน
            </p>
          </div>
        </div>

        {/* Card 4: Finance (Respects teacher_view_financials) */}
        {canViewFinancialsMobile && (
          <div className="p-3.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--color-text-muted)]">ยอดจัดเก็บค่าเทอม</span>
              <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-blue-700 dark:text-blue-400 font-mono tabular-nums">
                ฿{execMetrics.totalCollected.toLocaleString()}
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                ค้างชำระ {execMetrics.pendingCount} ใบเสร็จ
              </p>
            </div>
          </div>
        )}
      </div>

      {/* School Composition Summary */}
      <div className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2.5">
        <h3 className="text-xs font-bold text-[var(--color-text-title)] flex flex-wrap items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
            <span>อัตราส่วนทรัพยากรโรงเรียน</span>
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">MIS ข้อมูลล่าสุด</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>นักเรียน</span>
            </div>
            <div className="text-base font-black text-[var(--color-text-title)] font-mono mt-0.5">
              {execMetrics.totalStudents} คน
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>ครู &amp; บุคลากร</span>
            </div>
            <div className="text-base font-black text-[var(--color-text-title)] font-mono mt-0.5">
              {execMetrics.totalTeachers} ท่าน
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>รายวิชา</span>
            </div>
            <div className="text-base font-black text-[var(--color-text-title)] font-mono mt-0.5">
              {execMetrics.totalCourses} วิชา
            </div>
          </div>
        </div>
      </div>

      {/* Director Quick Links */}
      <div className="p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2">
        <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
          <span>ทางลัดการบริหาร</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectTab('checkin')}
            className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-between cursor-pointer"
          >
            <span>มอนิเตอร์การเช็คชื่อ</span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('leave')}
            className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-left text-xs font-semibold text-[var(--color-text-title)] flex items-center justify-between cursor-pointer"
          >
            <span>อนุมัติใบลา ({pendingLeavesCount})</span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          </button>
        </div>
      </div>
    </div>
  );
};
