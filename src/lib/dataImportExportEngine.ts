import * as XLSX from 'xlsx';
import {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  DayOfWeek,
  GradeRecord,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
} from '../types';
import { getLocalDateString } from './date';
import { calculateGrade } from './schoolSettings';
import { isSpecialMoeGrade } from './moeGrading';
import { formatSlotTeachersDisplay, parseSlotTeachersFromRaw } from './timetableTeachers';

export type ManagedImportEntity =
  | 'students'
  | 'teachers'
  | 'courses'
  | 'grades'
  | 'attendance'
  | 'timetable';

export interface EntityFieldDefinition {
  key: string;
  labelTh: string;
  labelEn: string;
  required?: boolean;
  aliases: string[];
  example: string;
}

export interface EntityImportSchema {
  entity: ManagedImportEntity;
  titleTh: string;
  titleEn: string;
  filenamePrefix: string;
  fields: EntityFieldDefinition[];
}

export interface ParsedSpreadsheetData {
  fileName: string;
  headers: string[];
  rows: unknown[][];
}

export interface FailedImportRow {
  rowNumber: number;
  identifier: string;
  errors: string[];
  errorFields: string[];
  rawRow: Record<string, string>;
  mappedValues: Record<string, string>;
}

export interface DuplicateColumnMappingInfo {
  headerIndex: number;
  headerName: string;
  fieldKeys: string[];
}

export interface MappingDiagnostics {
  requiredFieldsTotal: number;
  requiredFieldsMapped: number;
  missingRequiredFields: EntityFieldDefinition[];
  mappedFieldsCount: number;
  duplicateMappings: DuplicateColumnMappingInfo[];
  unmappedHeaders: Array<{ index: number; header: string }>;
}

export interface MappedImportParseResult<T> {
  validRecords: T[];
  failedRows: FailedImportRow[];
  warningMessages: string[];
  totalRows: number;
}

function normalizeHeaderToken(value: unknown): string {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[\s()_\-/.:]/g, '');
}

function parseCsvLines(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];
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

function triggerDownloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsvCell(val: unknown): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const ENTITY_IMPORT_SCHEMAS: Record<ManagedImportEntity, EntityImportSchema> = {
  students: {
    entity: 'students',
    titleTh: 'นักเรียน (DMC)',
    titleEn: 'Students',
    filenamePrefix: 'students_export',
    fields: [
      { key: 'studentIdNumber', labelTh: 'รหัสนักเรียน', labelEn: 'Student ID', required: true, aliases: ['studentidnumber', 'studentid', 'รหัสประจำตัวstudentid', 'รหัสประจำตัว', 'รหัสนักเรียน', 'id'], example: '66001' },
      { key: 'nationalId', labelTh: 'เลขบัตรประชาชน 13 หลัก', labelEn: 'National ID', aliases: ['nationalid', 'เลขบัตรประชาชน13หลักdmc', 'เลขบัตรประชาชน13หลัก', 'เลขบัตรประชาชน', 'เลขประจำตัวประชาชน', 'citizendid'], example: '1100501234567' },
      { key: 'firstNameTh', labelTh: 'ชื่อ (ไทย)', labelEn: 'First Name (TH)', required: true, aliases: ['firstnameth', 'firstname', 'ชื่อไทย', 'ชื่อ', 'fname'], example: 'กฤติยา' },
      { key: 'lastNameTh', labelTh: 'นามสกุล (ไทย)', labelEn: 'Last Name (TH)', required: true, aliases: ['lastnameth', 'lastname', 'นามสกุลไทย', 'นามสกุล', 'lname'], example: 'รักเรียน' },
      { key: 'firstNameEn', labelTh: 'ชื่อ (EN)', labelEn: 'First Name (EN)', aliases: ['firstnameen', 'ชื่อen', 'ชื่ออังกฤษ'], example: 'Krittiya' },
      { key: 'lastNameEn', labelTh: 'นามสกุล (EN)', labelEn: 'Last Name (EN)', aliases: ['lastnameen', 'นามสกุลen', 'นามสกุลอังกฤษ'], example: 'Rakrian' },
      { key: 'gender', labelTh: 'เพศ', labelEn: 'Gender', aliases: ['gender', 'sex', 'เพศ'], example: 'หญิง' },
      { key: 'dateOfBirth', labelTh: 'วันเกิด (YYYY-MM-DD)', labelEn: 'Date of Birth', aliases: ['dateofbirth', 'dob', 'birthdate', 'วันเกิด', 'วันเดือนปีเกิด'], example: '2011-05-14' },
      { key: 'gradeLevel', labelTh: 'ระดับชั้น', labelEn: 'Grade Level', required: true, aliases: ['gradelevel', 'grade', 'ระดับชั้น', 'ชั้น', 'class'], example: 'ม.4' },
      { key: 'room', labelTh: 'ห้องเรียน', labelEn: 'Room', required: true, aliases: ['room', 'classroom', 'ห้องเรียน', 'ห้อง'], example: 'ม.4/1' },
      { key: 'gpa', labelTh: 'GPAX', labelEn: 'GPA', aliases: ['gpa', 'gpax', 'เกรดเฉลี่ย', 'เกรดเฉลี่ยสะสม'], example: '3.75' },
      { key: 'guardianName', labelTh: 'ชื่อผู้ปกครอง', labelEn: 'Guardian Name', aliases: ['guardianname', 'parentname', 'ชื่อผู้ปกครอง', 'ผู้ปกครอง'], example: 'สมศรี รักเรียน' },
      { key: 'guardianRelation', labelTh: 'ความสัมพันธ์', labelEn: 'Guardian Relation', aliases: ['guardianrelation', 'relation', 'ความสัมพันธ์'], example: 'มารดา' },
      { key: 'guardianPhone', labelTh: 'เบอร์โทรผู้ปกครอง', labelEn: 'Guardian Phone', aliases: ['guardianphone', 'phone', 'tel', 'เบอร์โทรผู้ปกครอง', 'เบอร์โทร'], example: '081-234-5678' },
    ],
  },
  teachers: {
    entity: 'teachers',
    titleTh: 'ครูและบุคลากร (HRMS)',
    titleEn: 'Teachers',
    filenamePrefix: 'teachers_export',
    fields: [
      { key: 'teacherIdNumber', labelTh: 'รหัสบุคลากร', labelEn: 'Teacher Code', aliases: ['teacheridnumber', 'teachercode', 'staffid', 'รหัสบุคลากร', 'รหัสครู', 'id'], example: 'TCH-001' },
      { key: 'fullNameTh', labelTh: 'ชื่อ-นามสกุล (ไทย)', labelEn: 'Full Name (TH)', required: true, aliases: ['fullnameth', 'fullname', 'teachername', 'ชื่อนามสกุล', 'ชื่อสกุลไทย', 'ชื่อครู'], example: 'อ.สมชาย ใจดี' },
      { key: 'fullNameEn', labelTh: 'ชื่อ-นามสกุล (EN)', labelEn: 'Full Name (EN)', aliases: ['fullnameen', 'nameen', 'ชื่ออังกฤษ'], example: 'Somchai Jaidee' },
      { key: 'email', labelTh: 'อีเมล', labelEn: 'Email', aliases: ['email', 'mail', 'อีเมล'], example: 'somchai@school.ac.th' },
      { key: 'phone', labelTh: 'เบอร์โทรศัพท์', labelEn: 'Phone', aliases: ['phone', 'tel', 'เบอร์โทร', 'โทรศัพท์'], example: '089-111-2233' },
      { key: 'department', labelTh: 'กลุ่มสาระฯ / ฝ่าย', labelEn: 'Department', required: true, aliases: ['department', 'dept', 'กลุ่มสาระ', 'กลุ่มสาระฯ', 'แผนก', 'ฝ่าย'], example: 'วิทยาศาสตร์และเทคโนโลยี' },
      { key: 'positionTitle', labelTh: 'ตำแหน่ง', labelEn: 'Position', aliases: ['positiontitle', 'position', 'ตำแหน่ง'], example: 'ครูผู้สอน' },
      { key: 'academicStanding', labelTh: 'วิทยฐานะ', labelEn: 'Academic Standing', aliases: ['academicstanding', 'วิทยฐานะ'], example: 'ชำนาญการพิเศษ' },
      { key: 'teacherLicenseNo', labelTh: 'เลขที่ใบประกอบวิชาชีพ', labelEn: 'License No', aliases: ['teacherlicenseno', 'licenseno', 'ใบประกอบวิชาชีพ', 'เลขใบอนุญาต'], example: '55100234890' },
      { key: 'homeroomClasses', labelTh: 'ห้องที่ปรึกษา (คั่นด้วย ;)', labelEn: 'Homeroom Classes', aliases: ['homeroomclasses', 'homeroom', 'ครูที่ปรึกษา', 'ห้องที่ปรึกษา'], example: 'ม.4/1' },
    ],
  },
  courses: {
    entity: 'courses',
    titleTh: 'รายวิชาและหลักสูตร (MIS)',
    titleEn: 'Courses',
    filenamePrefix: 'courses_export',
    fields: [
      { key: 'code', labelTh: 'รหัสวิชา', labelEn: 'Course Code', required: true, aliases: ['code', 'coursecode', 'รหัสวิชา'], example: 'ว30101' },
      { key: 'titleTh', labelTh: 'ชื่อรายวิชา (ไทย)', labelEn: 'Title (TH)', required: true, aliases: ['titleth', 'coursetitleth', 'ชื่อวิชาไทย', 'ชื่อวิชา', 'ชื่อรายวิชา'], example: 'วิทยาศาสตร์พื้นฐาน' },
      { key: 'titleEn', labelTh: 'ชื่อรายวิชา (EN)', labelEn: 'Title (EN)', aliases: ['titleen', 'coursetitleen', 'ชื่อวิชาen', 'ชื่อวิชาอังกฤษ'], example: 'Core Science' },
      { key: 'category', labelTh: 'กลุ่มสาระฯ / หมวด', labelEn: 'Category', aliases: ['category', 'กลุ่มสาระ', 'หมวดวิชา'], example: 'stem' },
      { key: 'credits', labelTh: 'หน่วยกิต', labelEn: 'Credits', aliases: ['credits', 'credit', 'หน่วยกิต'], example: '1.5' },
      { key: 'weeklyHours', labelTh: 'ชั่วโมง/สัปดาห์', labelEn: 'Weekly Hours', aliases: ['weeklyhours', 'ชั่วโมงสัปดาห์', 'คาบต่อสัปดาห์'], example: '3' },
      { key: 'totalHours', labelTh: 'ชั่วโมงรวม/เทอม', labelEn: 'Total Hours', aliases: ['totalhours', 'ชั่วโมงรวม', 'เวลาเรียนทั้งหมด'], example: '60' },
      { key: 'teacherName', labelTh: 'ครูผู้สอน', labelEn: 'Teacher Name', required: true, aliases: ['teachername', 'instructor', 'ครูผู้สอน', 'อาจารย์ผู้สอน'], example: 'อ.สมชาย ใจดี' },
      { key: 'department', labelTh: 'กลุ่มสาระงาน', labelEn: 'Department', aliases: ['department', 'แผนก', 'ฝ่าย'], example: 'วิทยาศาสตร์' },
      { key: 'room', labelTh: 'ห้องเรียน / แล็บ', labelEn: 'Room', aliases: ['room', 'สถานที่', 'ห้องเรียน'], example: 'Lab 1' },
    ],
  },
  grades: {
    entity: 'grades',
    titleTh: 'ผลการเรียน ปพ.5',
    titleEn: 'Grades',
    filenamePrefix: 'grades_export',
    fields: [
      { key: 'studentId', labelTh: 'รหัสนักเรียน / ID', labelEn: 'Student ID', required: true, aliases: ['studentidnumber', 'studentid', 'รหัสประจำตัว', 'รหัสนักเรียน'], example: '66001' },
      { key: 'courseCode', labelTh: 'รหัสวิชา', labelEn: 'Course Code', required: true, aliases: ['coursecode', 'code', 'รหัสวิชา'], example: 'ว30101' },
      { key: 'academicYear', labelTh: 'ปีการศึกษา', labelEn: 'Academic Year', aliases: ['academicyear', 'ปีการศึกษา', 'ปี'], example: '2569' },
      { key: 'semester', labelTh: 'ภาคเรียน', labelEn: 'Semester', aliases: ['semester', 'ภาคเรียน', 'เทอม'], example: '1' },
      { key: 'midtermScore', labelTh: 'คะแนนกลางภาค (เต็ม 30)', labelEn: 'Midterm (30)', aliases: ['midtermscore', 'midterm', 'คะแนนกลางภาค', 'กลางภาค'], example: '24' },
      { key: 'finalScore', labelTh: 'คะแนนปลายภาค (เต็ม 40)', labelEn: 'Final (40)', aliases: ['finalscore', 'final', 'คะแนนปลายภาค', 'ปลายภาค'], example: '33' },
      { key: 'assignmentScore', labelTh: 'คะแนนเก็บ/งาน (เต็ม 20)', labelEn: 'Assignment (20)', aliases: ['assignmentscore', 'assignment', 'คะแนนเก็บ', 'งานที่มอบหมาย', 'คะแนนงาน'], example: '18' },
      { key: 'quizScore', labelTh: 'คะแนนสอบย่อย (เต็ม 10)', labelEn: 'Quiz (10)', aliases: ['quizscore', 'quiz', 'สอบย่อย', 'จิตพิสัย'], example: '9' },
      { key: 'totalScore', labelTh: 'คะแนนรวม (เต็ม 100)', labelEn: 'Total Score', aliases: ['totalscore', 'total', 'score', 'คะแนนรวม', 'รวม100'], example: '84' },
      { key: 'letterGrade', labelTh: 'ผลการเรียน (0-4 / ร / มส)', labelEn: 'Grade', aliases: ['lettergrade', 'grade', 'เกรด', 'ผลการเรียน'], example: '4' },
    ],
  },
  attendance: {
    entity: 'attendance',
    titleTh: 'บันทึกการเข้าเรียน',
    titleEn: 'Attendance',
    filenamePrefix: 'attendance_export',
    fields: [
      { key: 'studentId', labelTh: 'รหัสนักเรียน / ID', labelEn: 'Student ID', required: true, aliases: ['studentidnumber', 'studentid', 'รหัสประจำตัว', 'รหัสนักเรียน'], example: '66001' },
      { key: 'studentName', labelTh: 'ชื่อนักเรียน (ถ้ามี)', labelEn: 'Student Name', aliases: ['studentname', 'fullname', 'ชื่อนักเรียน', 'ชื่อสกุล'], example: 'กฤติยา รักเรียน' },
      { key: 'date', labelTh: 'วันที่ (YYYY-MM-DD)', labelEn: 'Date', required: true, aliases: ['date', 'วันที่', 'วันเดือนปี'], example: '2026-11-15' },
      { key: 'time', labelTh: 'เวลา (HH:mm)', labelEn: 'Time', aliases: ['time', 'เวลา', 'เวลาเช็คชื่อ'], example: '07:45' },
      { key: 'status', labelTh: 'สถานะ (present/late/absent/sick/leave)', labelEn: 'Status', required: true, aliases: ['status', 'สถานะ', 'ผลการเช็คชื่อ', 'การมาเรียน'], example: 'มาเรียน' },
      { key: 'recordType', labelTh: 'ประเภท (check_in / check_out)', labelEn: 'Check Type', aliases: ['recordtype', 'checktype', 'ประเภท'], example: 'check_in' },
      { key: 'remarks', labelTh: 'หมายเหตุ', labelEn: 'Remarks', aliases: ['remarks', 'note', 'notes', 'หมายเหตุ'], example: '' },
    ],
  },
  timetable: {
    entity: 'timetable',
    titleTh: 'ตารางเรียนและตารางสอน',
    titleEn: 'Timetable',
    filenamePrefix: 'timetable_export',
    fields: [
      { key: 'academicYear', labelTh: 'ปีการศึกษา', labelEn: 'Academic Year', aliases: ['academicyear', 'ปีการศึกษา', 'ปี'], example: '2569' },
      { key: 'semester', labelTh: 'ภาคเรียน', labelEn: 'Semester', aliases: ['semester', 'ภาคเรียน', 'เทอม'], example: '1' },
      { key: 'dayOfWeek', labelTh: 'วัน (จ-ศ / mon-fri)', labelEn: 'Day of Week', required: true, aliases: ['dayofweek', 'day', 'วันในสัปดาห์', 'วัน'], example: 'จันทร์' },
      { key: 'periodNumber', labelTh: 'คาบที่', labelEn: 'Period Number', required: true, aliases: ['periodnumber', 'period', 'คาบที่', 'คาบ'], example: '1' },
      { key: 'startTime', labelTh: 'เวลาเริ่ม (HH:mm)', labelEn: 'Start Time', aliases: ['starttime', 'เวลาเริ่ม', 'เริ่ม'], example: '08:30' },
      { key: 'endTime', labelTh: 'เวลาเลิก (HH:mm)', labelEn: 'End Time', aliases: ['endtime', 'เวลาเลิก', 'เลิก', 'สิ้นสุด'], example: '09:20' },
      { key: 'courseCode', labelTh: 'รหัสวิชา', labelEn: 'Course Code', required: true, aliases: ['coursecode', 'code', 'รหัสวิชา'], example: 'ว30101' },
      { key: 'courseTitleTh', labelTh: 'ชื่อวิชา (ไทย)', labelEn: 'Course Title (TH)', required: true, aliases: ['coursetitleth', 'titleth', 'ชื่อวิชาไทย', 'ชื่อวิชา'], example: 'วิทยาศาสตร์' },
      { key: 'courseTitleEn', labelTh: 'ชื่อวิชา (EN)', labelEn: 'Course Title (EN)', aliases: ['coursetitleen', 'titleen', 'ชื่อวิชาen', 'ชื่อวิชาอังกฤษ'], example: 'Science' },
      { key: 'classRoom', labelTh: 'ห้องเรียน', labelEn: 'Classroom', required: true, aliases: ['classroom', 'ห้องเรียน', 'ชั้นห้อง', 'ชั้นเรียน'], example: 'ม.4/1' },
      { key: 'teacherName', labelTh: 'ครูผู้สอนหลัก', labelEn: 'Primary Teacher', required: true, aliases: ['teachername', 'teacher', 'ครูผู้สอนหลัก', 'ครูผู้สอน', 'ครูหลัก'], example: 'อ.สมชาย ใจดี' },
      { key: 'coTeacherName', labelTh: 'ครูสอนคู่', labelEn: 'Co-Teacher', aliases: ['coteachername', 'coteacher', 'ครูสอนคู่', 'ครูร่วมสอน', 'ครูคนที่2'], example: 'อ.กมลวรรณ รักเรียน' },
      { key: 'room', labelTh: 'สถานที่ / ห้องปฏิบัติการ', labelEn: 'Room/Lab', aliases: ['room', 'location', 'สถานที่', 'สถานที่แล็บ', 'ห้องปฏิบัติการ'], example: 'Lab 1' },
      { key: 'credits', labelTh: 'หน่วยกิต', labelEn: 'Credits', aliases: ['credits', 'credit', 'หน่วยกิต'], example: '1.5' },
    ],
  },
};

export async function readSpreadsheetFile(file: File): Promise<ParsedSpreadsheetData> {
  const lowerName = file.name.toLowerCase();
  let matrix: unknown[][] = [];

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) throw new Error('ไม่พบชีทข้อมูลในไฟล์ Excel');
    matrix = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { header: 1, defval: '' }) as unknown[][];
  } else {
    const text = await file.text();
    matrix = parseCsvLines(text);
  }

  const nonEmpty = matrix.filter(
    (row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '')
  );

  if (nonEmpty.length === 0) {
    throw new Error('ไฟล์ไม่มีข้อมูลแถวใดๆ');
  }

  const headerRow = nonEmpty[0].map((cell, i) => {
    const label = String(cell ?? '').trim();
    return label || `คอลัมน์ ${i + 1}`;
  });

  const dataRows = nonEmpty.slice(1);
  return {
    fileName: file.name,
    headers: headerRow,
    rows: dataRows,
  };
}

export function suggestColumnMapping(
  entity: ManagedImportEntity,
  headers: string[]
): Record<string, number> {
  const schema = ENTITY_IMPORT_SCHEMAS[entity];
  const normalizedHeaders = headers.map((h) => normalizeHeaderToken(h));
  const mapping: Record<string, number> = {};
  const usedIndexes = new Set<number>();

  schema.fields.forEach((field) => {
    const candidates = [
      normalizeHeaderToken(field.key),
      normalizeHeaderToken(field.labelTh),
      normalizeHeaderToken(field.labelEn),
      ...field.aliases.map(normalizeHeaderToken),
    ];

    let foundIdx = normalizedHeaders.findIndex(
      (h, idx) => !usedIndexes.has(idx) && candidates.some((c) => h === c)
    );

    if (foundIdx < 0) {
      foundIdx = normalizedHeaders.findIndex(
        (h, idx) =>
          !usedIndexes.has(idx) &&
          h.length > 1 &&
          candidates.some((c) => c.length > 2 && (h.includes(c) || c.includes(h)))
      );
    }

    if (foundIdx >= 0) {
      mapping[field.key] = foundIdx;
      usedIndexes.add(foundIdx);
    } else {
      mapping[field.key] = -1;
    }
  });

  return mapping;
}

export function getMappingDiagnostics(
  entity: ManagedImportEntity,
  headers: string[],
  columnMapping: Record<string, number>
): MappingDiagnostics {
  const schema = ENTITY_IMPORT_SCHEMAS[entity];
  const requiredFields = schema.fields.filter((f) => f.required);
  const missingRequiredFields = requiredFields.filter((f) => {
    const idx = columnMapping[f.key];
    return idx === undefined || idx < 0 || idx >= headers.length;
  });

  const colToFields = new Map<number, string[]>();
  let mappedFieldsCount = 0;
  schema.fields.forEach((f) => {
    const idx = columnMapping[f.key];
    if (idx !== undefined && idx >= 0 && idx < headers.length) {
      mappedFieldsCount += 1;
      const list = colToFields.get(idx) || [];
      list.push(f.key);
      colToFields.set(idx, list);
    }
  });

  const duplicateMappings: DuplicateColumnMappingInfo[] = [];
  colToFields.forEach((fieldKeys, headerIndex) => {
    if (fieldKeys.length > 1) {
      duplicateMappings.push({
        headerIndex,
        headerName: headers[headerIndex] || `Column ${headerIndex + 1}`,
        fieldKeys,
      });
    }
  });

  const unmappedHeaders = headers
    .map((header, index) => ({ index, header }))
    .filter(({ index }) => !colToFields.has(index));

  return {
    requiredFieldsTotal: requiredFields.length,
    requiredFieldsMapped: requiredFields.length - missingRequiredFields.length,
    missingRequiredFields,
    mappedFieldsCount,
    duplicateMappings,
    unmappedHeaders,
  };
}

const MAPPING_PRESET_PREFIX = 'eduverse_import_mapping_preset_';

export function saveColumnMappingPreset(
  entity: ManagedImportEntity,
  headers: string[],
  columnMapping: Record<string, number>
): void {
  if (typeof window === 'undefined') return;
  const headerByField: Record<string, string> = {};
  Object.entries(columnMapping).forEach(([fieldKey, colIdx]) => {
    if (colIdx >= 0 && colIdx < headers.length) {
      headerByField[fieldKey] = headers[colIdx];
    }
  });
  try {
    localStorage.setItem(`${MAPPING_PRESET_PREFIX}${entity}`, JSON.stringify(headerByField));
  } catch {
    // ignore storage errors
  }
}

export function hasSavedColumnMappingPreset(entity: ManagedImportEntity): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem(`${MAPPING_PRESET_PREFIX}${entity}`));
  } catch {
    return false;
  }
}

export function applySavedColumnMappingPreset(
  entity: ManagedImportEntity,
  headers: string[]
): Record<string, number> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${MAPPING_PRESET_PREFIX}${entity}`);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, string>;
    const schema = ENTITY_IMPORT_SCHEMAS[entity];
    const normalizedHeaders = headers.map((h) => normalizeHeaderToken(h));
    const nextMapping: Record<string, number> = {};
    schema.fields.forEach((field) => {
      const savedHeader = saved[field.key];
      if (!savedHeader) {
        nextMapping[field.key] = -1;
        return;
      }
      const exactIdx = headers.findIndex((h) => h === savedHeader);
      if (exactIdx >= 0) {
        nextMapping[field.key] = exactIdx;
        return;
      }
      const normTarget = normalizeHeaderToken(savedHeader);
      const normIdx = normalizedHeaders.findIndex((h) => h === normTarget);
      nextMapping[field.key] = normIdx;
    });
    return nextMapping;
  } catch {
    return null;
  }
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function normalizeSpreadsheetDate(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 25000 && raw < 90000) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      let y = parsed.y;
      if (y > 2400) y -= 543;
      if (isValidCalendarDate(y, parsed.m, parsed.d)) {
        return `${String(y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }
  }
  const str = String(raw ?? '').trim();
  if (!str) return null;

  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/.exec(str);
  if (isoMatch) {
    let year = Number(isoMatch[1]);
    if (year > 2400) year -= 543;
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (isValidCalendarDate(year, month, day)) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const dmyMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(str);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);
    if (year > 2400) year -= 543;
    if (isValidCalendarDate(year, month, day)) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

function normalizeSpreadsheetTime(raw: unknown): string {
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

function parseAttendanceStatus(raw: string): AttendanceStatus | null {
  const val = raw.trim().toLowerCase();
  if (!val) return null;
  if (val === 'present' || val.includes('มาเรียน') || val === 'มา' || val === 'p') return 'present';
  if (val === 'late' || val.includes('สาย') || val === 'l') return 'late';
  if (val === 'absent' || val.includes('ขาด') || val === 'a') return 'absent';
  if (val === 'sick' || val.includes('ป่วย') || val === 's') return 'sick';
  if (val === 'leave' || val.includes('ลา') || val === 'v') return 'leave';
  return null;
}

function parseTimetableDay(raw: string): DayOfWeek | null {
  const val = raw.trim().toLowerCase();
  if (!val) return null;
  if (val === 'mon' || val === 'monday' || val.includes('จันทร์') || val === 'จ' || val === '1') return 'mon';
  if (val === 'tue' || val === 'tuesday' || val.includes('อังคาร') || val === 'อ' || val === '2') return 'tue';
  if (val === 'wed' || val === 'wednesday' || val.includes('พุธ') || val === 'พ' || val === '3') return 'wed';
  if (val === 'thu' || val === 'thursday' || val.includes('พฤหัส') || val === 'พฤ' || val === '4') return 'thu';
  if (val === 'fri' || val === 'friday' || val.includes('ศุกร์') || val === 'ศ' || val === '5') return 'fri';
  return null;
}

export interface ValidateMappedRowsContext {
  schoolId: string;
  academicYear?: string;
  semester?: string;
  existingStudents?: Student[];
  existingTeachers?: Teacher[];
  existingCourses?: Course[];
  schoolPeriods?: SchoolPeriodTime[];
}

export function validateAndParseMappedRows(
  entity: ManagedImportEntity,
  rawHeaders: string[],
  rawRows: unknown[][],
  columnMapping: Record<string, number>,
  context: ValidateMappedRowsContext
): MappedImportParseResult<any> {
  const getVal = (row: unknown[], fieldKey: string): string => {
    const colIdx = columnMapping[fieldKey];
    if (colIdx === undefined || colIdx < 0 || colIdx >= row.length) return '';
    return String(row[colIdx] ?? '').trim();
  };

  const getRawCell = (row: unknown[], fieldKey: string): unknown => {
    const colIdx = columnMapping[fieldKey];
    if (colIdx === undefined || colIdx < 0 || colIdx >= row.length) return '';
    return row[colIdx];
  };

  const toRawRecord = (row: unknown[]): Record<string, string> => {
    const obj: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      obj[h] = String(row[idx] ?? '').trim();
    });
    return obj;
  };

  const toMappedValues = (row: unknown[]): Record<string, string> => {
    const obj: Record<string, string> = {};
    const schema = ENTITY_IMPORT_SCHEMAS[entity];
    schema.fields.forEach((field) => {
      obj[field.key] = getVal(row, field.key);
    });
    return obj;
  };

  const validRecords: any[] = [];
  const failedRows: FailedImportRow[] = [];
  const warningMessages: string[] = [];

  if (entity === 'students') {
    const seenIds = new Set<string>();
    const existingByCode = new Set(
      (context.existingStudents || []).map((s) => s.studentIdNumber.trim().toLowerCase())
    );

    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];
      const errorFields = new Set<string>();
      const studentIdNumber = getVal(row, 'studentIdNumber');
      const firstNameTh = getVal(row, 'firstNameTh');
      const lastNameTh = getVal(row, 'lastNameTh');
      const gradeLevel = getVal(row, 'gradeLevel');
      const room = getVal(row, 'room');
      const nationalId = getVal(row, 'nationalId');
      const rawGpa = getVal(row, 'gpa');
      const rawDob = getRawCell(row, 'dateOfBirth');
      const rawDobStr = String(rawDob ?? '').trim();

      if (!studentIdNumber) {
        errors.push('ไม่ได้ระบุรหัสนักเรียน (studentIdNumber)');
        errorFields.add('studentIdNumber');
      }
      if (!firstNameTh) {
        errors.push('ไม่ได้ระบุชื่อนักเรียน (firstNameTh)');
        errorFields.add('firstNameTh');
      }
      if (!lastNameTh) {
        errors.push('ไม่ได้ระบุนามสกุลนักเรียน (lastNameTh)');
        errorFields.add('lastNameTh');
      }
      if (!gradeLevel) {
        errors.push('ไม่ได้ระบุระดับชั้น (gradeLevel)');
        errorFields.add('gradeLevel');
      }
      if (!room) {
        errors.push('ไม่ได้ระบุห้องเรียน (room)');
        errorFields.add('room');
      }
      if (nationalId && !/^\d{13}$/.test(nationalId.replace(/[\s-]/g, ''))) {
        errors.push(`เลขบัตรประชาชน "${nationalId}" ไม่ครบ 13 หลัก`);
        errorFields.add('nationalId');
      }
      if (rawDobStr !== '' && !normalizeSpreadsheetDate(rawDob)) {
        errors.push(`รูปแบบวันเกิด "${rawDobStr}" ไม่ถูกต้อง (ใช้ YYYY-MM-DD หรือ DD/MM/YYYY)`);
        errorFields.add('dateOfBirth');
      }
      if (rawGpa !== '') {
        const numGpa = Number(rawGpa);
        if (!Number.isFinite(numGpa) || numGpa < 0 || numGpa > 4) {
          errors.push(`ค่า GPA "${rawGpa}" อยู่นอกช่วง 0.00–4.00`);
          errorFields.add('gpa');
        }
      }
      if (studentIdNumber) {
        const key = studentIdNumber.toLowerCase();
        if (seenIds.has(key)) {
          errors.push(`รหัสนักเรียนซ้ำกันภายในไฟล์ ("${studentIdNumber}")`);
          errorFields.add('studentIdNumber');
        }
        seenIds.add(key);
        if (existingByCode.has(key)) {
          warningMessages.push(`แถว ${rowNumber}: รหัส ${studentIdNumber} มีอยู่แล้วในระบบ`);
        }
      }

      if (errors.length > 0) {
        failedRows.push({
          rowNumber,
          identifier: studentIdNumber || `${firstNameTh} ${lastNameTh}`.trim() || `แถว ${rowNumber}`,
          errors,
          errorFields: Array.from(errorFields),
          rawRow: toRawRecord(row),
          mappedValues: toMappedValues(row),
        });
        return;
      }

      const rawGender = getVal(row, 'gender').toLowerCase();
      const gender = rawGender.includes('fe') || rawGender === 'หญิง' || rawGender === 'f' ? 'female' : 'male';
      const parsedDob = normalizeSpreadsheetDate(rawDob) || '2010-01-01';
      const parsedGpa = rawGpa !== '' ? Math.min(4, Math.max(0, Number(Number(rawGpa).toFixed(2)))) : 0;

      const record: Student = {
        id: `stu-imp-${Date.now()}-${idx}`,
        schoolId: context.schoolId,
        studentIdNumber,
        nationalId: nationalId.replace(/[\s-]/g, ''),
        firstNameTh,
        lastNameTh,
        firstNameEn: getVal(row, 'firstNameEn') || firstNameTh,
        lastNameEn: getVal(row, 'lastNameEn') || lastNameTh,
        gender,
        dateOfBirth: parsedDob,
        gradeLevel,
        room,
        gpa: parsedGpa,
        status: 'active',
        avatarUrl: gender === 'female'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
          : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
        guardianName: getVal(row, 'guardianName') || 'ผู้ปกครอง',
        guardianRelation: getVal(row, 'guardianRelation') || 'ผู้ปกครอง',
        guardianPhone: getVal(row, 'guardianPhone'),
        guardianEmail: '',
        lineLinked: false,
        lineNotifyEnabled: false,
        enrolledDate: getLocalDateString(),
      };
      validRecords.push(record);
    });
  } else if (entity === 'teachers') {
    const seenNames = new Set<string>();
    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];
      const errorFields = new Set<string>();
      const fullNameTh = getVal(row, 'fullNameTh');
      const department = getVal(row, 'department') || 'วิชาการ';
      const teacherIdNumber = getVal(row, 'teacherIdNumber') || `TCH-${Date.now().toString().slice(-4)}${idx + 1}`;
      const email = getVal(row, 'email');

      if (!fullNameTh) {
        errors.push('ไม่ได้ระบุชื่อ-นามสกุลครู');
        errorFields.add('fullNameTh');
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`รูปแบบอีเมล "${email}" ไม่ถูกต้อง`);
        errorFields.add('email');
      }
      if (fullNameTh) {
        const key = fullNameTh.toLowerCase();
        if (seenNames.has(key)) {
          errors.push(`ชื่อครูซ้ำกันภายในไฟล์ ("${fullNameTh}")`);
          errorFields.add('fullNameTh');
        }
        seenNames.add(key);
      }

      if (errors.length > 0) {
        failedRows.push({
          rowNumber,
          identifier: fullNameTh || teacherIdNumber || `แถว ${rowNumber}`,
          errors,
          errorFields: Array.from(errorFields),
          rawRow: toRawRecord(row),
          mappedValues: toMappedValues(row),
        });
        return;
      }

      const homeroomRaw = getVal(row, 'homeroomClasses');
      const record: Teacher = {
        id: `tch-imp-${Date.now()}-${idx}`,
        schoolId: context.schoolId,
        teacherIdNumber,
        fullNameTh,
        fullNameEn: getVal(row, 'fullNameEn') || fullNameTh,
        gender: 'male',
        email: email || `${teacherIdNumber.toLowerCase()}@school.ac.th`,
        phone: getVal(row, 'phone') || '080-000-0000',
        avatarUrl: '',
        academicDegree: '',
        major: '',
        department,
        positionTitle: getVal(row, 'positionTitle') || 'ครูผู้สอน',
        academicStanding: getVal(row, 'academicStanding') || 'ครู',
        teacherLicenseNo: getVal(row, 'teacherLicenseNo') || 'รอระบุ',
        homeroomClasses: homeroomRaw ? homeroomRaw.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [],
        teachingGrades: [],
        teachingSubjects: [],
        paPortfolio: [],
      };
      validRecords.push(record);
    });
  } else if (entity === 'courses') {
    const seenCodes = new Set<string>();
    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];
      const errorFields = new Set<string>();
      const code = getVal(row, 'code');
      const titleTh = getVal(row, 'titleTh');
      const teacherName = getVal(row, 'teacherName');
      const rawCredits = getVal(row, 'credits');
      const credits = rawCredits ? Number(rawCredits) : 1.5;

      if (!code) {
        errors.push('ไม่ได้ระบุรหัสวิชา (code)');
        errorFields.add('code');
      }
      if (!titleTh) {
        errors.push('ไม่ได้ระบุชื่อรายวิชา (titleTh)');
        errorFields.add('titleTh');
      }
      if (!teacherName) {
        errors.push('ไม่ได้ระบุครูผู้สอน (teacherName)');
        errorFields.add('teacherName');
      }
      if (rawCredits && (!Number.isFinite(credits) || credits <= 0 || credits > 10)) {
        errors.push(`หน่วยกิต "${rawCredits}" ไม่ถูกต้อง`);
        errorFields.add('credits');
      }
      if (code) {
        const key = code.toLowerCase();
        if (seenCodes.has(key)) {
          errors.push(`รหัสวิชาซ้ำกันภายในไฟล์ ("${code}")`);
          errorFields.add('code');
        }
        seenCodes.add(key);
      }

      if (errors.length > 0) {
        failedRows.push({
          rowNumber,
          identifier: code || titleTh || `แถว ${rowNumber}`,
          errors,
          errorFields: Array.from(errorFields),
          rawRow: toRawRecord(row),
          mappedValues: toMappedValues(row),
        });
        return;
      }

      const rawWeekly = Number(getVal(row, 'weeklyHours'));
      const weeklyHours = Number.isFinite(rawWeekly) && rawWeekly > 0 ? rawWeekly : Math.max(1, Math.round(credits * 2));
      const rawTotal = Number(getVal(row, 'totalHours'));
      const totalHours = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : weeklyHours * 20;

      const record: Course = {
        id: `crs-imp-${Date.now()}-${idx}`,
        schoolId: context.schoolId,
        code,
        titleTh,
        titleEn: getVal(row, 'titleEn') || titleTh,
        category: getVal(row, 'category') || 'core',
        credits,
        weeklyHours,
        totalHours,
        minAttendanceHours: Math.round(totalHours * 0.8),
        teacherName,
        teacherEmail: `${teacherName.replace(/\s+/g, '').toLowerCase()}@school.ac.th`,
        department: getVal(row, 'department') || 'วิชาการ',
        schedule: 'รอจัดตาราง',
        room: getVal(row, 'room') || 'ห้อง 401',
        academicYear: context.academicYear || '2569',
        semester: context.semester || '1',
        enrolledStudentIds: [],
        description: '',
      };
      validRecords.push(record);
    });
  } else if (entity === 'grades') {
    const existingStudents = context.existingStudents || [];
    const existingCourses = context.existingCourses || [];
    const seenGradeKeys = new Set<string>();
    const validGradeTokens = new Set([
      '4', '4.0', '3.5', '3', '3.0', '2.5', '2', '2.0', '1.5', '1', '1.0', '0', '0.0',
      'a', 'b+', 'b', 'c+', 'c', 'd+', 'd', 'f', 'ร', 'มส', 'มส.', 'ผ', 'มผ',
    ]);

    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];
      const errorFields = new Set<string>();
      const studentRef = getVal(row, 'studentId');
      const courseRef = getVal(row, 'courseCode');
      const academicYear = getVal(row, 'academicYear') || context.academicYear || '2569';
      const semester = getVal(row, 'semester') || context.semester || '1';

      const matchedStudent = existingStudents.find(
        (s) =>
          s.studentIdNumber.toLowerCase() === studentRef.toLowerCase() ||
          s.id.toLowerCase() === studentRef.toLowerCase()
      );
      const matchedCourse = existingCourses.find(
        (c) =>
          c.code.toLowerCase() === courseRef.toLowerCase() ||
          c.id.toLowerCase() === courseRef.toLowerCase() ||
          c.titleTh.toLowerCase() === courseRef.toLowerCase()
      );

      if (!studentRef) {
        errors.push('ไม่ได้ระบุรหัสนักเรียน (studentId)');
        errorFields.add('studentId');
      } else if (existingStudents.length > 0 && !matchedStudent) {
        errors.push(`ไม่พบนักเรียนรหัส "${studentRef}" ในโรงเรียนนี้`);
        errorFields.add('studentId');
      }

      if (!courseRef) {
        errors.push('ไม่ได้ระบุรหัสวิชา (courseCode)');
        errorFields.add('courseCode');
      } else if (existingCourses.length > 0 && !matchedCourse) {
        errors.push(`ไม่พบรายวิชารหัส "${courseRef}" ในโรงเรียนนี้`);
        errorFields.add('courseCode');
      }

      const rawMid = getVal(row, 'midtermScore');
      const rawFinal = getVal(row, 'finalScore');
      const rawAsg = getVal(row, 'assignmentScore');
      const rawQuiz = getVal(row, 'quizScore');
      const rawTotal = getVal(row, 'totalScore');
      const customLetter = getVal(row, 'letterGrade');

      const mid = rawMid !== '' ? Number(rawMid) : 0;
      const fin = rawFinal !== '' ? Number(rawFinal) : 0;
      const asg = rawAsg !== '' ? Number(rawAsg) : 0;
      const quiz = rawQuiz !== '' ? Number(rawQuiz) : 0;

      if (rawMid !== '' && (!Number.isFinite(mid) || mid < 0 || mid > 100)) {
        errors.push(`คะแนนกลางภาค "${rawMid}" ไม่ถูกต้อง (ต้องเป็น 0–100)`);
        errorFields.add('midtermScore');
      }
      if (rawFinal !== '' && (!Number.isFinite(fin) || fin < 0 || fin > 100)) {
        errors.push(`คะแนนปลายภาค "${rawFinal}" ไม่ถูกต้อง (ต้องเป็น 0–100)`);
        errorFields.add('finalScore');
      }
      if (rawAsg !== '' && (!Number.isFinite(asg) || asg < 0 || asg > 100)) {
        errors.push(`คะแนนเก็บ "${rawAsg}" ไม่ถูกต้อง (ต้องเป็น 0–100)`);
        errorFields.add('assignmentScore');
      }
      if (rawQuiz !== '' && (!Number.isFinite(quiz) || quiz < 0 || quiz > 100)) {
        errors.push(`คะแนนสอบย่อย "${rawQuiz}" ไม่ถูกต้อง (ต้องเป็น 0–100)`);
        errorFields.add('quizScore');
      }

      if (
        rawMid === '' &&
        rawFinal === '' &&
        rawAsg === '' &&
        rawQuiz === '' &&
        rawTotal === '' &&
        customLetter === ''
      ) {
        errors.push('ไม่ได้ระบุคะแนนหรือผลการเรียนในแถวนี้');
        errorFields.add('totalScore');
      }

      if (customLetter !== '' && !validGradeTokens.has(customLetter.trim().toLowerCase())) {
        errors.push(`ผลการเรียน "${customLetter}" ไม่ถูกต้อง (ใช้ 0-4, A-F, ร, มส., ผ, มผ)`);
        errorFields.add('letterGrade');
      }

      const computedTotal = rawTotal !== '' ? Number(rawTotal) : mid + fin + asg + quiz;
      if (!Number.isFinite(computedTotal) || computedTotal < 0 || computedTotal > 100) {
        errors.push(`คะแนนรวม (${Number.isFinite(computedTotal) ? computedTotal : rawTotal}) ต้องอยู่ระหว่าง 0–100`);
        errorFields.add('totalScore');
      }

      const dupKey = `${studentRef.toLowerCase()}|${courseRef.toLowerCase()}|${academicYear}|${semester}`;
      if (studentRef && courseRef) {
        if (seenGradeKeys.has(dupKey)) {
          errors.push('รายการผลการเรียนซ้ำในไฟล์เดียวกัน');
          errorFields.add('studentId');
          errorFields.add('courseCode');
        }
        seenGradeKeys.add(dupKey);
      }

      if (errors.length > 0) {
        failedRows.push({
          rowNumber,
          identifier: `${studentRef || '-'} · ${courseRef || '-'}`,
          errors,
          errorFields: Array.from(errorFields),
          rawRow: toRawRecord(row),
          mappedValues: toMappedValues(row),
        });
        return;
      }

      const calculated = calculateGrade(computedTotal, 'thai');
      const isSpecial = isSpecialMoeGrade(customLetter);
      const record: GradeRecord = {
        id: `grd-imp-${Date.now()}-${idx}`,
        schoolId: context.schoolId,
        studentId: matchedStudent?.id || studentRef,
        courseId: matchedCourse?.id || courseRef,
        academicYear,
        semester,
        midtermScore: mid,
        finalScore: fin,
        assignmentScore: asg,
        quizScore: quiz,
        totalScore: computedTotal,
        letterGrade: customLetter || calculated.letter,
        gradePoint: isSpecial ? 0 : calculated.point,
      };
      validRecords.push(record);
    });
  } else if (entity === 'attendance') {
    const existingStudents = context.existingStudents || [];
    const seenAttendanceKeys = new Set<string>();

    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];
      const errorFields = new Set<string>();
      const studentRef = getVal(row, 'studentId');
      const rawDate = getRawCell(row, 'date');
      const parsedDate = normalizeSpreadsheetDate(rawDate);
      const rawStatus = getVal(row, 'status');
      const status = parseAttendanceStatus(rawStatus);
      const rawType = getVal(row, 'recordType').toLowerCase();
      const recordType = rawType.includes('out') || rawType.includes('ออก') ? 'check_out' : 'check_in';
      const rawTimeCell = getRawCell(row, 'time');
      const rawTimeStr = String(rawTimeCell ?? '').trim();
      const normalizedTime = normalizeSpreadsheetTime(rawTimeCell);
      const parsedTime = normalizedTime || '07:45';

      const matchedStudent = existingStudents.find(
        (s) =>
          s.studentIdNumber.toLowerCase() === studentRef.toLowerCase() ||
          s.id.toLowerCase() === studentRef.toLowerCase()
      );

      if (!studentRef) {
        errors.push('ไม่ได้ระบุรหัสนักเรียน (studentId)');
        errorFields.add('studentId');
      } else if (existingStudents.length > 0 && !matchedStudent) {
        errors.push(`ไม่พบนักเรียนรหัส "${studentRef}" ในโรงเรียนนี้`);
        errorFields.add('studentId');
      }
      if (!parsedDate) {
        errors.push(`รูปแบบวันที่ "${String(rawDate || '-')}" ไม่ถูกต้อง (ควรเป็น YYYY-MM-DD หรือ DD/MM/YYYY)`);
        errorFields.add('date');
      }
      if (rawTimeStr !== '' && !normalizedTime) {
        errors.push(`รูปแบบเวลา "${rawTimeStr}" ไม่ถูกต้อง (ควรเป็น HH:mm เช่น 07:45)`);
        errorFields.add('time');
      }
      if (!status) {
        errors.push(`สถานะการเข้าเรียน "${rawStatus || '-'}" ไม่รองรับ (ใช้ present/มาเรียน, late/สาย, absent/ขาด, sick/ป่วย, leave/ลา)`);
        errorFields.add('status');
      }

      const dupKey = `${studentRef.toLowerCase()}|${parsedDate || ''}|${recordType}`;
      if (studentRef && parsedDate) {
        if (seenAttendanceKeys.has(dupKey)) {
          errors.push('บันทึกเช็คชื่อซ้ำวันเดียวกันภายในไฟล์');
          errorFields.add('studentId');
          errorFields.add('date');
        }
        seenAttendanceKeys.add(dupKey);
      }

      if (errors.length > 0) {
        failedRows.push({
          rowNumber,
          identifier: `${studentRef || '-'} · ${parsedDate || String(rawDate || '-')}`,
          errors,
          errorFields: Array.from(errorFields),
          rawRow: toRawRecord(row),
          mappedValues: toMappedValues(row),
        });
        return;
      }

      const fullName = matchedStudent
        ? `${matchedStudent.firstNameTh} ${matchedStudent.lastNameTh}`
        : getVal(row, 'studentName') || studentRef;

      const record: AttendanceRecord = {
        id: `att-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        schoolId: context.schoolId,
        studentId: matchedStudent?.id || studentRef,
        userType: 'student',
        userName: fullName,
        userDepartmentOrRoom: matchedStudent?.room || '',
        recordType,
        date: parsedDate!,
        time: `${parsedTime}:00`.slice(0, 8),
        status: status!,
        checkinMethod: 'manual',
        remarks: getVal(row, 'remarks') || 'นำเข้าจากไฟล์ Excel/CSV',
        lineNotificationSent: false,
      };
      validRecords.push(record);
    });
  } else if (entity === 'timetable') {
    const periodMap = new Map((context.schoolPeriods || []).map((p) => [p.periodNumber, p]));
    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const errors: string[] = [];
      const errorFields = new Set<string>();
      const rawDay = getVal(row, 'dayOfWeek');
      const dayOfWeek = parseTimetableDay(rawDay);
      const rawPeriod = getVal(row, 'periodNumber');
      const periodNumber = Number(rawPeriod);
      const courseCode = getVal(row, 'courseCode');
      const courseTitleTh = getVal(row, 'courseTitleTh');
      const classRoom = getVal(row, 'classRoom');
      const rawTeacher = getVal(row, 'teacherName');
      const rawCoTeacher = getVal(row, 'coTeacherName');
      const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(rawTeacher, rawCoTeacher);

      if (!dayOfWeek) {
        errors.push(`วันในสัปดาห์ "${rawDay || '-'}" ไม่ถูกต้อง`);
        errorFields.add('dayOfWeek');
      }
      if (!Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > 16) {
        errors.push(`คาบเรียน "${rawPeriod || '-'}" ต้องเป็นตัวเลข 1–16`);
        errorFields.add('periodNumber');
      }
      if (!courseCode && !courseTitleTh) {
        errors.push('ไม่ได้ระบุรหัสวิชาหรือชื่อวิชา');
        errorFields.add('courseCode');
        errorFields.add('courseTitleTh');
      }
      if (!classRoom) {
        errors.push('ไม่ได้ระบุห้องเรียน (classRoom)');
        errorFields.add('classRoom');
      }
      if (!teacherName) {
        errors.push('ไม่ได้ระบุชื่อครูผู้สอนหลัก');
        errorFields.add('teacherName');
      }

      if (errors.length > 0) {
        failedRows.push({
          rowNumber,
          identifier: `${courseCode || courseTitleTh || '-'} · ${classRoom || '-'}`,
          errors,
          errorFields: Array.from(errorFields),
          rawRow: toRawRecord(row),
          mappedValues: toMappedValues(row),
        });
        return;
      }

      const periodFallback = periodMap.get(periodNumber);
      const startTime = normalizeSpreadsheetTime(getRawCell(row, 'startTime')) || periodFallback?.startTime || '08:30';
      const endTime = normalizeSpreadsheetTime(getRawCell(row, 'endTime')) || periodFallback?.endTime || '09:20';
      const rawCredits = Number(getVal(row, 'credits'));
      const credits = Number.isFinite(rawCredits) && rawCredits > 0 ? rawCredits : 1.5;

      const record: TimetableSlot = {
        id: `time-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        schoolId: context.schoolId,
        academicYear: getVal(row, 'academicYear') || context.academicYear || '2569',
        semester: getVal(row, 'semester') || context.semester || '1',
        dayOfWeek: dayOfWeek!,
        periodNumber,
        startTime,
        endTime,
        courseCode: courseCode || `CRS-${rowNumber}`,
        courseTitleTh: courseTitleTh || courseCode,
        courseTitleEn: getVal(row, 'courseTitleEn') || courseTitleTh || courseCode,
        teacherName,
        ...(coTeacherName ? { coTeacherName } : {}),
        room: getVal(row, 'room') || classRoom,
        classRoom,
        colorTag: 'sky',
        credits,
        totalSemesterHours: Math.round(credits * 40),
      };
      validRecords.push(record);
    });
  }

  return {
    validRecords,
    failedRows,
    warningMessages,
    totalRows: rawRows.length,
  };
}

function buildRowsForEntityExport(
  entity: ManagedImportEntity,
  records: any[],
  context?: { students?: Student[]; courses?: Course[] }
): Record<string, string | number>[] {
  if (entity === 'students') {
    return (records as Student[]).map((s) => ({
      studentIdNumber: s.studentIdNumber,
      nationalId: s.nationalId || '',
      firstNameTh: s.firstNameTh,
      lastNameTh: s.lastNameTh,
      firstNameEn: s.firstNameEn,
      lastNameEn: s.lastNameEn,
      gender: s.gender === 'female' ? 'หญิง' : 'ชาย',
      dateOfBirth: s.dateOfBirth,
      gradeLevel: s.gradeLevel,
      room: s.room,
      gpa: s.gpa,
      guardianName: s.guardianName,
      guardianRelation: s.guardianRelation,
      guardianPhone: s.guardianPhone,
    }));
  }
  if (entity === 'teachers') {
    return (records as Teacher[]).map((t) => ({
      teacherIdNumber: t.teacherIdNumber,
      fullNameTh: t.fullNameTh,
      fullNameEn: t.fullNameEn,
      email: t.email,
      phone: t.phone,
      department: t.department,
      positionTitle: t.positionTitle || 'ครูผู้สอน',
      academicStanding: t.academicStanding || '',
      teacherLicenseNo: t.teacherLicenseNo,
      homeroomClasses: (t.homeroomClasses || []).join('; '),
    }));
  }
  if (entity === 'courses') {
    return (records as Course[]).map((c) => ({
      code: c.code,
      titleTh: c.titleTh,
      titleEn: c.titleEn,
      category: c.category,
      credits: c.credits,
      weeklyHours: c.weeklyHours ?? Math.round(c.credits * 2),
      totalHours: c.totalHours ?? c.credits * 40,
      teacherName: c.teacherName,
      department: c.department,
      room: c.room,
    }));
  }
  if (entity === 'grades') {
    const stuMap = new Map((context?.students || []).map((s) => [s.id, s]));
    const crsMap = new Map((context?.courses || []).map((c) => [c.id, c]));
    return (records as GradeRecord[]).map((g) => ({
      studentId: stuMap.get(g.studentId)?.studentIdNumber || g.studentId,
      courseCode: crsMap.get(g.courseId)?.code || g.courseId,
      academicYear: g.academicYear,
      semester: g.semester,
      midtermScore: g.midtermScore,
      finalScore: g.finalScore,
      assignmentScore: g.assignmentScore,
      quizScore: g.quizScore,
      totalScore: g.totalScore,
      letterGrade: g.letterGrade,
    }));
  }
  if (entity === 'attendance') {
    const stuMap = new Map((context?.students || []).map((s) => [s.id, s]));
    return (records as AttendanceRecord[]).map((a) => {
      const st = stuMap.get(a.studentId);
      return {
        studentId: st?.studentIdNumber || a.studentId,
        studentName: st ? `${st.firstNameTh} ${st.lastNameTh}` : a.userName || '',
        date: a.date,
        time: a.time,
        status: a.status,
        recordType: a.recordType || 'check_in',
        remarks: a.remarks || '',
      };
    });
  }
  return (records as TimetableSlot[]).map((slot) => {
    const { teacherName, coTeacherName } = parseSlotTeachersFromRaw(slot.teacherName, slot.coTeacherName);
    return {
      academicYear: slot.academicYear || '',
      semester: slot.semester || '',
      dayOfWeek: slot.dayOfWeek,
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
      teachersDisplay: formatSlotTeachersDisplay(slot),
    };
  });
}

export function exportEntityData(
  entity: ManagedImportEntity,
  format: 'xlsx' | 'csv',
  records: any[],
  context?: { students?: Student[]; courses?: Course[] }
): void {
  const schema = ENTITY_IMPORT_SCHEMAS[entity];
  const rows = buildRowsForEntityExport(entity, records, context);
  const dateTag = getLocalDateString();

  if (format === 'xlsx') {
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, schema.titleEn);
    XLSX.writeFile(wb, `${schema.filenamePrefix}_${dateTag}.xlsx`);
    return;
  }

  const headers = schema.fields.map((f) => f.key);
  const csvLines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCsvCell(r[h])).join(',')),
  ];
  triggerDownloadBlob(
    `${schema.filenamePrefix}_${dateTag}.csv`,
    new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  );
}

export function downloadEntityTemplate(
  entity: ManagedImportEntity,
  format: 'xlsx' | 'csv'
): void {
  const schema = ENTITY_IMPORT_SCHEMAS[entity];
  const sampleRow: Record<string, string> = {};
  schema.fields.forEach((f) => {
    sampleRow[`${f.labelTh} (${f.key})`] = f.example;
  });

  if (format === 'xlsx') {
    const sheet = XLSX.utils.json_to_sheet([sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Template');
    XLSX.writeFile(wb, `template_${schema.entity}.xlsx`);
    return;
  }

  const headers = schema.fields.map((f) => f.key);
  const sampleValues = schema.fields.map((f) => escapeCsvCell(f.example));
  triggerDownloadBlob(
    `template_${schema.entity}.csv`,
    new Blob(['\uFEFF' + [headers.join(','), sampleValues.join(',')].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
  );
}

export function exportFailedRowsReport(
  entity: ManagedImportEntity,
  failedRows: FailedImportRow[],
  format: 'xlsx' | 'csv' = 'xlsx'
): void {
  if (failedRows.length === 0) return;
  const rows = failedRows.map((item) => ({
    'แถวที่ (Row)': item.rowNumber,
    'รายการอ้างอิง': item.identifier,
    'ฟิลด์ที่มีปัญหา': item.errorFields.join(', '),
    'สาเหตุข้อผิดพลาด': item.errors.join(' | '),
    ...item.rawRow,
  }));

  if (format === 'csv') {
    const keys = Object.keys(rows[0] || {});
    const csvLines = [
      keys.map((k) => escapeCsvCell(k)).join(','),
      ...rows.map((r) => keys.map((k) => escapeCsvCell((r as Record<string, unknown>)[k])).join(',')),
    ];
    triggerDownloadBlob(
      `error_report_${entity}_${getLocalDateString()}.csv`,
      new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    );
    return;
  }

  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Failed_Rows');
  XLSX.writeFile(wb, `error_report_${entity}_${getLocalDateString()}.xlsx`);
}
