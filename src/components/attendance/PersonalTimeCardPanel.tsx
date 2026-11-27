import React, { useState } from 'react';
import {
  Camera,
  Clock,
  Eye,
  FileEdit,
  FileText,
  MoreVertical,
  X,
} from 'lucide-react';
import type { AppLanguage, AttendanceCheckType, AttendanceRecord } from '../../types';
import AttendancePhoto from '../AttendancePhoto';
import {
  formatShortAttendanceTime,
  getStatusLabel,
  resolveRecordPhotoSource,
  type PersonalDailyAttendanceRow,
} from '../../lib/personalAttendanceHistory';

interface PersonalTimeCardPanelProps {
  lang: AppLanguage;
  personName?: string;
  todayCheckInRecord?: AttendanceRecord;
  todayCheckOutRecord?: AttendanceRecord;
  rows: PersonalDailyAttendanceRow[];
  activeCheckType?: AttendanceCheckType;
  onSelectCheckType?: (type: AttendanceCheckType) => void;
  onOpenCorrectionFromHistory?: (row: PersonalDailyAttendanceRow) => void;
  onOpenLeaveFromHistory?: (row: PersonalDailyAttendanceRow) => void;
  showPairedTimeCards?: boolean;
  showHistoryTable?: boolean;
  historyMaxHeightClass?: string;
}

export const PersonalTimeCardPanel: React.FC<PersonalTimeCardPanelProps> = ({
  lang,
  personName,
  todayCheckInRecord,
  todayCheckOutRecord,
  rows,
  activeCheckType,
  onSelectCheckType,
  onOpenCorrectionFromHistory,
  onOpenLeaveFromHistory,
  showPairedTimeCards = true,
  showHistoryTable = true,
  historyMaxHeightClass = 'max-h-[340px]',
}) => {
  const [historyFilter, setHistoryFilter] = useState<'all' | 'present' | 'late' | 'absent_leave'>('all');
  const [actionRowMenu, setActionRowMenu] = useState<PersonalDailyAttendanceRow | null>(null);
  const [photoPreviewTarget, setPhotoPreviewTarget] = useState<{
    title: string;
    dateLabel: string;
    checkInRecord?: AttendanceRecord;
    checkOutRecord?: AttendanceRecord;
  } | null>(null);

  const todayCheckInPhotoSrc = resolveRecordPhotoSource(todayCheckInRecord);
  const todayCheckOutPhotoSrc = resolveRecordPhotoSource(todayCheckOutRecord);
  const todayCheckInDisplayTime = formatShortAttendanceTime(todayCheckInRecord?.time);
  const todayCheckOutDisplayTime = formatShortAttendanceTime(
    todayCheckOutRecord?.time || todayCheckInRecord?.checkOutTime
  );

  const filteredRows = rows.filter((row) => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'present') return row.statusKey === 'present';
    if (historyFilter === 'late') return row.statusKey === 'late';
    return row.statusKey === 'absent' || row.statusKey === 'leave';
  });

  const todayDateLabel = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleSlotClick = (slotType: AttendanceCheckType, photoSrc?: string) => {
    if (onSelectCheckType) {
      onSelectCheckType(slotType);
      return;
    }
    if (photoSrc || todayCheckInRecord || todayCheckOutRecord) {
      setPhotoPreviewTarget({
        title:
          personName ||
          (lang === 'th' ? 'ภาพถ่ายและเวลาลงเวลาวันนี้' : "Today's Attendance Photos"),
        dateLabel: todayDateLabel,
        checkInRecord: todayCheckInRecord,
        checkOutRecord: todayCheckOutRecord,
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Paired Check-In / Check-Out Photo & Time Slots */}
      {showPairedTimeCards && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] grid grid-cols-2 divide-x divide-[var(--color-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => handleSlotClick('check_in', todayCheckInPhotoSrc)}
            className={`p-3 flex flex-col items-center gap-2 text-center cursor-pointer transition border-b-2 ${
              activeCheckType === 'check_in'
                ? 'bg-emerald-50/75 dark:bg-emerald-950/25 border-b-emerald-600'
                : 'border-b-transparent hover:bg-[var(--color-card-subtle)]'
            }`}
          >
            <div
              onClick={(e) => {
                if (todayCheckInPhotoSrc) {
                  e.stopPropagation();
                  setPhotoPreviewTarget({
                    title: lang === 'th' ? 'ภาพลงเวลาวันนี้' : "Today's Check-in Photo",
                    dateLabel: todayDateLabel,
                    checkInRecord: todayCheckInRecord,
                    checkOutRecord: todayCheckOutRecord,
                  });
                }
              }}
              className="relative w-full max-w-[96px] aspect-[3/4] rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-center"
            >
              {todayCheckInPhotoSrc ? (
                <>
                  <AttendancePhoto
                    src={todayCheckInPhotoSrc}
                    alt={lang === 'th' ? 'ภาพลงเวลาเข้าโรงเรียน' : 'Check-in photo'}
                    className="w-full h-full object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-slate-950/65 text-white flex items-center justify-center"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </>
              ) : (
                <Camera className="w-6 h-6 text-[var(--color-text-muted)]/45" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[var(--color-text-title)] tabular-nums">
                {todayCheckInDisplayTime ? `${todayCheckInDisplayTime} น.` : '-'}
              </p>
              <p
                className={`text-xs font-semibold ${
                  activeCheckType === 'check_in' || todayCheckInRecord
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {lang === 'th' ? 'เข้าโรงเรียน' : 'Check In'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {todayCheckInRecord
                  ? todayCheckInRecord.status === 'late'
                    ? lang === 'th'
                      ? 'มาสาย'
                      : 'Late'
                    : lang === 'th'
                      ? 'ตรงเวลา'
                      : 'On time'
                  : onSelectCheckType
                    ? lang === 'th'
                      ? activeCheckType === 'check_in'
                        ? 'กำลังเลือก'
                        : 'แตะเพื่อเลือก'
                      : activeCheckType === 'check_in'
                        ? 'Selected'
                        : 'Tap to select'
                    : null}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSlotClick('check_out', todayCheckOutPhotoSrc)}
            className={`p-3 flex flex-col items-center gap-2 text-center cursor-pointer transition border-b-2 ${
              activeCheckType === 'check_out'
                ? 'bg-indigo-50/75 dark:bg-indigo-950/25 border-b-indigo-600'
                : 'border-b-transparent hover:bg-[var(--color-card-subtle)]'
            }`}
          >
            <div
              onClick={(e) => {
                if (todayCheckOutPhotoSrc) {
                  e.stopPropagation();
                  setPhotoPreviewTarget({
                    title: lang === 'th' ? 'ภาพลงเวลาวันนี้' : "Today's Check-out Photo",
                    dateLabel: todayDateLabel,
                    checkInRecord: todayCheckInRecord,
                    checkOutRecord: todayCheckOutRecord,
                  });
                }
              }}
              className="relative w-full max-w-[96px] aspect-[3/4] rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-center"
            >
              {todayCheckOutPhotoSrc ? (
                <>
                  <AttendancePhoto
                    src={todayCheckOutPhotoSrc}
                    alt={lang === 'th' ? 'ภาพลงเวลาออกโรงเรียน' : 'Check-out photo'}
                    className="w-full h-full object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-slate-950/65 text-white flex items-center justify-center"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </>
              ) : (
                <Camera className="w-6 h-6 text-[var(--color-text-muted)]/45" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[var(--color-text-title)] tabular-nums">
                {todayCheckOutDisplayTime ? `${todayCheckOutDisplayTime} น.` : '-'}
              </p>
              <p
                className={`text-xs font-semibold ${
                  activeCheckType === 'check_out' || todayCheckOutDisplayTime
                    ? 'text-indigo-700 dark:text-indigo-400'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {lang === 'th' ? 'ออกโรงเรียน' : 'Check Out'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {todayCheckOutDisplayTime
                  ? lang === 'th'
                    ? 'บันทึกแล้ว'
                    : 'Recorded'
                  : onSelectCheckType
                    ? lang === 'th'
                      ? activeCheckType === 'check_out'
                        ? 'กำลังเลือก'
                        : 'แตะเพื่อเลือก'
                      : activeCheckType === 'check_out'
                        ? 'Selected'
                        : 'Tap to select'
                    : null}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* 2. Scrollable Personal Attendance History Table + 3-Dots Row Actions */}
      {showHistoryTable && (
      <section
        aria-label={lang === 'th' ? 'ประวัติการลงเวลา' : 'Attendance History'}
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
      >
        <div className="px-3.5 py-2.5 bg-[var(--color-card)] border-b border-[var(--color-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
            <h3 className="text-sm font-bold text-[var(--color-text-title)] truncate">
              {lang === 'th' ? 'ประวัติการลงเวลา' : 'Attendance History'}
              {personName ? ` · ${personName}` : ''}
            </h3>
          </div>
          <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums shrink-0">
            {filteredRows.length} {lang === 'th' ? 'วัน' : 'days'}
          </span>
        </div>

        <div className="px-2.5 py-2 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] grid grid-cols-4 gap-1">
          {(
            [
              { id: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All' },
              { id: 'present', label: lang === 'th' ? 'ปกติ' : 'On time' },
              { id: 'late', label: lang === 'th' ? 'สาย' : 'Late' },
              { id: 'absent_leave', label: lang === 'th' ? 'ลา/ขาด' : 'Leave/Abs' },
            ] as const
          ).map((tab) => {
            const active = historyFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryFilter(tab.id)}
                className={`min-h-[34px] rounded-lg text-[11px] font-semibold cursor-pointer transition ${
                  active
                    ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] border border-[var(--color-border)] shadow-2xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className={`${historyMaxHeightClass} overflow-y-auto`}>
          <div className="sticky top-0 z-10 grid grid-cols-[minmax(76px,1.2fr)_42px_42px_38px_minmax(56px,0.85fr)_38px] sm:grid-cols-[minmax(96px,1.25fr)_52px_52px_48px_minmax(72px,0.9fr)_42px] items-center gap-1 px-2.5 sm:px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-card)] text-[11px] font-bold text-[var(--color-text-muted)]">
            <span>{lang === 'th' ? 'วันที่' : 'Date'}</span>
            <span className="text-center">{lang === 'th' ? 'เข้า' : 'In'}</span>
            <span className="text-center">{lang === 'th' ? 'ออก' : 'Out'}</span>
            <span className="text-center">{lang === 'th' ? 'ชม.' : 'Hrs'}</span>
            <span className="text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</span>
            <span className="sr-only">{lang === 'th' ? 'ตัวเลือก' : 'Actions'}</span>
          </div>

          {filteredRows.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">
              {lang === 'th'
                ? 'ไม่พบรายการลงเวลาในตัวกรองที่เลือก'
                : 'No attendance records in this filter'}
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {filteredRows.map((row) => {
                const hasPhoto = Boolean(
                  resolveRecordPhotoSource(row.checkInRecord) ||
                    resolveRecordPhotoSource(row.checkOutRecord)
                );
                const dotClass =
                  row.statusKey === 'present'
                    ? 'bg-emerald-500'
                    : row.statusKey === 'late'
                      ? 'bg-amber-500'
                      : row.statusKey === 'leave'
                        ? 'bg-sky-500'
                        : row.statusKey === 'pending_today'
                          ? 'bg-slate-400'
                          : 'bg-rose-500';
                const statusTextClass =
                  row.statusKey === 'present'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : row.statusKey === 'late'
                      ? 'text-amber-700 dark:text-amber-400'
                      : row.statusKey === 'leave'
                        ? 'text-sky-700 dark:text-sky-400'
                        : row.statusKey === 'pending_today'
                          ? 'text-[var(--color-text-muted)]'
                          : 'text-rose-700 dark:text-rose-400';
                return (
                  <div
                    key={row.date}
                    className="grid grid-cols-[minmax(76px,1.2fr)_42px_42px_38px_minmax(56px,0.85fr)_38px] sm:grid-cols-[minmax(96px,1.25fr)_52px_52px_48px_minmax(72px,0.9fr)_42px] items-center gap-1 pl-2.5 sm:pl-3 pr-1 py-1.5 text-xs hover:bg-[var(--color-card-subtle)] transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="font-semibold text-[var(--color-text-title)] tabular-nums truncate">
                          {lang === 'th' ? row.dateLabelTh : row.dateLabelEn}
                        </p>
                        {hasPhoto && (
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoPreviewTarget({
                                title:
                                  personName ||
                                  (lang === 'th' ? 'ภาพถ่ายและเวลาลงเวลา' : 'Attendance Photos & Times'),
                                dateLabel: lang === 'th' ? row.dateLabelTh : row.dateLabelEn,
                                checkInRecord: row.checkInRecord,
                                checkOutRecord: row.checkOutRecord,
                              })
                            }
                            aria-label={lang === 'th' ? 'ดูรูปถ่ายลงเวลา' : 'View photo'}
                            className="p-0.5 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shrink-0 cursor-pointer"
                            title={lang === 'th' ? 'ดูรูปถ่ายลงเวลา' : 'View photo'}
                          >
                            <Camera className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {row.correctionRequest && (
                        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300 truncate">
                          {row.correctionRequest.stage === 'approved'
                            ? lang === 'th'
                              ? 'แก้เวลาแล้ว'
                              : 'Adjusted'
                            : row.correctionRequest.stage === 'rejected'
                              ? lang === 'th'
                                ? 'คำขอไม่ผ่าน'
                                : 'Declined'
                              : lang === 'th'
                                ? 'รอแก้เวลา'
                                : 'Pending fix'}
                        </p>
                      )}
                    </div>

                    <span className="text-center font-medium text-[var(--color-text-title)] tabular-nums">
                      {row.checkInTime || '-'}
                    </span>

                    <span className="text-center font-medium text-[var(--color-text-title)] tabular-nums">
                      {row.checkOutTime || '-'}
                    </span>

                    <span className="text-center font-medium text-[var(--color-text-muted)] tabular-nums">
                      {row.durationLabel || '-'}
                    </span>

                    <div className="flex items-center justify-center gap-1 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
                      <span className={`text-[11px] font-semibold truncate ${statusTextClass}`}>
                        {getStatusLabel(row, lang)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActionRowMenu(row)}
                      aria-label={
                        lang === 'th'
                          ? `จัดการรายการวันที่ ${row.dateLabelTh}`
                          : `Manage record for ${row.dateLabelEn}`
                      }
                      className="min-h-[44px] min-w-[40px] rounded-xl hover:bg-[var(--color-card-subtle)] active:bg-[var(--color-border)]/40 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      )}

      {/* 3-Dots Action Sheet Modal for Selected Day */}
      {actionRowMenu && (
        <div className="fixed inset-0 z-[70] bg-slate-950/55 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 w-full h-full cursor-default"
            aria-label={lang === 'th' ? 'ปิดเมนู' : 'Close menu'}
            onClick={() => setActionRowMenu(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl p-4 space-y-3 safe-area-bottom"
          >
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--color-text-title)] tabular-nums">
                  {lang === 'th' ? actionRowMenu.dateLabelTh : actionRowMenu.dateLabelEn} ·{' '}
                  {getStatusLabel(actionRowMenu, lang)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] tabular-nums mt-0.5">
                  {lang === 'th' ? 'เข้า' : 'In'}: {actionRowMenu.checkInTime || '-'} ·{' '}
                  {lang === 'th' ? 'ออก' : 'Out'}: {actionRowMenu.checkOutTime || '-'}
                  {actionRowMenu.durationLabel ? ` · ${actionRowMenu.durationLabel} ชม.` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionRowMenu(null)}
                className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-[var(--color-card-subtle)] flex items-center justify-center text-[var(--color-text-muted)] cursor-pointer"
                aria-label={lang === 'th' ? 'ปิด' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {onOpenCorrectionFromHistory && (
                <button
                  type="button"
                  onClick={() => {
                    const row = actionRowMenu;
                    setActionRowMenu(null);
                    onOpenCorrectionFromHistory(row);
                  }}
                  className="w-full min-h-[48px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] flex items-center gap-3 text-left cursor-pointer transition"
                >
                  <FileEdit className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'ขอแก้เวลา / ยืนยันเวลา' : 'Request Time Correction'}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {lang === 'th'
                        ? 'กรณีลืมสแกนเข้า-ออก มาสาย หรือเวลาคลาดเคลื่อน'
                        : 'Forgot scan, late arrival, or mismatch'}
                    </p>
                  </div>
                </button>
              )}

              {onOpenLeaveFromHistory && (
                <button
                  type="button"
                  onClick={() => {
                    const row = actionRowMenu;
                    setActionRowMenu(null);
                    onOpenLeaveFromHistory(row);
                  }}
                  className="w-full min-h-[48px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] flex items-center gap-3 text-left cursor-pointer transition"
                >
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'ยื่นใบลา (ป่วย / กิจ / ราชการ)' : 'Submit Leave Request'}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {lang === 'th'
                        ? `ระบุวันที่ ${actionRowMenu.dateLabelTh} อัตโนมัติ`
                        : `Pre-filled for ${actionRowMenu.dateLabelEn}`}
                    </p>
                  </div>
                </button>
              )}

              {(resolveRecordPhotoSource(actionRowMenu.checkInRecord) ||
                resolveRecordPhotoSource(actionRowMenu.checkOutRecord)) && (
                <button
                  type="button"
                  onClick={() => {
                    const row = actionRowMenu;
                    setActionRowMenu(null);
                    setPhotoPreviewTarget({
                      title:
                        personName ||
                        (lang === 'th' ? 'ภาพถ่ายและเวลาลงเวลา' : 'Attendance Photos & Times'),
                      dateLabel: lang === 'th' ? row.dateLabelTh : row.dateLabelEn,
                      checkInRecord: row.checkInRecord,
                      checkOutRecord: row.checkOutRecord,
                    });
                  }}
                  className="w-full min-h-[48px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] flex items-center gap-3 text-left cursor-pointer transition"
                >
                  <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? 'ดูรูปถ่ายลงเวลา' : 'View Check-in / Out Photos'}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'ตรวจสอบภาพเซลฟี่และเวลาที่บันทึกจริง' : 'Inspect recorded photos & timestamps'}
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo & Timestamp Preview Modal */}
      {photoPreviewTarget && (
        <div className="fixed inset-0 z-[75] bg-slate-950/70 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 w-full h-full cursor-default"
            aria-label={lang === 'th' ? 'ปิดภาพตัวอย่าง' : 'Close preview'}
            onClick={() => setPhotoPreviewTarget(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                  {photoPreviewTarget.title}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] tabular-nums truncate">
                  {photoPreviewTarget.dateLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPreviewTarget(null)}
                className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-[var(--color-card-subtle)] flex items-center justify-center text-[var(--color-text-muted)] cursor-pointer"
                aria-label={lang === 'th' ? 'ปิด' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: lang === 'th' ? 'เข้าโรงเรียน' : 'Check In',
                  rec: photoPreviewTarget.checkInRecord,
                  fallbackTime: undefined,
                },
                {
                  label: lang === 'th' ? 'ออกโรงเรียน' : 'Check Out',
                  rec: photoPreviewTarget.checkOutRecord,
                  fallbackTime: photoPreviewTarget.checkInRecord?.checkOutTime,
                },
              ].map((slot) => {
                const photoSrc = resolveRecordPhotoSource(slot.rec);
                const displayTime = formatShortAttendanceTime(slot.rec?.time || slot.fallbackTime);
                return (
                  <div
                    key={slot.label}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2.5 flex flex-col items-center gap-2 text-center"
                  >
                    <div className="w-full aspect-[3/4] rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-center">
                      {photoSrc ? (
                        <AttendancePhoto
                          src={photoSrc}
                          alt={slot.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-[var(--color-text-muted)]/45" />
                      )}
                    </div>
                    <div className="space-y-0.5 w-full">
                      <p className="text-xs font-bold text-[var(--color-text-title)]">{slot.label}</p>
                      <p className="text-sm font-bold text-[var(--color-primary-text)] tabular-nums">
                        {displayTime ? `${displayTime} น.` : '-'}
                      </p>
                      {slot.rec?.location?.geofenceZoneName && (
                        <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                          {slot.rec.location.geofenceZoneName}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
