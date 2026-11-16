import * as XLSX from 'xlsx';
import {
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  Student,
} from '../types';
import { getLocalDateString } from './date';
import { getAttendanceDuplicateReasons } from './duplicateRecords';

export interface ParsedAttendanceImportRow {
  rowNumber: number;
  rawStudentId: string;
  rawStudentName: string;
  matchedStudent?: Student;
  date: string;
  time: string;
  status: AttendanceStatus;
  recordType: AttendanceCheckType;
  remarks: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
}

export interface AttendanceImportParseResult {
  rows: ParsedAttendanceImportRow[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  detectedColumns: string[];
}

const HEADER_ALIASES = {
  studentId: [
    'student id',
    'student_id',
    'studentid',
    'studentidnumber',
    'id',
    'รหัสนักเรียน',
    'รหัสประจำตัว',
    'รหัส',
    'เลขประจำตัวนักเรียน',
  ],
  studentName: [
    'student name',
    'student_name',
    'name',
    'fullname',
    'full name',
    'ชื่อ-นามสกุล',
    'ชื่อนามสกุล',
    'ชื่อ-สกุล',
    'ชื่อนักเรียน',
    'ชื่อ',
  ],
  date: ['date', 'attendance date', 'วันที่', 'วัน/เดือน/ปี', 'วันเดือนปี'],
  time: ['time', 'check-in time', 'checkin time', 'เวลา', 'เวลาเข้าเรียน', 'เวลาเช็คชื่อ'],
  status: ['status', 'attendance', 'attendance status', 'สถานะ', 'สถานะการเข้าเรียน', 'ผลการเช็คชื่อ'],
  recordType: ['type', 'record type', 'record_type', 'ประเภท', 'เข้า/ออก', 'ประเภทการบันทึก'],
  remarks: ['remarks', 'remark', 'note', 'notes', 'comment', 'หมายเหตุ', 'บันทึกเพิ่มเติม'],
};

function normalizeHeader(header: unknown): string {
  return String(header || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    if (aliases.includes(h)) return i;
  }
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    if (aliases.some((alias) => h.includes(alias))) return i;
  }
  return -1;
}

function normalizeYearToCe(yearNum: number): number {
  if (yearNum >= 2400 && yearNum <= 2700) {
    return yearNum - 543;
  }
  return yearNum;
}

export function normalizeImportDate(rawValue: unknown, fallbackDate: string): { value: string; error?: string } {
  if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
    return { value: fallbackDate };
  }

  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    const y = normalizeYearToCe(rawValue.getFullYear());
    const m = String(rawValue.getMonth() + 1).padStart(2, '0');
    const d = String(rawValue.getDate()).padStart(2, '0');
    return { value: `${y}-${m}-${d}` };
  }

  if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 20000 && rawValue < 90000) {
    const parsed = XLSX.SSF.parse_date_code(rawValue);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const y = normalizeYearToCe(parsed.y);
      return {
        value: `${y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`,
      };
    }
  }

  const text = String(rawValue).trim();

  // ISO YYYY-MM-DD or BE YYYY-MM-DD
  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const y = normalizeYearToCe(Number(isoMatch[1]));
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { value: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY (common in Thai Excel)
  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    const y = normalizeYearToCe(Number(dmyMatch[3]));
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { value: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
    }
  }

  return {
    value: fallbackDate,
    error: `รูปแบบวันที่ไม่ถูกต้อง "${text}" (รองรับ YYYY-MM-DD หรือ DD/MM/YYYY)`,
  };
}

export function normalizeImportTime(rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
    return '07:45:00';
  }
  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    const hh = String(rawValue.getHours()).padStart(2, '0');
    const mm = String(rawValue.getMinutes()).padStart(2, '0');
    const ss = String(rawValue.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue >= 0 && rawValue < 1) {
    const totalSeconds = Math.round(rawValue * 24 * 60 * 60);
    const hh = String(Math.floor(totalSeconds / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  const text = String(rawValue).trim().replace(/\s*น\.?$/, '');
  const timeMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const hh = String(Math.min(23, Number(timeMatch[1]))).padStart(2, '0');
    const mm = String(Math.min(59, Number(timeMatch[2]))).padStart(2, '0');
    const ss = String(Math.min(59, Number(timeMatch[3] || 0))).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return '07:45:00';
}

export function normalizeImportStatus(rawValue: unknown): { status: AttendanceStatus; error?: string } {
  const raw = String(rawValue || '').trim().toLowerCase();
  if (!raw) return { status: 'present' };

  if (
    raw === 'present' ||
    raw === 'p' ||
    raw === '1' ||
    raw === 'on time' ||
    raw === 'ontime' ||
    raw.includes('มาเรียน') ||
    raw.includes('ตรงเวลา') ||
    raw === 'มา' ||
    raw === 'ปกติ' ||
    raw === '✓'
  ) {
    return { status: 'present' };
  }

  if (raw === 'late' || raw === 'l' || raw.includes('สาย')) {
    return { status: 'late' };
  }

  if (raw === 'sick' || raw === 's' || raw.includes('ป่วย')) {
    return { status: 'sick' };
  }

  if (raw === 'leave' || raw === 'v' || raw === 'excused' || raw.includes('ลา')) {
    return { status: 'leave' };
  }

  if (raw === 'absent' || raw === 'a' || raw === '0' || raw.includes('ขาด')) {
    return { status: 'absent' };
  }

  return {
    status: 'present',
    error: `ไม่รู้จักสถานะ "${String(rawValue).trim()}" (ใช้ present/มา, late/สาย, absent/ขาด, sick/ลาป่วย, leave/ลากิจ)`,
  };
}

export function normalizeImportRecordType(rawValue: unknown): AttendanceCheckType {
  const raw = String(rawValue || '').trim().toLowerCase();
  if (raw === 'check_out' || raw === 'checkout' || raw === 'out' || raw.includes('ออก')) {
    return 'check_out';
  }
  return 'check_in';
}

function readCsvMatrix(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => String(c || '').trim() !== ''));
}

export async function parseAttendanceImportFile(
  file: File,
  students: Student[],
  existingAttendance: AttendanceRecord[],
  defaultDate = getLocalDateString()
): Promise<AttendanceImportParseResult> {
  const fileNameLower = file.name.toLowerCase();
  let matrix: unknown[][] = [];

  if (fileNameLower.endsWith('.csv')) {
    const text = await file.text();
    matrix = readCsvMatrix(text);
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { rows: [], validCount: 0, duplicateCount: 0, errorCount: 0, detectedColumns: [] };
    }
    const sheet = workbook.Sheets[firstSheetName];
    matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  }

  const nonEmptyRows = matrix.filter(
    (r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== '')
  );

  if (nonEmptyRows.length === 0) {
    return { rows: [], validCount: 0, duplicateCount: 0, errorCount: 0, detectedColumns: [] };
  }

  // Locate header row (handles optional title banner row above headers)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, nonEmptyRows.length); i += 1) {
    const candidate = nonEmptyRows[i].map(normalizeHeader);
    if (
      findColumnIndex(candidate, HEADER_ALIASES.studentId) >= 0 ||
      findColumnIndex(candidate, HEADER_ALIASES.studentName) >= 0
    ) {
      headerRowIdx = i;
      break;
    }
  }

  const rawHeaders = nonEmptyRows[headerRowIdx].map((c) => String(c ?? '').trim());
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  let idCol = findColumnIndex(normalizedHeaders, HEADER_ALIASES.studentId);
  let nameCol = findColumnIndex(normalizedHeaders, HEADER_ALIASES.studentName);
  let dateCol = findColumnIndex(normalizedHeaders, HEADER_ALIASES.date);
  let timeCol = findColumnIndex(normalizedHeaders, HEADER_ALIASES.time);
  let statusCol = findColumnIndex(normalizedHeaders, HEADER_ALIASES.status);
  const typeCol = findColumnIndex(normalizedHeaders, HEADER_ALIASES.recordType);
  const remarksCol = findColumnIndex(normalizedHeaders, HEADER_ALIASES.remarks);

  // Positional fallback if user uploaded headerless or custom-header spreadsheet
  const hasAnyRecognizedHeader = idCol >= 0 || nameCol >= 0 || statusCol >= 0;
  const dataStartIdx = hasAnyRecognizedHeader ? headerRowIdx + 1 : 0;
  if (!hasAnyRecognizedHeader) {
    idCol = 0;
    nameCol = 1;
    dateCol = 2;
    timeCol = 3;
    statusCol = 4;
  }

  // Lookup maps for students
  const byStudentIdNumber = new Map<string, Student>();
  const byInternalId = new Map<string, Student>();
  const byFullName = new Map<string, Student>();

  students.forEach((s) => {
    if (s.studentIdNumber) byStudentIdNumber.set(s.studentIdNumber.trim().toLowerCase(), s);
    byInternalId.set(s.id.trim().toLowerCase(), s);
    const thName = `${s.firstNameTh} ${s.lastNameTh}`.trim().replace(/\s+/g, ' ').toLowerCase();
    const enName = `${s.firstNameEn} ${s.lastNameEn}`.trim().replace(/\s+/g, ' ').toLowerCase();
    if (thName) byFullName.set(thName, s);
    if (enName) byFullName.set(enName, s);
  });

  const seenInUpload = new Set<string>();
  const parsedRows: ParsedAttendanceImportRow[] = [];

  for (let i = dataStartIdx; i < nonEmptyRows.length; i += 1) {
    const row = nonEmptyRows[i];
    const rawStudentId = idCol >= 0 ? String(row[idCol] ?? '').trim() : '';
    const rawStudentName = nameCol >= 0 ? String(row[nameCol] ?? '').trim() : '';

    // Skip instruction/comment rows
    if (!rawStudentId && !rawStudentName) continue;
    if (rawStudentId.startsWith('#') || rawStudentName.startsWith('#')) continue;

    const matchedStudent =
      (rawStudentId
        ? byStudentIdNumber.get(rawStudentId.toLowerCase()) || byInternalId.get(rawStudentId.toLowerCase())
        : undefined) ||
      (rawStudentName
        ? byFullName.get(rawStudentName.replace(/\s+/g, ' ').toLowerCase())
        : undefined);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!matchedStudent) {
      errors.push(
        rawStudentId
          ? `ไม่พบนักเรียนรหัส "${rawStudentId}" ในระบบ`
          : `ไม่พบนักเรียนชื่อ "${rawStudentName}" ในระบบ`
      );
    }

    const rawDate = dateCol >= 0 ? row[dateCol] : '';
    const dateResult = normalizeImportDate(rawDate, defaultDate);
    if (dateResult.error) errors.push(dateResult.error);

    const timeStr = normalizeImportTime(timeCol >= 0 ? row[timeCol] : '');

    const rawStatus = statusCol >= 0 ? row[statusCol] : 'present';
    const statusResult = normalizeImportStatus(rawStatus);
    if (statusResult.error) errors.push(statusResult.error);

    const recordType = normalizeImportRecordType(typeCol >= 0 ? row[typeCol] : 'check_in');
    const remarks =
      (remarksCol >= 0 ? String(row[remarksCol] ?? '').trim() : '') ||
      'นำเข้าจากเทมเพลต Excel/CSV';

    let isDuplicate = false;
    if (matchedStudent) {
      const dupReasons = getAttendanceDuplicateReasons(
        {
          studentId: matchedStudent.id,
          date: dateResult.value,
          recordType,
        },
        existingAttendance
      );
      if (dupReasons.length > 0) {
        isDuplicate = true;
        warnings.push(...dupReasons);
      }

      const uploadKey = `${matchedStudent.id}|${dateResult.value}|${recordType}`;
      if (seenInUpload.has(uploadKey)) {
        isDuplicate = true;
        warnings.push('ข้อมูลซ้ำภายในไฟล์เดียวกัน');
      } else {
        seenInUpload.add(uploadKey);
      }
    }

    parsedRows.push({
      rowNumber: i + 1,
      rawStudentId,
      rawStudentName,
      matchedStudent,
      date: dateResult.value,
      time: timeStr,
      status: statusResult.status,
      recordType,
      remarks,
      isValid: errors.length === 0 && Boolean(matchedStudent),
      isDuplicate,
      errors,
      warnings,
    });
  }

  return {
    rows: parsedRows,
    validCount: parsedRows.filter((r) => r.isValid).length,
    duplicateCount: parsedRows.filter((r) => r.isValid && r.isDuplicate).length,
    errorCount: parsedRows.filter((r) => !r.isValid).length,
    detectedColumns: rawHeaders.filter(Boolean),
  };
}

export function buildTemplateRows(
  students: Student[],
  roomFilter: string,
  dateStr = getLocalDateString()
): Array<Record<string, string>> {
  const targetStudents =
    roomFilter === 'all'
      ? students
      : students.filter((s) => s.room === roomFilter || s.gradeLevel === roomFilter);

  const sampleList =
    targetStudents.length > 0
      ? targetStudents
      : [
          {
            studentIdNumber: 'ED-6901',
            firstNameTh: 'ตัวอย่าง',
            lastNameTh: 'นักเรียน',
            room: 'ม.4/1',
          } as Student,
        ];

  return sampleList.map((stu) => ({
    'รหัสนักเรียน (Student ID)': stu.studentIdNumber,
    'ชื่อ-นามสกุล (Student Name)': `${stu.firstNameTh} ${stu.lastNameTh}`.trim(),
    'ห้องเรียน (Room)': stu.room || '-',
    'วันที่ (Date YYYY-MM-DD)': dateStr,
    'เวลา (Time HH:mm)': '07:45',
    'สถานะ (present/late/absent/sick/leave)': 'present',
    'ประเภท (check_in/check_out)': 'check_in',
    'หมายเหตุ (Remarks)': 'เช็คชื่อประจำวัน',
  }));
}

export function downloadAttendanceExcelTemplate(
  students: Student[],
  roomFilter = 'all',
  dateStr = getLocalDateString()
): string {
  const rows = buildTemplateRows(students, roomFilter, dateStr);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 26 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 36 },
    { wch: 24 },
    { wch: 26 },
  ];

  const guideRows = [
    { 'คอลัมน์': 'รหัสนักเรียน (Student ID)', 'คำอธิบาย': 'รหัสนักเรียนในระบบ เช่น ED-6901 (จำเป็น)' },
    { 'คอลัมน์': 'วันที่ (Date YYYY-MM-DD)', 'คำอธิบาย': 'รองรับ ค.ศ. 2026-11-15, พ.ศ. 15/11/2569 หรือวันที่ใน Excel' },
    { 'คอลัมน์': 'เวลา (Time HH:mm)', 'คำอธิบาย': 'รูปแบบ 24 ชม. เช่น 07:45 (ไม่ระบุจะเป็น 07:45:00)' },
    { 'คอลัมน์': 'สถานะ', 'คำอธิบาย': 'present (มาเรียน/ตรงเวลา), late (มาสาย), absent (ขาด), sick (ลาป่วย), leave (ลากิจ)' },
    { 'คอลัมน์': 'ประเภท', 'คำอธิบาย': 'check_in (เข้าเรียน) หรือ check_out (ออกโรงเรียน)' },
  ];
  const guideSheet = XLSX.utils.json_to_sheet(guideRows);
  guideSheet['!cols'] = [{ wch: 28 }, { wch: 64 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance_Template');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Instructions');

  const tag = roomFilter === 'all' ? 'all_classes' : roomFilter.replace(/[^\w\u0E00-\u0E7F-]/g, '_');
  const fileName = `attendance_template_${tag}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}

export function downloadAttendanceCsvTemplate(
  students: Student[],
  roomFilter = 'all',
  dateStr = getLocalDateString()
): string {
  const rows = buildTemplateRows(students, roomFilter, dateStr);
  const headers = Object.keys(rows[0] || {});
  const csvLines = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ];

  const csvContent = '\uFEFF' + csvLines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const tag = roomFilter === 'all' ? 'all_classes' : roomFilter.replace(/[^\w\u0E00-\u0E7F-]/g, '_');
  const fileName = `attendance_template_${tag}_${dateStr}.csv`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return fileName;
}

export function buildAttendanceRecordsFromImport(
  parsedRows: ParsedAttendanceImportRow[],
  options: {
    skipDuplicates: boolean;
    schoolId?: string;
    recordedBy?: string;
    recordedByRole?: string;
  }
): AttendanceRecord[] {
  const { skipDuplicates, schoolId, recordedBy, recordedByRole } = options;
  const nowStamp = Date.now();

  return parsedRows
    .filter((row) => row.isValid && row.matchedStudent && (!skipDuplicates || !row.isDuplicate))
    .map((row, index) => {
      const stu = row.matchedStudent!;
      return {
        id: `att-imp-${nowStamp}-${index}-${Math.floor(Math.random() * 1000)}`,
        schoolId: stu.schoolId || schoolId,
        studentId: stu.id,
        userType: 'student',
        userName: `${stu.firstNameTh} ${stu.lastNameTh}`.trim(),
        userRole: `นักเรียน (${stu.gradeLevel})`,
        userAvatar: stu.avatarUrl,
        userDepartmentOrRoom: stu.room,
        recordType: row.recordType,
        date: row.date,
        time: row.time,
        status: row.status,
        checkinMethod: 'manual',
        remarks: row.remarks,
        lineNotificationSent: false,
        recordedBy,
        recordedByRole,
      };
    });
}
