import * as XLSX from 'xlsx';
import { DayOfWeek, SchoolPeriodTime, TimetableSlot } from '../types';
import { getLocalDateString } from './date';
import { parseSlotTeachersFromRaw } from './timetableTeachers';

const DAY_THAI_LABELS: Record<DayOfWeek, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
};

const COLOR_OPTIONS: TimetableSlot['colorTag'][] = [
  'sky',
  'emerald',
  'amber',
  'rose',
  'purple',
  'indigo',
  'cyan',
];

function parseDayOfWeek(raw: string): DayOfWeek | null {
  const val = raw.trim().toLowerCase();
  if (!val) return null;
  if (val === 'mon' || val === 'monday' || val.includes('จันทร์') || val === 'จ' || val === '1') return 'mon';
  if (val === 'tue' || val === 'tuesday' || val.includes('อังคาร') || val === 'อ' || val === '2') return 'tue';
  if (val === 'wed' || val === 'wednesday' || val.includes('พุธ') || val === 'พ' || val === '3') return 'wed';
  if (val === 'thu' || val === 'thursday' || val.includes('พฤหัส') || val === 'พฤ' || val === '4') return 'thu';
  if (val === 'fri' || val === 'friday' || val.includes('ศุกร์') || val === 'ศ' || val === '5') return 'fri';
  return null;
}

function normalizeColorTag(raw: string): TimetableSlot['colorTag'] {
  const val = raw.trim().toLowerCase() as TimetableSlot['colorTag'];
  return COLOR_OPTIONS.includes(val) ? val : 'sky';
}

function normalizeTimeValue(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw < 1) {
    const totalMinutes = Math.round(raw * 24 * 60);
    const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const str = String(raw ?? '').trim();
  const match = /^(\d{1,2})[:.](\d{2})/.exec(str);
  if (!match) return '';
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh > 23 || mm > 59) return '';
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function buildTimetableExportRows(slots: TimetableSlot[]) {
  return slots.map((slot) => {
    const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(slot.teacherName, slot.coTeacherName);
    return {
      academicYear: slot.academicYear || '',
      semester: slot.semester || '',
      dayOfWeek: DAY_THAI_LABELS[slot.dayOfWeek] || slot.dayOfWeek,
      periodNumber: slot.periodNumber,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseCode: slot.courseCode,
      courseTitleTh: slot.courseTitleTh,
      courseTitleEn: slot.courseTitleEn,
      classRoom: slot.classRoom,
      teacherName,
      coTeacherName: coTeacherName || '',
      room: slot.room,
      credits: slot.credits ?? 1.5,
      colorTag: slot.colorTag || 'sky',
    };
  });
}

function triggerBlobDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTimetableCsv(slots: TimetableSlot[], baseFilename?: string): void {
  const rows = buildTimetableExportRows(slots);
  const headers = [
    'academicYear',
    'semester',
    'dayOfWeek',
    'periodNumber',
    'startTime',
    'endTime',
    'courseCode',
    'courseTitleTh',
    'courseTitleEn',
    'classRoom',
    'teacherName',
    'coTeacherName',
    'room',
    'credits',
    'colorTag',
  ] as const;

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(
    `${baseFilename || `timetable_export_${getLocalDateString()}`}.csv`,
    blob
  );
}

export function exportTimetableXlsx(slots: TimetableSlot[], baseFilename?: string): void {
  const exportRows = buildTimetableExportRows(slots).map((row) => ({
    'ปีการศึกษา (academicYear)': row.academicYear,
    'ภาคเรียน (semester)': row.semester,
    'วัน (dayOfWeek)': row.dayOfWeek,
    'คาบที่ (periodNumber)': row.periodNumber,
    'เวลาเริ่ม (startTime)': row.startTime,
    'เวลาเลิก (endTime)': row.endTime,
    'รหัสวิชา (courseCode)': row.courseCode,
    'ชื่อวิชาไทย (courseTitleTh)': row.courseTitleTh,
    'ชื่อวิชาEN (courseTitleEn)': row.courseTitleEn,
    'ห้องเรียน (classRoom)': row.classRoom,
    'ครูผู้สอนหลัก (teacherName)': row.teacherName,
    'ครูสอนคู่ (coTeacherName)': row.coTeacherName,
    'สถานที่/แล็บ (room)': row.room,
    'หน่วยกิต (credits)': row.credits,
    'โทนสี (colorTag)': row.colorTag,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable');
  XLSX.writeFile(workbook, `${baseFilename || `timetable_export_${getLocalDateString()}`}.xlsx`);
}

export function downloadTimetableTemplateCsv(academicYear = '2569', semester = '1'): void {
  const sampleRows: TimetableSlot[] = [
    {
      id: 'sample-1',
      academicYear,
      semester,
      dayOfWeek: 'mon',
      periodNumber: 1,
      startTime: '08:30',
      endTime: '09:20',
      courseCode: 'ว30101',
      courseTitleTh: 'วิทยาศาสตร์และเทคโนโลยี (สอนคู่)',
      courseTitleEn: 'Science & Technology',
      teacherName: 'อ.สมชาย ใจดี',
      coTeacherName: 'อ.กมลวรรณ รักเรียน',
      room: 'ห้องแล็บ 1',
      classRoom: 'ม.4/1',
      colorTag: 'emerald',
      credits: 1.5,
    },
    {
      id: 'sample-2',
      academicYear,
      semester,
      dayOfWeek: 'tue',
      periodNumber: 2,
      startTime: '09:20',
      endTime: '10:10',
      courseCode: 'ค30101',
      courseTitleTh: 'คณิตศาสตร์พื้นฐาน',
      courseTitleEn: 'Core Mathematics',
      teacherName: 'อ.วีระ พัฒนา',
      room: 'ห้อง 401',
      classRoom: 'ม.4/1',
      colorTag: 'purple',
      credits: 1.5,
    },
  ];
  exportTimetableCsv(sampleRows, 'template_timetable_schedule');
}

export function downloadTimetableTemplateXlsx(academicYear = '2569', semester = '1'): void {
  const sampleRows: TimetableSlot[] = [
    {
      id: 'sample-1',
      academicYear,
      semester,
      dayOfWeek: 'mon',
      periodNumber: 1,
      startTime: '08:30',
      endTime: '09:20',
      courseCode: 'ว30101',
      courseTitleTh: 'วิทยาศาสตร์และเทคโนโลยี (สอนคู่)',
      courseTitleEn: 'Science & Technology',
      teacherName: 'อ.สมชาย ใจดี',
      coTeacherName: 'อ.กมลวรรณ รักเรียน',
      room: 'ห้องแล็บ 1',
      classRoom: 'ม.4/1',
      colorTag: 'emerald',
      credits: 1.5,
    },
    {
      id: 'sample-2',
      academicYear,
      semester,
      dayOfWeek: 'tue',
      periodNumber: 2,
      startTime: '09:20',
      endTime: '10:10',
      courseCode: 'ค30101',
      courseTitleTh: 'คณิตศาสตร์พื้นฐาน',
      courseTitleEn: 'Core Mathematics',
      teacherName: 'อ.วีระ พัฒนา',
      room: 'ห้อง 401',
      classRoom: 'ม.4/1',
      colorTag: 'purple',
      credits: 1.5,
    },
  ];
  exportTimetableXlsx(sampleRows, 'template_timetable_schedule');
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s()_\-/.]/g, '');
}

function parseCsvText(text: string): unknown[][] {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line) => {
    const row: string[] = [];
    let insideQuotes = false;
    let cur = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        cur = '';
      } else {
        cur += char;
      }
    }
    row.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return row;
  });
}

export interface ParseTimetableImportResult {
  slots: TimetableSlot[];
  errors: string[];
  skippedRows: number;
}

export async function parseTimetableImportFile(
  file: File,
  defaults: {
    schoolId: string;
    academicYear: string;
    semester: string;
    schoolPeriods?: SchoolPeriodTime[];
  }
): Promise<ParseTimetableImportResult> {
  let rawRows: unknown[][] = [];
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { slots: [], errors: ['ไม่พบชีทข้อมูลในไฟล์ Excel'], skippedRows: 0 };
    }
    const sheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  } else {
    const text = await file.text();
    rawRows = parseCsvText(text);
  }

  const nonEmptyRows = rawRows.filter((row) =>
    Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '')
  );
  if (nonEmptyRows.length < 2) {
    return { slots: [], errors: ['ไฟล์ไม่มีข้อมูลแถวคาบเรียน (ต้องมีแถวหัวตารางและข้อมูลอย่างน้อย 1 แถว)'], skippedRows: 0 };
  }

  const headers = nonEmptyRows[0].map(normalizeHeader);
  const aliases = {
    academicYear: ['academicyear', 'ปีการศึกษาacademicyear', 'ปีการศึกษา', 'ปี'],
    semester: ['semester', 'ภาคเรียนsemester', 'ภาคเรียน', 'เทอม'],
    dayOfWeek: ['dayofweek', 'วันdayofweek', 'วันในสัปดาห์', 'วัน', 'day'],
    periodNumber: ['periodnumber', 'คาบที่periodnumber', 'คาบที่', 'คาบ', 'period'],
    startTime: ['starttime', 'เวลาเริ่มstarttime', 'เวลาเริ่ม', 'เริ่ม'],
    endTime: ['endtime', 'เวลาเลิกendtime', 'เวลาเลิก', 'เวลาสิ้นสุด', 'สิ้นสุด', 'เลิก'],
    courseCode: ['coursecode', 'รหัสวิชาcoursecode', 'รหัสวิชา', 'code'],
    courseTitleTh: ['coursetitleth', 'ชื่อวิชาไทยcoursetitleth', 'ชื่อวิชาไทย', 'ชื่อวิชา', 'titleth'],
    courseTitleEn: ['coursetitleen', 'ชื่อวิชาen', 'ชื่อวิชาอังกฤษ', 'titleen'],
    classRoom: ['classroom', 'ห้องเรียนclassroom', 'ห้องเรียน', 'ชั้นห้อง', 'ชั้นเรียน'],
    teacherName: ['teachername', 'ครูผู้สอนหลักteachername', 'ครูผู้สอนหลัก', 'ครูผู้สอน', 'ครูหลัก', 'อาจารย์ผู้สอน'],
    coTeacherName: ['coteachername', 'ครูสอนคู่coteachername', 'ครูสอนคู่', 'ครูร่วมสอน', 'ผู้สอนร่วม', 'ครูคนที่2', 'coteacher'],
    room: ['room', 'สถานที่แล็บroom', 'ห้องสถานที่', 'สถานที่', 'ห้องปฏิบัติการ', 'location'],
    credits: ['credits', 'หน่วยกิตcredits', 'หน่วยกิต'],
    colorTag: ['colortag', 'โทนสีcolortag', 'โทนสี', 'สี'],
  } as const;

  const hasNamedHeaders = [
    ...aliases.dayOfWeek,
    ...aliases.periodNumber,
    ...aliases.courseCode,
    ...aliases.teacherName,
  ].some((alias) => headers.includes(normalizeHeader(alias)));

  const col = (field: keyof typeof aliases, fallback: number) => {
    const idx = headers.findIndex((h) => aliases[field].some((alias) => normalizeHeader(alias) === h));
    return idx >= 0 ? idx : hasNamedHeaders ? -1 : fallback;
  };

  const cols = {
    academicYear: col('academicYear', 0),
    semester: col('semester', 1),
    dayOfWeek: col('dayOfWeek', 2),
    periodNumber: col('periodNumber', 3),
    startTime: col('startTime', 4),
    endTime: col('endTime', 5),
    courseCode: col('courseCode', 6),
    courseTitleTh: col('courseTitleTh', 7),
    courseTitleEn: col('courseTitleEn', 8),
    classRoom: col('classRoom', 9),
    teacherName: col('teacherName', 10),
    coTeacherName: col('coTeacherName', 11),
    room: col('room', 12),
    credits: col('credits', 13),
    colorTag: col('colorTag', 14),
  };

  const cell = (row: unknown[], index: number) => (index >= 0 ? String(row[index] ?? '').trim() : '');
  const periodMap = new Map((defaults.schoolPeriods || []).map((p) => [p.periodNumber, p]));

  const slots: TimetableSlot[] = [];
  const errors: string[] = [];
  let skippedRows = 0;

  nonEmptyRows.slice(1).forEach((row, index) => {
    const rowNo = index + 2;
    const rawDay = cell(row, cols.dayOfWeek);
    const dayOfWeek = parseDayOfWeek(rawDay);
    const periodNumber = Number(cell(row, cols.periodNumber));
    const courseCode = cell(row, cols.courseCode);
    const courseTitleTh = cell(row, cols.courseTitleTh);
    const classRoom = cell(row, cols.classRoom);

    if (!dayOfWeek || !Number.isInteger(periodNumber) || periodNumber < 1) {
      skippedRows += 1;
      errors.push(`แถว ${rowNo}: วัน ("${rawDay || '-'}") หรือหมายเลขคาบ ("${cell(row, cols.periodNumber) || '-'}") ไม่ถูกต้อง`);
      return;
    }
    if (!courseCode && !courseTitleTh) {
      skippedRows += 1;
      errors.push(`แถว ${rowNo}: ไม่พบรหัสวิชาหรือชื่อวิชา`);
      return;
    }
    if (!classRoom) {
      skippedRows += 1;
      errors.push(`แถว ${rowNo}: ไม่ได้ระบุห้องเรียน (classRoom)`);
      return;
    }

    const periodFallback = periodMap.get(periodNumber);
    const startTime = normalizeTimeValue(cols.startTime >= 0 ? row[cols.startTime] : '') || periodFallback?.startTime || '08:30';
    const endTime = normalizeTimeValue(cols.endTime >= 0 ? row[cols.endTime] : '') || periodFallback?.endTime || '09:20';
    const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(
      cell(row, cols.teacherName),
      cell(row, cols.coTeacherName)
    );
    const parsedCredits = Number(cell(row, cols.credits));
    const credits = Number.isFinite(parsedCredits) && parsedCredits > 0 ? parsedCredits : 1.5;

    slots.push({
      id: `time-imp-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      schoolId: defaults.schoolId,
      academicYear: cell(row, cols.academicYear) || defaults.academicYear,
      semester: cell(row, cols.semester) || defaults.semester,
      dayOfWeek,
      periodNumber,
      startTime,
      endTime,
      courseCode: courseCode || `CRS-${rowNo}`,
      courseTitleTh: courseTitleTh || courseCode,
      courseTitleEn: cell(row, cols.courseTitleEn) || courseTitleTh || courseCode,
      teacherName,
      ...(coTeacherName ? { coTeacherName } : {}),
      room: cell(row, cols.room) || classRoom,
      classRoom,
      colorTag: normalizeColorTag(cell(row, cols.colorTag)),
      credits,
      totalSemesterHours: Math.round(credits * 40),
    });
  });

  return { slots, errors, skippedRows };
}
