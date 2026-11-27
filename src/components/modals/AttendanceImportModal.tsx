import React, { useMemo, useRef, useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  AttendanceStatus,
  AuthUser,
  Student,
} from '../../types';
import { getLocalDateString } from '../../lib/date';
import {
  AttendanceImportParseResult,
  buildAttendanceRecordsFromImport,
  downloadAttendanceCsvTemplate,
  downloadAttendanceExcelTemplate,
  parseAttendanceImportFile,
} from '../../lib/attendanceImport';
import { BaseModal } from '../common/BaseModal';

interface AttendanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  existingAttendance: AttendanceRecord[];
  schoolId?: string;
  currentUser?: AuthUser | null;
  lang?: AppLanguage;
  initialRoomFilter?: string;
  onConfirmImport: (records: AttendanceRecord[]) => void;
}

const STATUS_BADGE_MAP: Record<AttendanceStatus, { labelTh: string; labelEn: string; cls: string }> = {
  present: {
    labelTh: 'ตรงเวลา',
    labelEn: 'Present',
    cls: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
  },
  late: {
    labelTh: 'มาสาย',
    labelEn: 'Late',
    cls: 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  },
  absent: {
    labelTh: 'ขาดเรียน',
    labelEn: 'Absent',
    cls: 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700',
  },
  sick: {
    labelTh: 'ลาป่วย',
    labelEn: 'Sick',
    cls: 'bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700',
  },
  leave: {
    labelTh: 'ลากิจ',
    labelEn: 'Leave',
    cls: 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700',
  },
};

export const AttendanceImportModal: React.FC<AttendanceImportModalProps> = ({
  isOpen,
  onClose,
  students,
  existingAttendance,
  schoolId,
  currentUser,
  lang = 'th',
  initialRoomFilter = 'all',
  onConfirmImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateRoom, setTemplateRoom] = useState<string>(initialRoomFilter);
  const [templateDate, setTemplateDate] = useState<string>(getLocalDateString());
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<AttendanceImportParseResult | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'ready' | 'errors'>('all');

  const availableRooms = useMemo(() => {
    const rooms = new Set<string>();
    students.forEach((s) => {
      if (s.room?.trim()) rooms.add(s.room.trim());
    });
    return Array.from(rooms).sort((a, b) => a.localeCompare(b, 'th'));
  }, [students]);

  const readyToImportCount = useMemo(() => {
    if (!parseResult) return 0;
    return parseResult.rows.filter(
      (r) => r.isValid && (!skipDuplicates || !r.isDuplicate)
    ).length;
  }, [parseResult, skipDuplicates]);

  const filteredPreviewRows = useMemo(() => {
    if (!parseResult) return [];
    if (previewFilter === 'ready') {
      return parseResult.rows.filter((r) => r.isValid && (!skipDuplicates || !r.isDuplicate));
    }
    if (previewFilter === 'errors') {
      return parseResult.rows.filter((r) => !r.isValid || r.isDuplicate);
    }
    return parseResult.rows;
  }, [parseResult, previewFilter, skipDuplicates]);

  const handleFileSelected = async (file?: File) => {
    if (!file) return;
    setIsParsing(true);
    setStatusNotice(null);
    setUploadedFileName(file.name);
    try {
      const result = await parseAttendanceImportFile(file, students, existingAttendance, templateDate);
      setParseResult(result);
      if (result.rows.length === 0) {
        setStatusNotice({
          type: 'error',
          text: lang === 'th'
            ? 'ไม่พบข้อมูลแถวการเข้าเรียนในไฟล์ที่อัปโหลด กรุณาตรวจสอบหัวตารางหรือใช้เทมเพลต'
            : 'No attendance rows were detected in the uploaded file.',
        });
      }
    } catch (err) {
      setParseResult(null);
      setStatusNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบนามสกุล .xlsx หรือ .csv',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadXlsx = () => {
    const fileName = downloadAttendanceExcelTemplate(students, templateRoom, templateDate);
    setStatusNotice({
      type: 'success',
      text: lang === 'th'
        ? `ดาวน์โหลดเทมเพลต Excel สำเร็จ (${fileName})`
        : `Downloaded Excel template (${fileName})`,
    });
  };

  const handleDownloadCsv = () => {
    const fileName = downloadAttendanceCsvTemplate(students, templateRoom, templateDate);
    setStatusNotice({
      type: 'success',
      text: lang === 'th'
        ? `ดาวน์โหลดเทมเพลต CSV สำเร็จ (${fileName})`
        : `Downloaded CSV template (${fileName})`,
    });
  };

  const handleCommitImport = () => {
    if (!parseResult) return;
    const records = buildAttendanceRecordsFromImport(parseResult.rows, {
      skipDuplicates,
      schoolId,
      recordedBy: currentUser?.fullNameTh,
      recordedByRole: currentUser?.role,
    });
    if (records.length === 0) {
      setStatusNotice({
        type: 'error',
        text: lang === 'th'
          ? 'ไม่มีรายการที่พร้อมนำเข้า (ตรวจสอบข้อผิดพลาดหรือรายการซ้ำ)'
          : 'No valid rows available to import.',
      });
      return;
    }
    onConfirmImport(records);
    setParseResult(null);
    setUploadedFileName('');
    onClose();
  };

  const handleClearPreview = () => {
    setParseResult(null);
    setUploadedFileName('');
    setStatusNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      icon={<FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
      title={
        lang === 'th'
          ? 'นำเข้าข้อมูลการเข้าเรียนจาก Excel / CSV (Batch Class Import)'
          : 'Import Attendance Records from Excel / CSV Template'
      }
      subtitle={
        lang === 'th'
          ? 'ดาวน์โหลดเทมเพลตพร้อมรายชื่อนักเรียนในห้อง กรอกสถานะครั้งเดียวแล้วอัปโหลดเข้าระบบทันที'
          : 'Download a pre-filled class template (.xlsx / .csv), mark statuses, and upload to bulk-record attendance.'
      }
      bodyClassName="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="btn-tool-neutral px-4 py-2 text-xs"
          >
            {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={readyToImportCount === 0}
            onClick={handleCommitImport}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {lang === 'th'
                ? `ยืนยันนำเข้า ${readyToImportCount} รายการ`
                : `Confirm Import (${readyToImportCount})`}
            </span>
          </button>
        </div>
      }
    >
          {/* Step 1: Download Class Template */}
          <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>
                  {lang === 'th'
                    ? 'ขั้นตอนที่ 1: ดาวน์โหลดเทมเพลต Excel / CSV พร้อมรายชื่อนักเรียน'
                    : 'Step 1: Download Pre-filled Excel / CSV Template'}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end">
              <label className="block">
                <span className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                  {lang === 'th' ? 'เลือกห้องเรียนสำหรับเทมเพลต' : 'Class / Room'}
                </span>
                <select
                  value={templateRoom}
                  onChange={(e) => setTemplateRoom(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-medium"
                >
                  <option value="all">
                    {lang === 'th' ? `ทุกห้องเรียน (${students.length} คน)` : `All Students (${students.length})`}
                  </option>
                  {availableRooms.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                  {lang === 'th' ? 'วันที่เริ่มต้นในเทมเพลต' : 'Default Date'}
                </span>
                <input
                  type="date"
                  value={templateDate}
                  onChange={(e) => setTemplateDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                />
              </label>

              <button
                type="button"
                onClick={handleDownloadXlsx}
                className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เทมเพลต Excel (.xlsx)' : 'Excel Template (.xlsx)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                <span>{lang === 'th' ? 'เทมเพลต CSV (.csv)' : 'CSV Template (.csv)'}</span>
              </button>
            </div>

            <p className="text-[11px] text-[var(--color-text-muted)]">
              {lang === 'th'
                ? 'รองรับรหัสสถานะ: present (ตรงเวลา/มา), late (มาสาย), absent (ขาด), sick (ลาป่วย), leave (ลากิจ) • วันที่รองรับทั้ง ค.ศ. และ พ.ศ.'
                : 'Accepted statuses: present, late, absent, sick, leave (Thai labels also supported automatically).'}
            </p>
          </div>

          {/* Step 2: Upload File */}
          <div className="p-4 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-card)] space-y-3 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                void handleFileSelected(file);
              }}
            />

            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-[var(--color-text-title)] text-sm">
                  {lang === 'th'
                    ? 'ขั้นตอนที่ 2: เลือกไฟล์ Excel (.xlsx / .xls) หรือ CSV ที่กรอกข้อมูลแล้ว'
                    : 'Step 2: Select Completed Excel (.xlsx / .xls) or CSV File'}
                </p>
                {uploadedFileName && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
                    {lang === 'th' ? `ไฟล์ที่เลือก: ${uploadedFileName}` : `Selected file: ${uploadedFileName}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isParsing}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isParsing
                      ? lang === 'th'
                        ? 'กำลังอ่านไฟล์...'
                        : 'Parsing file...'
                      : lang === 'th'
                      ? 'เลือกไฟล์อัปโหลด'
                      : 'Browse File'}
                  </span>
                </button>
                {parseResult && (
                  <button
                    type="button"
                    onClick={handleClearPreview}
                    className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[var(--color-text-body)] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'ล้างรายการ' : 'Clear'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {statusNotice && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                statusNotice.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
              }`}
            >
              {statusNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusNotice.text}</span>
            </div>
          )}

          {/* Step 3: Validation Preview */}
          {parseResult && parseResult.rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-bold text-[var(--color-text-title)]">
                    ทั้งหมด {parseResult.rows.length} แถว
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-200">
                    พร้อมนำเข้า {readyToImportCount} รายการ
                  </span>
                  {parseResult.duplicateCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 font-bold text-amber-900 dark:text-amber-200">
                      ซ้ำ {parseResult.duplicateCount} รายการ
                    </span>
                  )}
                  {parseResult.errorCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 font-bold text-rose-900 dark:text-rose-200">
                      ไม่สมบูรณ์ {parseResult.errorCount} รายการ
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-[var(--color-text-body)]">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded border-[var(--color-border)]"
                    />
                    <span>{lang === 'th' ? 'ข้ามรายการเช็คชื่อซ้ำอัตโนมัติ' : 'Skip duplicate records'}</span>
                  </label>

                  <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('all')}
                      className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                        previewFilter === 'all' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      ทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('ready')}
                      className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                        previewFilter === 'ready' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      พร้อมนำเข้า
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('errors')}
                      className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                        previewFilter === 'errors' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      ซ้ำ/ผิดพลาด
                    </button>
                  </div>
                </div>
              </div>

              <div className="border border-[var(--color-border)] rounded-xl overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border-b border-[var(--color-border)] sticky top-0">
                    <tr>
                      <th className="p-2.5">แถว</th>
                      <th className="p-2.5">รหัสนักเรียน</th>
                      <th className="p-2.5">ชื่อนักเรียน</th>
                      <th className="p-2.5">วันที่ / เวลา</th>
                      <th className="p-2.5">สถานะ</th>
                      <th className="p-2.5">ผลตรวจสอบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {filteredPreviewRows.slice(0, 100).map((row) => {
                      const badge = STATUS_BADGE_MAP[row.status];
                      return (
                        <tr key={row.rowNumber} className="hover:bg-[var(--color-card-subtle)]">
                          <td className="p-2.5 font-mono text-[var(--color-text-muted)]">#{row.rowNumber}</td>
                          <td className="p-2.5 font-mono font-semibold text-[var(--color-text-title)]">
                            {row.matchedStudent?.studentIdNumber || row.rawStudentId || '-'}
                          </td>
                          <td className="p-2.5">
                            {row.matchedStudent ? (
                              <div>
                                <span className="font-bold text-[var(--color-text-title)]">
                                  {row.matchedStudent.firstNameTh} {row.matchedStudent.lastNameTh}
                                </span>
                                <span className="text-[10px] text-[var(--color-text-muted)] ml-1.5">
                                  ({row.matchedStudent.room})
                                </span>
                              </div>
                            ) : (
                              <span className="text-rose-700 dark:text-rose-300 font-semibold">
                                {row.rawStudentName || '-'}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-[var(--color-text-body)]">
                            {row.date} • {row.time.slice(0, 5)}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                              {lang === 'th' ? badge.labelTh : badge.labelEn}
                            </span>
                          </td>
                          <td className="p-2.5">
                            {!row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                {row.errors[0]}
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                {skipDuplicates ? `ข้าม (${row.warnings[0]})` : `ซ้ำ (${row.warnings[0]})`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                พร้อมนำเข้า
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredPreviewRows.length > 100 && (
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  แสดงตัวอย่าง 100 แถวแรกจากทั้งหมด {filteredPreviewRows.length} แถว (เมื่อกดนำเข้าจะบันทึกครบทุกรายการที่ถูกต้อง)
                </p>
              )}
            </div>
          )}
    </BaseModal>
  );
};

