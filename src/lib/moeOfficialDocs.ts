import {
  AttendanceRecord,
  BehaviorRecord,
  Course,
  GradeRecord,
  InfirmaryVisit,
  PeriodAttendanceRecord,
  School,
  SdqAssessment,
  Student,
  SystemConfig,
  TimetableSlot,
} from '../types';
import {
  aggregateGradesByAssessmentCycle,
  calculateStudentAcademicSummary,
  CycleGradeEntry,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  getStudentPrefixTh,
  StudentAcademicSummary,
} from './moeGrading';
import { getCourseType } from './courseClassification';
import {
  calculateDetailedCourseAttendance,
  DetailedStudentCourseAttendance,
  StudentQualitativeAssessment,
  summarizeStudentQualitative,
} from './moeQualitativeStore';
import {
  MOE_DESIRABLE_ATTRIBUTES_RUBRIC,
  MOE_KEY_COMPETENCIES,
  MOE_READING_WRITING_RUBRIC,
  MOE_STUDENT_ACTIVITIES,
  resolveMoeLearningArea,
} from '../data/moeCurriculumStandards';
import {
  buildA4PdfBlobFromCanvases,
  downloadMoeGradeSummaryPdf,
  printHtmlElementInIsolatedFrame,
  toThaiNumerals,
} from './moeReportPdf';
import { formatSemesterLabel } from './schoolSettings';
import { getPp3ApprovalStatusMeta, StudentRegistryRecord } from './studentRegistryStore';
import { STUDENT_STATUS_DETAILS } from '../data/studentAcademicData';

export type MoeDocumentType = 'pp1' | 'pp3' | 'pp5' | 'pp6' | 'pp7' | 'pp8';

export interface MoeDocumentDef {
  id: MoeDocumentType;
  code: string;
  titleTh: string;
  subtitleTh: string;
  authorityTh: string;
}

export const MOE_OFFICIAL_DOCUMENTS: MoeDocumentDef[] = [
  {
    id: 'pp1',
    code: 'ปพ.1',
    titleTh: 'ระเบียนแสดงผลการเรียน',
    subtitleTh: 'Official Transcript ตามหลักสูตรแกนกลางฯ 2551',
    authorityTh: 'กระทรวงศึกษาธิการ / สพฐ.',
  },
  {
    id: 'pp3',
    code: 'ปพ.3',
    titleTh: 'แบบรายงานผู้สำเร็จการศึกษา',
    subtitleTh: 'ทะเบียนรับรองการจบชั้น (ป.6 / ม.3 / ม.6)',
    authorityTh: 'สพฐ. / งานทะเบียนวัดผล',
  },
  {
    id: 'pp5',
    code: 'ปพ.5',
    titleTh: 'แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน',
    subtitleTh: 'สรุปคะแนนเก็บ กลางภาค ปลายภาค และเวลาเรียนทุกรายวิชา',
    authorityTh: 'สพฐ. / ครูประจำวิชา',
  },
  {
    id: 'pp6',
    code: 'ปพ.6',
    titleTh: 'แบบรายงานผลการพัฒนาคุณภาพผู้เรียน',
    subtitleTh: 'สมุดพก/รายงานประจำตัว (เกรด คุณลักษณะ อ่านฯ สมรรถนะ)',
    authorityTh: 'สพฐ. / ครูประจำชั้น',
  },
  {
    id: 'pp7',
    code: 'ปพ.7',
    titleTh: 'ใบรับรองผลการศึกษา / สถานภาพนักเรียน',
    subtitleTh: 'เอกสารรับรองความเป็นนักเรียนเพื่อศึกษาต่อ ทุน หรือราชการ',
    authorityTh: 'ผู้อำนวยการสถานศึกษา',
  },
  {
    id: 'pp8',
    code: 'ปพ.8',
    titleTh: 'ระเบียนสะสมผู้เรียนรายบุคคล',
    subtitleTh: 'ประวัติครอบครัว ผลการเรียน พฤติกรรม SDQ และสุขภาพ',
    authorityTh: 'งานแนะแนวและระบบดูแลช่วยเหลือนักเรียน',
  },
];

export const PP7_PURPOSE_OPTIONS = [
  'ใช้เป็นหลักฐานสมัครเข้าศึกษาต่อในระดับที่สูงขึ้น',
  'ใช้ประกอบการยื่นขอรับทุนการศึกษา / กองทุนเงินให้กู้ยืมเพื่อการศึกษา (กยศ.)',
  'ใช้เป็นหลักฐานแสดงสถานภาพการเป็นนักเรียนต่อหน่วยงานราชการ',
  'ใช้ประกอบการทำบัตรประจำตัวประชาชน / หนังสือเดินทาง / เดินทางต่างประเทศ',
];

export interface StudentMoeDossier {
  student: Student;
  school?: School;
  systemConfig: SystemConfig;
  registry: StudentRegistryRecord;
  qualitative: StudentQualitativeAssessment;
  qualSummary: ReturnType<typeof summarizeStudentQualitative>;
  academicSummary: StudentAcademicSummary;
  cycleEntries: CycleGradeEntry[];
  studentCourses: Course[];
  courseAttendanceByCourseId: Map<string, DetailedStudentCourseAttendance>;
  dailyAttendanceStats: {
    total: number;
    present: number;
    late: number;
    sickOrLeave: number;
    absent: number;
    percentText: string;
  };
  behaviorRecords: BehaviorRecord[];
  sdqAssessments: SdqAssessment[];
  infirmaryVisits: InfirmaryVisit[];
  pp7Purpose?: string;
  issuedDateTh: string;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildStudentMoeDossier(params: {
  student: Student;
  school?: School;
  systemConfig: SystemConfig;
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  timetableSlots: TimetableSlot[];
  behaviorRecords?: BehaviorRecord[];
  sdqAssessments?: SdqAssessment[];
  infirmaryVisits?: InfirmaryVisit[];
  registry: StudentRegistryRecord;
  qualitative: StudentQualitativeAssessment;
  pp7Purpose?: string;
}): StudentMoeDossier {
  const {
    student,
    school,
    systemConfig,
    courses,
    grades,
    attendance,
    periodAttendance,
    timetableSlots,
    behaviorRecords = [],
    sdqAssessments = [],
    infirmaryVisits = [],
    registry,
    qualitative,
    pp7Purpose,
  } = params;

  const studentCourses = courses.filter(
    (c) =>
      (c.enrolledStudentIds || []).includes(student.id) ||
      grades.some((g) => g.courseId === c.id && g.studentId === student.id)
  );
  const effectiveCourses = studentCourses.length > 0 ? studentCourses : courses;

  const academicSummary = calculateStudentAcademicSummary({
    student,
    courses: effectiveCourses,
    grades,
    gradingSystem: systemConfig.gradingSystem,
    currentAcademicYear: systemConfig.academicYear,
    currentSemester: systemConfig.currentSemester,
  });

  const cycleEntries = aggregateGradesByAssessmentCycle({
    student,
    courses: effectiveCourses,
    grades,
    gradingSystem: systemConfig.gradingSystem,
    currentAcademicYear: systemConfig.academicYear,
    currentSemester: systemConfig.currentSemester,
  });

  const courseAttendanceByCourseId = new Map<string, DetailedStudentCourseAttendance>();
  effectiveCourses.forEach((course) => {
    courseAttendanceByCourseId.set(
      course.id,
      calculateDetailedCourseAttendance({
        student,
        course,
        timetableSlots,
        attendance,
        periodAttendance,
      })
    );
  });

  const dailyRecs = attendance.filter((a) => a.studentId === student.id);
  const present = dailyRecs.filter((r) => r.status === 'present').length;
  const late = dailyRecs.filter((r) => r.status === 'late').length;
  const sickOrLeave = dailyRecs.filter((r) => r.status === 'sick' || r.status === 'leave').length;
  const absent = dailyRecs.filter((r) => r.status === 'absent').length;
  const percentText =
    dailyRecs.length > 0
      ? `${(((present + late + sickOrLeave) / dailyRecs.length) * 100).toFixed(1)}%`
      : '100.0%';

  const issuedDateTh = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    student,
    school,
    systemConfig,
    registry,
    qualitative,
    qualSummary: summarizeStudentQualitative(qualitative),
    academicSummary,
    cycleEntries,
    studentCourses: effectiveCourses,
    courseAttendanceByCourseId,
    dailyAttendanceStats: {
      total: dailyRecs.length,
      present,
      late,
      sickOrLeave,
      absent,
      percentText,
    },
    behaviorRecords: behaviorRecords.filter((b) => b.studentId === student.id),
    sdqAssessments: sdqAssessments.filter((s) => s.studentId === student.id),
    infirmaryVisits: infirmaryVisits.filter((v) => v.studentId === student.id),
    pp7Purpose: pp7Purpose || PP7_PURPOSE_OPTIONS[0],
    issuedDateTh,
  };
}

function qualityLevelText(level: number): string {
  if (level === 3) return 'ดีเยี่ยม (๓)';
  if (level === 2) return 'ดี (๒)';
  if (level === 1) return 'ผ่าน (๑)';
  return 'ไม่ผ่าน (๐)';
}

function buildOfficialHeaderHtml(dossier: StudentMoeDossier, docCode: string, docTitle: string, docNo?: string): string {
  const { school, systemConfig, registry } = dossier;
  const schoolNameTh = school?.nameTh || systemConfig.schoolNameTh || 'สถานศึกษา';
  const schoolNameEn = school?.nameEn || systemConfig.schoolNameEn || 'School';
  const rawLogoUrl = (school?.logoUrl || '').trim();
  const safeLogoUrl = /^(https?:\/\/|data:image\/(?:png|jpeg|jpg|webp|gif);base64,)/i.test(rawLogoUrl)
    ? rawLogoUrl
    : '';
  const logoHtml = safeLogoUrl
    ? `<img src="${escapeHtml(safeLogoUrl)}" alt="ตราโรงเรียน" style="width:58px;height:58px;object-fit:contain;border:1px solid #cbd5e1;border-radius:8px;padding:3px;background:#fff;" />`
    : `<div style="width:58px;height:58px;border:2px solid #0f172a;border-radius:999px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:13px;line-height:1.1;background:#f8fafc;"><span>ศธ.</span><span style="font-size:10px;font-weight:700;">สพฐ.</span></div>`;

  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${logoHtml}
        <div>
          <div style="font-size:16px;font-weight:800;color:#0f172a;">โรงเรียน${escapeHtml(schoolNameTh)}</div>
          <div style="font-size:12px;font-weight:700;color:#334155;">${escapeHtml(schoolNameEn)}</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">
            สังกัด ${escapeHtml(registry.affiliationOffice || 'สำนักงานเขตพื้นที่การศึกษา (สพฐ.)')}
            ${school?.code ? ` · รหัสสถานศึกษา ${escapeHtml(school.code)}` : ''}
            ${school?.province ? ` · จ.${escapeHtml(school.province)}` : ''}
          </div>
          <div style="font-size:10.5px;color:#475569;">หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ (ฉบับปรับปรุง พ.ศ. ๒๕๖๐)</div>
        </div>
      </div>
      <div style="border:1.5px solid #0f172a;padding:6px 10px;text-align:center;min-width:148px;background:#f8fafc;">
        <div style="font-size:14px;font-weight:800;color:#0f172a;">แบบ ${escapeHtml(docCode)}</div>
        <div style="font-size:11px;font-weight:700;color:#1e293b;">${escapeHtml(docTitle)}</div>
        <div style="font-size:10px;color:#475569;margin-top:2px;">ปีการศึกษา ${escapeHtml(toThaiNumerals(systemConfig.academicYear || '2569'))} · ${escapeHtml(formatSemesterLabel(systemConfig.currentSemester || '1'))}</div>
        ${docNo ? `<div style="font-size:10px;font-weight:700;color:#0f172a;margin-top:2px;">เลขที่: ${escapeHtml(docNo)}</div>` : ''}
      </div>
    </div>
  `;
}

function buildStudentIdentityBoxHtml(dossier: StudentMoeDossier): string {
  const { student, registry, academicSummary } = dossier;
  const fullNameTh = `${registry.prefixTh || getStudentPrefixTh(student)}${student.firstNameTh} ${student.lastNameTh}`.trim();
  const stageTh = getEducationStageLabelTh(academicSummary.stage);
  const statusLabel = STUDENT_STATUS_DETAILS[student.status || 'active']?.labelTh || 'กำลังศึกษา';

  return `
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:12px;background:#f8fafc;">
      <tr>
        <td style="border:1px solid #64748b;padding:5px 8px;width:52%;"><strong>ชื่อ-สกุล:</strong> ${escapeHtml(fullNameTh)} (${escapeHtml(student.firstNameEn)} ${escapeHtml(student.lastNameEn)})</td>
        <td style="border:1px solid #64748b;padding:5px 8px;width:48%;"><strong>เลขประจำตัวนักเรียน:</strong> <span style="font-family:monospace;font-weight:700;">${escapeHtml(student.studentIdNumber)}</span> · <strong>เลข ปชช.:</strong> <span style="font-family:monospace;">${escapeHtml(student.nationalId || '-')}</span></td>
      </tr>
      <tr>
        <td style="border:1px solid #64748b;padding:5px 8px;"><strong>ระดับชั้น:</strong> ${escapeHtml(student.gradeLevel)} · <strong>ห้อง:</strong> ${escapeHtml(student.room)} (${escapeHtml(stageTh)})</td>
        <td style="border:1px solid #64748b;padding:5px 8px;"><strong>วันเกิด:</strong> ${escapeHtml(student.dateOfBirth || '-')} · <strong>สัญชาติ/ศาสนา:</strong> ${escapeHtml(registry.nationality || 'ไทย')} / ${escapeHtml(registry.religion || 'พุทธ')} · <strong>สถานะ:</strong> ${escapeHtml(statusLabel)}</td>
      </tr>
      <tr>
        <td style="border:1px solid #64748b;padding:5px 8px;"><strong>ชื่อบิดา:</strong> ${escapeHtml(registry.fatherName || '-')} · <strong>ชื่อมารดา:</strong> ${escapeHtml(registry.motherName || '-')}</td>
        <td style="border:1px solid #64748b;padding:5px 8px;"><strong>ผู้ปกครอง:</strong> ${escapeHtml(student.guardianName || '-')} (${escapeHtml(student.guardianRelation || '-')}) · <strong>โทร:</strong> ${escapeHtml(student.guardianPhone || '-')}</td>
      </tr>
    </table>
  `;
}

function buildSignatureFooterHtml(dossier: StudentMoeDossier, mode: '3col' | 'director_only' = '3col'): string {
  const { registry, issuedDateTh, school } = dossier;
  if (mode === 'director_only') {
    return `
      <div style="display:flex;justify-content:flex-end;margin-top:28px;font-size:12px;text-align:center;">
        <div style="width:270px;line-height:1.7;">
          <div>ให้ไว้ ณ วันที่ ${escapeHtml(issuedDateTh)}</div>
          <div style="margin-top:34px;">ลงชื่อ..............................................................</div>
          <div style="font-weight:700;">(${escapeHtml(registry.principalName || '...................................................')})</div>
          <div>ผู้อำนวยการโรงเรียน${escapeHtml(school?.nameTh || dossier.systemConfig.schoolNameTh)}</div>
        </div>
      </div>
    `;
  }

  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px;border:1px solid #64748b;padding:10px 8px;font-size:11px;text-align:center;">
      <div>
        <div style="font-weight:700;">ครูประจำชั้น / ครูที่ปรึกษา</div>
        <div style="margin-top:26px;">ลงชื่อ...............................................</div>
        <div style="font-weight:700;">(${escapeHtml(registry.advisorName || '........................................')})</div>
        <div style="color:#475569;">วันที่ ${escapeHtml(issuedDateTh)}</div>
      </div>
      <div>
        <div style="font-weight:700;">นายทะเบียน / หัวหน้างานวัดผล</div>
        <div style="margin-top:26px;">ลงชื่อ...............................................</div>
        <div style="font-weight:700;">(${escapeHtml(registry.registrarName || registry.academicHeadName || '........................................')})</div>
        <div style="color:#475569;">วันที่ ${escapeHtml(issuedDateTh)}</div>
      </div>
      <div>
        <div style="font-weight:700;">ผู้อำนวยการสถานศึกษา</div>
        <div style="margin-top:26px;">ลงชื่อ...............................................</div>
        <div style="font-weight:700;">(${escapeHtml(registry.principalName || '........................................')})</div>
        <div style="color:#475569;">วันที่ ${escapeHtml(issuedDateTh)}</div>
      </div>
    </div>
  `;
}

export function buildMoeDocumentHtml(docType: MoeDocumentType, dossier: StudentMoeDossier): string {
  const {
    student,
    systemConfig,
    registry,
    qualitative,
    qualSummary,
    academicSummary,
    cycleEntries,
    courseAttendanceByCourseId,
    dailyAttendanceStats,
    behaviorRecords,
    sdqAssessments,
    infirmaryVisits,
    pp7Purpose,
    issuedDateTh,
  } = dossier;

  const isPrimary = academicSummary.isPrimary;
  const fullNameTh = `${registry.prefixTh || getStudentPrefixTh(student)}${student.firstNameTh} ${student.lastNameTh}`.trim();

  if (docType === 'pp1') {
    const rowsHtml =
      cycleEntries.length === 0
        ? `<tr><td colspan="${academicSummary.hideGpaCalculations ? 5 : 6}" style="border:1px solid #94a3b8;padding:14px;text-align:center;color:#475569;">ยังไม่มีข้อมูลผลการเรียนที่บันทึกในระบบ</td></tr>`
        : cycleEntries
            .map((entry, idx) => {
              const { grade, course, resolved, cycleLabelTh } = entry;
              const courseType = getCourseType(course);
              const categoryLabel =
                courseType === 'core' ? 'พื้นฐาน' : courseType === 'activities' ? 'กิจกรรม' : 'เพิ่มเติม';
              const fb = getRawScoreFeedback(grade.totalScore);
              return `
                <tr style="background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
                  <td style="border:1px solid #94a3b8;padding:5px 7px;font-family:monospace;font-weight:700;">${escapeHtml(course?.code || '-')}</td>
                  <td style="border:1px solid #94a3b8;padding:5px 7px;">
                    <div style="font-weight:700;">${escapeHtml(course?.titleTh || course?.titleEn || '-')}</div>
                    <div style="font-size:10px;color:#475569;">${escapeHtml(resolveMoeLearningArea(course).nameTh)} (${escapeHtml(categoryLabel)})</div>
                  </td>
                  <td style="border:1px solid #94a3b8;padding:5px 7px;text-align:center;font-family:monospace;">${
                    isPrimary ? escapeHtml(cycleLabelTh) : resolved.isActivity ? '-' : (course?.credits || 0).toFixed(1)
                  }</td>
                  <td style="border:1px solid #94a3b8;padding:5px 7px;text-align:center;font-family:monospace;font-weight:700;">${grade.totalScore}%</td>
                  <td style="border:1px solid #94a3b8;padding:5px 7px;text-align:center;font-weight:700;">${
                    isPrimary ? escapeHtml(fb.labelTh) : escapeHtml(resolved.letter)
                  }</td>
                  ${
                    academicSummary.hideGpaCalculations
                      ? ''
                      : `<td style="border:1px solid #94a3b8;padding:5px 7px;text-align:center;font-family:monospace;">${
                          resolved.countsInGpa ? resolved.point.toFixed(1) : '-'
                        }</td>`
                  }
                </tr>
              `;
            })
            .join('');

    return `
      <div class="moe-doc-page" style="font-family:'Sarabun','Noto Sans Thai',sans-serif;color:#0f172a;padding:12px;">
        ${buildOfficialHeaderHtml(dossier, 'ปพ.๑', 'ระเบียนแสดงผลการเรียน', registry.pp1DocNo || `TR-${student.studentIdNumber}`)}
        ${buildStudentIdentityBoxHtml(dossier)}
        <div style="font-size:12px;font-weight:800;margin-bottom:6px;">๑. ผลการเรียนรายวิชา (${isPrimary ? 'ประเมินรายปี' : 'ประเมินรายภาคเรียน'})</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#e2e8f0;">
              <th style="border:1px solid #475569;padding:6px;width:90px;">รหัสวิชา</th>
              <th style="border:1px solid #475569;padding:6px;text-align:left;">ชื่อรายวิชา / กลุ่มสาระการเรียนรู้</th>
              <th style="border:1px solid #475569;padding:6px;width:72px;">${isPrimary ? 'รอบประเมิน' : 'หน่วยกิต'}</th>
              <th style="border:1px solid #475569;padding:6px;width:72px;">ร้อยละ (%)</th>
              <th style="border:1px solid #475569;padding:6px;width:110px;">${isPrimary ? 'ระดับพัฒนาการ' : 'ผลการเรียน'}</th>
              ${academicSummary.hideGpaCalculations ? '' : '<th style="border:1px solid #475569;padding:6px;width:72px;">ค่าระดับ</th>'}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;font-size:11px;">
          <div style="border:1px solid #64748b;padding:7px;background:#f8fafc;">
            <div style="color:#475569;font-size:10px;">${academicSummary.hideGpaCalculations ? 'คะแนนเฉลี่ยรวม' : 'ผลการเรียนเฉลี่ย (GPA / GPAX)'}</div>
            <div style="font-size:15px;font-weight:800;font-family:monospace;">${
              academicSummary.hideGpaCalculations
                ? `${academicSummary.averageRawScore ?? '-'}%`
                : `${(academicSummary.termGpa ?? 0).toFixed(2)} / ${(academicSummary.gpax ?? 0).toFixed(2)}`
            }</div>
          </div>
          <div style="border:1px solid #64748b;padding:7px;background:#f8fafc;">
            <div style="color:#475569;font-size:10px;">หน่วยกิตที่เรียน / ได้รับ</div>
            <div style="font-size:15px;font-weight:800;font-family:monospace;">${academicSummary.registeredCredits.toFixed(1)} / ${academicSummary.earnedCredits.toFixed(1)}</div>
          </div>
          <div style="border:1px solid #64748b;padding:7px;background:#f8fafc;">
            <div style="color:#475569;font-size:10px;">สรุปเวลาเรียนภาพรวม</div>
            <div style="font-size:15px;font-weight:800;font-family:monospace;">${escapeHtml(dailyAttendanceStats.percentText)}</div>
          </div>
        </div>
        <div style="font-size:12px;font-weight:800;margin:10px 0 6px;">๒. ผลการประเมินองค์ประกอบอื่นตามหลักสูตรแกนกลางฯ</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <tr>
            <td style="border:1px solid #64748b;padding:6px;"><strong>การอ่าน คิดวิเคราะห์ และเขียน:</strong> ${escapeHtml(qualSummary.readingLabel)}</td>
            <td style="border:1px solid #64748b;padding:6px;"><strong>คุณลักษณะอันพึงประสงค์:</strong> ${escapeHtml(qualSummary.attrLabel)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #64748b;padding:6px;"><strong>สมรรถนะสำคัญของผู้เรียน:</strong> ${escapeHtml(qualSummary.compLabel)}</td>
            <td style="border:1px solid #64748b;padding:6px;"><strong>กิจกรรมพัฒนาผู้เรียน:</strong> ${escapeHtml(qualSummary.activityResult)}</td>
          </tr>
        </table>
        ${buildSignatureFooterHtml(dossier, '3col')}
      </div>
    `;
  }

  if (docType === 'pp3') {
    const pp3Status = getPp3ApprovalStatusMeta(registry.pp3ApprovalStatus);
    const hasFailedCourse = cycleEntries.some((e) => !e.resolved.passed && !e.resolved.isActivity);
    const gpaStr = academicSummary.hideGpaCalculations
      ? `${academicSummary.averageRawScore ?? '-'}% (เฉลี่ยรายปี)`
      : (academicSummary.gpax ?? 0).toFixed(2);

    return `
      <div class="moe-doc-page" style="font-family:'Sarabun','Noto Sans Thai',sans-serif;color:#0f172a;padding:12px;">
        ${buildOfficialHeaderHtml(dossier, 'ปพ.๓', 'แบบรายงานผู้สำเร็จการศึกษา (รายบุคคล)', registry.pp3BookNo ? `${registry.pp3SetNo || '๑'}/${registry.pp3BookNo}` : 'รอออกเลข')}
        ${buildStudentIdentityBoxHtml(dossier)}
        <div style="font-size:12px;font-weight:800;margin-bottom:6px;">ข้อมูลทะเบียนผู้สำเร็จการศึกษา (สำหรับนำส่งระบบ สพฐ.)</div>
        <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
          <tr>
            <td style="border:1px solid #64748b;padding:7px;width:40%;background:#f8fafc;"><strong>ชุดที่ / เล่มที่เอกสาร ปพ.๓</strong></td>
            <td style="border:1px solid #64748b;padding:7px;font-family:monospace;font-weight:700;">ชุดที่ ${escapeHtml(registry.pp3SetNo || 'ยังไม่กำหนด')} · เล่มที่/เลขที่ ${escapeHtml(registry.pp3BookNo || 'ยังไม่กำหนด')}</td>
          </tr>
          <tr>
            <td style="border:1px solid #64748b;padding:7px;background:#f8fafc;"><strong>ระดับชั้นที่จบการศึกษา</strong></td>
            <td style="border:1px solid #64748b;padding:7px;">${escapeHtml(student.gradeLevel)} (${escapeHtml(student.room)})</td>
          </tr>
          <tr>
            <td style="border:1px solid #64748b;padding:7px;background:#f8fafc;"><strong>หน่วยกิตสะสมทั้งหมด / GPAX สะสม</strong></td>
            <td style="border:1px solid #64748b;padding:7px;font-family:monospace;font-weight:700;">${academicSummary.earnedCredits.toFixed(1)} หน่วยกิต · ผลการเรียนสะสม ${escapeHtml(gpaStr)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #64748b;padding:7px;background:#f8fafc;"><strong>ผลผ่านเกณฑ์ ๔ องค์ประกอบหลักสูตร</strong></td>
            <td style="border:1px solid #64748b;padding:7px;">
              รายวิชา: <strong>${hasFailedCourse ? 'ยังมีรายวิชาไม่ผ่านเกณฑ์' : 'ผ่านครบทุกรายวิชา'}</strong> ·
              อ่านคิดวิเคราะห์: <strong>${escapeHtml(qualSummary.readingLabel)}</strong> ·
              คุณลักษณะฯ: <strong>${escapeHtml(qualSummary.attrLabel)}</strong> ·
              กิจกรรมพัฒนาผู้เรียน: <strong>${escapeHtml(qualSummary.activityResult)}</strong>
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #64748b;padding:7px;background:#f8fafc;"><strong>สถานะการอนุมัติจบการศึกษา</strong></td>
            <td style="border:1px solid #64748b;padding:7px;font-weight:800;">${escapeHtml(pp3Status.labelTh)}${registry.graduationDate ? ` · วันที่อนุมัติ ${escapeHtml(registry.graduationDate)}` : ''}</td>
          </tr>
        </table>
        <div style="margin-top:14px;border:1px solid #64748b;padding:10px;background:#f8fafc;font-size:11px;line-height:1.6;">
          <strong>คำรับรองของสถานศึกษา:</strong> สถานศึกษาได้ตรวจสอบคุณสมบัติการสำเร็จการศึกษาของ <strong>${escapeHtml(fullNameTh)}</strong>
          เลขประจำตัวประชาชน <span style="font-family:monospace;">${escapeHtml(student.nationalId || '-')}</span> ตามหลักเกณฑ์การจบหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ ครบถ้วนถูกต้องแล้ว
        </div>
        ${buildSignatureFooterHtml(dossier, '3col')}
      </div>
    `;
  }

  if (docType === 'pp5') {
    const rowsHtml =
      cycleEntries.length === 0
        ? `<tr><td colspan="9" style="border:1px solid #94a3b8;padding:14px;text-align:center;color:#475569;">ยังไม่มีคะแนนรายวิชาในระบบ ปพ.๕</td></tr>`
        : cycleEntries
            .map((entry, idx) => {
              const { grade, course, resolved } = entry;
              const att = course ? courseAttendanceByCourseId.get(course.id) : undefined;
              const pct = att ? `${att.attendancePercent}%` : dailyAttendanceStats.percentText;
              const eligibleText = att?.isAtRiskMs ? 'มส.' : 'มีสิทธิ์สอบ';
              return `
                <tr style="background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
                  <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-family:monospace;">${idx + 1}</td>
                  <td style="border:1px solid #94a3b8;padding:4px 6px;font-family:monospace;font-weight:700;">${escapeHtml(course?.code || '-')}</td>
                  <td style="border:1px solid #94a3b8;padding:4px 6px;">${escapeHtml(course?.titleTh || '-')}</td>
                  <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-family:monospace;">${grade.assignmentScore + grade.quizScore}</td>
                  <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-family:monospace;">${grade.midtermScore}</td>
                  <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-family:monospace;">${grade.finalScore}</td>
                  <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-family:monospace;font-weight:800;">${grade.totalScore}</td>
                  <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-weight:800;">${escapeHtml(resolved.letter)}</td>
                  <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-family:monospace;">${escapeHtml(pct)} (${escapeHtml(eligibleText)})</td>
                </tr>
              `;
            })
            .join('');

    return `
      <div class="moe-doc-page" style="font-family:'Sarabun','Noto Sans Thai',sans-serif;color:#0f172a;padding:12px;">
        ${buildOfficialHeaderHtml(dossier, 'ปพ.๕', 'แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (รวมทุกรายวิชา)')}
        ${buildStudentIdentityBoxHtml(dossier)}
        <div style="font-size:12px;font-weight:800;margin-bottom:6px;">ตารางสรุปคะแนนเก็บ สอบกลางภาค ปลายภาค ผลการเรียน และเวลาเรียนตามเกณฑ์ ปพ.๕</div>
        <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
          <thead>
            <tr style="background:#e2e8f0;">
              <th style="border:1px solid #475569;padding:5px;width:32px;">ที่</th>
              <th style="border:1px solid #475569;padding:5px;width:72px;">รหัสวิชา</th>
              <th style="border:1px solid #475569;padding:5px;text-align:left;">ชื่อรายวิชา</th>
              <th style="border:1px solid #475569;padding:5px;width:58px;">งาน/ย่อย</th>
              <th style="border:1px solid #475569;padding:5px;width:54px;">กลางภาค</th>
              <th style="border:1px solid #475569;padding:5px;width:54px;">ปลายภาค</th>
              <th style="border:1px solid #475569;padding:5px;width:54px;">รวม 100</th>
              <th style="border:1px solid #475569;padding:5px;width:54px;">เกรด</th>
              <th style="border:1px solid #475569;padding:5px;width:104px;">เวลาเรียน / สิทธิ์</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${buildSignatureFooterHtml(dossier, '3col')}
      </div>
    `;
  }

  if (docType === 'pp6') {
    const attrRows = MOE_DESIRABLE_ATTRIBUTES_RUBRIC.map(
      (item, idx) => `
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">${idx + 1}. ${escapeHtml(item.titleTh)}</td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-weight:700;">${escapeHtml(qualityLevelText(qualitative.attributes[idx] ?? 3))}</td>
      </tr>
    `
    ).join('');

    const readRows = MOE_READING_WRITING_RUBRIC.map(
      (item, idx) => `
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">${idx + 1}. ${escapeHtml(item.titleTh)}</td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-weight:700;">${escapeHtml(qualityLevelText(qualitative.readingWriting[idx] ?? 3))}</td>
      </tr>
    `
    ).join('');

    const compRows = MOE_KEY_COMPETENCIES.map(
      (titleTh, idx) => `
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">${escapeHtml(titleTh)}</td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-weight:700;">${escapeHtml(qualityLevelText(qualitative.competencies[idx] ?? 3))}</td>
      </tr>
    `
    ).join('');

    const actRows = MOE_STUDENT_ACTIVITIES.map(
      (item, idx) => `
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">${escapeHtml(item.name)}</td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:center;font-weight:700;">${escapeHtml(qualitative.activities[idx] || 'ผ (ผ่าน)')}</td>
      </tr>
    `
    ).join('');

    return `
      <div class="moe-doc-page" style="font-family:'Sarabun','Noto Sans Thai',sans-serif;color:#0f172a;padding:12px;">
        ${buildOfficialHeaderHtml(dossier, 'ปพ.๖', 'แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล')}
        ${buildStudentIdentityBoxHtml(dossier)}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:10.5px;">
          <div>
            <div style="font-weight:800;margin-bottom:4px;">คุณลักษณะอันพึงประสงค์ ๘ ประการ (สรุป: ${escapeHtml(qualSummary.attrLabel)})</div>
            <table style="width:100%;border-collapse:collapse;">${attrRows}</table>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div>
              <div style="font-weight:800;margin-bottom:4px;">การอ่าน คิดวิเคราะห์ และเขียน (สรุป: ${escapeHtml(qualSummary.readingLabel)})</div>
              <table style="width:100%;border-collapse:collapse;">${readRows}</table>
            </div>
            <div>
              <div style="font-weight:800;margin-bottom:4px;">สมรรถนะสำคัญของผู้เรียน (สรุป: ${escapeHtml(qualSummary.compLabel)})</div>
              <table style="width:100%;border-collapse:collapse;">${compRows}</table>
            </div>
            <div>
              <div style="font-weight:800;margin-bottom:4px;">กิจกรรมพัฒนาผู้เรียน (สรุป: ${escapeHtml(qualSummary.activityResult)})</div>
              <table style="width:100%;border-collapse:collapse;">${actRows}</table>
            </div>
          </div>
        </div>
        <div style="margin-top:10px;border:1px solid #64748b;padding:8px;background:#f8fafc;font-size:11px;">
          <strong>ความเห็นและข้อเสนอแนะของครูประจำชั้น:</strong>
          <div style="margin-top:3px;">${escapeHtml(
            qualitative.homeroomComment ||
              'นักเรียนมีความตั้งใจเรียน รับผิดชอบงานที่ได้รับมอบหมายสม่ำเสมอ และปฏิบัติตามระเบียบของสถานศึกษาได้เป็นอย่างดี'
          )}</div>
        </div>
        ${buildSignatureFooterHtml(dossier, '3col')}
      </div>
    `;
  }

  if (docType === 'pp7') {
    const docNo = registry.pp7DocNo || `ศธ.${toThaiNumerals(systemConfig.academicYear)}/${student.studentIdNumber}`;
    const gpaSummaryText = academicSummary.hideGpaCalculations
      ? `มีคะแนนเฉลี่ยสะสมร้อยละ ${academicSummary.averageRawScore ?? '-'}%`
      : `มีผลการเรียนเฉลี่ยสะสม (GPAX) เท่ากับ ${(academicSummary.gpax ?? 0).toFixed(2)}`;
    const statusText =
      student.status === 'graduated'
        ? `เป็นผู้สำเร็จการศึกษาชั้น ${student.gradeLevel} ปีการศึกษา ${toThaiNumerals(systemConfig.academicYear)}`
        : `กำลังศึกษาอยู่ในระดับชั้น ${student.gradeLevel} ห้อง ${student.room} ปีการศึกษา ${toThaiNumerals(systemConfig.academicYear)}`;

    return `
      <div class="moe-doc-page" style="font-family:'Sarabun','Noto Sans Thai',sans-serif;color:#0f172a;padding:18px;">
        ${buildOfficialHeaderHtml(dossier, 'ปพ.๗', 'ใบรับรองผลการศึกษา / สถานภาพนักเรียน', docNo)}
        <div style="text-align:center;margin:18px 0 14px;">
          <div style="font-size:18px;font-weight:800;">ใบรับรองสถานภาพและผลการศึกษา</div>
          <div style="font-size:12px;color:#475569;">เลขที่ ${escapeHtml(docNo)}</div>
        </div>
        <div style="font-size:13.5px;line-height:1.9;text-align:justify;padding:8px 12px;">
          <p style="text-indent:36px;margin:0 0 12px 0;">
            หนังสือฉบับนี้ขอรับรองว่า <strong>${escapeHtml(fullNameTh)}</strong>
            (${escapeHtml(student.firstNameEn)} ${escapeHtml(student.lastNameEn)})
            เลขประจำตัวนักเรียน <strong style="font-family:monospace;">${escapeHtml(student.studentIdNumber)}</strong>
            เลขประจำตัวประชาชน <strong style="font-family:monospace;">${escapeHtml(student.nationalId || '-')}</strong>
            เกิดวันที่ <strong>${escapeHtml(student.dateOfBirth || '-')}</strong>
            สัญชาติ <strong>${escapeHtml(registry.nationality || 'ไทย')}</strong>
            เป็นบุตรของ <strong>${escapeHtml(registry.fatherName || '-')}</strong> และ <strong>${escapeHtml(registry.motherName || '-')}</strong>
          </p>
          <p style="text-indent:36px;margin:0 0 12px 0;">
            ปัจจุบัน <strong>${escapeHtml(statusText)}</strong> ณ โรงเรียน${escapeHtml(dossier.school?.nameTh || systemConfig.schoolNameTh)}
            ${escapeHtml(gpaSummaryText)} โดยมีเวลาเรียนร้อยละ <strong>${escapeHtml(dailyAttendanceStats.percentText)}</strong>
            และความประพฤติเรียบร้อยดี
          </p>
          <p style="text-indent:36px;margin:0 0 12px 0;">
            ใบรับรองฉบับนี้ออกให้เพื่อ <strong>${escapeHtml(pp7Purpose || PP7_PURPOSE_OPTIONS[0])}</strong>
            ทั้งนี้ ให้ใช้ได้ภายในกำหนด ๙๐ วัน นับแต่วันที่ออกหนังสือรับรอง
          </p>
        </div>
        <div style="margin-top:16px;border:1px dashed #64748b;padding:8px 12px;font-size:11px;display:flex;justify-content:space-between;background:#f8fafc;">
          <span>ออกให้ ณ วันที่ ${escapeHtml(issuedDateTh)}</span>
          <span>ผู้ตรวจสอบทะเบียน: ${escapeHtml(registry.registrarName || 'งานทะเบียนวัดผล')}</span>
        </div>
        ${buildSignatureFooterHtml(dossier, 'director_only')}
      </div>
    `;
  }

  // pp8: Cumulative Student Profile
  const meritPoints = behaviorRecords.filter((b) => b.type === 'merit').reduce((acc, b) => acc + b.points, 0);
  const demeritPoints = behaviorRecords.filter((b) => b.type === 'demerit').reduce((acc, b) => acc + b.points, 0);
  const latestSdq = sdqAssessments[0];
  const sdqLabel =
    latestSdq?.overallStatus === 'problem'
      ? 'กลุ่มมีปัญหา'
      : latestSdq?.overallStatus === 'risk'
      ? 'กลุ่มเสี่ยง'
      : latestSdq
      ? 'ปกติ'
      : 'ยังไม่มีผลประเมิน';

  return `
    <div class="moe-doc-page" style="font-family:'Sarabun','Noto Sans Thai',sans-serif;color:#0f172a;padding:12px;">
      ${buildOfficialHeaderHtml(dossier, 'ปพ.๘', 'ระเบียนสะสมผู้เรียนรายบุคคล')}
      ${buildStudentIdentityBoxHtml(dossier)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;">
        <div style="border:1px solid #64748b;padding:8px;background:#f8fafc;">
          <div style="font-weight:800;margin-bottom:4px;">๑. ประวัติส่วนตัวและที่อยู่</div>
          <div><strong>ที่อยู่ปัจจุบัน:</strong> ${escapeHtml(student.address || '-')}</div>
          <div><strong>หมู่เลือด:</strong> ${escapeHtml(student.bloodType || '-')} · <strong>การแพ้ยา/อาหาร:</strong> ${escapeHtml((student.allergies || []).join(', ') || 'ไม่มี')}</div>
          <div><strong>โรคประจำตัว:</strong> ${escapeHtml((student.chronicDiseases || []).join(', ') || 'ไม่มี')}</div>
          <div><strong>ติดต่อฉุกเฉิน:</strong> ${escapeHtml(student.emergencyContact || student.guardianName || '-')} (${escapeHtml(student.emergencyPhone || student.guardianPhone || '-')})</div>
        </div>
        <div style="border:1px solid #64748b;padding:8px;background:#f8fafc;">
          <div style="font-weight:800;margin-bottom:4px;">๒. พัฒนาการด้านการเรียนและความถนัด</div>
          <div><strong>สายการเรียน/แผน:</strong> ${escapeHtml(student.academicTrack || 'การศึกษาขั้นพื้นฐาน')}</div>
          <div><strong>คะแนน/GPA สะสม:</strong> ${
            academicSummary.hideGpaCalculations
              ? `${academicSummary.averageRawScore ?? '-'}%`
              : `${(academicSummary.gpax ?? 0).toFixed(2)}`
          } (${academicSummary.gradedSubjectCount} วิชา)</div>
          <div><strong>ทักษะเด่น:</strong> ${escapeHtml((student.skills || []).join(', ') || '-')}</div>
          <div><strong>เป้าหมายอาชีพ/ศึกษาต่อ:</strong> ${escapeHtml(student.dreamCareer || '-')} ${student.targetUniversity ? `(${escapeHtml(student.targetUniversity)})` : ''}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;margin-top:10px;">
        <div style="border:1px solid #64748b;padding:8px;">
          <div style="font-weight:800;margin-bottom:4px;">๓. พฤติกรรม วินัย และการคัดกรอง SDQ</div>
          <div><strong>คะแนนความประพฤติปัจจุบัน:</strong> ${student.behaviorScore ?? 100} คะแนน (ทำความดี +${meritPoints} / หัก -${demeritPoints})</div>
          <div><strong>ผลการคัดกรอง SDQ ล่าสุด:</strong> ${escapeHtml(sdqLabel)} ${latestSdq ? `(ปัญหา ${latestSdq.totalDifficultiesScore}/40 · จุดแข็ง ${latestSdq.prosocialScore}/10)` : ''}</div>
          <div><strong>คุณลักษณะอันพึงประสงค์:</strong> ${escapeHtml(qualSummary.attrLabel)} · <strong>กิจกรรม:</strong> ${escapeHtml(qualSummary.activityResult)}</div>
        </div>
        <div style="border:1px solid #64748b;padding:8px;">
          <div style="font-weight:800;margin-bottom:4px;">๔. สถิติเวลาเรียนและประวัติสุขภาพ (ห้องพยาบาล)</div>
          <div><strong>การมาเรียน:</strong> มา ${dailyAttendanceStats.present} · สาย ${dailyAttendanceStats.late} · ลา/ป่วย ${dailyAttendanceStats.sickOrLeave} · ขาด ${dailyAttendanceStats.absent} (${escapeHtml(dailyAttendanceStats.percentText)})</div>
          <div><strong>ประวัติเข้าห้องพยาบาล:</strong> ${infirmaryVisits.length} ครั้ง${
            infirmaryVisits[0]
              ? ` (ล่าสุด ${escapeHtml(infirmaryVisits[0].visitDate)}: ${escapeHtml(infirmaryVisits[0].symptoms)})`
              : ''
          }</div>
        </div>
      </div>

      <div style="margin-top:10px;border:1px solid #64748b;padding:8px;background:#f8fafc;font-size:11px;">
        <strong>๕. บันทึกการดูแลช่วยเหลือนักเรียนของครูประจำชั้น / แนะแนว:</strong>
        <div style="margin-top:3px;">${escapeHtml(
          qualitative.homeroomComment ||
            'ผู้เรียนมีพัฒนาการสมวัย สามารถปรับตัวและเข้าร่วมกิจกรรมของสถานศึกษาได้เป็นอย่างดี'
        )}</div>
      </div>
      ${buildSignatureFooterHtml(dossier, '3col')}
    </div>
  `;
}

export function printMoeDocument(docType: MoeDocumentType, dossier: StudentMoeDossier): void {
  const html = buildMoeDocumentHtml(docType, dossier);
  const title = `${docType.toUpperCase()}_${dossier.student.studentIdNumber}_${dossier.student.firstNameTh}`;
  printHtmlElementInIsolatedFrame(html, title);
}

export function printMoeBundleDocuments(docTypes: MoeDocumentType[], dossier: StudentMoeDossier): void {
  const pagesHtml = docTypes
    .map(
      (docType, idx) =>
        `<div style="${idx < docTypes.length - 1 ? 'page-break-after: always;' : ''}">${buildMoeDocumentHtml(docType, dossier)}</div>`
    )
    .join('\n');
  const title = `MOE_Bundle_${dossier.student.studentIdNumber}_${dossier.student.firstNameTh}`;
  printHtmlElementInIsolatedFrame(pagesHtml, title);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text || '').split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export function downloadMoeDocumentPdf(docType: MoeDocumentType, dossier: StudentMoeDossier): { fileName: string } {
  if (docType === 'pp1') {
    const res = downloadMoeGradeSummaryPdf({
      student: dossier.student,
      courses: dossier.studentCourses,
      grades: dossier.cycleEntries.map((e) => e.grade),
      systemConfig: dossier.systemConfig,
      school: dossier.school,
      advisorName: dossier.registry.advisorName,
      registrarName: dossier.registry.registrarName,
      principalName: dossier.registry.principalName,
      readingRating: dossier.qualSummary.readingLabel,
      attributeRating: dossier.qualSummary.attrLabel,
      competencyRating: dossier.qualSummary.compLabel,
      activityResult: dossier.qualSummary.activityResult,
      homeroomRemark: dossier.qualitative.homeroomComment,
    });
    return { fileName: res.fileName };
  }

  // Render crisp A4 150 DPI canvas PDF for pp3, pp5, pp6, pp7, pp8
  const width = 1240;
  const height = 1754;
  const margin = 72;
  const contentW = width - margin * 2;
  const font = `'Sarabun', 'Noto Sans Thai', 'Plus Jakarta Sans', sans-serif`;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ไม่สามารถสร้าง Canvas สำหรับ PDF ได้');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, width - 84, height - 84);

  const docMeta = MOE_OFFICIAL_DOCUMENTS.find((d) => d.id === docType) || MOE_OFFICIAL_DOCUMENTS[0];
  const schoolNameTh = dossier.school?.nameTh || dossier.systemConfig.schoolNameTh || 'สถานศึกษา';
  const fullNameTh = `${dossier.registry.prefixTh || getStudentPrefixTh(dossier.student)}${dossier.student.firstNameTh} ${dossier.student.lastNameTh}`.trim();

  // Official Emblem
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(margin + 44, 124, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = `700 18px ${font}`;
  ctx.fillText('ศธ.', margin + 44, 121);
  ctx.font = `600 13px ${font}`;
  ctx.fillText('สพฐ.', margin + 44, 141);

  // Header text
  ctx.font = `700 24px ${font}`;
  ctx.fillText(`${docMeta.code} : ${docMeta.titleTh}`, width / 2, 108);
  ctx.font = `700 20px ${font}`;
  ctx.fillText(`โรงเรียน${schoolNameTh}`, width / 2, 138);
  ctx.fillStyle = '#475569';
  ctx.font = `500 14px ${font}`;
  ctx.fillText(
    `สังกัด ${dossier.registry.affiliationOffice || 'สพฐ.'} · ปีการศึกษา ${toThaiNumerals(dossier.systemConfig.academicYear)} · ${formatSemesterLabel(dossier.systemConfig.currentSemester)}`,
    width / 2,
    164
  );

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, 184);
  ctx.lineTo(width - margin, 184);
  ctx.stroke();

  // Student info box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(margin, 200, contentW, 104);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(margin, 200, contentW, 104);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 17px ${font}`;
  ctx.fillText(`ชื่อ-สกุล: ${fullNameTh} (${dossier.student.firstNameEn} ${dossier.student.lastNameEn})`, margin + 16, 232);
  ctx.font = `600 15px ${font}`;
  ctx.fillText(
    `รหัสนักเรียน: ${dossier.student.studentIdNumber} · เลข ปชช.: ${dossier.student.nationalId || '-'} · ชั้น ${dossier.student.gradeLevel} ห้อง ${dossier.student.room}`,
    margin + 16,
    262
  );
  ctx.fillStyle = '#334155';
  ctx.font = `500 14px ${font}`;
  ctx.fillText(
    `บิดา: ${dossier.registry.fatherName || '-'} · มารดา: ${dossier.registry.motherName || '-'} · ผู้ปกครอง: ${dossier.student.guardianName || '-'} (${dossier.student.guardianPhone || '-'})`,
    margin + 16,
    290
  );

  let y = 342;
  const writeSectionTitle = (title: string) => {
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 18px ${font}`;
    ctx.fillText(title, margin, y);
    y += 10;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
    y += 28;
  };

  const writeLine = (text: string, bold = false) => {
    ctx.fillStyle = '#0f172a';
    ctx.font = `${bold ? 700 : 500} 15px ${font}`;
    const wrapped = wrapLines(ctx, text, contentW - 20);
    wrapped.forEach((line) => {
      if (y < height - 220) {
        ctx.fillText(line, margin + 8, y);
        y += 24;
      }
    });
  };

  if (docType === 'pp3') {
    const pp3Meta = getPp3ApprovalStatusMeta(dossier.registry.pp3ApprovalStatus);
    writeSectionTitle('ข้อมูลผู้สำเร็จการศึกษา (ปพ.๓)');
    writeLine(`ชุดที่ / เล่มที่ ปพ.๓: ชุดที่ ${dossier.registry.pp3SetNo || 'ยังไม่กำหนด'} · เล่มที่ ${dossier.registry.pp3BookNo || 'ยังไม่กำหนด'}`, true);
    writeLine(`ระดับชั้นที่สำเร็จการศึกษา: ${dossier.student.gradeLevel} (${dossier.student.room})`);
    writeLine(
      `ผลสัมฤทธิ์สะสม: หน่วยกิตที่ได้ ${dossier.academicSummary.earnedCredits.toFixed(1)} · ${
        dossier.academicSummary.hideGpaCalculations
          ? `คะแนนเฉลี่ย ${dossier.academicSummary.averageRawScore ?? '-'}%`
          : `GPAX ${(dossier.academicSummary.gpax ?? 0).toFixed(2)}`
      }`,
      true
    );
    writeLine(`อ่านคิดวิเคราะห์เขียน: ${dossier.qualSummary.readingLabel} · คุณลักษณะฯ: ${dossier.qualSummary.attrLabel} · สมรรถนะ: ${dossier.qualSummary.compLabel} · กิจกรรม: ${dossier.qualSummary.activityResult}`);
    writeLine(`สถานะการอนุมัติจบ: ${pp3Meta.labelTh}${dossier.registry.graduationDate ? ` (วันที่อนุมัติ ${dossier.registry.graduationDate})` : ''}`, true);
  } else if (docType === 'pp5') {
    writeSectionTitle('สรุปผลคะแนนเก็บ กลางภาค ปลายภาค และเวลาเรียนทุกรายวิชา (ปพ.๕)');
    dossier.cycleEntries.slice(0, 18).forEach((entry, i) => {
      const att = entry.course ? dossier.courseAttendanceByCourseId.get(entry.course.id) : undefined;
      writeLine(
        `${i + 1}. [${entry.course?.code || '-'}] ${entry.course?.titleTh || '-'} | งาน/ย่อย ${entry.grade.assignmentScore + entry.grade.quizScore} | กลาง ${entry.grade.midtermScore} | ปลาย ${entry.grade.finalScore} | รวม ${entry.grade.totalScore} | เกรด ${entry.resolved.letter} | มาเรียน ${att?.attendancePercent ?? 100}%`
      );
    });
  } else if (docType === 'pp6') {
    writeSectionTitle('สรุปผลการพัฒนาคุณภาพผู้เรียน (ปพ.๖)');
    writeLine(`ผลการเรียนเฉลี่ย: ${dossier.academicSummary.hideGpaCalculations ? `${dossier.academicSummary.averageRawScore ?? '-'}%` : `GPA ${(dossier.academicSummary.termGpa ?? 0).toFixed(2)} / GPAX ${(dossier.academicSummary.gpax ?? 0).toFixed(2)}`} (${dossier.academicSummary.gradedSubjectCount} วิชา)`, true);
    writeLine(`เวลาเรียน: ${dossier.dailyAttendanceStats.percentText} (มา ${dossier.dailyAttendanceStats.present} · สาย ${dossier.dailyAttendanceStats.late} · ลา/ป่วย ${dossier.dailyAttendanceStats.sickOrLeave} · ขาด ${dossier.dailyAttendanceStats.absent})`);
    y += 8;
    writeSectionTitle('คุณลักษณะอันพึงประสงค์ ๘ ประการ / อ่านคิดวิเคราะห์ / สมรรถนะ / กิจกรรม');
    writeLine(`• คุณลักษณะอันพึงประสงค์: ${dossier.qualSummary.attrLabel}`);
    writeLine(`• การอ่าน คิดวิเคราะห์ และเขียน: ${dossier.qualSummary.readingLabel}`);
    writeLine(`• สมรรถนะสำคัญของผู้เรียน: ${dossier.qualSummary.compLabel}`);
    writeLine(`• กิจกรรมพัฒนาผู้เรียน: ${dossier.qualSummary.activityResult}`);
    y += 8;
    writeSectionTitle('ความเห็นครูประจำชั้น');
    writeLine(dossier.qualitative.homeroomComment || 'นักเรียนมีความตั้งใจเรียนและปฏิบัติตามระเบียบของสถานศึกษาได้เป็นอย่างดี');
  } else if (docType === 'pp7') {
    const docNo = dossier.registry.pp7DocNo || `ศธ.${toThaiNumerals(dossier.systemConfig.academicYear)}/${dossier.student.studentIdNumber}`;
    writeSectionTitle(`ใบรับรองสถานภาพและผลการศึกษา (เลขที่ ${docNo})`);
    writeLine(
      `หนังสือฉบับนี้ขอรับรองว่า ${fullNameTh} (${dossier.student.firstNameEn} ${dossier.student.lastNameEn}) เลขประจำตัวนักเรียน ${dossier.student.studentIdNumber} เลขประจำตัวประชาชน ${dossier.student.nationalId || '-'} เกิดวันที่ ${dossier.student.dateOfBirth || '-'} สัญชาติ ${dossier.registry.nationality || 'ไทย'}`
    );
    y += 6;
    writeLine(
      dossier.student.status === 'graduated'
        ? `เป็นผู้สำเร็จการศึกษาชั้น ${dossier.student.gradeLevel} ปีการศึกษา ${toThaiNumerals(dossier.systemConfig.academicYear)} ณ โรงเรียน${schoolNameTh}`
        : `กำลังศึกษาอยู่ในชั้น ${dossier.student.gradeLevel} ห้อง ${dossier.student.room} ปีการศึกษา ${toThaiNumerals(dossier.systemConfig.academicYear)} ณ โรงเรียน${schoolNameTh}`
    );
    y += 6;
    writeLine(
      dossier.academicSummary.hideGpaCalculations
        ? `มีคะแนนเฉลี่ยสะสมร้อยละ ${dossier.academicSummary.averageRawScore ?? '-'}% และมีเวลาเรียนร้อยละ ${dossier.dailyAttendanceStats.percentText}`
        : `มีผลการเรียนเฉลี่ยสะสม (GPAX) เท่ากับ ${(dossier.academicSummary.gpax ?? 0).toFixed(2)} และมีเวลาเรียนร้อยละ ${dossier.dailyAttendanceStats.percentText}`
    );
    y += 6;
    writeLine(`วัตถุประสงค์ในการออกเอกสาร: ${dossier.pp7Purpose || PP7_PURPOSE_OPTIONS[0]}`, true);
  } else {
    writeSectionTitle('ระเบียนสะสมผู้เรียนรายบุคคล (ปพ.๘)');
    writeLine(`ที่อยู่: ${dossier.student.address || '-'} · หมู่เลือด: ${dossier.student.bloodType || '-'} · แพ้ยา: ${(dossier.student.allergies || []).join(', ') || 'ไม่มี'}`);
    writeLine(`แผนการเรียน: ${dossier.student.academicTrack || '-'} · ความถนัด/ทักษะ: ${(dossier.student.skills || []).join(', ') || '-'}`);
    writeLine(`คะแนนความประพฤติ: ${dossier.student.behaviorScore ?? 100} คะแนน · ประวัติคัดกรอง SDQ: ${dossier.sdqAssessments[0]?.overallStatus || 'ปกติ'}`);
    writeLine(`สถิติเวลาเรียน: ${dossier.dailyAttendanceStats.percentText} · ประวัติเข้าห้องพยาบาล: ${dossier.infirmaryVisits.length} ครั้ง`);
    y += 8;
    writeSectionTitle('บันทึกพัฒนาการและข้อเสนอแนะ');
    writeLine(dossier.qualitative.homeroomComment || 'ผู้เรียนมีพัฒนาการสมวัยและเข้าร่วมกิจกรรมของสถานศึกษาสม่ำเสมอ');
  }

  // Signatures
  const sigY = height - 185;
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(margin, sigY);
  ctx.lineTo(width - margin, sigY);
  ctx.stroke();

  const cols = [
    { title: 'ครูประจำชั้น / ที่ปรึกษา', name: dossier.registry.advisorName || '................................' },
    { title: 'นายทะเบียน / งานวัดผล', name: dossier.registry.registrarName || dossier.registry.academicHeadName || '................................' },
    { title: 'ผู้อำนวยการสถานศึกษา', name: dossier.registry.principalName || '................................' },
  ];
  cols.forEach((c, i) => {
    const cx = margin + (contentW / 3) * (i + 0.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 14px ${font}`;
    ctx.fillText(c.title, cx, sigY + 30);
    ctx.font = `500 14px ${font}`;
    ctx.fillText('ลงชื่อ ...........................................', cx, sigY + 72);
    ctx.font = `700 14px ${font}`;
    ctx.fillText(`(${c.name})`, cx, sigY + 98);
    ctx.fillStyle = '#475569';
    ctx.font = `500 12px ${font}`;
    ctx.fillText(dossier.issuedDateTh, cx, sigY + 122);
  });

  const blob = buildA4PdfBlobFromCanvases([canvas]);
  const fileName = `${docMeta.code}_${dossier.student.studentIdNumber}_${dossier.student.firstNameTh}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { fileName };
}

export function exportStudentMoeCsv(dossier: StudentMoeDossier): string {
  const { student, registry, qualSummary, academicSummary, cycleEntries, dailyAttendanceStats } = dossier;
  const fullNameTh = `${registry.prefixTh || getStudentPrefixTh(student)}${student.firstNameTh} ${student.lastNameTh}`.trim();

  const rows: string[][] = [
    ['รายงานข้อมูลทะเบียนนักเรียนและผลการเรียน สพฐ.', `โรงเรียน${dossier.school?.nameTh || dossier.systemConfig.schoolNameTh}`],
    ['ชื่อ-นามสกุล', fullNameTh, 'ชื่ออังกฤษ', `${student.firstNameEn} ${student.lastNameEn}`],
    ['รหัสนักเรียน', student.studentIdNumber, 'เลขประจำตัวประชาชน 13 หลัก', student.nationalId || '-'],
    ['ระดับชั้น', student.gradeLevel, 'ห้องเรียน', student.room],
    ['เลขที่ ปพ.1', registry.pp1DocNo || '-', 'ชุด/เล่มที่ ปพ.3', `${registry.pp3SetNo || '-'}/${registry.pp3BookNo || '-'}`],
    ['GPAX / ร้อยละเฉลี่ย', academicSummary.hideGpaCalculations ? `${academicSummary.averageRawScore ?? '-'}%` : `${(academicSummary.gpax ?? 0).toFixed(2)}`, 'เวลาเรียน (%)', dailyAttendanceStats.percentText],
    ['คุณลักษณะอันพึงประสงค์', qualSummary.attrLabel, 'อ่าน คิดวิเคราะห์ เขียน', qualSummary.readingLabel],
    ['สมรรถนะสำคัญ', qualSummary.compLabel, 'กิจกรรมพัฒนาผู้เรียน', qualSummary.activityResult],
    [],
    ['รหัสวิชา', 'ชื่อรายวิชา', 'หน่วยกิต', 'งาน/สอบย่อย', 'กลางภาค', 'ปลายภาค', 'รวม 100', 'เกรด', 'เวลาเรียน (%)'],
    ...cycleEntries.map((e) => {
      const att = e.course ? dossier.courseAttendanceByCourseId.get(e.course.id) : undefined;
      return [
        e.course?.code || '-',
        e.course?.titleTh || '-',
        String(e.course?.credits ?? 0),
        String(e.grade.assignmentScore + e.grade.quizScore),
        String(e.grade.midtermScore),
        String(e.grade.finalScore),
        String(e.grade.totalScore),
        e.resolved.letter,
        `${att?.attendancePercent ?? 100}%`,
      ];
    }),
  ];

  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const fileName = `ทะเบียน_${student.studentIdNumber}_${student.firstNameTh}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return fileName;
}

export function exportStudentMoeJson(dossier: StudentMoeDossier): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    school: {
      id: dossier.school?.id,
      code: dossier.school?.code,
      nameTh: dossier.school?.nameTh || dossier.systemConfig.schoolNameTh,
      academicYear: dossier.systemConfig.academicYear,
      semester: dossier.systemConfig.currentSemester,
    },
    student: dossier.student,
    registry: dossier.registry,
    qualitative: dossier.qualitative,
    academicSummary: dossier.academicSummary,
    grades: dossier.cycleEntries.map((e) => ({
      courseCode: e.course?.code,
      courseTitleTh: e.course?.titleTh,
      credits: e.course?.credits,
      ...e.grade,
      resolvedLetter: e.resolved.letter,
    })),
    attendanceSummary: dossier.dailyAttendanceStats,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
  const fileName = `Student_DB_${dossier.student.studentIdNumber}.json`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return fileName;
}
