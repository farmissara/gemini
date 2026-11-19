import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  Search,
  Users,
  X,
} from 'lucide-react';
import { AppLanguage, AuthUser, School, Student, SystemConfig, UserRole } from '../types';
import {
  MOE_DESIRABLE_ATTRIBUTES_RUBRIC,
  MOE_READING_WRITING_RUBRIC,
} from '../data/moeCurriculumStandards';
import {
  createDefaultStudentQualitative,
  getStudentQualitativeRecord,
  loadQualitativeAssessments,
  saveQualitativeAssessments,
  StudentQualitativeAssessment,
  summarizeStudentQualitative,
} from '../lib/moeQualitativeStore';
import { getStudentShortPrefixTh } from '../lib/moeGrading';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { printHtmlElementInIsolatedFrame } from '../lib/moeReportPdf';

interface GradeLevelQualitativeSummaryViewProps {
  students: Student[];
  systemConfig: SystemConfig;
  school?: School;
  currentRole?: UserRole;
  currentUser?: AuthUser | null;
  lang?: AppLanguage;
  onOpenStudentDevBook?: (studentId: string) => void;
  onOpenStudentPp6?: (studentId: string) => void;
}

function getLevelOrder(level: string): number {
  const s = level.trim().toLowerCase().replace(/\s+/g, '');
  const k = s.match(/(?:อ\.?|อนุบาล)([1-3])/);
  if (k) return Number(k[1]);
  const primary = s.match(/(?:ป\.?|ประถม(?:ศึกษาปีที่)?)([1-6])/);
  if (primary) return 10 + Number(primary[1]);
  const sec = s.match(/(?:ม\.?|มัธยม(?:ศึกษาปีที่)?)([1-6])/);
  if (sec) return 20 + Number(sec[1]);
  const grade = s.match(/grade([0-9]+)/);
  if (grade) return 30 + Number(grade[1]);
  return 99;
}

const QUALITY_TEXT: Record<number, string> = {
  3: 'ดีเยี่ยม (๓)',
  2: 'ดี (๒)',
  1: 'ผ่าน (๑)',
  0: 'ไม่ผ่าน (๐)',
};

export const GradeLevelQualitativeSummaryView: React.FC<GradeLevelQualitativeSummaryViewProps> = ({
  students,
  systemConfig,
  school,
  currentRole = 'teacher',
  currentUser,
  lang = 'th',
  onOpenStudentDevBook,
  onOpenStudentPp6,
}) => {
  const schoolId = school?.id || students[0]?.schoolId || 'default';
  const academicYear = systemConfig.academicYear || '2569';
  const semester = systemConfig.currentSemester || '1';
  const canEdit = ['super_admin', 'admin', 'teacher'].includes(currentRole);

  const [qualitativeMap, setQualitativeMap] = useState<Record<string, StudentQualitativeAssessment>>(() =>
    loadQualitativeAssessments(schoolId, academicYear, semester)
  );
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>(() => {
    if (currentRole === 'teacher' && currentUser?.homeroomClass) {
      return currentUser.homeroomClass;
    }
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_support'>('all');
  const [dimensionLens, setDimensionLens] = useState<'attributes' | 'reading'>('attributes');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQualitativeMap(loadQualitativeAssessments(schoolId, academicYear, semester));
  }, [schoolId, academicYear, semester]);

  const gradeLevelOptions = useMemo(() => {
    return Array.from(new Set(students.map((s) => (s.gradeLevel || '').trim()).filter(Boolean))).sort(
      (a, b) => getLevelOrder(a) - getLevelOrder(b) || a.localeCompare(b, 'th')
    );
  }, [students]);

  const roomOptions = useMemo(() => {
    const base =
      gradeLevelFilter === 'all'
        ? students
        : students.filter((s) => (s.gradeLevel || '').trim() === gradeLevelFilter);
    return Array.from(new Set(base.map((s) => (s.room || '').trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [gradeLevelFilter, students]);

  useEffect(() => {
    if (roomFilter !== 'all' && !roomOptions.includes(roomFilter)) {
      setRoomFilter('all');
    }
  }, [roomFilter, roomOptions]);

  // All students inside selected grade level / classroom scope (for aggregate charts)
  const scopeStudents = useMemo(() => {
    return students.filter((s) => {
      if (gradeLevelFilter !== 'all' && (s.gradeLevel || '').trim() !== gradeLevelFilter) return false;
      if (roomFilter !== 'all' && (s.room || '').trim() !== roomFilter) return false;
      return true;
    });
  }, [gradeLevelFilter, roomFilter, students]);

  const studentRows = useMemo(() => {
    return scopeStudents.map((student) => {
      const record = qualitativeMap[student.id] || createDefaultStudentQualitative(student.id);
      const isSavedReal = Boolean(qualitativeMap[student.id]);
      const summary = summarizeStudentQualitative(record);
      const needsSupport = summary.attrLevel <= 1 || summary.readingLevel <= 1;
      const attrAvg =
        record.attributes.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 3), 0) / 8;
      const readingAvg =
        record.readingWriting.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 3), 0) / 5;
      return {
        student,
        record,
        isSavedReal,
        summary,
        needsSupport,
        attrAvg,
        readingAvg,
      };
    });
  }, [qualitativeMap, scopeStudents]);

  const filteredTableRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return studentRows.filter((row) => {
      if (statusFilter === 'needs_support' && !row.needsSupport) return false;
      if (!q) return true;
      return [
        row.student.studentIdNumber,
        row.student.nationalId,
        `${row.student.firstNameTh} ${row.student.lastNameTh}`,
        `${row.student.firstNameEn} ${row.student.lastNameEn}`,
        row.student.room,
        row.student.gradeLevel,
      ].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [searchQuery, statusFilter, studentRows]);

  // Aggregate Classroom Analytics for KPIs and Recharts
  const analytics = useMemo(() => {
    const total = studentRows.length;
    const savedCount = studentRows.filter((r) => r.isSavedReal).length;
    const attrCounts: Record<0 | 1 | 2 | 3, number> = { 3: 0, 2: 0, 1: 0, 0: 0 };
    const readCounts: Record<0 | 1 | 2 | 3, number> = { 3: 0, 2: 0, 1: 0, 0: 0 };

    let readPercentSum = 0;
    let attrAvgSum = 0;
    let needsSupportCount = 0;

    studentRows.forEach((row) => {
      attrCounts[row.summary.attrLevel] += 1;
      readCounts[row.summary.readingLevel] += 1;
      readPercentSum += row.summary.readingPercent;
      attrAvgSum += row.attrAvg;
      if (row.needsSupport) needsSupportCount += 1;
    });

    const pct = (count: number) => (total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0);

    const distributionChartData = [
      {
        tier: 'ดีเยี่ยม (๓)',
        attributesCount: attrCounts[3],
        readingCount: readCounts[3],
        attributesPct: pct(attrCounts[3]),
        readingPct: pct(readCounts[3]),
      },
      {
        tier: 'ดี (๒)',
        attributesCount: attrCounts[2],
        readingCount: readCounts[2],
        attributesPct: pct(attrCounts[2]),
        readingPct: pct(readCounts[2]),
      },
      {
        tier: 'ผ่าน (๑)',
        attributesCount: attrCounts[1],
        readingCount: readCounts[1],
        attributesPct: pct(attrCounts[1]),
        readingPct: pct(readCounts[1]),
      },
      {
        tier: 'ไม่ผ่าน (๐)',
        attributesCount: attrCounts[0],
        readingCount: readCounts[0],
        attributesPct: pct(attrCounts[0]),
        readingPct: pct(readCounts[0]),
      },
    ];

    const attributeItemMeans = MOE_DESIRABLE_ATTRIBUTES_RUBRIC.map((rubric, idx) => {
      const avg =
        total > 0
          ? Number(
              (
                studentRows.reduce((sum, row) => sum + (row.record.attributes[idx] ?? 3), 0) / total
              ).toFixed(2)
            )
          : 0;
      const belowGoodCount = studentRows.filter((row) => (row.record.attributes[idx] ?? 3) <= 1).length;
      return {
        label: rubric.titleTh.replace(/^[๑-๘\d]+\.\s*/, ''),
        fullTitle: rubric.titleTh,
        avgScore: avg,
        belowGoodCount,
      };
    });

    const readingItemMeans = MOE_READING_WRITING_RUBRIC.map((dim, idx) => {
      const avg =
        total > 0
          ? Number(
              (
                studentRows.reduce((sum, row) => sum + (row.record.readingWriting[idx] ?? 3), 0) /
                total
              ).toFixed(2)
            )
          : 0;
      const belowGoodCount = studentRows.filter(
        (row) => (row.record.readingWriting[idx] ?? 3) <= 1
      ).length;
      return {
        label: dim.shortTh,
        fullTitle: dim.titleTh,
        avgScore: avg,
        belowGoodCount,
      };
    });

    // Room-by-Room comparison inside selected grade level (or across school)
    const roomBuckets = new Map<string, typeof studentRows>();
    studentRows.forEach((row) => {
      const key = (row.student.room || row.student.gradeLevel || 'ไม่ระบุห้อง').trim();
      const arr = roomBuckets.get(key) || [];
      arr.push(row);
      roomBuckets.set(key, arr);
    });

    const roomComparisonData = Array.from(roomBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'th'))
      .map(([room, rows]) => {
        const count = rows.length;
        const attrGoodPct = Number(
          ((rows.filter((r) => r.summary.attrLevel >= 2).length / Math.max(1, count)) * 100).toFixed(1)
        );
        const readGoodPct = Number(
          ((rows.filter((r) => r.summary.readingLevel >= 2).length / Math.max(1, count)) * 100).toFixed(
            1
          )
        );
        const avgReadPercent = Number(
          (rows.reduce((s, r) => s + r.summary.readingPercent, 0) / Math.max(1, count)).toFixed(1)
        );
        return {
          room,
          students: count,
          attrGoodPct,
          readGoodPct,
          avgReadPercent,
        };
      });

    const weakestAttr =
      attributeItemMeans.length > 0
        ? [...attributeItemMeans].sort((a, b) => a.avgScore - b.avgScore)[0]
        : null;
    const weakestReading =
      readingItemMeans.length > 0
        ? [...readingItemMeans].sort((a, b) => a.avgScore - b.avgScore)[0]
        : null;

    return {
      total,
      savedCount,
      attrCounts,
      readCounts,
      attrGoodPlusPct: pct(attrCounts[3] + attrCounts[2]),
      attrExcellentPct: pct(attrCounts[3]),
      readGoodPlusPct: pct(readCounts[3] + readCounts[2]),
      readExcellentPct: pct(readCounts[3]),
      avgReadingPercent: total > 0 ? Number((readPercentSum / total).toFixed(1)) : 0,
      avgAttributeScore: total > 0 ? Number((attrAvgSum / total).toFixed(2)) : 0,
      needsSupportCount,
      distributionChartData,
      attributeItemMeans,
      readingItemMeans,
      roomComparisonData,
      weakestAttr,
      weakestReading,
    };
  }, [studentRows]);

  const handleQuickSetLevel = (
    studentId: string,
    target: 'attributes' | 'readingWriting',
    level: 3 | 2 | 1 | 0
  ) => {
    if (!canEdit) return;
    setQualitativeMap((prev) => {
      const current = getStudentQualitativeRecord(prev, studentId);
      const updated: StudentQualitativeAssessment = {
        ...current,
        [target]: Array(target === 'attributes' ? 8 : 5).fill(level),
        updatedAt: new Date().toISOString(),
      };
      const next = { ...prev, [studentId]: updated };
      saveQualitativeAssessments(schoolId, academicYear, semester, next);
      return next;
    });
    setExportNotice(
      `อัปเดตผลประเมิน${target === 'attributes' ? 'คุณลักษณะฯ 8 ประการ' : 'การอ่าน คิดวิเคราะห์ เขียน'} เป็น ${QUALITY_TEXT[level]} แล้ว (ซิงค์กับ ปพ.5/ปพ.6)`
    );
  };

  const handleExportCsv = () => {
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ระดับชั้น',
      'ห้องเรียน',
      'สรุปคุณลักษณะฯ 8 ประการ',
      'ค่าเฉลี่ยคุณลักษณะฯ (0-3)',
      'สรุปการอ่าน คิดวิเคราะห์ เขียน',
      'คะแนนการอ่านฯ (%)',
      'สมรรถนะ 5 ด้าน',
      'กิจกรรมพัฒนาผู้เรียน',
      'หมายเหตุติดตาม',
    ];
    const rows = filteredTableRows.map((row) => [
      `"${row.student.studentIdNumber}"`,
      `"${getStudentShortPrefixTh(row.student)} ${row.student.firstNameTh} ${row.student.lastNameTh}"`,
      `"${row.student.gradeLevel}"`,
      `"${row.student.room}"`,
      `"${row.summary.attrLabel}"`,
      row.attrAvg.toFixed(2),
      `"${row.summary.readingLabel}"`,
      `${row.summary.readingPercent}%`,
      `"${row.summary.compLabel}"`,
      `"${row.summary.activityResult}"`,
      `"${row.needsSupport ? 'ควรจัดซ่อมเสริม/ติดตาม' : 'ผ่านเกณฑ์ปกติ'}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `สรุปคุณลักษณะ_อ่านคิดวิเคราะห์_${gradeLevelFilter === 'all' ? 'ทุกระดับ' : gradeLevelFilter}_AY${academicYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportNotice('ส่งออกตารางสรุปผลการประเมินคุณลักษณะฯ และการอ่าน คิดวิเคราะห์ เขียน (CSV) แล้ว');
  };

  const handlePrint = () => {
    if (!printSheetRef.current) return;
    printHtmlElementInIsolatedFrame(
      printSheetRef.current.innerHTML,
      `สรุปผลคุณลักษณะและอ่านคิดวิเคราะห์_${academicYear}`
    );
  };

  const scopeLabel = `${gradeLevelFilter === 'all' ? 'ทุกระดับชั้น' : gradeLevelFilter} · ${roomFilter === 'all' ? 'ทุกห้องเรียน' : roomFilter}`;
  const activeItemChartData =
    dimensionLens === 'attributes' ? analytics.attributeItemMeans : analytics.readingItemMeans;

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="saas-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>{school?.nameTh || systemConfig.schoolNameTh}</span>
            <span aria-hidden="true">·</span>
            <span>{formatSemesterLabel(semester)} ปีการศึกษา {academicYear}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">ขอบเขต: {scopeLabel}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] text-balance">
            {lang === 'th'
              ? 'สรุปผลการประเมินคุณลักษณะอันพึงประสงค์ และการอ่าน คิดวิเคราะห์ เขียน (รายชั้นปี / ห้องเรียน)'
              : 'Grade-Level Qualitative & Reading Analytics'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="เลือกระดับชั้น"
            value={gradeLevelFilter}
            onChange={(e) => setGradeLevelFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-title)]"
          >
            <option value="all">ทุกระดับชั้น ({students.length} คน)</option>
            {gradeLevelOptions.map((lvl) => (
              <option key={lvl} value={lvl}>
                ระดับชั้น {lvl}
              </option>
            ))}
          </select>

          <select
            aria-label="เลือกห้องเรียน"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-title)]"
          >
            <option value="all">ทุกห้องเรียน</option>
            {roomOptions.map((rm) => (
              <option key={rm} value={rm}>
                {rm}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-tool-neutral px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-action-primary px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์สรุปรายห้อง (A4)</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 print:hidden">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportNotice}</span>
          </span>
          <button type="button" onClick={() => setExportNotice(null)} className="underline cursor-pointer">
            ปิด
          </button>
        </div>
      )}

      <div ref={printSheetRef} className="space-y-4">
        {/* Print Header */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 text-center">
          <p className="text-xs font-bold">
            รายงานสรุปผลการประเมินคุณลักษณะอันพึงประสงค์ ๘ ประการ และการอ่าน คิดวิเคราะห์ และเขียน (สพฐ.)
          </p>
          <h2 className="text-lg font-extrabold">โรงเรียน{school?.nameTh || systemConfig.schoolNameTh}</h2>
          <p className="text-xs">
            ขอบเขต: {scopeLabel} · {formatSemesterLabel(semester)} ปีการศึกษา {academicYear} · จำนวน {analytics.total} คน
          </p>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 tabular-nums">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>ขอบเขตผู้เรียนที่ประเมิน</span>
              <Users className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-[var(--color-text-title)]">
              {analytics.total} คน
            </div>
            <div className="text-[11px] text-[var(--color-text-body)]">
              บันทึกผลรายบุคคลแล้ว {analytics.savedCount} คน (ซิงค์ ปพ.๕/ปพ.๖)
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>คุณลักษณะอันพึงประสงค์ (ดีขึ้นไป)</span>
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                {analytics.attrGoodPlusPct}%
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                (ดีเยี่ยม {analytics.attrExcellentPct}%)
              </span>
            </div>
            <div className="text-[11px] text-[var(--color-text-body)] truncate">
              ค่าเฉลี่ยรวม {analytics.avgAttributeScore.toFixed(2)} / 3.00 · ไม่ผ่าน {analytics.attrCounts[0]} คน
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>การอ่าน คิดวิเคราะห์ เขียน (ดีขึ้นไป)</span>
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-indigo-700 dark:text-indigo-300">
                {analytics.readGoodPlusPct}%
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                (เฉลี่ย {analytics.avgReadingPercent}%)
              </span>
            </div>
            <div className="text-[11px] text-[var(--color-text-body)] truncate">
              ดีเยี่ยม {analytics.readCounts[3]} คน · ดี {analytics.readCounts[2]} คน · ไม่ผ่าน {analytics.readCounts[0]} คน
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>กลุ่มต้องเสริมพัฒนาการ (ระดับ ๐–๑)</span>
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold font-mono ${
                  analytics.needsSupportCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {analytics.needsSupportCount} คน
              </span>
            </div>
            <div className="text-[11px] text-[var(--color-text-body)] truncate">
              {analytics.weakestAttr
                ? `จุดเน้น: ${analytics.weakestAttr.label} (${analytics.weakestAttr.avgScore.toFixed(2)})`
                : 'ยังไม่มีข้อมูล'}
            </div>
          </div>
        </div>

        {/* Data Visualization Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Chart 1: Quality Distribution Comparison (Attributes vs Reading/Writing) */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                ๑. การกระจายระดับคุณภาพของห้องเรียน (สัดส่วน % ตามเกณฑ์ สพฐ.)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                เปรียบเทียบจำนวนร้อยละผู้เรียนในแต่ละระดับคุณภาพ ระหว่างคุณลักษณะอันพึงประสงค์กับการอ่าน คิดวิเคราะห์ เขียน
              </p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.distributionChartData} margin={{ top: 10, right: 16, left: -12, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="tier" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value, name, item) => {
                      const payload = item?.payload as
                        | { attributesCount: number; readingCount: number }
                        | undefined;
                      const isAttr = item?.dataKey === 'attributesPct';
                      const cnt = isAttr ? payload?.attributesCount ?? 0 : payload?.readingCount ?? 0;
                      return [`${Number(value ?? 0)}% (${cnt} คน)`, String(name ?? '')];
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="attributesPct"
                    name="คุณลักษณะอันพึงประสงค์ ๘ ประการ (%)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="readingPct"
                    name="การอ่าน คิดวิเคราะห์ และเขียน ๕ มิติ (%)"
                    fill="#4f46e5"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Item-level Mean Scores (0.00 - 3.00) with OBEC Reference Lines */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  ๒. คะแนนเฉลี่ยรายองค์ประกอบ (ระดับ ๐.๐๐–๓.๐๐)
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  ช่วยให้ครูเห็นรายข้อที่ควรจัดกิจกรรมส่งเสริมเพิ่มเติมในห้องเรียน
                </p>
              </div>
              <div className="seg-tab-group shrink-0 print:hidden">
                <button
                  type="button"
                  data-active={dimensionLens === 'attributes'}
                  onClick={() => setDimensionLens('attributes')}
                  className="seg-tab-btn text-[11px]"
                >
                  คุณลักษณะฯ ๘ ข้อ
                </button>
                <button
                  type="button"
                  data-active={dimensionLens === 'reading'}
                  onClick={() => setDimensionLens('reading')}
                  className="seg-tab-btn text-[11px]"
                >
                  อ่าน คิดวิเคราะห์ ๕ มิติ
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeItemChartData}
                  layout="vertical"
                  margin={{ top: 6, right: 20, left: 16, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis type="number" domain={[0, 3]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={132}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value ?? 0).toFixed(2)} / 3.00`, 'คะแนนเฉลี่ยห้องเรียน']}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { fullTitle?: string; belowGoodCount?: number } | undefined;
                      return row ? `${row.fullTitle} (ระดับ 0-1: ${row.belowGoodCount} คน)` : '';
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine
                    x={2.0}
                    stroke="#0284c7"
                    strokeDasharray="4 4"
                    label={{ value: 'ดี (2.0)', position: 'top', fill: '#0284c7', fontSize: 10 }}
                  />
                  <ReferenceLine
                    x={2.5}
                    stroke="#059669"
                    strokeDasharray="4 4"
                    label={{ value: 'ดีเยี่ยม (2.5)', position: 'top', fill: '#059669', fontSize: 10 }}
                  />
                  <Bar
                    dataKey="avgScore"
                    name="คะแนนเฉลี่ย (0–3)"
                    fill={dimensionLens === 'attributes' ? '#059669' : '#4f46e5'}
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 3: Room-by-Room / Classroom Comparison when viewing multiple rooms */}
        {analytics.roomComparisonData.length > 1 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                ๓. เปรียบเทียบภาพรวมรายห้องเรียนในชั้นปี (% นักเรียนระดับดี–ดีเยี่ยม)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                เปรียบเทียบสัดส่วนนักเรียนระดับดีขึ้นไป (ระดับ ๒–๓) แยกตามห้องเรียน
              </p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.roomComparisonData}
                  margin={{ top: 10, right: 16, left: -12, bottom: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="room" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value ?? 0)}%`, String(name ?? '')]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <ReferenceLine y={80} stroke="#059669" strokeDasharray="4 4" />
                  <Bar
                    dataKey="attrGoodPct"
                    name="คุณลักษณะฯ ดีขึ้นไป (%)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="readGoodPct"
                    name="อ่าน คิดวิเคราะห์ เขียน ดีขึ้นไป (%)"
                    fill="#0284c7"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Student Roster Qualitative Breakdown Table */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                ตารางรายละเอียดผลการประเมินรายบุคคล ({filteredTableRows.length} คน)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                ตัวเลข ๘ ช่องด้านซ้าย = คุณลักษณะฯ ข้อ ๑–๘ · ตัวเลข ๕ ช่องด้านขวา = อ่าน คิดวิเคราะห์ เขียน มิติ ๑–๕
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <div className="relative w-48 sm:w-56">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ / รหัสนักเรียน..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-1.5 pl-8 pr-6 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="seg-tab-group shrink-0">
                <button
                  type="button"
                  data-active={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                  className="seg-tab-btn text-[11px]"
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  data-active={statusFilter === 'needs_support'}
                  onClick={() => setStatusFilter('needs_support')}
                  className="seg-tab-btn text-[11px]"
                >
                  ต้องติดตาม ({analytics.needsSupportCount})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-semibold">
                <tr>
                  <th className="py-2 px-3">รหัส</th>
                  <th className="py-2 px-3">ชื่อ-นามสกุล / ห้อง</th>
                  <th className="py-2 px-2 text-center">คุณลักษณะฯ (ข้อ ๑–๘)</th>
                  <th className="py-2 px-2 text-center">ผลคุณลักษณะฯ</th>
                  <th className="py-2 px-2 text-center">อ่าน คิดฯ เขียน (๕ มิติ)</th>
                  <th className="py-2 px-2 text-center">ผลอ่าน คิดฯ (%)</th>
                  <th className="py-2 px-3 text-right print:hidden">จัดการ / ซิงค์สมุดพัฒนาฯ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] tabular-nums">
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--color-text-muted)]">
                      ไม่พบข้อมูลนักเรียนในเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredTableRows.map(({ student, record, summary, needsSupport }) => (
                    <tr
                      key={student.id}
                      className={`hover:bg-[var(--color-card-subtle)]/70 transition ${
                        needsSupport ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-[var(--color-primary-text)]">
                        {student.studentIdNumber}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-[var(--color-text-title)]">
                          {getStudentShortPrefixTh(student)} {student.firstNameTh} {student.lastNameTh}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">
                          {student.gradeLevel} ({student.room})
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[11px]">
                        <div className="inline-flex items-center gap-0.5">
                          {record.attributes.slice(0, 8).map((val, i) => (
                            <span
                              key={i}
                              className={`w-4 h-4 rounded text-[10px] font-bold inline-flex items-center justify-center ${
                                val === 3
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                  : val === 2
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                                  : val === 1
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                              }`}
                            >
                              {val}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {canEdit ? (
                          <select
                            aria-label={`ระดับคุณลักษณะฯ ${student.firstNameTh}`}
                            value={summary.attrLevel}
                            onChange={(e) =>
                              handleQuickSetLevel(
                                student.id,
                                'attributes',
                                Number(e.target.value) as 3 | 2 | 1 | 0
                              )
                            }
                            className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold cursor-pointer ${
                              summary.attrLevel >= 2
                                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                                : 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                            }`}
                          >
                            <option value={3}>ดีเยี่ยม (๓)</option>
                            <option value={2}>ดี (๒)</option>
                            <option value={1}>ผ่าน (๑)</option>
                            <option value={0}>ไม่ผ่าน (๐)</option>
                          </select>
                        ) : (
                          <span className="font-semibold">{summary.attrLabel}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[11px]">
                        <div className="inline-flex items-center gap-0.5">
                          {record.readingWriting.slice(0, 5).map((val, i) => (
                            <span
                              key={i}
                              className={`w-4 h-4 rounded text-[10px] font-bold inline-flex items-center justify-center ${
                                val === 3
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                                  : val === 2
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                                  : val === 1
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                              }`}
                            >
                              {val}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {canEdit ? (
                          <div className="inline-flex items-center gap-1.5">
                            <select
                              aria-label={`ระดับอ่านคิดวิเคราะห์ ${student.firstNameTh}`}
                              value={summary.readingLevel}
                              onChange={(e) =>
                                handleQuickSetLevel(
                                  student.id,
                                  'readingWriting',
                                  Number(e.target.value) as 3 | 2 | 1 | 0
                                )
                              }
                              className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold cursor-pointer ${
                                summary.readingLevel >= 2
                                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
                                  : 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                              }`}
                            >
                              <option value={3}>ดีเยี่ยม (๓)</option>
                              <option value={2}>ดี (๒)</option>
                              <option value={1}>ผ่าน (๑)</option>
                              <option value={0}>ไม่ผ่าน (๐)</option>
                            </select>
                            <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                              {summary.readingPercent}%
                            </span>
                          </div>
                        ) : (
                          <span>
                            {summary.readingLabel} ({summary.readingPercent}%)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right print:hidden">
                        <div className="inline-flex items-center gap-2">
                          {onOpenStudentDevBook && (
                            <button
                              type="button"
                              onClick={() => onOpenStudentDevBook(student.id)}
                              className="text-[var(--color-primary-text)] hover:underline font-semibold cursor-pointer whitespace-nowrap"
                            >
                              สมุดพัฒนาฯ
                            </button>
                          )}
                          {onOpenStudentPp6 && (
                            <button
                              type="button"
                              onClick={() => onOpenStudentPp6(student.id)}
                              className="text-[var(--color-text-body)] hover:underline font-medium cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <FileText className="w-3 h-3" />
                              <span>ปพ.๖</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
