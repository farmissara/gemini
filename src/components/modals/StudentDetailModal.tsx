import React, { useEffect, useState } from 'react';
import { Student, Course, GradeRecord, AttendanceRecord, StudentStatus, GradingSystem } from '../../types';
import { 
  X, 
  Award, 
  BookOpen, 
  Clock,
  Phone, 
  Mail, 
  User, 
  Calendar,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Camera,
  Edit3,
  Check,
  GraduationCap,
  QrCode,
  Printer,
  Download,
  Copy,
  Compass,
  Sparkles,
} from 'lucide-react';
import { ImageCaptureUploadModal } from './ImageCaptureUploadModal';
import { BaseModal } from '../common/BaseModal';
import { StudentAcademicTrendChart } from '../StudentAcademicTrendChart';
import { PagedList } from '../PagedList';
import { QrCodeMatrix } from '../QrCodeMatrix';
import { generateQrMatrix } from '../../lib/qrCode';
import { STUDENT_STATUS_DETAILS, ALL_GRADE_LEVELS } from '../../data/studentAcademicData';
import {
  aggregateGradesByAssessmentCycle,
  calculateStudentAcademicSummary,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  resolveEffectiveGrade,
} from '../../lib/moeGrading';
import { getSharedCareerSnapshotForStudent, loadSchoolSharedCareerQuests } from '../../lib/careerQuestStore';
import { POPULAR_CAREERS } from '../../data/careerQuestData';
import type { StudentCareerQuestState } from '../../types';

interface StudentDetailModalProps {
  student: Student;
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  onClose: () => void;
  onLoadAttendanceHistory?: (startDate?: string | null, endDate?: string | null, studentId?: string) => Promise<void> | void;
  onOpenReportCard: (student: Student) => void;
  onOpenDevelopmentBook?: (student: Student) => void;
  onOpenMoeDocumentCenter?: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  gradingSystem?: GradingSystem;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  courses,
  grades,
  attendance,
  onClose,
  onLoadAttendanceHistory,
  onOpenReportCard,
  onOpenDevelopmentBook,
  onOpenMoeDocumentCenter,
  onUpdateStudent,
  gradingSystem = 'thai',
}) => {
  useEffect(() => {
    if (onLoadAttendanceHistory) void onLoadAttendanceHistory(null, null, student.id);
  }, [onLoadAttendanceHistory, student.id]);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrPayloadMode, setQrPayloadMode] = useState<'eduverse' | 'raw_id'>('eduverse');
  const [copiedQrId, setCopiedQrId] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'grades'>('overview');
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [editGradeLevel, setEditGradeLevel] = useState(student.gradeLevel);
  const [editRoom, setEditRoom] = useState(student.room);
  const [editStatus, setEditStatus] = useState<StudentStatus>(student.status || 'active');
  const [editGpa, setEditGpa] = useState<number>(Number(student.gpa) || 0.0);
  const [sharedCareer, setSharedCareer] = useState<StudentCareerQuestState | null>(() =>
    getSharedCareerSnapshotForStudent(student.schoolId || 'default-school', student.id)
  );

  React.useEffect(() => {
    const sid = student.schoolId || 'default-school';
    const localSnap = getSharedCareerSnapshotForStudent(sid, student.id);
    if (localSnap) {
      setSharedCareer(localSnap);
      return;
    }
    let active = true;
    loadSchoolSharedCareerQuests(sid)
      .then((rows) => {
        if (!active) return;
        const found = rows.find((r) => r.studentId === student.id || r.userId === student.id) || null;
        setSharedCareer(found);
      })
      .catch((err) => {
        console.warn('[StudentDetailModal] Could not load CareerQuest snapshot:', err);
      });
    return () => {
      active = false;
    };
  }, [student.id, student.schoolId]);

  const uniqueStudentId = (student.studentIdNumber || student.id || '').trim();
  const qrPayload = qrPayloadMode === 'eduverse' ? `EDUVERSE:STU:${uniqueStudentId}` : uniqueStudentId;

  const handleDownloadQrPng = () => {
    const matrix = generateQrMatrix(qrPayload || 'eduverse');
    const modules = matrix.length;
    const quietZone = 4;
    const scale = 12;
    const qrPixelSize = (modules + quietZone * 2) * scale;
    const cardWidth = Math.max(760, qrPixelSize + 180);
    const cardHeight = qrPixelSize + 300;

    const canvas = document.createElement('canvas');
    canvas.width = cardWidth;
    canvas.height = cardHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White printable card background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // Subtle border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, cardWidth - 32, cardHeight - 32);

    // Top accent bar
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(16, 16, cardWidth - 32, 84);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('STUDENT ATTENDANCE QR PASS', cardWidth / 2, 56);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#dbeafe';
    ctx.fillText('สแกน QR Code เพื่อบันทึกเวลาเข้า-ออกโรงเรียน', cardWidth / 2, 84);

    // QR frame
    const qrX = Math.round((cardWidth - qrPixelSize) / 2);
    const qrY = 126;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX, qrY, qrPixelSize, qrPixelSize);

    ctx.fillStyle = '#0f172a';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(
            qrX + (c + quietZone) * scale,
            qrY + (r + quietZone) * scale,
            scale,
            scale
          );
        }
      }
    }

    // Student details below QR
    const textTop = qrY + qrPixelSize + 44;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${student.firstNameTh} ${student.lastNameTh}`.trim() || `${student.firstNameEn} ${student.lastNameEn}`, cardWidth / 2, textTop);

    ctx.fillStyle = '#475569';
    ctx.font = '20px sans-serif';
    ctx.fillText(`${student.firstNameEn} ${student.lastNameEn} • ${student.gradeLevel} (${student.room})`, cardWidth / 2, textTop + 34);

    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`ID: ${uniqueStudentId}`, cardWidth / 2, textTop + 72);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Student_QR_${uniqueStudentId || 'pass'}.png`;
    link.click();
  };

  const handleCopyStudentQrId = async () => {
    try {
      await navigator.clipboard.writeText(uniqueStudentId);
      setCopiedQrId(true);
      setTimeout(() => setCopiedQrId(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const studentAttendance = attendance.filter((a) => a.studentId === student.id);
  const currentStatusConfig = STUDENT_STATUS_DETAILS[student.status || 'active'] || STUDENT_STATUS_DETAILS.active;
  const academicSummary = calculateStudentAcademicSummary({
    student,
    courses,
    grades,
    gradingSystem,
  });
  const cycleEntries = aggregateGradesByAssessmentCycle({
    student,
    courses,
    grades,
    gradingSystem,
  });
  const studentGrades = grades.filter((g) => g.studentId === student.id);
  const stageLabelTh = getEducationStageLabelTh(academicSummary.stage);
  const primaryFeedback = getRawScoreFeedback(academicSummary.averageRawScore);
  const hasRecordedGpa = academicSummary.hasRecordedGrades && academicSummary.gpax !== null;
  const effectiveGpax = hasRecordedGpa && academicSummary.gpax !== null ? academicSummary.gpax : 0;

  const handlePhotoUpdated = (newUrl: string) => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        avatarUrl: newUrl,
      });
    }
  };

  const handleCalculateGpaFromGrades = () => {
    if (academicSummary.gpax !== null) {
      setEditGpa(academicSummary.gpax);
    } else {
      setEditGpa(0);
    }
  };

  const handleSaveClassEdit = () => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        gradeLevel: editGradeLevel.trim() || student.gradeLevel,
        room: editRoom.trim() || student.room,
        status: editStatus,
        gpa: Math.min(4.0, Math.max(0, Number(editGpa) || 0)),
      });
    }
    setIsEditingClass(false);
  };

  return (
    <>
    <BaseModal
      isOpen={true}
      onClose={onClose}
      hideHeader
      title={`${student.firstNameTh} ${student.lastNameTh}`}
      maxWidthClass="max-w-2xl"
      heightClass="max-h-[90dvh]"
      bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden p-0 text-[var(--color-text-body)]"
    >
        {/* Header (Intentional Dark High-Contrast Student Card Banner) */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => setShowPhotoModal(true)}
              className="relative group cursor-pointer"
              title="แตะเพื่อถ่ายรูป หรือเปลี่ยนรูปนักเรียน"
            >
              <img
                src={student.avatarUrl}
                alt={student.firstNameEn}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400/60 shadow-lg group-hover:ring-2 group-hover:ring-indigo-300 transition"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-indigo-700 group-hover:bg-indigo-600 rounded-full text-white shadow transition">
                <Camera className="w-3 h-3" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">
                  {student.firstNameEn} {student.lastNameEn}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-100 border border-indigo-500/50 font-mono">
                  {student.studentIdNumber}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-bold ${currentStatusConfig.badgeClasses}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentStatusConfig.dotColor}`} />
                  {currentStatusConfig.labelTh}
                </span>
              </div>
              <p className="text-xs text-slate-200 font-thai">
                {student.firstNameTh} {student.lastNameTh} • เลขประจำตัวประชาชน: {student.nationalId || 'N/A'}
              </p>
              <p className="text-xs text-slate-200 mt-1 flex items-center gap-2">
                <span>{student.gradeLevel} • {student.room}</span>
                {onUpdateStudent && (
                  <button
                    type="button"
                    onClick={() => setIsEditingClass(!isEditingClass)}
                    className="text-[11px] text-blue-300 hover:text-blue-100 underline flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>แก้ไขชั้น/ห้อง/สถานะ</span>
                  </button>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inline Quick Editor for Grade Level, Room & Status */}
        {isEditingClass && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/70 border-b border-indigo-200 dark:border-indigo-800 shrink-0 space-y-2 text-xs">
            <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              แก้ไขระดับชั้น ห้องเรียน เกรดเฉลี่ยสะสม (GPA) และสถานะนักเรียน
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-title)] mb-0.5">
                  ระดับชั้น (Grade Level)
                </label>
                <input
                  list="quick-grade-levels"
                  value={editGradeLevel}
                  onChange={(e) => setEditGradeLevel(e.target.value)}
                  placeholder="พิมพ์หรือเลือกระดับชั้น"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                />
                <datalist id="quick-grade-levels">
                  {ALL_GRADE_LEVELS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.labelTh}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-title)] mb-0.5">
                  ห้องเรียน (Room)
                </label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  placeholder="เช่น Room 401 หรือ ม.4/1"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-medium"
                />
              </div>

              {!academicSummary.hideGpaCalculations && (
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-text-title)] mb-0.5">
                    เกรดเฉลี่ยสะสม (GPA: 0-4.00)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4.00"
                      value={editGpa}
                      onChange={(e) => setEditGpa(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-bold tabular-nums"
                    />
                    {studentGrades.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCalculateGpaFromGrades}
                        className="px-2 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] whitespace-nowrap cursor-pointer"
                        title="คำนวณเฉลี่ยจากรายวิชาที่มีในระบบ"
                      >
                        ออโต้
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-title)] mb-0.5">
                  สถานะนักเรียน (Status)
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as StudentStatus)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold"
                >
                  {Object.values(STUDENT_STATUS_DETAILS).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.labelTh} ({s.labelEn})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingClass(false)}
                className="px-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveClassEdit}
                className="px-4 py-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">
                    {academicSummary.hideGpaCalculations ? 'คะแนนดิบเฉลี่ย & พัฒนาการรายปี' : 'GPA / GPAX สะสม'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                    {stageLabelTh} • {academicSummary.isPrimary ? 'ประเมินรายปี' : 'ประเมินรายภาคเรียน'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2.5 mt-0.5 flex-wrap">
                  {academicSummary.hideGpaCalculations ? (
                    academicSummary.averageRawScore !== null ? (
                      <>
                        <span className="text-2xl font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                          {academicSummary.averageRawScore}%
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${primaryFeedback.badgeClass}`}>
                          {primaryFeedback.labelTh} ({academicSummary.averageRawScore}/100)
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-[var(--color-text-muted)]">
                        ยังไม่มีผลคะแนนดิบรายปี
                      </span>
                    )
                  ) : (
                    <>
                      {hasRecordedGpa ? (
                        <span className="text-2xl font-mono font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                          {effectiveGpax.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-[var(--color-text-muted)]">
                          — (ยังไม่ตัดเกรด ปพ.5)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingClass(true)}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                      >
                        [ปรับแก้ข้อมูล]
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  {academicSummary.isPrimary
                    ? academicSummary.isEarlyPrimary
                      ? 'ป.1–ป.3 สื่อสารด้วยคะแนนดิบ (เต็ม 100) และร้อยละพัฒนาการ (%) ประเมินผลรายปี (ซ่อนการคำนวณ GPA)'
                      : 'ระดับประถมศึกษา (ป.4–ป.6) ประเมินผลรายปี เน้นคะแนนดิบ (เต็ม 100) และร้อยละ (%) เป็นหลัก'
                    : `คำนวณแบบถ่วงน้ำหนักหน่วยกิต (${academicSummary.gradedCredits} หน่วยกิตที่ตัดสินแล้ว) ไม่นับกิจกรรมพัฒนาผู้เรียน และ ร/มส.`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/25 cursor-pointer"
                title="พิมพ์รหัส QR ประจำตัวนักเรียนสำหรับการเช็คชื่อ"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Print QR</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenReportCard(student)}
                className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold flex items-center gap-1 shadow-md shadow-indigo-700/30 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Transcript</span>
              </button>
              {onOpenMoeDocumentCenter && (
                <button
                  type="button"
                  onClick={() => onOpenMoeDocumentCenter(student)}
                  className="px-3 py-1.5 rounded-lg border border-sky-600/30 bg-sky-50 hover:bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 dark:text-sky-200 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  title="เปิดศูนย์งานทะเบียน & ออกเอกสาร สพฐ. รายคน (ปพ.1–8)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>เอกสาร สพฐ. (ปพ.1–8)</span>
                </button>
              )}
              {onOpenDevelopmentBook && (
                <button
                  type="button"
                  onClick={() => onOpenDevelopmentBook(student)}
                  className="px-3 py-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-200 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  title="เปิดสมุดบันทึกพัฒนาคุณภาพผู้เรียนรายบุคคล"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>สมุดพัฒนาฯ</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setActiveSection('overview')} className={`px-3 py-1.5 rounded-lg font-semibold border transition cursor-pointer ${activeSection === 'overview' ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border-[var(--color-border)] text-[var(--color-text-body)]'}`}>
              ข้อมูลทั่วไป
            </button>
            <button type="button" onClick={() => setActiveSection('grades')} className={`px-3 py-1.5 rounded-lg font-semibold border transition cursor-pointer ${activeSection === 'grades' ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border-[var(--color-border)] text-[var(--color-text-body)]'}`}>
              ผลการเรียน ({studentGrades.length})
            </button>
          </div>

          {activeSection === 'overview' ? (
          /* Details Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Guardian Info */}
            <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
              <span className="text-[11px] font-bold text-[var(--color-primary-text)] uppercase tracking-wider block">
                ข้อมูลผู้ปกครอง {student.guardians && student.guardians.length > 1 ? `(${student.guardians.length} คน)` : ''}
              </span>
              {student.guardians && student.guardians.length > 0 ? (
                <div className="space-y-3">
                  {student.guardians.map((g, i) => (
                    <div key={g.id || i} className="p-2.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[var(--color-text-title)] flex items-center gap-1.5 text-xs">
                          <User className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                          <span>{g.name || 'ไม่ระบุชื่อ'}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border border-indigo-200">
                            {g.relation}
                          </span>
                        </p>
                        {g.isPrimary && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            ★ ผู้ปกครองหลัก
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-text-body)] flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        <span>{g.phone || '-'}</span>
                      </p>
                      {g.email && (
                        <p className="text-[11px] text-[var(--color-text-body)] flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                          <span>{g.email}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--color-text-title)] flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    {student.guardianName} ({student.guardianRelation})
                  </p>
                  <p className="text-[var(--color-text-body)] flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    {student.guardianPhone}
                  </p>
                  <p className="text-[var(--color-text-body)] flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    {student.guardianEmail}
                  </p>
                </div>
              )}
            </div>

            {/* Attendance Summary */}
            <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
              <span className="text-[11px] font-bold text-[var(--color-primary-text)] uppercase tracking-wider block">
                สถิติการมาเรียนล่าสุด
              </span>
              <div className="space-y-1">
                <p className="text-[var(--color-text-body)] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  บันทึกการเข้าเรียนทั้งหมด: <span className="font-mono font-bold text-[var(--color-text-title)]">{studentAttendance.length}</span> ครั้ง
                </p>
                <p className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  มาเรียนตรงเวลา: {studentAttendance.filter((a) => a.status === 'present').length} ครั้ง
                </p>
              </div>
            </div>

            {/* Shared Career Quest AI Goal (if student enabled sharing) */}
            {sharedCareer && sharedCareer.activeCareerId && (() => {
              const careerProfile =
                sharedCareer.pinnedCareers.find((c) => c.id === sharedCareer.activeCareerId) ||
                POPULAR_CAREERS.find((c) => c.id === sharedCareer.activeCareerId);
              if (!careerProfile) return null;
              return (
                <div className="md:col-span-2 p-4 rounded-xl bg-violet-50/70 dark:bg-violet-950/35 border border-violet-200 dark:border-violet-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-800 dark:text-violet-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>เป้าหมายอาชีพในฝัน (Career Quest AI)</span>
                      </div>
                      <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                        {careerProfile.titleTh} ({careerProfile.titleEn})
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                        ระดับ {sharedCareer.lastReadinessLevel || 'Lv.1 นักสำรวจ'} · Career EXP {sharedCareer.careerExp}
                        {sharedCareer.equippedCareerTitle ? ` · ฉายา "${sharedCareer.equippedCareerTitle}"` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0 tabular-nums">
                    <span className="text-lg font-extrabold font-mono text-violet-700 dark:text-violet-300">
                      {sharedCareer.lastReadinessPercent ?? 0}%
                    </span>
                    <span className="block text-[10px] font-semibold text-[var(--color-text-muted)]">
                      ความพร้อมปัจจุบัน
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Multi-Semester Academic Performance Trend Line Chart */}
            <div className="md:col-span-2">
              <StudentAcademicTrendChart
                student={student}
                courses={courses}
                grades={grades}
                gradingSystem={gradingSystem}
                compact
              />
            </div>
          </div>
          ) : (
          /* Enrolled Courses & Grades */
          <div className="space-y-3">
            <StudentAcademicTrendChart
              student={student}
              courses={courses}
              grades={grades}
              gradingSystem={gradingSystem}
            />
            <span className="text-[11px] font-bold text-[var(--color-primary-text)] uppercase tracking-wider block">
              {academicSummary.isPrimary ? 'ผลการประเมินพัฒนาการและรายวิชา (รายปี)' : 'ผลการเรียนประจำภาคเรียน (ถ่วงน้ำหนักหน่วยกิต)'}
            </span>
            <div className="space-y-2 pr-1">
              {cycleEntries.length === 0 ? (
                <p className="text-[var(--color-text-muted)] py-3 text-center">ยังไม่มีข้อมูลผลการเรียนในระบบ</p>
              ) : (
                <PagedList items={cycleEntries} pageSize={4} renderItem={({ grade: g, course, resolved }) => {
                  const feedback = getRawScoreFeedback(g.totalScore);
                  return (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono text-[var(--color-primary-text)] font-bold mr-2">{course?.code}</span>
                        <span className="text-[var(--color-text-title)] font-medium">{course?.titleTh || course?.titleEn}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[var(--color-text-body)] font-bold">
                          {resolved.isActivity ? `${g.totalScore}%` : `${g.totalScore}% (${g.totalScore}/100)`}
                        </span>
                        {academicSummary.hideGpaCalculations && !resolved.isSpecial ? (
                          <span className={`font-bold px-2 py-0.5 rounded border text-[11px] ${feedback.badgeClass}`}>
                            {feedback.labelTh} (ผลรายปี {resolved.letter})
                          </span>
                        ) : (
                          <span className={`font-mono font-bold px-2 py-0.5 rounded border ${
                            resolved.letter === 'ร' || resolved.letter === 'มส.' || resolved.letter === 'มผ'
                              ? 'text-red-900 dark:text-red-200 bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-700'
                              : 'text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700'
                          }`}>
                            {resolved.letter}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }} />
              )}
            </div>
          </div>
          )}
        </div>
    </BaseModal>

      {/* Printable Student QR Pass Modal */}
      <BaseModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="บัตร QR เช็คชื่อนักเรียน (Printable QR Pass)"
        icon={<QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        maxWidthClass="max-w-md"
        zIndexClass="z-[105]"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-5 space-y-4"
      >
              {/* Printable Pass Card */}
              <div className="student-qr-print-area rounded-2xl border-2 border-slate-300 bg-white text-slate-900 p-5 shadow-sm flex flex-col items-center text-center space-y-3">
                <div className="w-full rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5">
                  <p className="text-[11px] font-bold tracking-widest uppercase text-indigo-200">
                    EduVerse Attendance Pass
                  </p>
                  <p className="text-sm font-bold mt-0.5">
                    บัตร QR Code ประจำตัวนักเรียนสำหรับการเช็คชื่อ
                  </p>
                </div>

                <div className="p-2 rounded-2xl bg-white border border-slate-200">
                  <QrCodeMatrix
                    value={qrPayload}
                    size={220}
                    label={`Student Attendance QR: ${uniqueStudentId}`}
                    className="!border-0 !shadow-none !p-1"
                  />
                </div>

                <div className="space-y-1 w-full">
                  <p className="text-base font-extrabold text-slate-900">
                    {student.firstNameTh} {student.lastNameTh}
                  </p>
                  <p className="text-xs font-semibold text-slate-600">
                    {student.firstNameEn} {student.lastNameEn}
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono font-bold text-xs">
                      ID: {uniqueStudentId}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-xs">
                      {student.gradeLevel} • {student.room}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 border-t border-slate-200 pt-2 w-full">
                  สแกนผ่านเครื่องสแกน Rapid QR หน้าประตู หรือกล้องเช็คชื่อรายคาบ ({qrPayloadMode === 'eduverse' ? qrPayload : uniqueStudentId})
                </p>
              </div>

              {/* Payload format switch & actions (hidden when printing) */}
              <div className="no-print space-y-3">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-[var(--color-text-muted)]">รูปแบบข้อมูลใน QR:</span>
                  <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5">
                    <button
                      type="button"
                      onClick={() => setQrPayloadMode('eduverse')}
                      className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition ${
                        qrPayloadMode === 'eduverse'
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      EduVerse Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrPayloadMode('raw_id')}
                      className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition ${
                        qrPayloadMode === 'raw_id'
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      ID ล้วน ({uniqueStudentId})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="col-span-3 sm:col-span-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQrPng}
                    className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>โหลด PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyStudentQrId}
                    className="col-span-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedQrId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedQrId ? 'คัดลอกแล้ว' : 'คัดลอก ID'}</span>
                  </button>
                </div>
              </div>
      </BaseModal>

      {/* Image Capture & Upload Modal */}
      <ImageCaptureUploadModal
        isOpen={showPhotoModal}
        currentImageUrl={student.avatarUrl}
        title={`ถ่ายรูปสดหรือเปลี่ยนรูปนักเรียน: ${student.firstNameTh} ${student.lastNameTh}`}
        onSelectImage={handlePhotoUpdated}
        onClose={() => setShowPhotoModal(false)}
      />
    </>
  );
};
