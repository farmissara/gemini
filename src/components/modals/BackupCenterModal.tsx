import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CloudUpload,
  DatabaseBackup,
  Download,
  FileUp,
  FolderArchive,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import type { School } from '../../types';
import { ConfirmActionModal } from './ConfirmActionModal';
import { emitAppToast } from '../common/ToastProvider';

type Props = { isSuperAdmin: boolean; schools: School[]; activeSchoolId: string; onClose: () => void };
type BackupScopeChoice = 'school' | 'all';
type ModalTab = 'backup' | 'restore';

type Report = {
  valid?: boolean;
  ok?: boolean;
  partial?: boolean;
  scope?: { type: string; schoolId?: string };
  exportedAt?: string;
  sourceProject?: string;
  counts?: Record<string, number>;
  loginAccounts?: number;
  restoredStorageFiles?: number;
  imported?: Record<string, number>;
  skipped?: Record<string, number>;
  missingAccounts?: Array<{ email: string; role?: string | null }>;
  message?: string;
  error?: string;
  passwordsIncluded?: boolean;
};

export const BackupCenterModal: React.FC<Props> = ({
  isSuperAdmin,
  schools,
  activeSchoolId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('backup');
  const [scopeChoice, setScopeChoice] = useState<BackupScopeChoice>(
    isSuperAdmin ? 'all' : 'school'
  );
  const [schoolId, setSchoolId] = useState(activeSchoolId);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  // Local restore file state
  const [file, setFile] = useState<File | null>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [pendingRestoreCheck, setPendingRestoreCheck] = useState<Report | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === schoolId),
    [schools, schoolId]
  );
  const schoolNameById = useMemo(
    () =>
      new Map(
        schools.map((s) => [s.id, s.nameTh || s.nameEn || s.code || s.id])
      ),
    [schools]
  );

  useEffect(() => {
    if (!isSuperAdmin) {
      setSchoolId(activeSchoolId);
      setScopeChoice('school');
    }
  }, [activeSchoolId, isSuperAdmin]);

  const request = useCallback(async (path: string, body?: File, method?: 'GET' | 'POST') => {
    const client = getSupabaseClient();
    if (!client) throw new Error('ไม่พบการเชื่อมต่อ Supabase');
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const resolvedMethod = method || (body ? 'POST' : 'GET');
    const response = await fetch(path, {
      method: resolvedMethod,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/octet-stream' } : {}),
      },
      body,
    });
    if (!response.ok && response.status !== 207) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || payload.error || `คำขอล้มเหลว (${response.status})`);
    }
    return response;
  }, []);

  const exportLocalBackup = async () => {
    setBusy(true);
    setReport(null);
    try {
      const effectiveScope = !isSuperAdmin || scopeChoice === 'school' ? 'school' : 'all';
      const query =
        effectiveScope === 'all'
          ? '?scope=all'
          : `?scope=school&schoolId=${encodeURIComponent(schoolId)}`;
      const response = await request(`/api/backup${query}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `baanpakkru-${effectiveScope === 'all' ? 'system' : 'school'}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setReport({ ok: true, message: 'ดาวน์โหลดไฟล์สำรองลงเครื่องเรียบร้อยแล้ว' });
      emitAppToast({
        tone: 'success',
        title: 'สำรองข้อมูลสำเร็จ',
        message: 'ดาวน์โหลดไฟล์สำรอง JSON เรียบร้อยแล้ว',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ส่งออกไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'ส่งออกข้อมูลไม่สำเร็จ', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const validateAndPromptRestore = async (targetFile: File) => {
    setBusy(true);
    setReport(null);
    try {
      const validation = await request('/api/backup/validate', targetFile);
      const checked = (await validation.json()) as Report;
      setReport(checked);
      if (!checked.valid) return;
      setPendingRestoreFile(targetFile);
      setPendingRestoreCheck(checked);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ตรวจสอบไฟล์สำรองไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'ตรวจสอบไฟล์สำรองไม่สำเร็จ', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const confirmRestoreBackup = async () => {
    if (!pendingRestoreFile) return;
    setBusy(true);
    try {
      const restored = await request('/api/backup/restore', pendingRestoreFile);
      const result = (await restored.json()) as Report;
      setReport(result);
      setPendingRestoreCheck(null);
      setPendingRestoreFile(null);
      const partial = result.ok === false || result.partial === true;
      emitAppToast({
        tone: partial ? 'warning' : 'success',
        title: partial ? 'กู้คืนข้อมูลได้บางส่วน' : 'กู้คืนข้อมูลสำเร็จ',
        message: partial
          ? result.error || 'นำเข้าข้อมูลได้บางส่วน โปรดตรวจรายงานก่อนดำเนินการต่อ'
          : 'นำเข้าข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'นำเข้าไม่สำเร็จ';
      setReport({ error: msg });
      setPendingRestoreCheck(null);
      setPendingRestoreFile(null);
      emitAppToast({ tone: 'error', title: 'กู้คืนข้อมูลไม่สำเร็จ', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const restoreScopeLabel =
    pendingRestoreCheck?.scope?.type === 'system'
      ? 'ทั้งระบบ'
      : `โรงเรียน ${
          pendingRestoreCheck?.scope?.schoolId
            ? schoolNameById.get(pendingRestoreCheck.scope.schoolId) ||
              pendingRestoreCheck.scope.schoolId
            : 'ที่ระบุในไฟล์'
        }`;

  return (
    <>
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-center-title"
      >
        <section className="modal-enter flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] shadow-2xl">
          <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-[var(--color-primary-light)] p-2 text-[var(--color-primary-text)]">
                <DatabaseBackup className="h-5 w-5" />
              </span>
              <div>
                <h2
                  id="backup-center-title"
                  className="font-bold text-[var(--color-text-title)]"
                >
                  ศูนย์สำรองและกู้คืนข้อมูล
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  ดาวน์โหลดไฟล์สำรองลงเครื่อง และกู้คืนจากไฟล์สำรองในเครื่อง
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon-tool"
              aria-label="ปิด"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-card)] px-5 py-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition ${
                activeTab === 'backup'
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)]'
              }`}
            >
              <CloudUpload className="h-3.5 w-3.5" />
              <span>สำรองข้อมูล</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('restore')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition ${
                activeTab === 'restore'
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)]'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>กู้คืนข้อมูลทันที</span>
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto p-5">
            {/* TAB 1: BACKUP */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                {isSuperAdmin && (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                    <label className="mb-2 block text-sm font-semibold text-[var(--color-text-title)]">
                      รูปแบบการสำรองข้อมูล (แนะนำ: แยกเป็นรายโรงเรียน)
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setScopeChoice('school')}
                        className={`rounded-xl border p-3 text-left text-xs cursor-pointer transition ${
                          scopeChoice === 'school'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)]'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <FolderArchive className="h-3.5 w-3.5" />
                          <span>เลือกเฉพาะ 1 โรงเรียน</span>
                        </div>
                        <p className="mt-1 opacity-85">
                          สำรองฐานข้อมูลและไฟล์ Storage เฉพาะโรงเรียนที่เลือก
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScopeChoice('all')}
                        className={`rounded-xl border p-3 text-left text-xs cursor-pointer transition ${
                          scopeChoice === 'all'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)]'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <DatabaseBackup className="h-3.5 w-3.5" />
                          <span>ทั้งระบบรวมไฟล์เดียว</span>
                        </div>
                        <p className="mt-1 opacity-85">
                          รวมทุกโรงเรียน + ตารางระบบกลาง (จำกัดขนาดรวม 50 MB)
                        </p>
                      </button>
                    </div>

                    {scopeChoice === 'school' && (
                      <select
                        value={schoolId}
                        onChange={(event) => setSchoolId(event.target.value)}
                        className="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] p-2.5 text-sm"
                      >
                        <option value="">เลือกโรงเรียน</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.nameTh || school.nameEn || school.id}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-title)]">
                      <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>ดาวน์โหลดไฟล์สำรองลงเครื่อง</span>
                    </h3>
                    <p className="mt-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
                      {!isSuperAdmin || scopeChoice === 'school'
                        ? `ดาวน์โหลดไฟล์ .json ของโรงเรียน ${selectedSchool?.nameTh || selectedSchool?.nameEn || ''}`
                        : 'ดาวน์โหลดไฟล์ .json ของระบบทั้งหมดเก็บสำรองบนอุปกรณ์นี้'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || (scopeChoice === 'school' && !schoolId)}
                    onClick={() => void exportLocalBackup()}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text-title)] disabled:opacity-50 cursor-pointer transition"
                  >
                    <Download className="h-4 w-4" />
                    <span>
                      {scopeChoice === 'all'
                        ? 'ดาวน์โหลดไฟล์สำรองทั้งระบบ (.json)'
                        : 'ดาวน์โหลดไฟล์ .json'}
                    </span>
                  </button>
                </article>
              </div>
            )}

            {/* TAB 2: RESTORE */}
            {activeTab === 'restore' && (
              <div className="space-y-4">
                {/* Local JSON file restore */}
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-title)]">
                    <FileUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>กู้คืนจากไฟล์ JSON ในเครื่อง</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={(event) => {
                        setFile(event.target.files?.[0] || null);
                        setReport(null);
                      }}
                      className="flex-1 text-xs text-[var(--color-text-muted)] file:mr-2 file:rounded-md file:border file:border-[var(--color-border)] file:bg-[var(--color-card-subtle)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-text-title)]"
                    />
                    <button
                      type="button"
                      disabled={busy || !file}
                      onClick={() => file && void validateAndPromptRestore(file)}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 dark:border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50 cursor-pointer transition"
                    >
                      <FileUp className="h-4 w-4" />
                      <span>ตรวจสอบและกู้คืน</span>
                    </button>
                  </div>
                </section>
              </div>
            )}

            <div className="flex gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs leading-relaxed">
                ไฟล์สำรองรวมข้อมูลตารางฐานข้อมูลและไฟล์ Storage (โลโก้ เอกสาร ภาพเช็คชื่อ) พร้อม SHA-256 checksum จำกัดขนาด 50 MB/ไฟล์ การกู้คืนเป็นแบบ merge (เพิ่ม/อัปเดตไม่ลบข้อมูลปัจจุบัน) รายชื่อบัญชีไม่รวมรหัสผ่านและไม่รวมคีย์ลับ AI
              </p>
            </div>

            {report && (
              <div
                className={`rounded-xl border p-3 text-sm ${
                  report.error
                    ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
                }`}
              >
                {busy && <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />}
                {report.error ||
                  report.message ||
                  (report.valid ? 'ไฟล์ผ่านการตรวจสอบ' : report.ok ? 'เสร็จเรียบร้อย' : '')}
                {report.valid && (
                  <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                    {report.sourceProject && `ต้นทาง ${report.sourceProject} · `}
                    {report.exportedAt &&
                      new Date(report.exportedAt).toLocaleString('th-TH')}{' '}
                    · {report.loginAccounts || 0} บัญชี ·{' '}
                    {Object.keys(report.counts || {}).length} ตาราง
                  </div>
                )}
                {report.imported && (
                  <div className="mt-2 text-xs">
                    นำเข้า:{' '}
                    {Object.entries(report.imported)
                      .map(([table, count]) => `${table} ${count}`)
                      .join(' · ') || 'ไม่มีแถวใหม่'}
                    {report.restoredStorageFiles !== undefined &&
                      ` · ไฟล์ Storage ${report.restoredStorageFiles}`}
                    {Object.keys(report.skipped || {}).length > 0 &&
                      ` · ข้าม ${Object.entries(report.skipped || {})
                        .map(([table, count]) => `${table} ${count}`)
                        .join(', ')}`}
                  </div>
                )}
                {!!report.missingAccounts?.length && (
                  <div className="mt-2 text-xs">
                    <b>บัญชีที่ต้องสร้าง/เชิญใหม่:</b>{' '}
                    {report.missingAccounts.map((account) => account.email).join(', ')}
                  </div>
                )}
              </div>
            )}

            <p className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ไฟล์สำรองจะถูกดาวน์โหลดลงอุปกรณ์นี้ ส่วนการกู้คืนจะตรวจสอบสิทธิ์และขอบเขตโรงเรียนก่อนนำเข้าข้อมูล
            </p>
          </div>

          <footer className="flex justify-end border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-tool-neutral px-4 py-2 text-sm"
            >
              ปิด
            </button>
          </footer>
        </section>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(pendingRestoreCheck)}
        title="ยืนยันการกู้คืนข้อมูลจากไฟล์สำรอง"
        description={`ตรวจไฟล์ผ่าน (${restoreScopeLabel}): ข้อมูลตาราง ${
          Object.keys(pendingRestoreCheck?.counts || {}).length
        } รายการ และบัญชี ${pendingRestoreCheck?.loginAccounts || 0} บัญชี`}
        detailNote="การกู้คืนเป็นแบบเพิ่ม/ปรับปรุงข้อมูล ไม่ลบข้อมูลปัจจุบัน และรหัสผ่านไม่อยู่ในไฟล์สำรอง"
        confirmLabel="ยืนยันกู้คืนข้อมูล"
        tone="warning"
        isBusy={busy}
        onCancel={() => {
          if (!busy) {
            setPendingRestoreCheck(null);
            setPendingRestoreFile(null);
          }
        }}
        onConfirm={confirmRestoreBackup}
      />

    </>
  );
};
