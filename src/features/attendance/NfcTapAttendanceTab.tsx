import React from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Link2,
  LogIn,
  LogOut,
  MapPin,
  Nfc,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  AttendanceCheckType,
  AttendanceStatus,
  CampusGateGeofence,
  Student,
  Teacher,
} from '../../types';
import { removeNfcBinding, type NfcCardBinding } from '../../lib/nfcAttendance';
import type { NfcRecentLogEntry } from './types';

interface NfcTapAttendanceTabProps {
  embeddedMobile: boolean;
  lang: AppLanguage;
  activeSchoolId: string;
  isStaffUser: boolean;
  isRestrictedViewer: boolean;
  ownStudent: Student | undefined;
  students: Student[];
  teachers: Teacher[];
  isNfcScanning: boolean;
  webNfcAvailable: boolean;
  secureNfc: boolean;
  nfcCheckType: AttendanceCheckType;
  setNfcCheckType: (type: AttendanceCheckType) => void;
  normalizedGates: CampusGateGeofence[];
  selectedGate: CampusGateGeofence | null;
  setSelectedGateId: (id: string) => void;
  nfcStatusMode: AttendanceStatus;
  setNfcStatusMode: (status: AttendanceStatus) => void;
  stopNfcScanning: () => void;
  handleStartWebNfcScan: () => Promise<void>;
  handleProcessNfcCardInput: (rawUid: string, payloadText?: string) => void;
  nfcStatusMessage: string | null;
  nfcErrorMessage: string | null;
  nfcManualUidInput: string;
  setNfcManualUidInput: (val: string) => void;
  unregisteredNfcTag: { uid: string; payloadText: string } | null;
  setUnregisteredNfcTag: (tag: { uid: string; payloadText: string } | null) => void;
  bindTargetType: 'student' | 'teacher';
  setBindTargetType: (type: 'student' | 'teacher') => void;
  bindTargetId: string;
  setBindTargetId: (id: string) => void;
  handleBindUnregisteredNfcCard: () => void;
  nfcBindings: NfcCardBinding[];
  setNfcBindings: (bindings: NfcCardBinding[]) => void;
  nfcRecentLogs: NfcRecentLogEntry[];
  setNfcDrawerMode: (mode: null | 'quick_tap' | 'recent_logs') => void;
}

export const NfcTapAttendanceTab: React.FC<NfcTapAttendanceTabProps> = ({
  embeddedMobile,
  lang,
  activeSchoolId,
  isStaffUser,
  isRestrictedViewer,
  ownStudent,
  students,
  teachers,
  isNfcScanning,
  webNfcAvailable,
  secureNfc,
  nfcCheckType,
  setNfcCheckType,
  normalizedGates,
  selectedGate,
  setSelectedGateId,
  nfcStatusMode,
  setNfcStatusMode,
  stopNfcScanning,
  handleStartWebNfcScan,
  handleProcessNfcCardInput,
  nfcStatusMessage,
  nfcErrorMessage,
  nfcManualUidInput,
  setNfcManualUidInput,
  unregisteredNfcTag,
  setUnregisteredNfcTag,
  bindTargetType,
  setBindTargetType,
  bindTargetId,
  setBindTargetId,
  handleBindUnregisteredNfcCard,
  nfcBindings,
  setNfcBindings,
  nfcRecentLogs,
  setNfcDrawerMode,
}) => {
  return (
    <div
      data-guide-id="mobile-checkin-body"
      className={`space-y-4 ${embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 pb-4' : ''}`}
    >
      {/* Top Terminal Card */}
      <div className="saas-card">
        <div className="saas-card-header">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isNfcScanning ? 'bg-emerald-600 text-white' : 'bg-[var(--tone-soft)] text-[var(--tone)]'
              }`}
            >
              <Nfc className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="type-section-title truncate">
                {lang === 'th' ? 'เช็คชื่อเข้า/ออกโรงเรียน (บัตร NFC)' : 'School NFC Check-in / Out'}
              </h2>
              <p className="type-meta truncate">
                {isStaffUser
                  ? lang === 'th'
                    ? 'แตะบัตรนักเรียนหรือครูเพื่อบันทึกเวลาทันที'
                    : 'Tap a student or teacher NFC ID card to log attendance.'
                  : lang === 'th'
                    ? 'แตะบัตรนักเรียน NFC ของคุณเพื่อลงเวลา'
                    : 'Tap your NFC student ID card to log attendance.'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 type-meta font-semibold shrink-0 ${
              webNfcAvailable && secureNfc
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            <Nfc className="w-3.5 h-3.5" />
            <span>
              {webNfcAvailable && secureNfc
                ? lang === 'th'
                  ? 'Web NFC พร้อม'
                  : 'Web NFC Ready'
                : lang === 'th'
                  ? 'โหมด USB / UID'
                  : 'USB / UID Mode'}
            </span>
          </span>
        </div>

        <div className="saas-card-body space-y-4">
          {/* Mode Controls: IN/OUT + Gate + (Staff Status) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setNfcCheckType('check_in')}
                className={`flex-1 min-h-[36px] px-3 rounded-md flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  nfcCheckType === 'check_in'
                    ? 'bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold shadow-xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium'
                }`}
              >
                <LogIn className={`w-3.5 h-3.5 ${nfcCheckType === 'check_in' ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span>{lang === 'th' ? 'เข้าโรงเรียน' : 'Check In'}</span>
              </button>
              <button
                type="button"
                onClick={() => setNfcCheckType('check_out')}
                className={`flex-1 min-h-[36px] px-3 rounded-md flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  nfcCheckType === 'check_out'
                    ? 'bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold shadow-xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium'
                }`}
              >
                <LogOut className={`w-3.5 h-3.5 ${nfcCheckType === 'check_out' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                <span>{lang === 'th' ? 'ออกโรงเรียน' : 'Check Out'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
              {normalizedGates.length > 1 && selectedGate ? (
                <select
                  aria-label={lang === 'th' ? 'จุดสแกน NFC' : 'NFC Gate'}
                  value={selectedGate.id}
                  onChange={(e) => setSelectedGateId(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-xs font-medium text-[var(--color-text-title)] focus:outline-hidden"
                >
                  {normalizedGates.map((gate) => (
                    <option key={gate.id} value={gate.id}>
                      {gate.nameTh}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="flex-1 min-w-0 text-xs font-medium text-[var(--color-text-title)] truncate">
                  {selectedGate ? selectedGate.nameTh : lang === 'th' ? 'ยังไม่ตั้งค่าพิกัดโรงเรียน' : 'School GPS not set'}
                </span>
              )}
            </div>

            {isStaffUser && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                {(['present', 'late'] as const).map((stt) => (
                  <button
                    key={stt}
                    type="button"
                    onClick={() => setNfcStatusMode(stt)}
                    className={`flex-1 min-h-[36px] px-2.5 rounded-md text-xs transition cursor-pointer ${
                      nfcStatusMode === stt
                        ? 'bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold shadow-xs border border-[var(--color-border)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-medium'
                    }`}
                  >
                    {stt === 'present' ? (lang === 'th' ? 'สถานะ: มา' : 'Present') : lang === 'th' ? 'สถานะ: สาย' : 'Late'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Web NFC Tap Pad */}
          <div
            className={`p-5 rounded-xl border transition flex flex-col items-center text-center gap-3 ${
              isNfcScanning
                ? 'border-emerald-500/60 bg-emerald-500/[0.06]'
                : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center transition ${
                isNfcScanning
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[var(--color-card)] text-[var(--color-primary-text)] border border-[var(--color-border)]'
              }`}
            >
              <Nfc className="w-7 h-7" />
            </div>

            <div className="space-y-1 max-w-md">
              <p className="text-sm font-bold text-[var(--color-text-title)]">
                {isNfcScanning
                  ? lang === 'th'
                    ? 'กำลังรอสัญญาณแตะบัตร NFC...'
                    : 'Listening for NFC Card Tap...'
                  : webNfcAvailable && secureNfc
                    ? lang === 'th'
                      ? 'แตะปุ่มด้านล่างเพื่อเปิดรับสัญญาณบัตร NFC'
                      : 'Tap below to activate NFC reader'
                    : lang === 'th'
                      ? 'อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับ Web NFC โดยตรง'
                      : 'Direct Web NFC is unavailable on this browser'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {webNfcAvailable && secureNfc
                  ? lang === 'th'
                    ? 'รองรับบัตรนักเรียน/บุคลากร MIFARE, NTAG213/215 และแท็ก NFC ที่มี NDEF หรือ Serial UID'
                    : 'Supports MIFARE, NTAG ID cards, and NDEF student/staff tags.'
                  : lang === 'th'
                    ? 'Web NFC รองรับบน Chrome สำหรับ Android (HTTPS) — สำหรับ iOS หรือคอมพิวเตอร์ สามารถเสียบเครื่องอ่าน USB/RFID หรือกรอก UID บัตรด้านล่างได้ทันที'
                    : 'Web NFC requires Android Chrome over HTTPS. On iOS/Desktop, connect a USB NFC reader or type card UID below.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
              {webNfcAvailable && secureNfc && (
                <button
                  type="button"
                  onClick={() => {
                    if (isNfcScanning) stopNfcScanning();
                    else void handleStartWebNfcScan();
                  }}
                  className={`min-h-[44px] px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition ${
                    isNfcScanning
                      ? 'bg-rose-700 hover:bg-rose-800 text-white'
                      : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                  }`}
                >
                  <Nfc className="w-4 h-4" />
                  <span>
                    {isNfcScanning
                      ? lang === 'th'
                        ? 'หยุดรอรับสัญญาณ NFC'
                        : 'Stop NFC Reader'
                      : lang === 'th'
                        ? 'เปิดเครื่องอ่าน NFC (แตะบัตร)'
                        : 'Start Web NFC Scan'}
                  </span>
                </button>
              )}

              {isRestrictedViewer && ownStudent && (
                <button
                  type="button"
                  onClick={() => handleProcessNfcCardInput(ownStudent.nfcCardUid || ownStudent.studentIdNumber)}
                  className="min-h-[44px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-[var(--color-primary-text)]" />
                  <span>
                    {lang === 'th'
                      ? `เช็คชื่อด้วยบัตรของฉัน (${ownStudent.studentIdNumber})`
                      : `Tap My ID (${ownStudent.studentIdNumber})`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {nfcStatusMessage && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
              <span>{nfcStatusMessage}</span>
            </div>
          )}

          {nfcErrorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
              <span>{nfcErrorMessage}</span>
            </div>
          )}

          {/* USB / Keyboard-Wedge NFC Reader & Manual Card UID Entry */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nfcManualUidInput.trim()) return;
              handleProcessNfcCardInput(nfcManualUidInput);
              setNfcManualUidInput('');
            }}
            className="space-y-1.5"
          >
            <label className="text-xs font-bold text-[var(--color-text-title)] block">
              {lang === 'th'
                ? 'แตะผ่านเครื่องอ่าน USB NFC / กรอกเลข UID บัตร หรือรหัสประจำตัว'
                : 'USB NFC Reader / Card UID or ID Number'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <CreditCard className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nfcManualUidInput}
                  onChange={(e) => setNfcManualUidInput(e.target.value)}
                  placeholder={
                    lang === 'th'
                      ? `สแกน UID บัตร (เช่น 04:A2:19:FA) หรือ ${students[0]?.studentIdNumber || 'ED-6901'}`
                      : 'Card UID (e.g. 04:A2:19:FA) or ID number'
                  }
                  className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-mono text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <button
                type="submit"
                disabled={!nfcManualUidInput.trim()}
                className="min-h-[44px] px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>{lang === 'th' ? 'บันทึกแตะบัตร' : 'Log Card Tap'}</span>
              </button>
            </div>
          </form>

          {/* Unregistered Card Binding Prompt */}
          {unregisteredNfcTag && (
            <div className="p-3.5 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-primary)] space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[var(--color-text-title)]">
                  {lang === 'th'
                    ? `ผูกบัตร NFC UID: ${unregisteredNfcTag.uid}`
                    : `Bind NFC Card UID: ${unregisteredNfcTag.uid}`}
                </span>
                <button
                  type="button"
                  onClick={() => setUnregisteredNfcTag(null)}
                  className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                  aria-label="ปิด"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isStaffUser ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] p-0.5">
                    <button
                      type="button"
                      onClick={() => setBindTargetType('student')}
                      className={`flex-1 py-1.5 rounded-md font-bold text-xs cursor-pointer ${
                        bindTargetType === 'student' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-body)]'
                      }`}
                    >
                      {lang === 'th' ? 'นักเรียน' : 'Student'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBindTargetType('teacher')}
                      className={`flex-1 py-1.5 rounded-md font-bold text-xs cursor-pointer ${
                        bindTargetType === 'teacher' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-body)]'
                      }`}
                    >
                      {lang === 'th' ? 'ครู/บุคลากร' : 'Teacher'}
                    </button>
                  </div>

                  <select
                    value={bindTargetId}
                    onChange={(e) => setBindTargetId(e.target.value)}
                    className="sm:col-span-2 min-h-[40px] px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs"
                  >
                    {bindTargetType === 'student'
                      ? students.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.firstNameTh} {st.lastNameTh} ({st.studentIdNumber})
                          </option>
                        ))
                      : teachers.map((tc) => (
                          <option key={tc.id} value={tc.id}>
                            {tc.fullNameTh} ({tc.teacherIdNumber})
                          </option>
                        ))}
                  </select>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleBindUnregisteredNfcCard}
                className="w-full min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Link2 className="w-4 h-4" />
                <span>{lang === 'th' ? 'ผูกบัตรกับบุคคลนี้และเช็คชื่อทันที' : 'Bind Card & Check In Now'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Compact 2-Button Drawer Triggers; Desktop: Clean 2-Col Secondary Cards */}
      {embeddedMobile ? (
        <div className="saas-kpi-strip grid grid-cols-2 divide-x divide-[var(--color-border)]">
          {isStaffUser && (teachers.length > 0 || students.length > 0) && (
            <button
              type="button"
              onClick={() => setNfcDrawerMode('quick_tap')}
              className="px-3 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-[var(--color-card-subtle)] cursor-pointer min-w-0"
            >
              <div className="min-w-0">
                <p className="type-card-title truncate">{lang === 'th' ? 'แตะบัตรด่วน' : 'Quick ID Tap'}</p>
                <p className="type-meta tabular-nums truncate">
                  {lang === 'th' ? `ผูกบัตร ${nfcBindings.length} ใบ` : `${nfcBindings.length} bound`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setNfcDrawerMode('recent_logs')}
            className={`px-3 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-[var(--color-card-subtle)] cursor-pointer min-w-0 ${!(isStaffUser && (teachers.length > 0 || students.length > 0)) ? 'col-span-2' : ''}`}
          >
            <div className="min-w-0">
              <p className="type-card-title truncate">{lang === 'th' ? 'ประวัติแตะบัตร' : 'Tap History'}</p>
              <p className="type-meta tabular-nums truncate">
                {nfcRecentLogs.length} {lang === 'th' ? 'รายการ' : 'taps'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Staff Quick Card Tap Strip */}
          {isStaffUser && (teachers.length > 0 || students.length > 0) && (
            <div className="saas-card">
              <div className="saas-card-header">
                <h3 className="type-card-title">{lang === 'th' ? 'แตะบัตรด่วน' : 'Quick ID Tap'}</h3>
                <span className="type-meta">
                  {lang === 'th' ? `ผูกบัตร ${nfcBindings.length} ใบ` : `${nfcBindings.length} bound`}
                </span>
              </div>

              <div className="saas-card-body space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {teachers.slice(0, 3).map((tc) => (
                    <button
                      key={tc.id}
                      type="button"
                      onClick={() => handleProcessNfcCardInput(tc.nfcCardUid || tc.teacherIdNumber)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Nfc className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                      <span className="truncate max-w-[140px]">{tc.fullNameTh}</span>
                      <span className="font-mono type-meta">{tc.teacherIdNumber}</span>
                    </button>
                  ))}
                  {students.slice(0, 4).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleProcessNfcCardInput(st.nfcCardUid || st.studentIdNumber)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Nfc className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[140px]">
                        {st.firstNameTh} {st.lastNameTh}
                      </span>
                      <span className="font-mono type-meta">{st.studentIdNumber}</span>
                    </button>
                  ))}
                </div>

                {nfcBindings.length > 0 && (
                  <div className="pt-2.5 border-t border-[var(--color-border)] space-y-1.5">
                    <p className="type-meta font-semibold">
                      {lang === 'th' ? 'บัตร NFC ที่จับคู่บนอุปกรณ์นี้' : 'Paired NFC Cards'}
                    </p>
                    <div className="divide-y divide-[var(--color-border)]">
                      {nfcBindings.slice(0, 5).map((b) => (
                        <div key={b.normalizedUid} className="py-1.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="type-card-title">{b.label}</span>
                            <span className="ml-2 font-mono type-meta">
                              {b.uid} · {b.displayId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNfcBindings(removeNfcBinding(activeSchoolId, b.uid))}
                            className="btn-icon-tool text-rose-600 dark:text-rose-300"
                            title={lang === 'th' ? 'ยกเลิกการผูกบัตร' : 'Unbind card'}
                            aria-label={lang === 'th' ? 'ยกเลิกการผูกบัตร' : 'Unbind card'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent NFC Tap Log */}
          <div className="saas-card">
            <div className="saas-card-header">
              <h3 className="type-card-title">
                {lang === 'th' ? 'บันทึกการแตะบัตรล่าสุด' : 'Recent NFC Check-ins'}
              </h3>
              <span className="type-meta font-mono">
                {nfcRecentLogs.length} {lang === 'th' ? 'รายการ' : 'taps'}
              </span>
            </div>

            <div className="saas-card-body">
              {nfcRecentLogs.length === 0 ? (
                <p className="type-meta text-center py-4">
                  {lang === 'th' ? 'ยังไม่มีรายการแตะบัตร NFC ในเซสชันนี้' : 'No NFC taps recorded in this session yet.'}
                </p>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {nfcRecentLogs.map((log) => (
                    <div key={log.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="type-card-title truncate">{log.name}</p>
                        <p className="type-meta truncate">
                          {log.roleLabel} · UID {log.uid} · {log.gateName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`type-label ${
                            log.checkType === 'check_in'
                              ? log.status === 'late'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-emerald-700 dark:text-emerald-300'
                              : 'text-[var(--color-primary-text)]'
                          }`}
                        >
                          {log.checkType === 'check_in'
                            ? log.status === 'late'
                              ? 'เข้า · สาย'
                              : 'เข้าโรงเรียน'
                            : 'ออกโรงเรียน'}
                        </span>
                        <p className="type-meta font-mono">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
