import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Columns3,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import { AppLanguage, Course, Student } from '../../types';
import {
  applySavedColumnMappingPreset,
  downloadEntityTemplate,
  ENTITY_IMPORT_SCHEMAS,
  exportEntityData,
  exportFailedRowsReport,
  FailedImportRow,
  getMappingDiagnostics,
  hasSavedColumnMappingPreset,
  ManagedImportEntity,
  ParsedSpreadsheetData,
  readSpreadsheetFile,
  saveColumnMappingPreset,
  suggestColumnMapping,
  validateAndParseMappedRows,
  ValidateMappedRowsContext,
} from '../../lib/dataImportExportEngine';

interface SmartEntityMapperPanelProps {
  entity: ManagedImportEntity;
  subtitle: string;
  lang?: AppLanguage;
  existingRecords: any[];
  context: ValidateMappedRowsContext;
  exportContext?: { students?: Student[]; courses?: Course[] };
  onImportValid: (records: any[]) => Promise<void> | void;
  onToast: (msg: string) => void;
}

const FAILED_PAGE_SIZE = 10;

export const SmartEntityMapperPanel: React.FC<SmartEntityMapperPanelProps> = ({
  entity,
  subtitle,
  lang = 'th',
  existingRecords,
  context,
  exportContext,
  onImportValid,
  onToast,
}) => {
  const isTh = lang === 'th';
  const schema = ENTITY_IMPORT_SCHEMAS[entity];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedFile, setParsedFile] = useState<ParsedSpreadsheetData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Mapping UI helpers
  const [fieldSearch, setFieldSearch] = useState('');
  const [showRawPreview, setShowRawPreview] = useState(false);
  const [hasPreset, setHasPreset] = useState(() => hasSavedColumnMappingPreset(entity));

  // Error reporting UI state
  const [errorSearch, setErrorSearch] = useState('');
  const [errorFieldFilter, setErrorFieldFilter] = useState<string>('all');
  const [failedPage, setFailedPage] = useState(0);
  const [expandedFailedRow, setExpandedFailedRow] = useState<number | null>(null);
  const [showWarningsList, setShowWarningsList] = useState(false);

  const diagnostics = useMemo(() => {
    if (!parsedFile) return null;
    return getMappingDiagnostics(entity, parsedFile.headers, columnMapping);
  }, [entity, parsedFile, columnMapping]);

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

  // Sample values per column index (up to 3 non-empty samples)
  const columnSamples = useMemo(() => {
    if (!parsedFile) return new Map<number, string[]>();
    const map = new Map<number, string[]>();
    parsedFile.headers.forEach((_, colIdx) => {
      const samples: string[] = [];
      for (let r = 0; r < parsedFile.rows.length && samples.length < 3; r++) {
        const val = String(parsedFile.rows[r]?.[colIdx] ?? '').trim();
        if (val && !samples.includes(val)) {
          samples.push(val);
        }
      }
      map.set(colIdx, samples);
    });
    return map;
  }, [parsedFile]);

  const visibleSchemaFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    const list = !q
      ? schema.fields
      : schema.fields.filter(
          (f) =>
            f.key.toLowerCase().includes(q) ||
            f.labelTh.toLowerCase().includes(q) ||
            f.labelEn.toLowerCase().includes(q)
        );
    // Required fields first
    return [...list].sort((a, b) => Number(Boolean(b.required)) - Number(Boolean(a.required)));
  }, [schema.fields, fieldSearch]);

  // Error breakdown by failing system field
  const errorFieldBreakdown = useMemo(() => {
    if (!validation || validation.failedRows.length === 0) return [];
    const counts = new Map<string, number>();
    validation.failedRows.forEach((row) => {
      row.errorFields.forEach((fk) => {
        counts.set(fk, (counts.get(fk) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([fieldKey, count]) => {
        const def = schema.fields.find((f) => f.key === fieldKey);
        return {
          fieldKey,
          label: isTh ? def?.labelTh || fieldKey : def?.labelEn || fieldKey,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [validation, schema.fields, isTh]);

  const filteredFailedRows = useMemo<FailedImportRow[]>(() => {
    if (!validation) return [];
    const q = errorSearch.trim().toLowerCase();
    return validation.failedRows.filter((item) => {
      if (errorFieldFilter !== 'all' && !item.errorFields.includes(errorFieldFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        String(item.rowNumber).includes(q) ||
        item.identifier.toLowerCase().includes(q) ||
        item.errors.some((e) => e.toLowerCase().includes(q)) ||
        Object.values(item.rawRow).some((v) => v.toLowerCase().includes(q))
      );
    });
  }, [validation, errorFieldFilter, errorSearch]);

  const failedPageCount = Math.max(1, Math.ceil(filteredFailedRows.length / FAILED_PAGE_SIZE));
  const safeFailedPage = Math.min(failedPage, failedPageCount - 1);
  const paginatedFailedRows = filteredFailedRows.slice(
    safeFailedPage * FAILED_PAGE_SIZE,
    (safeFailedPage + 1) * FAILED_PAGE_SIZE
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReading(true);
    try {
      const data = await readSpreadsheetFile(file);
      setParsedFile(data);
      setColumnMapping(suggestColumnMapping(entity, data.headers));
      setFailedPage(0);
      setErrorFieldFilter('all');
      setErrorSearch('');
      setExpandedFailedRow(null);
      setHasPreset(hasSavedColumnMappingPreset(entity));
      onToast(
        isTh
          ? `อ่านไฟล์ ${file.name} สำเร็จ (${data.rows.length} แถว) กรุณาตรวจสอบการจับคู่คอลัมน์`
          : `Loaded ${file.name} (${data.rows.length} rows). Please verify column mapping.`
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : isTh ? 'ไม่สามารถอ่านไฟล์ได้' : 'Failed to read file');
    } finally {
      setIsReading(false);
      e.target.value = '';
    }
  };

  const handleClearAllMappings = () => {
    const cleared: Record<string, number> = {};
    schema.fields.forEach((f) => {
      cleared[f.key] = -1;
    });
    setColumnMapping(cleared);
    setFailedPage(0);
  };

  const handleSavePreset = () => {
    if (!parsedFile) return;
    saveColumnMappingPreset(entity, parsedFile.headers, columnMapping);
    setHasPreset(true);
    onToast(
      isTh
        ? `บันทึกรูปแบบการจับคู่คอลัมน์สำหรับ "${schema.titleTh}" แล้ว`
        : `Saved column mapping preset for ${schema.titleEn}`
    );
  };

  const handleApplyPreset = () => {
    if (!parsedFile) return;
    const restored = applySavedColumnMappingPreset(entity, parsedFile.headers);
    if (!restored) {
      onToast(isTh ? 'ไม่พบรูปแบบที่บันทึกไว้' : 'No saved preset found');
      return;
    }
    setColumnMapping(restored);
    setFailedPage(0);
    onToast(isTh ? 'นำเข้ารูปแบบการจับคู่คอลัมน์ที่บันทึกไว้แล้ว' : 'Applied saved column mapping preset');
  };

  const handleConfirmImport = async () => {
    if (!validation || validation.validRecords.length === 0) return;
    setIsImporting(true);
    try {
      await onImportValid(validation.validRecords);
      onToast(
        isTh
          ? `นำเข้าข้อมูล${schema.titleTh}สำเร็จ ${validation.validRecords.length} รายการ`
          : `Successfully imported ${validation.validRecords.length} ${schema.titleEn} records`
      );
      setParsedFile(null);
      setColumnMapping({});
    } catch (err) {
      onToast(err instanceof Error ? err.message : isTh ? 'นำเข้าข้อมูลไม่สำเร็จ' : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const previewFields = schema.fields.slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Top 3 Action Cards: Import / Templates / Export */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-light)]/25 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-title)]">
              <Upload className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>{isTh ? `นำเข้า ${schema.titleTh}` : `Import ${schema.titleEn}`}</span>
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
            <span>
              {parsedFile
                ? isTh
                  ? 'อัปโหลดไฟล์ใหม่ (Excel / CSV)'
                  : 'Upload Another File (Excel / CSV)'
                : isTh
                ? 'เลือกไฟล์ Excel หรือ CSV'
                : 'Choose Excel or CSV File'}
            </span>
          </button>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-title)]">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isTh ? 'ดาวน์โหลดแม่แบบนำเข้า' : 'Download Template'}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {isTh
                ? `หัวคอลัมน์มาตรฐานพร้อมตัวอย่างข้อมูล (${schema.fields.length} ฟิลด์)`
                : `Standard headers with sample data (${schema.fields.length} fields)`}
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
              <span>{isTh ? `ส่งออกข้อมูล (${existingRecords.length})` : `Export Data (${existingRecords.length})`}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {isTh
                ? 'ส่งออกรายการปัจจุบันเป็น Excel (.xlsx) หรือ CSV (UTF-8 BOM)'
                : 'Export current records to Excel (.xlsx) or UTF-8 CSV'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={existingRecords.length === 0}
              onClick={() => {
                exportEntityData(entity, 'xlsx', existingRecords, exportContext);
                onToast(isTh ? `ส่งออกข้อมูล${schema.titleTh} (.xlsx) สำเร็จ` : `Exported ${schema.titleEn} (.xlsx)`);
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
                onToast(isTh ? `ส่งออกข้อมูล${schema.titleTh} (.csv) สำเร็จ` : `Exported ${schema.titleEn} (.csv)`);
              }}
              className="py-2 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Flexible Custom Header Mapping UI */}
      {parsedFile && diagnostics && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5 space-y-4">
          {/* Header & Action Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Columns3 className="w-4 h-4 text-[var(--color-primary-text)]" />
                <h4 className="text-sm font-bold text-[var(--color-text-title)]">
                  {isTh
                    ? `ขั้นตอนที่ 1: จับคู่หัวคอลัมน์จากไฟล์ (${parsedFile.fileName})`
                    : `Step 1: Map Spreadsheet Headers (${parsedFile.fileName})`}
                </h4>
                <span className="px-2 py-0.5 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[10px] font-bold">
                  {parsedFile.headers.length} {isTh ? 'คอลัมน์' : 'columns'} · {parsedFile.rows.length}{' '}
                  {isTh ? 'แถว' : 'rows'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {isTh
                  ? 'เลือกคอลัมน์จากไฟล์ของคุณให้ตรงกับฟิลด์ระบบ (* คือข้อมูลจำเป็น) สามารถบันทึกการจับคู่ไว้ใช้ซ้ำได้'
                  : 'Match your custom spreadsheet headers to the required system fields (*). You can save presets for reuse.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setColumnMapping(suggestColumnMapping(entity, parsedFile.headers));
                  setFailedPage(0);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-bold hover:bg-[var(--color-primary-light)] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isTh ? 'จับคู่อัตโนมัติ' : 'Auto-Match'}</span>
              </button>

              {hasPreset && (
                <button
                  type="button"
                  onClick={handleApplyPreset}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 text-[11px] font-bold hover:bg-indigo-100 cursor-pointer"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>{isTh ? 'ใช้ที่บันทึกไว้' : 'Load Preset'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSavePreset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-bold hover:bg-[var(--color-primary-light)] cursor-pointer"
                title={isTh ? 'บันทึกการจับคู่หัวคอลัมน์นี้ไว้ใช้ครั้งถัดไป' : 'Save header mapping for future imports'}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isTh ? 'บันทึกชุดจับคู่' : 'Save Preset'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearAllMappings}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isTh ? 'ล้างทั้งหมด' : 'Clear'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRawPreview((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer ${
                  showRawPreview
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>{isTh ? 'ดูข้อมูลดิบ' : 'Raw Preview'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setParsedFile(null);
                  setColumnMapping({});
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isTh ? 'ยกเลิกไฟล์' : 'Remove'}</span>
              </button>
            </div>
          </div>

          {/* Required Fields Status Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-bold text-[var(--color-text-title)] mr-1">
                {isTh
                  ? `ฟิลด์จำเป็น (${diagnostics.requiredFieldsMapped}/${diagnostics.requiredFieldsTotal}):`
                  : `Required Fields (${diagnostics.requiredFieldsMapped}/${diagnostics.requiredFieldsTotal}):`}
              </span>
              {schema.fields
                .filter((f) => f.required)
                .map((reqField) => {
                  const mapped = (columnMapping[reqField.key] ?? -1) >= 0;
                  return (
                    <span
                      key={reqField.key}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${
                        mapped
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {mapped ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      <span>{isTh ? reqField.labelTh : reqField.labelEn}</span>
                      <span className="font-mono opacity-75 text-[10px]">({reqField.key})</span>
                    </span>
                  );
                })}
            </div>

            <div className="relative sm:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="search"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder={isTh ? 'ค้นหาฟิลด์ระบบ...' : 'Filter system fields...'}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
              />
            </div>
          </div>

          {/* Duplicate Column Mapping Warning */}
          {diagnostics.duplicateMappings.length > 0 && (
            <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold">
                  {isTh
                    ? 'ตรวจพบคอลัมน์ต้นทางถูกจับคู่ซ้ำกับหลายฟิลด์:'
                    : 'Duplicate column mapping detected:'}
                </p>
                <p className="text-[11px] mt-0.5">
                  {diagnostics.duplicateMappings
                    .map(
                      (dup) =>
                        `"${dup.headerName}" → [${dup.fieldKeys.join(', ')}]`
                    )
                    .join(' · ')}
                </p>
              </div>
            </div>
          )}

          {/* Optional Raw File Preview */}
          {showRawPreview && (
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="px-3 py-2 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-title)] flex items-center justify-between">
                <span>
                  {isTh
                    ? `ตัวอย่างข้อมูลดิบจากไฟล์ (5 แถวแรก จากทั้งหมด ${parsedFile.rows.length} แถว)`
                    : `Raw Spreadsheet Preview (first 5 of ${parsedFile.rows.length} rows)`}
                </span>
                <span className="text-[var(--color-text-muted)] font-normal">
                  {isTh
                    ? `ยังไม่ถูกจับคู่: ${diagnostics.unmappedHeaders.length} คอลัมน์`
                    : `Unmapped headers: ${diagnostics.unmappedHeaders.length}`}
                </span>
              </div>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] font-bold">
                    <tr>
                      <th className="px-2.5 py-1.5 text-[var(--color-text-muted)]">#</th>
                      {parsedFile.headers.map((h, i) => (
                        <th key={`${h}-${i}`} className="px-2.5 py-1.5 whitespace-nowrap text-[var(--color-text-title)]">
                          <span className="text-[9px] font-mono text-[var(--color-text-muted)] mr-1">C{i + 1}</span>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {parsedFile.rows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[var(--color-card-subtle)]">
                        <td className="px-2.5 py-1.5 font-mono text-[var(--color-text-muted)]">{rIdx + 2}</td>
                        {parsedFile.headers.map((_, cIdx) => (
                          <td key={cIdx} className="px-2.5 py-1.5 whitespace-nowrap">
                            {String(row[cIdx] ?? '').trim() || <span className="text-[var(--color-text-muted)] opacity-50">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Field Mapping Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleSchemaFields.map((field) => {
              const selectedIdx = columnMapping[field.key] ?? -1;
              const samples = selectedIdx >= 0 ? columnSamples.get(selectedIdx) || [] : [];
              const isMissingRequired = field.required && selectedIdx < 0;
              const isDuplicatedCol =
                selectedIdx >= 0 &&
                diagnostics.duplicateMappings.some((d) => d.headerIndex === selectedIdx);

              return (
                <div
                  key={field.key}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                    isMissingRequired
                      ? 'border-amber-400 bg-amber-50/45 dark:border-amber-700 dark:bg-amber-950/25'
                      : isDuplicatedCol
                      ? 'border-orange-400 bg-orange-50/40 dark:border-orange-700 dark:bg-orange-950/20'
                      : selectedIdx >= 0
                      ? 'border-emerald-300/80 dark:border-emerald-800/80 bg-[var(--color-card-subtle)]'
                      : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-bold text-[var(--color-text-title)] truncate">
                      {isTh ? field.labelTh : field.labelEn}
                      {field.required && <span className="text-rose-600 ml-0.5">*</span>}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] shrink-0">
                      {field.key}
                    </span>
                  </div>

                  <select
                    aria-label={`${field.labelEn} (${field.key})`}
                    value={selectedIdx}
                    onChange={(e) => {
                      setColumnMapping((prev) => ({
                        ...prev,
                        [field.key]: Number(e.target.value),
                      }));
                      setFailedPage(0);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-medium text-[var(--color-text-title)]"
                  >
                    <option value={-1}>{isTh ? '-- ไม่นำเข้า / ข้าม --' : '-- Do not import / Skip --'}</option>
                    {parsedFile.headers.map((header, idx) => (
                      <option key={`${header}-${idx}`} value={idx}>
                        {isTh ? `คอลัมน์ ${idx + 1}: ${header}` : `Column ${idx + 1}: ${header}`}
                      </option>
                    ))}
                  </select>

                  <div className="text-[10px] text-[var(--color-text-muted)] truncate flex items-center gap-1">
                    <span className="shrink-0">{isTh ? 'ตัวอย่าง:' : 'Sample:'}</span>
                    {samples.length > 0 ? (
                      <span className="font-semibold text-[var(--color-text-body)] truncate">
                        {samples.join(' · ')}
                      </span>
                    ) : (
                      <span className="italic opacity-75">
                        {selectedIdx >= 0
                          ? isTh
                            ? '(คอลัมน์นี้ว่าง)'
                            : '(empty column)'
                          : `${isTh ? 'รูปแบบเช่น' : 'e.g.'} ${field.example || '-'}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Validation Summary + Detailed Failed Rows Error Reporting + Valid Preview */}
      {validation && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                {isTh ? `ทั้งหมด ${validation.totalRows} แถว` : `Total ${validation.totalRows} rows`}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isTh ? `ผ่านเกณฑ์ ${validation.validRecords.length} แถว` : `Valid ${validation.validRecords.length} rows`}
              </span>
              {validation.failedRows.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isTh ? `พบข้อผิดพลาด ${validation.failedRows.length} แถว` : `Failed ${validation.failedRows.length} rows`}
                </span>
              )}
              {validation.warningMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowWarningsList((prev) => !prev)}
                  className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 inline-flex items-center gap-1 cursor-pointer hover:opacity-90"
                >
                  <span>
                    {isTh
                      ? `ซ้ำข้อมูลเดิม ${validation.warningMessages.length} รายการ`
                      : `${validation.warningMessages.length} existing warnings`}
                  </span>
                  {showWarningsList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {validation.failedRows.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => exportFailedRowsReport(entity, validation.failedRows, 'csv')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTh ? 'รายงานผิดพลาด (.csv)' : 'Errors (.csv)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportFailedRowsReport(entity, validation.failedRows, 'xlsx')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTh ? 'รายงานผิดพลาด (.xlsx)' : 'Errors (.xlsx)'}</span>
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={validation.validRecords.length === 0 || isImporting}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer transition"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>
                  {isTh
                    ? `ยืนยันนำเข้า ${validation.validRecords.length} รายการที่ผ่านเกณฑ์`
                    : `Import ${validation.validRecords.length} Valid Records`}
                </span>
              </button>
            </div>
          </div>

          {/* Existing Record Warnings Panel */}
          {showWarningsList && validation.warningMessages.length > 0 && (
            <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 space-y-2 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                {isTh
                  ? `แจ้งเตือนข้อมูลที่ตรงกับทะเบียนเดิม (${validation.warningMessages.length} รายการ)`
                  : `Records matching existing data (${validation.warningMessages.length})`}
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-amber-800 dark:text-amber-300">
                {validation.warningMessages.map((msg, i) => (
                  <p key={i}>• {msg}</p>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Failed Rows Error Reporting Interface */}
          {validation.failedRows.length > 0 && (
            <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-rose-200 dark:border-rose-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {isTh
                        ? `รายงานข้อผิดพลาดรายแถว (${validation.failedRows.length} แถว — ระบบจะข้ามแถวเหล่านี้ขณะนำเข้า)`
                        : `Detailed Row Error Report (${validation.failedRows.length} failed rows — excluded from import)`}
                    </span>
                  </span>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-500" />
                    <input
                      type="search"
                      value={errorSearch}
                      onChange={(e) => {
                        setErrorSearch(e.target.value);
                        setFailedPage(0);
                      }}
                      placeholder={isTh ? 'ค้นหาเลขแถว รหัส หรือข้อความ error...' : 'Search row, ID, or error...'}
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-700 bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                    />
                  </div>
                </div>

                {/* Aggregated Error Field Filter Chips */}
                {errorFieldBreakdown.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="inline-flex items-center gap-1 font-bold text-rose-800 dark:text-rose-200 mr-1">
                      <Filter className="w-3 h-3" />
                      <span>{isTh ? 'กรองตามฟิลด์ที่ผิด:' : 'Filter by field:'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorFieldFilter('all');
                        setFailedPage(0);
                      }}
                      className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer border ${
                        errorFieldFilter === 'all'
                          ? 'bg-rose-700 text-white border-rose-700'
                          : 'bg-[var(--color-card)] text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700'
                      }`}
                    >
                      {isTh ? 'ทั้งหมด' : 'All'} ({validation.failedRows.length})
                    </button>
                    {errorFieldBreakdown.map((item) => (
                      <button
                        key={item.fieldKey}
                        type="button"
                        onClick={() => {
                          setErrorFieldFilter(item.fieldKey);
                          setFailedPage(0);
                        }}
                        className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer border ${
                          errorFieldFilter === item.fieldKey
                            ? 'bg-rose-700 text-white border-rose-700'
                            : 'bg-[var(--color-card)] text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700'
                        }`}
                      >
                        {item.label} ({item.count})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-100/70 dark:bg-rose-950/60 font-bold text-[10px] text-rose-900 dark:text-rose-200">
                    <tr>
                      <th className="px-3 py-2 w-20">{isTh ? 'แถวที่' : 'Row'}</th>
                      <th className="px-3 py-2 w-44">{isTh ? 'ข้อมูลอ้างอิง' : 'Identifier'}</th>
                      <th className="px-3 py-2 w-40">{isTh ? 'ฟิลด์ที่ผิดพลาด' : 'Failing Fields'}</th>
                      <th className="px-3 py-2">{isTh ? 'รายละเอียดสาเหตุ' : 'Error Details'}</th>
                      <th className="px-3 py-2 w-24 text-right">{isTh ? 'ตรวจสอบ' : 'Inspect'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200/70 dark:divide-rose-900 bg-[var(--color-card)]/60">
                    {paginatedFailedRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-[var(--color-text-muted)]">
                          {isTh ? 'ไม่พบแถวผิดพลาดที่ตรงกับเงื่อนไขการค้นหา' : 'No matching failed rows'}
                        </td>
                      </tr>
                    ) : (
                      paginatedFailedRows.map((fail) => {
                        const isExpanded = expandedFailedRow === fail.rowNumber;
                        return (
                          <React.Fragment key={`${fail.rowNumber}-${fail.identifier}`}>
                            <tr className="hover:bg-rose-50/70 dark:hover:bg-rose-950/30">
                              <td className="px-3 py-2 font-mono font-bold text-rose-800 dark:text-rose-200 whitespace-nowrap">
                                #{fail.rowNumber}
                              </td>
                              <td className="px-3 py-2 font-medium text-[var(--color-text-title)]">
                                {fail.identifier}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {fail.errorFields.map((fk) => (
                                    <span
                                      key={fk}
                                      className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-mono text-[10px] font-bold border border-rose-200 dark:border-rose-800"
                                    >
                                      {fk}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-rose-700 dark:text-rose-300 font-medium">
                                <ul className="space-y-0.5">
                                  {fail.errors.map((errMsg, errIdx) => (
                                    <li key={errIdx}>• {errMsg}</li>
                                  ))}
                                </ul>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedFailedRow(isExpanded ? null : fail.rowNumber)
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-700 bg-[var(--color-card)] text-[11px] font-bold text-rose-700 dark:text-rose-200 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>{isExpanded ? (isTh ? 'ซ่อน' : 'Hide') : (isTh ? 'ดูค่า' : 'View')}</span>
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-rose-50/60 dark:bg-rose-950/35">
                                <td colSpan={5} className="px-4 py-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                                    <div className="p-2.5 rounded-xl bg-[var(--color-card)] border border-rose-200 dark:border-rose-800 space-y-1.5">
                                      <p className="font-bold text-[var(--color-text-title)]">
                                        {isTh ? 'ค่าที่ระบบอ่านได้ตามการจับคู่ (Mapped Fields)' : 'Mapped System Values'}
                                      </p>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {schema.fields.map((f) => {
                                          const isFailing = fail.errorFields.includes(f.key);
                                          const val = fail.mappedValues[f.key] ?? '';
                                          return (
                                            <div
                                              key={f.key}
                                              className={`px-2 py-1 rounded border ${
                                                isFailing
                                                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100'
                                                  : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
                                              }`}
                                            >
                                              <span className="font-mono text-[9px] text-[var(--color-text-muted)] block">
                                                {f.key}
                                              </span>
                                              <span className="font-semibold break-all">
                                                {val || <span className="opacity-50 italic">(ว่าง)</span>}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-1.5">
                                      <p className="font-bold text-[var(--color-text-title)]">
                                        {isTh ? 'ข้อมูลดิบจากคอลัมน์ในไฟล์ (Raw Spreadsheet Cells)' : 'Raw Spreadsheet Cells'}
                                      </p>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {Object.entries(fail.rawRow).map(([hdr, rawVal]) => (
                                          <div
                                            key={hdr}
                                            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                                          >
                                            <span className="text-[9px] text-[var(--color-text-muted)] block truncate">
                                              {hdr}
                                            </span>
                                            <span className="font-medium break-all">
                                              {rawVal || <span className="opacity-50 italic">(ว่าง)</span>}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for Failed Rows */}
              {failedPageCount > 1 && (
                <div className="px-4 py-2.5 border-t border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs bg-[var(--color-card)]/40">
                  <button
                    type="button"
                    disabled={safeFailedPage === 0}
                    onClick={() => setFailedPage((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-700 bg-[var(--color-card)] disabled:opacity-40 cursor-pointer font-semibold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{isTh ? 'ก่อนหน้า' : 'Prev'}</span>
                  </button>
                  <span className="text-[11px] font-semibold text-rose-900 dark:text-rose-200">
                    {isTh
                      ? `หน้า ${safeFailedPage + 1} / ${failedPageCount} · ${filteredFailedRows.length} แถว`
                      : `Page ${safeFailedPage + 1} of ${failedPageCount} · ${filteredFailedRows.length} rows`}
                  </span>
                  <button
                    type="button"
                    disabled={safeFailedPage >= failedPageCount - 1}
                    onClick={() => setFailedPage((p) => Math.min(failedPageCount - 1, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-700 bg-[var(--color-card)] disabled:opacity-40 cursor-pointer font-semibold"
                  >
                    <span>{isTh ? 'ถัดไป' : 'Next'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Valid Records Preview Table */}
          {validation.validRecords.length > 0 && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-bold text-[var(--color-text-title)]">
                {isTh
                  ? `ตัวอย่างข้อมูลที่ผ่านเกณฑ์พร้อมนำเข้า (แสดง ${Math.min(15, validation.validRecords.length)} จาก ${validation.validRecords.length} รายการ)`
                  : `Valid Records Preview (showing ${Math.min(15, validation.validRecords.length)} of ${validation.validRecords.length})`}
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-card-subtle)] font-bold text-[10px] text-[var(--color-text-muted)] uppercase sticky top-0">
                    <tr>
                      {previewFields.map((f) => (
                        <th key={f.key} className="px-3 py-2 whitespace-nowrap">
                          {isTh ? f.labelTh : f.labelEn}
                        </th>
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
