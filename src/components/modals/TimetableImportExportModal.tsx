import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { SchoolPeriodTime, TimetableSlot } from '../../types';
import { getTimetableDuplicateReasons } from '../../lib/duplicateRecords';
import {
  downloadTimetableTemplateCsv,
  downloadTimetableTemplateXlsx,
  exportTimetableCsv,
  exportTimetableXlsx,
  parseTimetableImportFile,
} from '../../lib/timetableImportExport';

interface TimetableImportExportModalProps {
  schoolId: string;
  academicYear: string;
  semester: string;
  filteredSlots: TimetableSlot[];
  allSlots: TimetableSlot[];
  existingSlotsForTerm: TimetableSlot[];
  schoolPeriods: SchoolPeriodTime[];
  filterLabel: string;
  onImportSlots: (slots: TimetableSlot[]) => Promise<void> | void;
  onClose: () => void;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัสบดี',
  fri: 'ศุกร์',
};

export const TimetableImportExportModal: React.FC<TimetableImportExportModalProps> = ({
  schoolId,
  academicYear,
  semester,
  filteredSlots,
  allSlots,
  existingSlotsForTerm,
  schoolPeriods,
  filterLabel,
  onImportSlots,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [parsedSlots, setParsedSlots] = useState<TimetableSlot[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [skippedRows, setSkippedRows] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const slotsToExport = exportScope === 'filtered' ? filteredSlots : allSlots;

  const previewRows = useMemo(() => {
    return parsedSlots.map((slot, idx) => {
      const priorInFile = parsedSlots.slice(0, idx);
      const conflicts = getTimetableDuplicateReasons(slot, [...existingSlotsForTerm, ...priorInFile]);
      return { slot, conflicts };
    });
  }, [parsedSlots, existingSlotsForTerm]);

  const nonConflictingSlots = useMemo(
    () => previewRows.filter((row) => row.conflicts.length === 0).map((row) => row.slot),
    [previewRows]
  );

  const conflictCount = previewRows.length - nonConflictingSlots.length;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setIsParsing(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const result = await parseTimetableImportFile(file, {
        schoolId,
        academicYear,
        semester,
        schoolPeriods,
      });
      setParsedSlots(result.slots);
      setParseErrors(result.errors);
      setSkippedRows(result.skippedRows);
      if (result.slots.length === 0 && result.errors.length === 0) {
        setErrorMessage('ไม่พบคาบเรียนที่พร้อมนำเข้าในไฟล์ที่เลือก');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์นำเข้าได้');
      setParsedSlots([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async (mode: 'clean' | 'all') => {
    const chosen = mode === 'clean' ? nonConflictingSlots : parsedSlots;
    if (chosen.length === 0) return;
    setIsImporting(true);
    setErrorMessage('');
    try {
      await onImportSlots(chosen);
      setStatusMessage(`นำเข้าตารางเรียนสำเร็จ ${chosen.length} คาบแล้ว`);
      setParsedSlots([]);
      setParseErrors([]);
      setSkippedRows(0);
      setSelectedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูลนำเข้า');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">ส่งออก / นำเข้าข้อมูลตารางเรียนและตารางสอน</h3>
              <p className="text-xs text-slate-500">
                รองรับไฟล์ Excel (.xlsx) และ CSV (.csv) พร้อมคอลัมน์ครูผู้สอนหลักและครูสอนคู่
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {statusMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Export Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">1. ส่งออกข้อมูล & ดาวน์โหลดไฟล์แม่แบบ</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  มุมมองที่กำลังแสดง: {filterLabel}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setExportScope('filtered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    exportScope === 'filtered' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ตามตัวกรอง ({filteredSlots.length} คาบ)
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    exportScope === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ทั้งหมดในโรงเรียน ({allSlots.length} คาบ)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                disabled={slotsToExport.length === 0}
                onClick={() => {
                  exportTimetableXlsx(slotsToExport, `timetable_${academicYear}_${semester}`);
                  setStatusMessage(`ส่งออกตารางเรียน Excel (.xlsx) จำนวน ${slotsToExport.length} คาบแล้ว`);
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                ส่งออก Excel (.xlsx)
              </button>
              <button
                type="button"
                disabled={slotsToExport.length === 0}
                onClick={() => {
                  exportTimetableCsv(slotsToExport, `timetable_${academicYear}_${semester}`);
                  setStatusMessage(`ส่งออกตารางเรียน CSV จำนวน ${slotsToExport.length} คาบแล้ว`);
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                ส่งออก CSV (.csv)
              </button>
              <button
                type="button"
                onClick={() => downloadTimetableTemplateXlsx(academicYear, semester)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                แม่แบบ Excel
              </button>
              <button
                type="button"
                onClick={() => downloadTimetableTemplateCsv(academicYear, semester)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                แม่แบบ CSV
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">2. นำเข้าตารางเรียนจาก Excel / CSV</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  รองรับคอลัมน์ ครูผู้สอนหลัก (`teacherName`) และ ครูสอนคู่ (`coTeacherName` หรือคั่นด้วย `+`)
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isParsing}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-60"
                >
                  {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {selectedFileName ? `เปลี่ยนไฟล์ (${selectedFileName})` : 'เลือกไฟล์ Excel / CSV'}
                </button>
              </div>
            </div>

            {parseErrors.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 space-y-1">
                <p className="font-bold">พบแถวที่ไม่สมบูรณ์ (ข้าม {skippedRows} แถว):</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {parseErrors.slice(0, 6).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {parseErrors.length > 6 && <li>และอีก {parseErrors.length - 6} รายการ...</li>}
                </ul>
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      อ่านได้ {previewRows.length} คาบ
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      ไม่ชน {nonConflictingSlots.length} คาบ
                    </span>
                    {conflictCount > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                        มีจุดชน {conflictCount} คาบ
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {nonConflictingSlots.length > 0 && (
                      <button
                        type="button"
                        disabled={isImporting}
                        onClick={() => void handleConfirmImport('clean')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        นำเข้าเฉพาะรายการที่ไม่ชน ({nonConflictingSlots.length} คาบ)
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={() => void handleConfirmImport('all')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                    >
                      นำเข้าทั้งหมด ({previewRows.length} คาบ)
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">วัน / คาบ</th>
                        <th className="px-3 py-2.5">รายวิชา</th>
                        <th className="px-3 py-2.5">ห้องเรียน</th>
                        <th className="px-3 py-2.5">ครูผู้สอนหลัก & ครูสอนคู่</th>
                        <th className="px-3 py-2.5">สถานที่</th>
                        <th className="px-3 py-2.5">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.map(({ slot, conflicts }) => (
                        <tr key={slot.id} className={conflicts.length > 0 ? 'bg-amber-50/40' : 'bg-white'}>
                          <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                            {DAY_LABELS[slot.dayOfWeek] || slot.dayOfWeek} · คาบ {slot.periodNumber}
                            <div className="text-[10px] text-slate-400">
                              {slot.startTime} - {slot.endTime}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-bold text-slate-900">{slot.courseCode}</span>{' '}
                            <span className="text-slate-600">{slot.courseTitleTh}</span>
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap">{slot.classRoom}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-800">{slot.teacherName || 'ไม่ระบุ'}</div>
                            {slot.coTeacherName && (
                              <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                <Users className="w-2.5 h-2.5" />
                                คู่: {slot.coTeacherName}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{slot.room || '-'}</td>
                          <td className="px-3 py-2">
                            {conflicts.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                พร้อมนำเข้า
                              </span>
                            ) : (
                              <div className="text-amber-700 space-y-0.5">
                                {conflicts.map((reason, idx) => (
                                  <div key={idx} className="text-[11px] font-medium">
                                    • {reason}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
