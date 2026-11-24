import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  HeartPulse,
  Send,
  Upload,
  X,
} from 'lucide-react';
import type {
  AttendanceUserType,
  AuthUser,
  Course,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  Student,
  Teacher,
} from '../../types';
import type { CourseTeacherOption } from '../../lib/courseTeacherFilter';
import { courseMatchesTeacherFilter } from '../../lib/courseTeacherFilter';
import {
  detectTeacherApprovalRoleForLeave,
  enrichLeaveRequestForDualApproval,
  resolveStudentLeaveApprovers,
  type LeaveApprovalScope,
} from '../../lib/leaveApprovalRouting';
import { PagedList } from '../../components/PagedList';

interface LeaveRequestTabProps {
  embeddedMobile: boolean;
  activeSchoolId: string;
  currentUser: AuthUser | null;
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  fallbackCourse: Course;
  ownStudent: Student | undefined;
  selectedStudent: Student | undefined;
  selectedTeacher: Teacher | undefined;
  isSelfCheckin: boolean;
  isRestrictedViewer: boolean;
  isSchoolAdmin: boolean;
  loggedInUserType: AttendanceUserType;
  effectiveUserType: AttendanceUserType;
  setActiveUserType: (type: AttendanceUserType) => void;
  activePersonName: string;
  activePersonRole: string;
  leaveFormStep: 1 | 2;
  setLeaveFormStep: (step: 1 | 2) => void;
  leaveSuccessNotice: string | null;
  leaveErrorNotice: string | null;
  handleSubmitLeave: (e: React.FormEvent) => void;
  leaveScope: 'full_day' | 'period_hourly';
  setLeaveScope: (scope: 'full_day' | 'period_hourly') => void;
  leavePeriodNum: number;
  setLeavePeriodNum: (num: number) => void;
  periodsList: Array<{ period: number; time: string; label: string }>;
  courseTeacherOptions: CourseTeacherOption[];
  leaveTeacherFilter: string;
  setLeaveTeacherFilter: (val: string) => void;
  leaveCourseId: string;
  setLeaveCourseId: (id: string) => void;
  leaveFilteredCourses: Course[];
  leaveSubstituteTeacherId: string;
  setLeaveSubstituteTeacherId: (id: string) => void;
  leaveCcRoles: string;
  setLeaveCcRoles: (val: string) => void;
  leaveMissionNumber: string;
  setLeaveMissionNumber: (val: string) => void;
  leaveType: LeaveType;
  setLeaveType: (type: LeaveType) => void;
  leaveStartDate: string;
  setLeaveStartDate: (date: string) => void;
  leaveEndDate: string;
  setLeaveEndDate: (date: string) => void;
  leaveReason: string;
  setLeaveReason: (reason: string) => void;
  leaveAttachmentUrl: string;
  setLeaveAttachmentUrl: (url: string) => void;
  scopedLeaveRequests: LeaveRequest[];
  onUpdateLeaveStatus?: (
    reqId: string,
    status: LeaveStatus,
    remarks?: string,
    scope?: LeaveApprovalScope
  ) => void;
}

export const LeaveRequestTab: React.FC<LeaveRequestTabProps> = ({
  embeddedMobile,
  activeSchoolId,
  currentUser,
  students,
  teachers,
  courses,
  fallbackCourse,
  ownStudent,
  selectedStudent,
  selectedTeacher,
  isSelfCheckin,
  isRestrictedViewer,
  isSchoolAdmin,
  loggedInUserType,
  effectiveUserType,
  setActiveUserType,
  activePersonName,
  activePersonRole,
  leaveFormStep,
  setLeaveFormStep,
  leaveSuccessNotice,
  leaveErrorNotice,
  handleSubmitLeave,
  leaveScope,
  setLeaveScope,
  leavePeriodNum,
  setLeavePeriodNum,
  periodsList,
  courseTeacherOptions,
  leaveTeacherFilter,
  setLeaveTeacherFilter,
  leaveCourseId,
  setLeaveCourseId,
  leaveFilteredCourses,
  leaveSubstituteTeacherId,
  setLeaveSubstituteTeacherId,
  leaveCcRoles,
  setLeaveCcRoles,
  leaveMissionNumber,
  setLeaveMissionNumber,
  leaveType,
  setLeaveType,
  leaveStartDate,
  setLeaveStartDate,
  leaveEndDate,
  setLeaveEndDate,
  leaveReason,
  setLeaveReason,
  leaveAttachmentUrl,
  setLeaveAttachmentUrl,
  scopedLeaveRequests,
  onUpdateLeaveStatus,
}) => {
  return (
    <div
      data-guide-id="mobile-checkin-body"
      className={`${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 pb-4' : ''}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Form */}
        <div className="lg:col-span-7 saas-card text-[var(--color-text-body)]">
          <div className="saas-card-header">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h3 className="type-section-title">ยื่นใบลาออนไลน์</h3>
                <p className="type-meta">ขอลาป่วย ลากิจ หรือไปราชการ พร้อมแนบหลักฐาน</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 type-meta">
              <span className={leaveFormStep === 1 ? 'font-bold text-emerald-700 dark:text-emerald-300' : ''}>
                1. รายละเอียด
              </span>
              <span>→</span>
              <span className={leaveFormStep === 2 ? 'font-bold text-emerald-700 dark:text-emerald-300' : ''}>
                2. เหตุผล
              </span>
            </div>
          </div>

          <div className="saas-card-body space-y-4">
            {leaveSuccessNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 type-meta font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                <span>{leaveSuccessNotice}</span>
              </div>
            )}

            {leaveErrorNotice && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 type-meta font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-300 shrink-0" />
                <span>{leaveErrorNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLeave} className="space-y-4 type-body">
              {leaveFormStep === 1 && (
                <div className="space-y-4">
                  {/* Person Summary / Switcher */}
                  <div className="pb-3 border-b border-[var(--color-border)] space-y-2">
                    <span className="type-label block">ผู้ขอยื่นใบลา</span>
                    {isSelfCheckin ? (
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="type-card-title">{activePersonName}</span>
                        <span className="type-meta">· {activePersonRole} · บัญชีของคุณ</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveUserType('student')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition max-w-full truncate cursor-pointer ${
                            effectiveUserType === 'student'
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                          }`}
                        >
                          นักเรียน: {selectedStudent?.firstNameTh} ({selectedStudent?.room})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveUserType('teacher')}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition max-w-full truncate cursor-pointer ${
                            effectiveUserType === 'teacher'
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                          }`}
                        >
                          ครู: {selectedTeacher?.fullNameTh}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Leave Scope Toggle */}
                  <div className="space-y-1.5">
                    <label className="type-label block">ขอบเขตการลา</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLeaveScope('full_day')}
                        className={`p-2.5 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                          leaveScope === 'full_day'
                            ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                            : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>ลาเต็มวัน / หลายวัน</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveScope('period_hourly')}
                        className={`p-2.5 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                          leaveScope === 'period_hourly'
                            ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                            : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>ลาเฉพาะคาบ / รายชม.</span>
                      </button>
                    </div>
                  </div>

                  {/* Period / Hourly Specific Selectors */}
                  {leaveScope === 'period_hourly' && (
                    <div className="p-3.5 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-border)] space-y-3">
                      <div className="flex items-center gap-2 text-[var(--color-primary-text)] type-card-title">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>ระบุคาบสอนและครูสอนแทน</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="type-meta font-semibold">คาบเรียนที่ลา</label>
                          <select
                            value={leavePeriodNum}
                            onChange={(e) => setLeavePeriodNum(Number(e.target.value))}
                            className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                          >
                            {periodsList.map((p) => (
                              <option key={p.period} value={p.period}>
                                {p.label} ({p.time})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="type-meta font-semibold">วิชาที่ติดสอน</label>
                          {courseTeacherOptions.length > 0 && (
                            <select
                              aria-label="กรองวิชาตามรายชื่อครู"
                              value={leaveTeacherFilter}
                              onChange={(e) => {
                                const nextTeacher = e.target.value;
                                setLeaveTeacherFilter(nextTeacher);
                                const matching = (courses.length > 0 ? courses : [fallbackCourse]).filter((c) =>
                                  courseMatchesTeacherFilter(c, nextTeacher, courseTeacherOptions)
                                );
                                if (matching.length > 0 && !matching.some((c) => c.id === leaveCourseId)) {
                                  setLeaveCourseId(matching[0].id);
                                }
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                            >
                              <option value="all">ครูผู้สอนทุกคน ({courseTeacherOptions.length})</option>
                              {courseTeacherOptions.map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                  {opt.label} ({opt.count} วิชา)
                                </option>
                              ))}
                            </select>
                          )}
                          <select
                            value={leaveCourseId}
                            onChange={(e) => setLeaveCourseId(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                          >
                            {leaveFilteredCourses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.code} {c.titleTh} {c.room ? `(ห้อง ${c.room})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="type-meta font-semibold">ครูสอนแทน</label>
                        <select
                          value={leaveSubstituteTeacherId}
                          onChange={(e) => setLeaveSubstituteTeacherId(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                        >
                          <option value="">-- เลือกครูสอนแทน หรือเวรประจำวัน --</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.fullNameTh} ({t.department} · {t.academicStanding})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="type-meta font-semibold">CC บุคคล/ตำแหน่งที่เกี่ยวข้อง</label>
                        <input
                          type="text"
                          value={leaveCcRoles}
                          onChange={(e) => setLeaveCcRoles(e.target.value)}
                          placeholder="เช่น หัวหน้ากลุ่มสาระฯ, รอง ผอ.วิชาการ"
                          className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] text-xs"
                        />
                      </div>

                      <div>
                        <label className="type-meta font-semibold">เลขที่บันทึกข้อความ / คำสั่ง (ถ้ามี)</label>
                        <input
                          type="text"
                          value={leaveMissionNumber}
                          onChange={(e) => setLeaveMissionNumber(e.target.value)}
                          placeholder="เช่น ศธ 04225/ว1234"
                          className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Leave Type */}
                  <div className="space-y-1.5">
                    <label className="type-label block">ประเภทการลา</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setLeaveType('sick')}
                        className={`p-2 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                          leaveType === 'sick'
                            ? 'bg-rose-50 dark:bg-rose-950 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                            : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                        <span>ลาป่วย</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveType('personal')}
                        className={`p-2 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                          leaveType === 'personal'
                            ? 'bg-amber-50 dark:bg-amber-950 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                            : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        <Briefcase className="w-3.5 h-3.5 shrink-0" />
                        <span>ลากิจ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveType('official')}
                        className={`p-2 rounded-lg border text-center font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                          leaveType === 'official'
                            ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                            : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span>ไปราชการ</span>
                      </button>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className={`grid ${leaveScope === 'period_hourly' ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                    <div className="space-y-1">
                      <label className="type-label block">
                        {leaveScope === 'period_hourly' ? 'วันที่ลา' : 'ตั้งแต่วันที่'}
                      </label>
                      <input
                        type="date"
                        value={leaveStartDate}
                        onChange={(e) => {
                          setLeaveStartDate(e.target.value);
                          if (leaveScope === 'period_hourly') setLeaveEndDate(e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] tabular-nums"
                        required
                      />
                    </div>
                    {leaveScope === 'full_day' && (
                      <div className="space-y-1">
                        <label className="type-label block">ถึงวันที่</label>
                        <input
                          type="date"
                          value={leaveEndDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] tabular-nums"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Dual Approval Routing Preview for Student Leave */}
                  {((isSelfCheckin && loggedInUserType === 'student') || (!isSelfCheckin && effectiveUserType === 'student')) &&
                    (() => {
                      const previewApprovers = resolveStudentLeaveApprovers({
                        student: selectedStudent || ownStudent,
                        teachers,
                        courses,
                        courseId: leaveScope === 'period_hourly' ? leaveCourseId : undefined,
                      });
                      return (
                        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-1.5">
                          <p className="text-[11px] font-bold text-sky-900 dark:text-sky-200">
                            เส้นทางการอนุมัติใบลานักเรียน (ส่งอนุมัติทั้ง 2 ฝ่ายอัตโนมัติ)
                          </p>
                          <div className="text-[11px] text-sky-800 dark:text-sky-300 space-y-0.5">
                            <p>
                              • <strong>ครูประจำชั้น:</strong> {previewApprovers.homeroomTeacherName}
                            </p>
                            <p>
                              • <strong>ครูประจำวิชา ({previewApprovers.subjectTeacherNames.length} ท่าน):</strong>{' '}
                              {previewApprovers.subjectTeacherNames.join(', ')}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                  <button
                    type="button"
                    onClick={() => {
                      if (leaveStartDate) setLeaveFormStep(2);
                    }}
                    className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <span>ถัดไป: ระบุเหตุผลและหลักฐาน</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {leaveFormStep === 2 && (
                <div className="space-y-4">
                  {/* Reason */}
                  <div className="space-y-1">
                    <label className="type-label block">
                      {leaveScope === 'period_hourly' ? 'เหตุผลและภารกิจประกอบการลาสอน' : 'เหตุผลประกอบการลา'}
                    </label>
                    <textarea
                      rows={3}
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder={
                        leaveScope === 'period_hourly'
                          ? 'ระบุภารกิจราชการ หรืออาการป่วยกะทันหัน...'
                          : 'ระบุอาการเจ็บป่วย หรือภารกิจจำเป็น...'
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                      required
                    />
                  </div>

                  {/* Medical certificate / Document attachment */}
                  <div className="space-y-2">
                    <label className="type-label block">
                      {leaveScope === 'period_hourly' ? 'แนบคำสั่ง / ใบมอบหมายสอนแทน (ถ้ามี)' : 'แนบใบรับรองแพทย์ / เอกสาร (ถ้ามี)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const sampleCert = 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500';
                          setLeaveAttachmentUrl(sampleCert);
                        }}
                        className="text-[var(--color-primary-text)] hover:underline font-semibold flex items-center gap-1.5 underline-offset-4 cursor-pointer text-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>แนบเอกสารตัวอย่าง</span>
                      </button>
                      {leaveAttachmentUrl && (
                        <span className="type-meta text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>แนบแล้ว</span>
                        </span>
                      )}
                    </div>

                    {leaveAttachmentUrl && (
                      <div className="relative w-36 h-24 rounded-lg overflow-hidden border border-[var(--color-border)] mt-2">
                        <img src={leaveAttachmentUrl} alt="Document Attachment" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setLeaveAttachmentUrl('')}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-white hover:bg-black cursor-pointer"
                          aria-label="ลบไฟล์แนบ"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {leaveScope === 'period_hourly' ? 'ยื่นขอลาสอนคาบนี้ (แจ้งเตือน CC)' : 'ส่งคำขอใบลา'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveFormStep(1)}
                    className="w-full py-1 text-center type-meta hover:text-[var(--color-text-title)] font-semibold underline underline-offset-4 cursor-pointer"
                  >
                    ย้อนกลับแก้ไขวันลา
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right: History of Leave Requests */}
        <div className="lg:col-span-5 saas-card text-[var(--color-text-body)]">
          <div className="saas-card-header">
            <h4 className="type-section-title flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>
                {isRestrictedViewer
                  ? `ประวัติใบลา (${scopedLeaveRequests.length})`
                  : `สถานะใบลาล่าสุด (${scopedLeaveRequests.length})`}
              </span>
            </h4>
          </div>

          <div className="saas-card-body">
            <div className="divide-y divide-[var(--color-border)]">
              <PagedList
                items={scopedLeaveRequests}
                pageSize={3}
                emptyState={<p className="type-meta py-4 text-center">ยังไม่มีประวัติใบลา</p>}
                renderItem={(rawReq) => {
                  const req = enrichLeaveRequestForDualApproval({
                    schoolId: activeSchoolId,
                    req: rawReq,
                    students,
                    teachers,
                    courses,
                  });
                  const isStudentLeave = req.userRole === 'student';
                  const subjectList = req.subjectApprovals || [];
                  const approvedSubjects = subjectList.filter((s) => s.status === 'approved').length;
                  const teacherRoleInfo = detectTeacherApprovalRoleForLeave(req, currentUser, teachers);
                  return (
                    <div key={req.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="type-card-title truncate">{req.userName}</p>
                          <p className="type-meta truncate">
                            {req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ไปราชการ'}
                            {' · '}
                            {req.leaveScope === 'period_hourly'
                              ? `คาบที่ ${req.periodNumber || 1}${req.courseCode ? ` (${req.courseCode})` : ''} · ${req.startDate}`
                              : `${req.startDate} – ${req.endDate}`}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 type-label shrink-0 ${
                            req.status === 'approved'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : req.status === 'pending'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {req.status === 'approved' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : req.status === 'pending' ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          <span>{req.status === 'approved' ? 'อนุมัติครบ' : req.status === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ'}</span>
                        </span>
                      </div>

                      {/* Dual Approval Status: Homeroom + Subject Teachers */}
                      {isStudentLeave && (
                        <div className="p-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--color-text-muted)] truncate">
                              ครูประจำชั้น:{' '}
                              <strong className="text-[var(--color-text-title)]">{req.homeroomTeacherName || 'ครูประจำชั้น'}</strong>
                            </span>
                            <span
                              className={`font-bold shrink-0 ${
                                req.homeroomApprovalStatus === 'approved'
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : req.homeroomApprovalStatus === 'rejected'
                                    ? 'text-rose-700 dark:text-rose-300'
                                    : 'text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {req.homeroomApprovalStatus === 'approved'
                                ? 'อนุมัติแล้ว'
                                : req.homeroomApprovalStatus === 'rejected'
                                  ? 'ไม่อนุมัติ'
                                  : 'รออนุมัติ'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--color-text-muted)] truncate">
                              ครูประจำวิชา ({approvedSubjects}/{subjectList.length || 1}):{' '}
                              <strong className="text-[var(--color-text-title)]">
                                {(req.subjectTeacherNames || []).slice(0, 2).join(', ') || 'ครูผู้สอนรายวิชา'}
                              </strong>
                            </span>
                            <span
                              className={`font-bold shrink-0 ${
                                subjectList.length > 0 && approvedSubjects === subjectList.length
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : subjectList.some((s) => s.status === 'rejected')
                                    ? 'text-rose-700 dark:text-rose-300'
                                    : 'text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {subjectList.length > 0 && approvedSubjects === subjectList.length
                                ? 'อนุมัติครบ'
                                : subjectList.some((s) => s.status === 'rejected')
                                  ? 'ไม่อนุมัติ'
                                  : approvedSubjects > 0
                                    ? `อนุมัติแล้ว ${approvedSubjects}`
                                    : 'รออนุมัติ'}
                            </span>
                          </div>
                        </div>
                      )}

                      {req.leaveScope === 'period_hourly' && (
                        <p className="type-meta text-[var(--color-primary-text)]">
                          สอนแทน: {req.substituteTeacherName || 'ยังไม่ระบุ'}
                          {req.ccEmailsOrRoles ? ` · CC: ${req.ccEmailsOrRoles}` : ''}
                        </p>
                      )}

                      <p className="type-body">"{req.reason}"</p>

                      {req.attachmentUrl && (
                        <div className="flex items-center gap-1 type-meta text-[var(--color-primary-text)]">
                          <FileText className="w-3 h-3" />
                          <span>มีเอกสารแนบ</span>
                        </div>
                      )}

                      {req.approvalRemarks && (
                        <p className="type-meta">
                          ผู้อนุมัติ: {req.approvedBy} ({req.approvalRemarks})
                        </p>
                      )}

                      {req.status === 'pending' &&
                        onUpdateLeaveStatus &&
                        (currentUser?.role === 'teacher' ||
                          currentUser?.role === 'admin' ||
                          currentUser?.role === 'super_admin') && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                            {isStudentLeave ? (
                              <>
                                {req.homeroomApprovalStatus !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateLeaveStatus(req.id, 'approved', 'ครูประจำชั้นอนุมัติผ่านมือถือ', 'homeroom')
                                    }
                                    className="flex-1 min-w-[118px] py-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition cursor-pointer inline-flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>อนุมัติ (ครูประจำชั้น)</span>
                                  </button>
                                )}
                                {!(subjectList.length > 0 && approvedSubjects === subjectList.length) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateLeaveStatus(req.id, 'approved', 'ครูประจำวิชาอนุมัติผ่านมือถือ', 'subject')
                                    }
                                    className="flex-1 min-w-[118px] py-1.5 px-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] transition cursor-pointer inline-flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>อนุมัติ (ครูวิชา)</span>
                                  </button>
                                )}
                                {(isSchoolAdmin || (teacherRoleInfo.isHomeroomApprover && teacherRoleInfo.isSubjectApprover)) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateLeaveStatus(req.id, 'approved', 'อนุมัติครบทั้ง 2 ฝ่าย', 'both')
                                    }
                                    className="py-1.5 px-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] transition cursor-pointer"
                                  >
                                    อนุมัติทั้ง 2 ฝ่าย
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onUpdateLeaveStatus(req.id, 'rejected', 'ไม่อนุมัติ', 'both')}
                                  className="py-1.5 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-semibold text-[11px] transition cursor-pointer inline-flex items-center justify-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>ปฏิเสธ</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onUpdateLeaveStatus(req.id, 'approved', 'อนุมัติผ่านระบบมือถือ', 'both')}
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>อนุมัติ</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateLeaveStatus(req.id, 'rejected', 'ไม่อนุมัติ', 'both')}
                                  className="py-1.5 px-3 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-semibold text-xs transition cursor-pointer inline-flex items-center justify-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>ปฏิเสธ</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                    </div>
                  );
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
