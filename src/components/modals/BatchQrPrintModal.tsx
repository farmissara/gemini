import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  FileDown,
  Filter,
  Printer,
  QrCode,
  Search,
  Square,
  X,
} from 'lucide-react';
import { AppLanguage, School, Student } from '../../types';
import { QrCodeMatrix } from '../QrCodeMatrix';
import { downloadBatchStudentQrCodesPdf } from '../../lib/moeReportPdf';

interface BatchQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialSelectedIds: string[];
  school?: School;
  lang?: AppLanguage;
}

export const BatchQrPrintModal: React.FC<BatchQrPrintModalProps> = ({
  isOpen,
  onClose,
  students,
  initialSelectedIds,
  school,
  lang = 'th',
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSelectedIds.length > 0) return new Set(initialSelectedIds);
    return new Set(students.map((s) => s.id));
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [layoutDensity, setLayoutDensity] = useState<'standard_3x4' | 'compact_4x5'>('standard_3x4');
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const schoolCode = school?.code || 'EDU';
  const schoolNameTh = school?.nameTh || 'สถานศึกษา EduVerse';

  const gradeLevels = useMemo(
    () => Array.from(new Set(students.map((s) => s.gradeLevel).filter(Boolean))),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (gradeFilter !== 'all' && s.gradeLevel !== gradeFilter) return false;
      if (!q) return true;
      return (
        `${s.firstNameTh || ''} ${s.lastNameTh || ''}`.toLowerCase().includes(q) ||
        `${s.firstNameEn || ''} ${s.lastNameEn || ''}`.toLowerCase().includes(q) ||
        (s.studentIdNumber || '').toLowerCase().includes(q) ||
        (s.room || '').toLowerCase().includes(q)
      );
    });
  }, [students, gradeFilter, searchQuery]);

  const printableStudents = useMemo(
    () => students.filter((s) => selectedIds.has(s.id)),
    [students, selectedIds]
  );

  if (!isOpen) return null;

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDownloadPdf = () => {
    if (printableStudents.length === 0) return;
    const { fileName } = downloadBatchStudentQrCodesPdf({
      students: printableStudents,
      school,
      layout: layoutDensity,
      lang,
    });
    setPdfNotice(
      lang === 'th'
        ? `ดาวน์โหลดไฟล์ PDF รวม ${printableStudents.length} คนสำเร็จ (${fileName})`
        : `Downloaded combined PDF for ${printableStudents.length} students (${fileName})`
    );
    setTimeout(() => setPdfNotice(null), 4500);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-[var(--color-text-body)]">
        {/* Top Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-sm shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-[var(--color-text-title)] truncate">
                {lang === 'th'
                  ? 'พิมพ์รหัส QR นักเรียนชุดรวม (Batch Print QR Codes)'
                  : 'Batch Print Student QR Codes (Single PDF)'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? `เลือกนักเรียนแล้วสร้างเป็นไฟล์ PDF แผ่นพับ/บัตรสแกน QR ชุดเดียว (เลือกแล้ว ${printableStudents.length} คน)`
                  : `Combine selected student QR codes into a single printable A4 PDF (${printableStudents.length} selected)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={printableStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-40"
            >
              <FileDown className="w-4 h-4" />
              <span>
                {lang === 'th'
                  ? `ดาวน์โหลด PDF รวม (${printableStudents.length})`
                  : `Download Single PDF (${printableStudents.length})`}
              </span>
            </button>
            <button
              type="button"
              onClick={handleBrowserPrint}
              disabled={printableStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'th' ? 'สั่งพิมพ์ (Print A4)' : 'Print A4'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Layout Toolbar */}
        <div className="p-3 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-card)] flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ รหัส หรือห้อง..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
              />
            </div>

            <label className="flex items-center gap-1.5 font-semibold text-[var(--color-text-title)]">
              <Filter className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-medium cursor-pointer"
              >
                <option value="all">ทุกระดับชั้น ({students.length})</option>
                {gradeLevels.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold cursor-pointer"
            >
              เลือกทั้งหมด ({filteredStudents.length})
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer"
            >
              ล้างที่เลือก
            </button>
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
            <button
              type="button"
              onClick={() => setLayoutDensity('standard_3x4')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                layoutDensity === 'standard_3x4'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              บัตรใหญ่ 12 ดวง/หน้า (3×4)
            </button>
            <button
              type="button"
              onClick={() => setLayoutDensity('compact_4x5')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                layoutDensity === 'compact_4x5'
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              สติกเกอร์ 20 ดวง/หน้า (4×5)
            </button>
          </div>
        </div>

        {pdfNotice && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 text-xs font-semibold shrink-0 no-print">
            {pdfNotice}
          </div>
        )}

        {/* Interactive Split Area: Quick Checklist + Live A4 QR Sheet Preview */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Checklist */}
          <div className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--color-border)] bg-[var(--color-card)] overflow-y-auto max-h-48 lg:max-h-none p-3 space-y-1.5 no-print">
            <div className="text-[11px] font-bold text-[var(--color-text-muted)] px-1 pb-1">
              เลือกรายชื่อนักเรียน ({selectedIds.size}/{students.length})
            </div>
            {filteredStudents.map((stu) => {
              const checked = selectedIds.has(stu.id);
              return (
                <button
                  key={stu.id}
                  type="button"
                  onClick={() => toggleStudent(stu.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                    checked
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold'
                      : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 shrink-0 opacity-60" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      {stu.firstNameTh} {stu.lastNameTh}
                    </p>
                    <p className="text-[10px] font-mono opacity-80 truncate">
                      {stu.studentIdNumber} · {stu.room}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Printable Sheet Preview */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80 batch-qr-print-area">
            {printableStudents.length === 0 ? (
              <div className="text-center py-16 space-y-2 text-[var(--color-text-muted)]">
                <QrCode className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-sm font-bold text-[var(--color-text-title)]">
                  ยังไม่ได้เลือกนักเรียนสำหรับพิมพ์ QR Code
                </p>
                <p className="text-xs">
                  กรุณาเลือกนักเรียนจากรายการด้านซ้ายหรือกด "เลือกทั้งหมด"
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-3 mx-auto ${
                  layoutDensity === 'compact_4x5'
                    ? 'grid-cols-2 sm:grid-cols-4 max-w-4xl'
                    : 'grid-cols-2 sm:grid-cols-3 max-w-4xl'
                }`}
              >
                {printableStudents.map((stu) => (
                  <div
                    key={stu.id}
                    className="rounded-xl border border-dashed border-slate-400 dark:border-slate-600 bg-white text-slate-900 p-3 flex flex-col items-center text-center gap-1.5 shadow-2xs print:border-slate-700 print:shadow-none print:break-inside-avoid"
                  >
                    <div className="w-full flex items-center justify-between border-b border-slate-200 pb-1 text-[9px] font-bold text-slate-600">
                      <span className="truncate">{schoolNameTh}</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono shrink-0">
                        QR PASS
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                      <QrCodeMatrix
                        value={`EDUVERSE:STU:${stu.studentIdNumber}:${schoolCode}`}
                        size={layoutDensity === 'compact_4x5' ? 88 : 112}
                        label={`Student ID QR: ${stu.studentIdNumber}`}
                      />
                    </div>

                    <div className="w-full min-w-0 space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {stu.firstNameTh} {stu.lastNameTh}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {stu.firstNameEn} {stu.lastNameEn}
                      </p>
                      <div className="pt-0.5 flex items-center justify-center gap-1.5 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-900">
                          {stu.studentIdNumber}
                        </span>
                        <span className="font-bold text-blue-700">{stu.room}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
