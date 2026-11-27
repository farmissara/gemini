import React from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import type { AttendanceCheckType, AttendanceStatus, Student } from '../../types';
import { PagedList } from '../../components/PagedList';

interface TeacherProxyTabProps {
  embeddedMobile: boolean;
  students: Student[];
  proxySavedNotification: string | null;
  proxyStudentIdInput: string;
  setProxyStudentIdInput: (val: string) => void;
  proxyDate: string;
  setProxyDate: (date: string) => void;
  proxyTime: string;
  setProxyTime: (time: string) => void;
  trimmedProxyStudentId: string;
  matchedProxyStudent: Student | undefined;
  matchingProxyCandidates: Student[];
  proxyCheckType: AttendanceCheckType;
  setProxyCheckType: (type: AttendanceCheckType) => void;
  proxySingleStatus: AttendanceStatus;
  setProxySingleStatus: (status: AttendanceStatus) => void;
  runWithBiometricGuard: (action: () => void) => void;
  handleConfirmProxySingleCheckin: () => void;
  proxyRoomFilter: string;
  setProxyRoomFilter: (room: string) => void;
}

const renderStudentAvatar = (student: Student, sizeClass = 'w-9 h-9', borderClass = 'border-[var(--color-border)]') => {
  if (student.avatarUrl) {
    return (
      <img
        src={student.avatarUrl}
        alt={`${student.firstNameTh} ${student.lastNameTh}`}
        className={`${sizeClass} rounded-lg object-cover border ${borderClass} shrink-0`}
      />
    );
  }
  const initials = `${student.firstNameTh || student.firstNameEn || 'S'}`.trim().slice(0, 2);
  return (
    <div
      className={`${sizeClass} rounded-lg border ${borderClass} bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold text-xs flex items-center justify-center shrink-0`}
    >
      {initials}
    </div>
  );
};

export const TeacherProxyTab: React.FC<TeacherProxyTabProps> = ({
  embeddedMobile,
  students,
  proxySavedNotification,
  proxyStudentIdInput,
  setProxyStudentIdInput,
  proxyDate,
  setProxyDate,
  proxyTime,
  setProxyTime,
  trimmedProxyStudentId,
  matchedProxyStudent,
  matchingProxyCandidates,
  proxyCheckType,
  setProxyCheckType,
  proxySingleStatus,
  setProxySingleStatus,
  runWithBiometricGuard,
  handleConfirmProxySingleCheckin,
  proxyRoomFilter,
  setProxyRoomFilter,
}) => {
  const roomOptions = Array.from(
    new Map(
      students
        .map((student) => `${student.gradeLevel} ${student.room}`.trim())
        .filter(Boolean)
        .map((label) => [label, label])
    ).values()
  ).sort((a, b) => a.localeCompare(b, 'th'));

  return (
    <div
      data-guide-id="mobile-checkin-body"
      className={`space-y-4 ${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 pb-24' : 'pb-12'}`}
    >
      <div className="saas-card">
        <div className="saas-card-header">
          <div>
            <h3 className="type-section-title flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>เช็คชื่อเข้า/ออกโรงเรียนแทนนักเรียน</span>
            </h3>
            <p className="type-meta mt-0.5">
              พิมพ์รหัสหรือชื่อนักเรียน แล้วเลือกชื่อเพื่อบันทึกเวลา
            </p>
          </div>
        </div>

        <div className="saas-card-body space-y-3.5">
          {proxySavedNotification && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 type-meta font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
              <span>{proxySavedNotification}</span>
            </div>
          )}

          {/* Student Search Input + Room Filter */}
          <div className="space-y-3 type-body">
            <div className="space-y-1.5">
              <label className="type-label block">
                รหัสหรือชื่อนักเรียน <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={proxyStudentIdInput}
                    onChange={(e) => setProxyStudentIdInput(e.target.value)}
                    placeholder={`พิมพ์รหัส เช่น ${students[0]?.studentIdNumber || '2799'} หรือชื่อนักเรียน`}
                    className="w-full min-h-[42px] pl-8 pr-9 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] text-xs focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  {proxyStudentIdInput && (
                    <button
                      type="button"
                      onClick={() => setProxyStudentIdInput('')}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center absolute right-0.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                      aria-label="ล้างคำค้นหานักเรียน"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {!matchedProxyStudent && roomOptions.length > 1 && (
                  <select
                    aria-label="กรองตามห้องเรียน"
                    value={proxyRoomFilter}
                    onChange={(e) => setProxyRoomFilter(e.target.value)}
                    className="min-h-[42px] px-2.5 py-2 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-title)] bg-[var(--color-card-subtle)] sm:max-w-[170px]"
                  >
                    <option value="all">ทุกห้อง ({students.length})</option>
                    {roomOptions.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="type-label">วันที่บันทึก</span>
                <input
                  type="date"
                  value={proxyDate}
                  onChange={(event) => setProxyDate(event.target.value)}
                  className="w-full min-h-[40px] rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)] tabular-nums"
                />
              </label>
              <label className="block space-y-1">
                <span className="type-label">เวลาบันทึก</span>
                <input
                  type="time"
                  value={proxyTime}
                  onChange={(event) => setProxyTime(event.target.value)}
                  className="w-full min-h-[40px] rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)] tabular-nums"
                />
              </label>
            </div>

            {/* Matched Student Confirmation & Check-in Controls */}
            {matchedProxyStudent ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 space-y-3">
                <div className="flex items-center gap-3">
                  {renderStudentAvatar(
                    matchedProxyStudent,
                    'w-10 h-10',
                    'border-emerald-400 dark:border-emerald-700'
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="type-card-title text-emerald-950 dark:text-emerald-100">
                        {matchedProxyStudent.firstNameTh} {matchedProxyStudent.lastNameTh}
                      </span>
                      <span className="inline-flex items-center gap-1 type-meta text-emerald-700 dark:text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>พร้อมบันทึก</span>
                      </span>
                    </div>
                    <p className="type-meta text-emerald-900 dark:text-emerald-200 font-mono tabular-nums">
                      {matchedProxyStudent.studentIdNumber} · {matchedProxyStudent.gradeLevel} {matchedProxyStudent.room}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <span className="type-meta font-semibold block">ประเภทบันทึก</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setProxyCheckType('check_in')}
                        className={`flex-1 min-h-[40px] py-1.5 px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                          proxyCheckType === 'check_in'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        เข้าโรงเรียน
                      </button>
                      <button
                        type="button"
                        onClick={() => setProxyCheckType('check_out')}
                        className={`flex-1 min-h-[40px] py-1.5 px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                          proxyCheckType === 'check_out'
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                        }`}
                      >
                        ออกโรงเรียน
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="type-meta font-semibold block">สถานะ</span>
                    <div className="grid grid-cols-4 gap-1">
                      {(['present', 'late', 'sick', 'absent'] as AttendanceStatus[]).map((stt) => (
                        <button
                          key={stt}
                          type="button"
                          onClick={() => setProxySingleStatus(stt)}
                          className={`min-h-[40px] px-2 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            proxySingleStatus === stt
                              ? stt === 'present'
                                ? 'bg-emerald-700 text-white'
                                : stt === 'late'
                                  ? 'bg-amber-500 text-slate-950'
                                  : stt === 'sick'
                                    ? 'bg-[var(--color-primary)] text-white'
                                    : 'bg-rose-700 text-white'
                              : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                          }`}
                        >
                          {stt === 'present' ? 'มา' : stt === 'late' ? 'สาย' : stt === 'sick' ? 'ลา' : 'ขาด'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => runWithBiometricGuard(() => handleConfirmProxySingleCheckin())}
                  className="w-full min-h-[44px] py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ยืนยันเช็คชื่อ ({matchedProxyStudent.studentIdNumber})</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
                {trimmedProxyStudentId && matchingProxyCandidates.length === 0 ? (
                  <p className="type-meta text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>ไม่พบนักเรียนที่ตรงกับ "{trimmedProxyStudentId}"</span>
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="font-semibold">
                        {trimmedProxyStudentId
                          ? `พบนักเรียนที่ตรงกัน (${matchingProxyCandidates.length} คน)`
                          : `เลือกนักเรียนจากรายชื่อ (${matchingProxyCandidates.length} คน)`}
                      </span>
                    </div>
                    <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]/40 overflow-hidden">
                      <PagedList
                        items={matchingProxyCandidates}
                        pageSize={5}
                        emptyState={
                          <p className="type-meta text-center py-4">ยังไม่มีรายชื่อนักเรียนในระบบ</p>
                        }
                        renderItem={(st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setProxyStudentIdInput(st.studentIdNumber || st.id)}
                            className="w-full min-h-[52px] px-3 py-2 flex items-center justify-between gap-2.5 text-left hover:bg-[var(--color-card-subtle)] active:bg-[var(--color-card-subtle)] transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {renderStudentAvatar(st, 'w-8 h-8')}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                                  {st.firstNameTh} {st.lastNameTh}
                                </p>
                                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                                  {st.gradeLevel} {st.room}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono text-xs font-semibold text-[var(--color-primary-text)] tabular-nums">
                                {st.studentIdNumber}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                            </div>
                          </button>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
