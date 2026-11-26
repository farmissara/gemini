import React from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  LogIn,
  LogOut,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import type { AttendanceCheckType, AttendanceStatus, Student } from '../../types';
import { PagedList } from '../../components/PagedList';
import { TableActionMenu } from '../../components/common/TableActionMenu';

interface TeacherProxyTabProps {
  embeddedMobile: boolean;
  students: Student[];
  proxyShowRosterHint: boolean;
  setProxyShowRosterHint: (show: boolean) => void;
  proxySavedNotification: string | null;
  proxyStudentIdInput: string;
  setProxyStudentIdInput: (val: string) => void;
  proxyDate: string;
  setProxyDate: (date: string) => void;
  proxyTime: string;
  setProxyTime: (time: string) => void;
  trimmedProxyStudentId: string;
  matchedProxyStudent: Student | undefined;
  proxyCheckType: AttendanceCheckType;
  setProxyCheckType: (type: AttendanceCheckType) => void;
  proxySingleStatus: AttendanceStatus;
  setProxySingleStatus: (status: AttendanceStatus) => void;
  runWithBiometricGuard: (action: () => void) => void;
  handleConfirmProxySingleCheckin: () => void;
  filteredProxyStudents: Student[];
  proxySearch: string;
  setProxySearch: (query: string) => void;
  proxyRoomFilter: string;
  setProxyRoomFilter: (room: string) => void;
  onEditStudent: (student: Student, checkType: AttendanceCheckType) => void;
}

export const TeacherProxyTab: React.FC<TeacherProxyTabProps> = ({
  embeddedMobile,
  students,
  proxyShowRosterHint,
  setProxyShowRosterHint,
  proxySavedNotification,
  proxyStudentIdInput,
  setProxyStudentIdInput,
  proxyDate,
  setProxyDate,
  proxyTime,
  setProxyTime,
  trimmedProxyStudentId,
  matchedProxyStudent,
  proxyCheckType,
  setProxyCheckType,
  proxySingleStatus,
  setProxySingleStatus,
  runWithBiometricGuard,
  handleConfirmProxySingleCheckin,
  filteredProxyStudents,
  proxySearch,
  setProxySearch,
  proxyRoomFilter,
  setProxyRoomFilter,
  onEditStudent,
}) => {
  const roomOptions = Array.from(
    new Map(
      students.map((student) => {
        const key = `${student.gradeLevel} ${student.room}`.trim();
        return [key, key];
      })
    ).values()
  ).sort((a, b) => a.localeCompare(b, 'th'));

  return (
    <div
      data-guide-id="mobile-checkin-body"
      className={`space-y-4 ${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 pb-4' : ''}`}
    >
      <div className="saas-card">
        <div className="saas-card-header">
          <div>
            <h3 className="type-section-title flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>ลงชื่อเข้า-ออกแทนนักเรียน</span>
            </h3>
            <p className="type-meta mt-0.5">ระบุรหัสนักเรียนเพื่อยืนยันตัวตนก่อนบันทึกเวลา</p>
          </div>
          <button
            type="button"
            onClick={() => setProxyShowRosterHint(!proxyShowRosterHint)}
            className="text-xs font-semibold text-[var(--color-primary-text)] underline underline-offset-4 cursor-pointer self-start sm:self-auto"
          >
            {proxyShowRosterHint ? 'ซ่อนรายชื่อ' : 'ดูรายชื่อ & รหัส'}
          </button>
        </div>

        <div className="saas-card-body space-y-3.5">
          {proxySavedNotification && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 type-meta font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
              <span>{proxySavedNotification}</span>
            </div>
          )}

          {/* Step 1: Required Student ID Input */}
          <div className="space-y-3 type-body">
            <div className="space-y-1.5">
              <label className="type-label block">
                รหัสนักเรียน <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={proxyStudentIdInput}
                  onChange={(e) => setProxyStudentIdInput(e.target.value)}
                  placeholder={`เช่น ${students[0]?.studentIdNumber || 'ED-6901'}`}
                  className="w-full pl-8 pr-8 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {proxyStudentIdInput && (
                  <button
                    type="button"
                    onClick={() => setProxyStudentIdInput('')}
                    className="absolute right-2.5 top-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                    aria-label="ล้างรหัสนักเรียน"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {students.length > 0 && !trimmedProxyStudentId && (
                <p className="type-meta">
                  ตัวอย่าง: {students.slice(0, 3).map((s) => s.studentIdNumber).join(', ')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="type-label">วันที่บันทึก</span>
                <input
                  type="date"
                  value={proxyDate}
                  onChange={(event) => setProxyDate(event.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="type-label">เวลาบันทึก</span>
                <input
                  type="time"
                  value={proxyTime}
                  onChange={(event) => setProxyTime(event.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                />
              </label>
            </div>

            {/* Verification Feedback & Check-in Controls */}
            {!trimmedProxyStudentId ? (
              <p className="type-meta flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>กรุณาระบุรหัสนักเรียนด้านบนก่อนบันทึกเวลา</span>
              </p>
            ) : !matchedProxyStudent ? (
              <p className="type-meta text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>ไม่พบนักเรียนรหัส "{trimmedProxyStudentId}"</span>
              </p>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={matchedProxyStudent.avatarUrl}
                    alt={matchedProxyStudent.firstNameTh}
                    className="w-10 h-10 rounded-lg object-cover border border-emerald-400 dark:border-emerald-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="type-card-title text-emerald-950 dark:text-emerald-100">
                        {matchedProxyStudent.firstNameTh} {matchedProxyStudent.lastNameTh}
                      </span>
                      <span className="inline-flex items-center gap-1 type-meta text-emerald-700 dark:text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ยืนยันแล้ว</span>
                      </span>
                    </div>
                    <p className="type-meta text-emerald-900 dark:text-emerald-200 font-mono">
                      {matchedProxyStudent.studentIdNumber} · {matchedProxyStudent.gradeLevel} {matchedProxyStudent.room}
                    </p>
                  </div>
                </div>

                {/* Step 2: Check-in / Check-out & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <span className="type-meta font-semibold block">ประเภทบันทึก</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setProxyCheckType('check_in')}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
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
                        className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-xs transition cursor-pointer ${
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
                    <div className="flex flex-wrap gap-1">
                      {(['present', 'late', 'sick', 'absent'] as AttendanceStatus[]).map((stt) => (
                        <button
                          key={stt}
                          type="button"
                          onClick={() => setProxySingleStatus(stt)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
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
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ยืนยันเช็คชื่อ ({matchedProxyStudent.studentIdNumber})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional Reference Roster */}
      {proxyShowRosterHint && (
        <div className="saas-card">
          <div className="saas-card-header">
            <span className="type-card-title">รายชื่ออ้างอิง ({filteredProxyStudents.length} คน)</span>
          </div>
          <div className="saas-card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-2" />
                <input
                  type="search"
                  value={proxySearch}
                  onChange={(e) => setProxySearch(e.target.value)}
                  placeholder="ค้นหาชื่อหรือรหัสนักเรียน"
                  aria-label="ค้นหานักเรียนในห้องประจำชั้น"
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-title)] bg-[var(--color-card-subtle)]"
                />
              </div>
              <select
                aria-label="กรองตามห้องเรียน"
                value={proxyRoomFilter}
                onChange={(e) => setProxyRoomFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-title)] bg-[var(--color-card-subtle)]"
              >
                <option value="all">ทุกห้องประจำชั้น</option>
                {roomOptions.map((room) => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              <PagedList
                items={filteredProxyStudents}
                pageSize={4}
                emptyState={<p className="type-meta text-center py-4">ไม่พบรายชื่อนักเรียนตามตัวกรอง</p>}
                renderItem={(st) => (
                  <div key={st.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={st.avatarUrl}
                        alt={st.firstNameTh}
                        className="w-8 h-8 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="type-card-title truncate">
                          {st.firstNameTh} {st.lastNameTh}
                        </p>
                        <p className="type-meta truncate">
                          {st.gradeLevel} {st.room}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono type-meta font-semibold text-[var(--color-text-title)] shrink-0">
                      {st.studentIdNumber}
                    </span>
                    <TableActionMenu
                      size="md"
                      ariaLabel={`แก้ไขเช็คชื่อ ${st.firstNameTh} ${st.lastNameTh}`}
                      items={[
                        {
                          id: 'check-in',
                          label: 'แก้ไขเช็คเข้าโรงเรียน',
                          icon: <LogIn className="w-3.5 h-3.5" />,
                          variant: 'success',
                          onClick: () => onEditStudent(st, 'check_in'),
                        },
                        {
                          id: 'check-out',
                          label: 'แก้ไขเช็คออกจากโรงเรียน',
                          icon: <LogOut className="w-3.5 h-3.5" />,
                          variant: 'primary',
                          onClick: () => onEditStudent(st, 'check_out'),
                        },
                      ]}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
