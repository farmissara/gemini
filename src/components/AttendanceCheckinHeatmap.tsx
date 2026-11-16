import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Flame, MapPin, Clock, Activity, Calendar } from 'lucide-react';
import { AppLanguage, AttendanceRecord, CampusGateGeofence } from '../types';
import { getLocalDateString } from '../lib/date';

interface AttendanceCheckinHeatmapProps {
  attendance: AttendanceRecord[];
  campusGates?: CampusGateGeofence[];
  lang?: AppLanguage;
}

type HeatmapMode = 'time_by_gate' | 'day_by_time';

interface TimeSlotDef {
  id: string;
  label: string;
  shortLabel: string;
  rangeLabel: string;
  matchHourMinute: (minutesSinceMidnight: number) => boolean;
}

const TIME_SLOTS: TimeSlotDef[] = [
  {
    id: 'before_0700',
    label: '< 07:00',
    shortLabel: '<07:00',
    rangeLabel: '05:00 – 06:59 น.',
    matchHourMinute: (m) => m < 7 * 60,
  },
  {
    id: '0700_0729',
    label: '07:00–07:29',
    shortLabel: '07:00',
    rangeLabel: '07:00 – 07:29 น.',
    matchHourMinute: (m) => m >= 7 * 60 && m < 7 * 60 + 30,
  },
  {
    id: '0730_0759',
    label: '07:30–07:59',
    shortLabel: '07:30',
    rangeLabel: '07:30 – 07:59 น.',
    matchHourMinute: (m) => m >= 7 * 60 + 30 && m < 8 * 60,
  },
  {
    id: '0800_0829',
    label: '08:00–08:29',
    shortLabel: '08:00',
    rangeLabel: '08:00 – 08:29 น.',
    matchHourMinute: (m) => m >= 8 * 60 && m < 8 * 60 + 30,
  },
  {
    id: '0830_0859',
    label: '08:30–08:59',
    shortLabel: '08:30',
    rangeLabel: '08:30 – 08:59 น.',
    matchHourMinute: (m) => m >= 8 * 60 + 30 && m < 9 * 60,
  },
  {
    id: '0900_1159',
    label: '09:00–11:59',
    shortLabel: '09:00+',
    rangeLabel: '09:00 – 11:59 น.',
    matchHourMinute: (m) => m >= 9 * 60 && m < 12 * 60,
  },
  {
    id: '1200_plus',
    label: '12:00+',
    shortLabel: '12:00+',
    rangeLabel: '12:00 น. เป็นต้นไป',
    matchHourMinute: (m) => m >= 12 * 60,
  },
];

interface HeatmapCellData {
  x: number;
  y: number;
  xLabel: string;
  yLabel: string;
  subtitle: string;
  count: number;
  presentCount: number;
  lateCount: number;
  percent: number;
  ratio: number;
  numCols: number;
  numRows: number;
}

function parseMinutesSinceMidnight(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }
  return hh * 60 + mm;
}

function resolveEntryGateLabel(
  rec: AttendanceRecord,
  campusGates: CampusGateGeofence[],
  lang: AppLanguage
): string {
  const geoName = rec.location?.geofenceZoneName?.trim();
  if (geoName) return geoName;

  const remarks = (rec.remarks || '').trim();
  if (remarks) {
    const matchedGate = campusGates.find((g) => {
      const th = g.nameTh?.trim().toLowerCase();
      const en = g.nameEn?.trim().toLowerCase();
      const rLower = remarks.toLowerCase();
      return (th && rLower.includes(th)) || (en && rLower.includes(en));
    });
    if (matchedGate) {
      return lang === 'th' ? matchedGate.nameTh : matchedGate.nameEn || matchedGate.nameTh;
    }

    // Extract common gate naming patterns cleanly
    const cleaned = remarks
      .replace(/^สแกน(เข้า|ผ่านเครื่อง)?\s*/i, '')
      .replace(/^เช็คชื่อ\s*/i, '')
      .trim();
    if (/ประตู|gate|จุดสแกน|อาคาร|หน้าโรงเรียน|ฝั่ง|ทางเข้า|ลาน/i.test(cleaned)) {
      return cleaned.length > 26 ? `${cleaned.slice(0, 25)}…` : cleaned;
    }
  }

  switch (rec.checkinMethod) {
    case 'selfie_geofence':
    case 'mobile_geofence':
      return lang === 'th' ? 'ประตูหลัก (GPS / มือถือ)' : 'Main Gate (Mobile GPS)';
    case 'qr_scanner':
      return lang === 'th' ? 'จุดสแกน QR หน้าประตู' : 'Front QR Gate Scanner';
    case 'rfid':
      return lang === 'th' ? 'เครื่องสแกนบัตร RFID' : 'RFID Gate Terminal';
    case 'teacher_proxy':
      return lang === 'th' ? 'จุดคัดกรองครูเวร' : 'Staff Checkpoint';
    default:
      return lang === 'th' ? 'จุดเช็คชื่อหลัก' : 'Main Check-in Point';
  }
}

function getHeatColor(ratio: number, count: number): { fill: string; text: string; border: string } {
  if (count <= 0 || ratio <= 0) {
    return {
      fill: 'var(--color-card-subtle)',
      text: 'var(--color-text-muted)',
      border: 'var(--color-border)',
    };
  }
  if (ratio < 0.25) {
    return {
      fill: '#dbeafe',
      text: '#1e3a8a',
      border: '#93c5fd',
    };
  }
  if (ratio < 0.5) {
    return {
      fill: '#60a5fa',
      text: '#0f172a',
      border: '#3b82f6',
    };
  }
  if (ratio < 0.75) {
    return {
      fill: '#2563eb',
      text: '#ffffff',
      border: '#1d4ed8',
    };
  }
  return {
    fill: '#f59e0b',
    text: '#1e1b4b',
    border: '#d97706',
  };
}

function subtractDaysIso(baseIso: string, days: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() - days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export const AttendanceCheckinHeatmap: React.FC<AttendanceCheckinHeatmapProps> = ({
  attendance,
  campusGates = [],
  lang = 'th',
}) => {
  const [mode, setMode] = useState<HeatmapMode>('time_by_gate');

  const todayIso = getLocalDateString();
  const cutoffIso = useMemo(() => subtractDaysIso(todayIso, 29), [todayIso]);

  const {
    recentCheckins,
    gateTimeCells,
    gateNames,
    dayTimeCells,
    dateLabels,
    peakTimeSlot,
    topGate,
    maxCellCountGate,
    maxCellCountDay,
  } = useMemo(() => {
    const validCheckins = attendance.filter((rec) => {
      if (rec.recordType === 'check_out') return false;
      if (rec.status === 'absent' || rec.status === 'sick' || rec.status === 'leave') return false;
      if (!rec.date || rec.date < cutoffIso || rec.date > todayIso) return false;
      return parseMinutesSinceMidnight(rec.time) !== null;
    });

    const gateTotals = new Map<string, number>();
    const timeSlotTotals = new Map<string, number>();
    const gateTimeBuckets = new Map<
      string,
      { count: number; presentCount: number; lateCount: number }
    >();
    const dayTimeBuckets = new Map<
      string,
      { count: number; presentCount: number; lateCount: number }
    >();

    // Seed active configured gates so empty configured gates remain discoverable when needed
    campusGates
      .filter((g) => g.isActive !== false)
      .slice(0, 4)
      .forEach((g) => {
        const label = lang === 'th' ? g.nameTh : g.nameEn || g.nameTh;
        if (label && !gateTotals.has(label)) {
          gateTotals.set(label, 0);
        }
      });

    for (const rec of validCheckins) {
      const mins = parseMinutesSinceMidnight(rec.time);
      if (mins === null) continue;
      const slot =
        TIME_SLOTS.find((s) => s.matchHourMinute(mins)) || TIME_SLOTS[TIME_SLOTS.length - 1];
      const gate = resolveEntryGateLabel(rec, campusGates, lang);

      gateTotals.set(gate, (gateTotals.get(gate) || 0) + 1);
      timeSlotTotals.set(slot.id, (timeSlotTotals.get(slot.id) || 0) + 1);

      const gtKey = `${gate}|||${slot.id}`;
      const gtPrev = gateTimeBuckets.get(gtKey) || { count: 0, presentCount: 0, lateCount: 0 };
      gtPrev.count += 1;
      if (rec.status === 'late') gtPrev.lateCount += 1;
      else gtPrev.presentCount += 1;
      gateTimeBuckets.set(gtKey, gtPrev);

      const dtKey = `${rec.date}|||${slot.id}`;
      const dtPrev = dayTimeBuckets.get(dtKey) || { count: 0, presentCount: 0, lateCount: 0 };
      dtPrev.count += 1;
      if (rec.status === 'late') dtPrev.lateCount += 1;
      else dtPrev.presentCount += 1;
      dayTimeBuckets.set(dtKey, dtPrev);
    }

    const sortedGates = Array.from(gateTotals.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th'))
      .slice(0, 6)
      .map(([name]) => name);

    const totalCount = validCheckins.length;
    let maxGateCount = 0;
    const gCells: HeatmapCellData[] = [];

    sortedGates.forEach((gateName, yIdx) => {
      TIME_SLOTS.forEach((slot, xIdx) => {
        const bucket = gateTimeBuckets.get(`${gateName}|||${slot.id}`) || {
          count: 0,
          presentCount: 0,
          lateCount: 0,
        };
        if (bucket.count > maxGateCount) maxGateCount = bucket.count;
        gCells.push({
          x: xIdx,
          y: yIdx,
          xLabel: slot.label,
          yLabel: gateName,
          subtitle: slot.rangeLabel,
          count: bucket.count,
          presentCount: bucket.presentCount,
          lateCount: bucket.lateCount,
          percent: totalCount > 0 ? Math.round((bucket.count / totalCount) * 1000) / 10 : 0,
          ratio: 0,
          numCols: TIME_SLOTS.length,
          numRows: Math.max(1, sortedGates.length),
        });
      });
    });

    gCells.forEach((cell) => {
      cell.ratio = maxGateCount > 0 ? cell.count / maxGateCount : 0;
    });

    // Build 30-day window (past 30 days oldest -> newest on X-axis vs Time Slots on Y-axis)
    const dates30: string[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      dates30.push(subtractDaysIso(todayIso, i));
    }
    const shortDateLabels = dates30.map((iso) => {
      const [, mm, dd] = iso.split('-');
      return `${Number(dd)}/${Number(mm)}`;
    });

    let maxDayCount = 0;
    const dCells: HeatmapCellData[] = [];
    TIME_SLOTS.forEach((slot, yIdx) => {
      dates30.forEach((iso, xIdx) => {
        const bucket = dayTimeBuckets.get(`${iso}|||${slot.id}`) || {
          count: 0,
          presentCount: 0,
          lateCount: 0,
        };
        if (bucket.count > maxDayCount) maxDayCount = bucket.count;
        dCells.push({
          x: xIdx,
          y: yIdx,
          xLabel: shortDateLabels[xIdx],
          yLabel: slot.label,
          subtitle: `${iso} • ${slot.rangeLabel}`,
          count: bucket.count,
          presentCount: bucket.presentCount,
          lateCount: bucket.lateCount,
          percent: totalCount > 0 ? Math.round((bucket.count / totalCount) * 1000) / 10 : 0,
          ratio: 0,
          numCols: dates30.length,
          numRows: TIME_SLOTS.length,
        });
      });
    });

    dCells.forEach((cell) => {
      cell.ratio = maxDayCount > 0 ? cell.count / maxDayCount : 0;
    });

    // Find peak time slot & top gate
    let bestSlot: { slot: TimeSlotDef; count: number } | null = null;
    for (const slot of TIME_SLOTS) {
      const c = timeSlotTotals.get(slot.id) || 0;
      if (!bestSlot || c > bestSlot.count) {
        bestSlot = { slot, count: c };
      }
    }

    let bestGate: { name: string; count: number } | null = null;
    for (const [name, count] of gateTotals.entries()) {
      if (!bestGate || count > bestGate.count) {
        bestGate = { name, count };
      }
    }

    return {
      recentCheckins: validCheckins,
      gateTimeCells: gCells,
      gateNames: sortedGates,
      dayTimeCells: dCells,
      dateLabels: shortDateLabels,
      peakTimeSlot: bestSlot && bestSlot.count > 0 ? bestSlot : null,
      topGate: bestGate && bestGate.count > 0 ? bestGate : null,
      maxCellCountGate: maxGateCount,
      maxCellCountDay: maxDayCount,
    };
  }, [attendance, campusGates, cutoffIso, todayIso, lang]);

  const activeCells = mode === 'time_by_gate' ? gateTimeCells : dayTimeCells;
  const xLabels =
    mode === 'time_by_gate' ? TIME_SLOTS.map((s) => s.label) : dateLabels;
  const yLabels =
    mode === 'time_by_gate' ? gateNames : TIME_SLOTS.map((s) => s.label);
  const maxVal = mode === 'time_by_gate' ? maxCellCountGate : maxCellCountDay;

  const renderHeatmapCell = (rawProps: unknown) => {
    const props = rawProps as {
      cx?: number;
      cy?: number;
      xAxis?: { width?: number };
      yAxis?: { height?: number };
      payload?: HeatmapCellData;
    };
    if (typeof props.cx !== 'number' || typeof props.cy !== 'number' || !props.payload) {
      return <g />;
    }

    const cell = props.payload;
    const palette = getHeatColor(cell.ratio, cell.count);
    const axisW = props.xAxis?.width || 620;
    const axisH = props.yAxis?.height || 220;

    const rawCellW = axisW / Math.max(1, cell.numCols) - (cell.numCols > 14 ? 3 : 8);
    const rawCellH = axisH / Math.max(1, cell.numRows) - 6;
    const w = Math.max(12, Math.min(86, rawCellW));
    const h = Math.max(18, Math.min(44, rawCellH));

    return (
      <g style={{ cursor: 'pointer' }}>
        <rect
          x={props.cx - w / 2}
          y={props.cy - h / 2}
          width={w}
          height={h}
          rx={cell.numCols > 14 ? 4 : 8}
          ry={cell.numCols > 14 ? 4 : 8}
          fill={palette.fill}
          stroke={palette.border}
          strokeWidth={cell.count > 0 ? 1.25 : 1}
        />
        {w >= 24 && cell.count > 0 && (
          <text
            x={props.cx}
            y={props.cy + 4}
            textAnchor="middle"
            fontSize={w < 34 ? 10 : 12}
            fontWeight={800}
            fill={palette.text}
            style={{ pointerEvents: 'none' }}
          >
            {cell.count}
          </text>
        )}
      </g>
    );
  };

  const chartHeight = Math.max(240, yLabels.length * 48 + 56);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-4">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 shrink-0 mt-0.5">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th'
                  ? 'แผนที่ความหนาแน่นการเช็คชื่อ (Attendance Heatmap • 30 วันล่าสุด)'
                  : 'Attendance Check-in Heatmap (Past 30 Days)'}
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-mono">
                {cutoffIso} – {todayIso}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {lang === 'th'
                ? 'แสดงช่วงเวลาที่นักเรียนและบุคลากรเช็คชื่อเข้าเรียนหนาแน่นที่สุด พร้อมจุดประตูยอดนิยมในรอบ 30 วัน'
                : 'Visualize peak check-in windows and most popular campus entry gates over the past 30 days.'}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 text-xs font-medium self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setMode('time_by_gate')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold flex items-center gap-1.5 ${
              mode === 'time_by_gate'
                ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ช่วงเวลา × จุดประตู' : 'Time × Entry Gate'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('day_by_time')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold flex items-center gap-1.5 ${
              mode === 'day_by_time'
                ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? '30 วัน × ช่วงเวลา' : '30 Days × Time'}</span>
          </button>
        </div>
      </div>

      {/* KPI Insights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
              {lang === 'th' ? 'เช็คชื่อทั้งหมด (30 วันล่าสุด)' : '30-Day Check-ins'}
            </p>
            <p className="text-lg font-black text-[var(--color-text-title)] mt-0.5 tabular-nums">
              {recentCheckins.length.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                {lang === 'th' ? 'ครั้ง' : 'scans'}
              </span>
            </p>
          </div>
          <Activity className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
        </div>

        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
              {lang === 'th' ? 'ช่วงเวลาหนาแน่นสูงสุด (Peak Time)' : 'Peak Check-in Time'}
            </p>
            <p className="text-base font-black text-amber-950 dark:text-amber-100 mt-0.5 truncate tabular-nums">
              {peakTimeSlot
                ? `${peakTimeSlot.slot.label} (${peakTimeSlot.count})`
                : lang === 'th'
                ? 'ยังไม่มีข้อมูล'
                : 'No data'}
            </p>
          </div>
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        </div>

        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-blue-900 dark:text-blue-200">
              {lang === 'th' ? 'ประตู / จุดสแกนยอดนิยม' : 'Most Popular Entry Gate'}
            </p>
            <p className="text-sm font-black text-blue-950 dark:text-blue-100 mt-0.5 truncate">
              {topGate
                ? `${topGate.name} (${topGate.count})`
                : lang === 'th'
                ? 'ยังไม่มีข้อมูล'
                : 'No data'}
            </p>
          </div>
          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
        <span>
          {mode === 'time_by_gate'
            ? lang === 'th'
              ? 'แกนตั้ง: จุดประตู / ช่องทางสแกน • แกนนอน: ช่วงเวลาเช็คชื่อ'
              : 'Y: Entry Gate • X: Time Slot'
            : lang === 'th'
            ? 'แกนตั้ง: ช่วงเวลา • แกนนอน: วันที่ย้อนหลัง 30 วัน'
            : 'Y: Time Slot • X: Past 30 Days'}
        </span>
        <div className="flex items-center gap-1.5">
          <span>{lang === 'th' ? 'น้อย' : 'Low'}</span>
          <span className="w-4 h-3 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)]" />
          <span className="w-4 h-3 rounded bg-[#dbeafe] border border-[#93c5fd]" />
          <span className="w-4 h-3 rounded bg-[#60a5fa] border border-[#3b82f6]" />
          <span className="w-4 h-3 rounded bg-[#2563eb] border border-[#1d4ed8]" />
          <span className="w-4 h-3 rounded bg-[#f59e0b] border border-[#d97706]" />
          <span>{lang === 'th' ? `หนาแน่นสูงสุด (${maxVal})` : `Peak (${maxVal})`}</span>
        </div>
      </div>

      {/* Recharts Heatmap Matrix */}
      {recentCheckins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] py-12 text-center space-y-1">
          <p className="text-sm font-bold text-[var(--color-text-title)]">
            {lang === 'th'
              ? 'ยังไม่มีข้อมูลการสแกนเช็คชื่อในช่วง 30 วันที่ผ่านมา'
              : 'No check-in timestamps recorded in the past 30 days'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {lang === 'th'
              ? 'เมื่อมีการสแกนประตู หรือเช็คชื่อเข้าเรียน ข้อมูลความหนาแน่นตามช่วงเวลาและประตูจะแสดงในแผนที่นี้ทันที'
              : 'Once students or staff check in, hourly and gate density will render here.'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[540px] w-full" style={{ height: `${chartHeight}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{
                  top: 16,
                  right: 20,
                  bottom: 24,
                  left: mode === 'time_by_gate' ? 140 : 66,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[-0.5, xLabels.length - 0.5]}
                  ticks={xLabels.map((_, idx) => idx)}
                  interval={mode === 'day_by_time' ? 2 : 0}
                  tickFormatter={(idx: number) => xLabels[idx] || ''}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  reversed
                  domain={[-0.5, yLabels.length - 0.5]}
                  ticks={yLabels.map((_, idx) => idx)}
                  interval={0}
                  tickFormatter={(idx: number) => yLabels[idx] || ''}
                  tickLine={false}
                  axisLine={false}
                  width={mode === 'time_by_gate' ? 136 : 62}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }}
                />
                <Tooltip
                  cursor={false}
                  content={<HeatmapTooltip lang={lang} mode={mode} />}
                />
                <Scatter
                  data={activeCells}
                  shape={renderHeatmapCell}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

interface HeatmapTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: HeatmapCellData }>;
  lang: AppLanguage;
  mode: HeatmapMode;
}

const HeatmapTooltip: React.FC<HeatmapTooltipProps> = ({ active, payload, lang, mode }) => {
  if (!active || !payload || !payload.length) return null;
  const cell = payload[0].payload;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-lg text-xs space-y-1.5 min-w-48">
      <div className="border-b border-[var(--color-border)] pb-1.5">
        <p className="font-bold text-[var(--color-text-title)]">
          {mode === 'time_by_gate' ? cell.yLabel : cell.xLabel}
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]">{cell.subtitle}</p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--color-text-body)]">
          {lang === 'th' ? 'จำนวนเช็คชื่อ:' : 'Check-ins:'}
        </span>
        <span className="font-mono font-black text-[var(--color-primary-text)] tabular-nums">
          {cell.count} ({cell.percent}%)
        </span>
      </div>
      {cell.count > 0 && (
        <div className="flex items-center justify-between gap-4 text-[11px]">
          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
            {lang === 'th' ? `ตรงเวลา ${cell.presentCount}` : `On-time ${cell.presentCount}`}
          </span>
          <span className="text-amber-700 dark:text-amber-300 font-semibold">
            {lang === 'th' ? `มาสาย ${cell.lateCount}` : `Late ${cell.lateCount}`}
          </span>
        </div>
      )}
    </div>
  );
};
