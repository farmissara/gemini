import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { Course, Student } from '../../types';
import {
  downloadEntityTemplate,
  ENTITY_IMPORT_SCHEMAS,
  exportEntityData,
  exportFailedRowsReport,
  ManagedImportEntity,
  ParsedSpreadsheetData,
  readSpreadsheetFile,
  suggestColumnMapping,
  validateAndParseMappedRows,
  ValidateMappedRowsContext,
} from '../../lib/dataImportExportEngine';

interface SmartEntityMapperPanelProps {
  entity: ManagedImportEntity;
  subtitle: string;
  existingRecords: any[];
  context: ValidateMappedRowsContext;
  exportContext?: { students?: Student[]; courses?: Course[] };
  onImportValid: (records: any[]) => Promise<void> | void;
  onToast: (msg: string) => void;
}

export const SmartEntityMapperPanel: React.FC<SmartEntityMapperPanelProps> = ({
  entity,
  subtitle,
  existingRecords,
  context,
  exportContext,
  onImportValid,
  onToast,
}) => {
  const schema = ENTITY_IMPORT_SCHEMAS[entity];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedFile, setParsedFile] = useState<ParsedSpreadsheetData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const validation = useMemo(() => {
    if (!parsedFile) return null;
    return validateAndParseMappedRows(
      entity,
      parsedFile.headers,
      parsedFile.rows,
      columnMapping,
      context
    );
  }, [parsedFile, columnMapping, entity, context]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReading(true);
    try {
      const data = await readSpreadsheetFile(file);
      setParsedFile(data);
      setColumnMapping(suggestColumnMapping(entity, data.headers));
      onToast(`อ่านไฟล์ ${file.name} สำเร็จ (${data.rows.length} แถว) กรุณาตรวจสอบการจับคู่คอลัมน์`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ได้');
    } finally {
      setIsReading(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!validation || validation.validRecords.length === 0) return;
    setIsImporting(true);
    try {
      await onImportValid(validation.validRecords);
      onToast(`นำเข้าข้อมูล${schema.titleTh}สำเร็จ ${validation.validRecords.length} รายการ`);
      setParsedFile(null);
      setColumnMapping({});
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'นำเข้าข้อมูลไม่สำเร็จ');
    } finally {
      setIsImporting(false);
    }
  };

  const firstSampleRow = parsedFile?.rows[0] || [];
  const previewFields = schema.fields.slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Top 3 Action Cards: Import / Templates / Export */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-light)]/25 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-title)]">
              <Upload className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>นำเข้า {schema.titleTh}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{subtitle}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={isReading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60 transition"
          >
            {isReading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{parsedFile ? 'อัปโหลดไฟล์ใหม่ (Excel / CSV)' : 'เลือกไฟล์ Excel หรือ CSV'}</span>
          </button>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-title)]">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>ดาวน์โหลดแม่แบบนำเข้า</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              หัวคอลัมน์มาตรฐานพร้อมตัวอย่างข้อมูล ({schema.fields.length} ฟิลด์)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => downloadEntityTemplate(entity, 'xlsx')}
              className="py-2 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={() => downloadEntityTemplate(entity, 'csv')}
              className="py-2 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-title)]">
              <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>ส่งออกข้อมูล ({existingRecords.length})</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              ส่งออกรายการปัจจุบันเป็น Excel (.xlsx) หรือ CSV (UTF-8 BOM)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={existingRecords.length === 0}
              onClick={() => {
                exportEntityData(entity, 'xlsx', existingRecords, exportContext);
                onToast(`ส่งออกข้อมูล${schema.titleTh} (.xlsx) สำเร็จ`);
              }}
              className="py-2 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              disabled={existingRecords.length === 0}
              onClick={() => {
                exportEntityData(entity, 'csv', existingRecords, exportContext);
                onToast(`ส่งออกข้อมูล${schema.titleTh} (.csv) สำเร็จ`);
              }}
              className="py-2 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Custom Header Mapping UI */}
      {parsedFile && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text-title)]">
                ขั้นตอนที่ 1: จับคู่หัวคอลัมน์จากไฟล์ ({parsedFile.fileName})
              </h4>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                สามารถปรับเปลี่ยนคอลัมน์ต้นทางให้ตรงกับฟิลด์ระบบได้อิสระ (* คือข้อมูลจำเป็น)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setColumnMapping(suggestColumnMapping(entity, parsedFile.headers))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-bold hover:bg-[var(--color-primary-light)] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>จับคู่อัตโนมัติใหม่</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setParsedFile(null);
                  setColumnMapping({});
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยกเลิกไฟล์นี้</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {schema.fields.map((field) => {
              const selectedIdx = columnMapping[field.key] ?? -1;
              const sampleVal =
                selectedIdx >= 0 && selectedIdx < firstSampleRow.length
                  ? String(firstSampleRow[selectedIdx] ?? '').trim()
                  : '';
              const isMissingRequired = field.required && selectedIdx < 0;

              return (
                <div
                  key={field.key}
                  className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                    isMissingRequired
                      ? 'border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/20'
                      : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-[var(--color-text-title)]">
                      {field.labelTh}
                      {field.required && <span className="text-rose-600 ml-0.5">*</span>}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{field.key}</span>
                  </div>
                  <select
                    value={selectedIdx}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [field.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-medium text-[var(--color-text-title)]"
                  >
                    <option value={-1}>-- ไม่นำเข้า / ข้าม --</option>
                    {parsedFile.headers.map((header, idx) => (
                      <option key={`${header}-${idx}`} value={idx}>
                        คอลัมน์ {idx + 1}: {header}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                    ตัวอย่างแถวแรก: <span className="font-semibold">{sampleVal || '(ว่าง)'}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Validation Summary + Failed Rows Error Report + Valid Preview */}
      {validation && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-full bg-slate-200/80 text-slate-800">
                ทั้งหมด {validation.totalRows} แถว
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ผ่านเกณฑ์ {validation.validRecords.length} แถว
              </span>
              {validation.failedRows.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  พบข้อผิดพลาด {validation.failedRows.length} แถว
                </span>
              )}
              {validation.warningMessages.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                  ซ้ำข้อมูลเดิม {validation.warningMessages.length} รายการ
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {validation.failedRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportFailedRowsReport(entity, validation.failedRows)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดรายงานแถวที่ผิดพลาด (.xlsx)</span>
                </button>
              )}
              <button
                type="button"
                disabled={validation.validRecords.length === 0 || isImporting}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer transition"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>ยืนยันนำเข้า {validation.validRecords.length} รายการที่ผ่านเกณฑ์</span>
              </button>
            </div>
          </div>

          {/* Failed Rows Table */}
          {validation.failedRows.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-rose-200 dark:border-rose-800 flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  รายการแถวที่ไม่ผ่านการตรวจสอบ ({validation.failedRows.length} แถว — จะไม่ถูกนำเข้า)
                </span>
              </div>
              <div className="max-h-52 overflow-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-100/70 dark:bg-rose-950/50 font-bold text-[10px] text-rose-900 dark:text-rose-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-20">แถวที่</th>
                      <th className="px-3 py-2 w-48">ข้อมูลอ้างอิง</th>
                      <th className="px-3 py-2">สาเหตุข้อผิดพลาด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200/70 dark:divide-rose-900">
                    {validation.failedRows.slice(0, 50).map((fail) => (
                      <tr key={`${fail.rowNumber}-${fail.identifier}`}>
                        <td className="px-3 py-2 font-mono font-bold text-rose-800">แถว {fail.rowNumber}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{fail.identifier}</td>
                        <td className="px-3 py-2 text-rose-700 font-medium">{fail.errors.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid Records Preview Table */}
          {validation.validRecords.length > 0 && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-bold text-[var(--color-text-title)]">
                ตัวอย่างข้อมูลที่ผ่านเกณฑ์พร้อมนำเข้า (แสดง {Math.min(15, validation.validRecords.length)} จาก {validation.validRecords.length} รายการ)
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-card-subtle)] font-bold text-[10px] text-[var(--color-text-muted)] uppercase sticky top-0">
                    <tr>
                      {previewFields.map((f) => (
                        <th key={f.key} className="px-3 py-2 whitespace-nowrap">{f.labelTh}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {validation.validRecords.slice(0, 15).map((rec, idx) => (
                      <tr key={rec.id || idx} className="hover:bg-[var(--color-card-subtle)]">
                        {previewFields.map((f) => (
                          <td key={f.key} className="px-3 py-2 whitespace-nowrap">
                            {Array.isArray(rec[f.key])
                              ? rec[f.key].join(', ')
                              : String(rec[f.key] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
