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
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import {
  decryptBackup,
  encryptBackup,
  MAX_BACKUP_PASSPHRASE_LENGTH,
  MAX_ENCRYPTED_BACKUP_BYTES,
  MIN_BACKUP_PASSPHRASE_LENGTH,
} from '../../lib/backupEncryption';
import type { School } from '../../types';
import { ConfirmActionModal } from './ConfirmActionModal';
import { emitAppToast } from '../common/ToastProvider';
import { BaseModal } from '../common/BaseModal';

type Props = { isSuperAdmin: boolean; schools: School[]; activeSchoolId: string; onClose: () => void };
type BackupScopeChoice = 'school' | 'all';
type ModalTab = 'backup' | 'restore';
type RestoreMode = 'restore' | 'drill';
type DrillStatus = { enabled: boolean; environment: string; targetProject: string | null };

type Report = {
  valid?: boolean;
  ok?: boolean;
  partial?: boolean;
  drill?: boolean;
  environment?: string;
  scope?: { type: string; schoolId?: string };
  exportedAt?: string;
  sourceProject?: string;
  targetProject?: string | null;
  counts?: Record<string, number>;
  storageFilesByBucket?: Record<string, number>;
  exclusions?: Record<string, string>;
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
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupPassphraseConfirmation, setBackupPassphraseConfirmation] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('restore');
  const [drillStatus, setDrillStatus] = useState<DrillStatus | null>(null);
  const [drillStatusError, setDrillStatusError] = useState('');
  const [drillStatusLoading, setDrillStatusLoading] = useState(false);

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

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    setDrillStatusLoading(true);
    setDrillStatusError('');
    void request('/api/backup/drill-status')
      .then(async (response) => {
        const status = (await response.json()) as DrillStatus;
        if (typeof status.enabled !== 'boolean' || typeof status.environment !== 'string') {
          throw new Error('ข้อมูลสถานะ Staging ไม่ถูกต้อง');
        }
        if (active) setDrillStatus(status);
      })
      .catch((error) => {
        if (active) {
          setDrillStatusError(error instanceof Error ? error.message : 'ตรวจสอบสถานะ Staging ไม่สำเร็จ');
        }
      })
      .finally(() => {
        if (active) setDrillStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isSuperAdmin, request]);

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
      const encryptedContent = await encryptBackup(await response.text(), backupPassphrase);
      const blob = new Blob([encryptedContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `baanpakkru-${effectiveScope === 'all' ? 'system' : 'school'}-backup-${new Date().toISOString().slice(0, 10)}.encrypted.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setReport({ ok: true, message: 'เข้ารหัสและดาวน์โหลดไฟล์สำรองลงเครื่องเรียบร้อยแล้ว' });
      emitAppToast({
        tone: 'success',
        title: 'สำรองข้อมูลสำเร็จ',
        message: 'เข้ารหัสและดาวน์โหลดไฟล์สำรองเรียบร้อยแล้ว',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ส่งออกไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'ส่งออกข้อมูลไม่สำเร็จ', message: msg });
    } finally {
      setBusy(false);
      setBackupPassphrase('');
      setBackupPassphraseConfirmation('');
    }
  };

  const validateAndPromptRestore = async (targetFile: File) => {
    setBusy(true);
    setReport(null);
    try {
      if (targetFile.size > MAX_ENCRYPTED_BACKUP_BYTES) {
        throw new Error('ไฟล์สำรองมีขนาดเกิน 70 MB');
      }
      const decrypted = await decryptBackup(await targetFile.text(), restorePassphrase);
      const backupFile = new File([decrypted.content], targetFile.name, {
        type: 'application/json',
      });
      const validation = await request(
        restoreMode === 'drill' ? '/api/backup/drill/validate' : '/api/backup/validate',
        backupFile,
      );
      const checked = (await validation.json()) as Report;
      setReport(checked);
      if (!checked.valid) return;
      setPendingRestoreFile(backupFile);
      setPendingRestoreCheck(checked);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ตรวจสอบไฟล์สำรองไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'ตรวจสอบไฟล์สำรองไม่สำเร็จ', message: msg });
    } finally {
      setBusy(false);
      setRestorePassphrase('');
    }
  };

  const confirmRestoreBackup = async () => {
    if (!pendingRestoreFile) return;
    setBusy(true);
    try {
      const restored = await request(
        restoreMode === 'drill' ? '/api/backup/drill/restore' : '/api/backup/restore',
        pendingRestoreFile,
      );
      const result = (await restored.json()) as Report;
      const isDrill = restoreMode === 'drill';
      setReport(result);
      setPendingRestoreCheck(null);
      setPendingRestoreFile(null);
      const partial = result.ok === false || result.partial === true;
      emitAppToast({
        tone: partial ? 'warning' : 'success',
        title: partial
          ? isDrill ? 'ซ้อมกู้คืน Staging ได้บางส่วน' : 'กู้คืนข้อมูลได้บางส่วน'
          : isDrill ? 'ซ้อมกู้คืน Staging สำเร็จ' : 'กู้คืนข้อมูลสำเร็จ',
        message: partial
          ? result.error || 'นำเข้าข้อมูลได้บางส่วน โปรดตรวจรายงานก่อนดำเนินการต่อ'
          : isDrill
            ? 'นำเข้าข้อมูลใน Staging แล้ว โปรดตรวจข้อมูลปลายทางให้ครบก่อนถือว่าการซ้อมผ่าน'
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
  const restoreTargetLabel = pendingRestoreCheck?.drill
    ? `ซ้อมกู้คืนบน Staging (${pendingRestoreCheck.sourceProject || 'ไม่ทราบต้นทาง'} → ${
        pendingRestoreCheck.targetProject || 'ไม่ทราบปลายทาง'
      })`
    : 'กู้คืนในโปรเจกต์ปัจจุบัน';

  return (
    <>
      <BaseModal
        isOpen={true}
        onClose={onClose}
        maxWidthClass="max-w-4xl"
        title="ศูนย์สำรองและกู้คืนข้อมูล"
        subtitle="ดาวน์โหลดไฟล์สำรองลงเครื่อง และกู้คืนจากไฟล์สำรองในเครื่อง"
        icon={<DatabaseBackup className="h-5 w-5" />}
        bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn-tool-neutral px-4 py-2 text-sm"
            >
              ปิด
            </button>
          </div>
        }
      >
        {/* Navigation Tabs */}
        <div className="shrink-0 flex flex-wrap gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-card)] px-5 py-2.5">
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

        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-5">
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
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-[var(--color-text-body)]">
                      รหัสผ่านเข้ารหัสไฟล์ ({MIN_BACKUP_PASSPHRASE_LENGTH}–{MAX_BACKUP_PASSPHRASE_LENGTH} ตัวอักษร)
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={MIN_BACKUP_PASSPHRASE_LENGTH}
                        maxLength={MAX_BACKUP_PASSPHRASE_LENGTH}
                        value={backupPassphrase}
                        onChange={(event) => setBackupPassphrase(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-sm text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[var(--color-text-body)]">
                      ยืนยันรหัสผ่าน
                      <input
                        type="password"
                        autoComplete="new-password"
                        minLength={MIN_BACKUP_PASSPHRASE_LENGTH}
                        maxLength={MAX_BACKUP_PASSPHRASE_LENGTH}
                        value={backupPassphraseConfirmation}
                        onChange={(event) => setBackupPassphraseConfirmation(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-sm text-[var(--color-text-title)]"
                      />
                    </label>
                  </div>
                  {backupPassphraseConfirmation &&
                    backupPassphrase !== backupPassphraseConfirmation && (
                      <p className="mt-2 text-xs text-rose-700 dark:text-rose-300" role="alert">
                        รหัสผ่านทั้งสองช่องไม่ตรงกัน
                      </p>
                    )}
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    กรุณาเก็บรหัสผ่านไว้ให้ปลอดภัย ระบบไม่ได้เก็บรหัสผ่านนี้ และไม่สามารถกู้ไฟล์ได้หากลืม
                  </p>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      Array.from(backupPassphrase).length < MIN_BACKUP_PASSPHRASE_LENGTH ||
                      Array.from(backupPassphrase).length > MAX_BACKUP_PASSPHRASE_LENGTH ||
                      backupPassphrase !== backupPassphraseConfirmation ||
                      (scopeChoice === 'school' && !schoolId)
                    }
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
                  {isSuperAdmin && (
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3">
                      <p className="text-xs font-semibold text-[var(--color-text-title)]">
                        เลือกปลายทางก่อนตรวจไฟล์
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          aria-pressed={restoreMode === 'restore'}
                          onClick={() => {
                            setRestoreMode('restore');
                            setPendingRestoreCheck(null);
                            setPendingRestoreFile(null);
                            setReport(null);
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            restoreMode === 'restore'
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                              : 'border-[var(--color-border)] text-[var(--color-text-body)]'
                          }`}
                        >
                          กู้คืนระบบนี้
                        </button>
                        {drillStatus?.enabled && (
                          <button
                            type="button"
                            aria-pressed={restoreMode === 'drill'}
                            onClick={() => {
                              setRestoreMode('drill');
                              setPendingRestoreCheck(null);
                              setPendingRestoreFile(null);
                              setReport(null);
                            }}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                              restoreMode === 'drill'
                                ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                                : 'border-[var(--color-border)] text-[var(--color-text-body)]'
                            }`}
                          >
                            ซ้อมกู้คืนบน Staging
                          </button>
                        )}
                      </div>
                      {drillStatusLoading && (
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                          <LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                          กำลังตรวจสอบปลายทาง Staging
                        </p>
                      )}
                      {drillStatusError && (
                        <p className="mt-2 text-xs text-rose-700 dark:text-rose-300" role="alert">
                          ตรวจสอบ Staging ไม่สำเร็จ: {drillStatusError}
                        </p>
                      )}
                      {!drillStatusLoading && !drillStatusError && drillStatus?.enabled && (
                        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                          Staging project: {drillStatus.targetProject}. ระบบจะปฏิเสธไฟล์ที่มีโปรเจกต์ต้นทางเดียวกับปลายทาง
                        </p>
                      )}
                      {!drillStatusLoading && !drillStatusError && !drillStatus?.enabled && (
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                          โหมดซ้อมจะเปิดเฉพาะเมื่อเซิร์ฟเวอร์ Staging ตั้งค่า{' '}
                          <code>BACKUP_RESTORE_ENVIRONMENT=staging</code>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={(event) => {
                        setFile(event.target.files?.[0] || null);
                        setRestorePassphrase('');
                        setReport(null);
                      }}
                      className="flex-1 text-xs text-[var(--color-text-muted)] file:mr-2 file:rounded-md file:border file:border-[var(--color-border)] file:bg-[var(--color-card-subtle)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-text-title)]"
                    />
                    <label className="block w-full text-xs font-semibold text-[var(--color-text-body)]">
                      รหัสผ่านไฟล์สำรอง (เฉพาะไฟล์ที่เข้ารหัส)
                      <input
                        type="password"
                        autoComplete="current-password"
                        maxLength={256}
                        value={restorePassphrase}
                        onChange={(event) => setRestorePassphrase(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-sm text-[var(--color-text-title)]"
                      />
                    </label>
                    <p className="w-full text-xs text-[var(--color-text-muted)]">
                      ไฟล์สำรองใหม่ต้องใช้รหัสผ่านที่ตั้งไว้ตอนดาวน์โหลด ไฟล์สำรองรุ่นเก่าที่ยังไม่เข้ารหัสนำเข้าได้ตามปกติ
                    </p>
                    <button
                      type="button"
                      disabled={busy || !file}
                      onClick={() => file && void validateAndPromptRestore(file)}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 dark:border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50 cursor-pointer transition"
                    >
                      <FileUp className="h-4 w-4" />
                      <span>{restoreMode === 'drill' ? 'ตรวจสอบและซ้อมกู้คืน' : 'ตรวจสอบไฟล์สำรอง'}</span>
                    </button>
                  </div>
                </section>
              </div>
            )}

            <div className="flex gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs leading-relaxed">
                ไฟล์สำรองที่ดาวน์โหลดใหม่เข้ารหัส AES-256-GCM และต้องใช้รหัสผ่านเดิมเพื่อกู้คืน (รหัสผ่านไม่ถูกจัดเก็บ) จำกัดขนาดข้อมูล 50 MB/ไฟล์ การกู้คืนเป็นแบบ merge (เพิ่ม/อัปเดตไม่ลบข้อมูลปัจจุบัน) รายชื่อบัญชีไม่รวมรหัสผ่านและไม่รวมคีย์ลับ AI
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
                    <div className="mt-2 space-y-2 text-xs text-[var(--color-text-muted)]">
                      <p>
                        {report.sourceProject && `ต้นทาง ${report.sourceProject} · `}
                        {report.targetProject && `ปลายทาง ${report.targetProject} · `}
                        {report.exportedAt && `${new Date(report.exportedAt).toLocaleString('th-TH')} · `}
                        {report.loginAccounts || 0} บัญชี · {Object.keys(report.counts || {}).length} ตาราง
                      </p>
                      <details open className="rounded-lg border border-[var(--color-border)] p-2">
                        <summary className="cursor-pointer font-semibold text-[var(--color-text-body)]">
                          ข้อมูลในไฟล์สำรอง
                        </summary>
                        <ul className="mt-2 grid max-h-36 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto sm:grid-cols-2">
                          {Object.entries(report.counts || {}).map(([table, count]) => (
                            <li key={table} className="flex justify-between gap-2">
                              <span className="break-all">{table}</span>
                              <span className="shrink-0">{count} แถว</span>
                            </li>
                          ))}
                        </ul>
                        {report.storageFilesByBucket && (
                          <div className="mt-2 border-t border-[var(--color-border)] pt-2">
                            <p className="font-semibold text-[var(--color-text-body)]">ไฟล์ Storage</p>
                            <ul className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                              {Object.entries(report.storageFilesByBucket).map(([bucket, count]) => (
                                <li key={bucket} className="flex justify-between gap-2">
                                  <span>{bucket}</span>
                                  <span>{count} ไฟล์</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!!Object.keys(report.exclusions || {}).length && (
                          <div className="mt-2 border-t border-[var(--color-border)] pt-2">
                            <p className="font-semibold text-amber-800 dark:text-amber-200">
                              ข้อมูลที่ไม่รวมในไฟล์
                            </p>
                            <ul className="mt-1 space-y-1">
                              {Object.entries(report.exclusions || {}).map(([item, reason]) => (
                                <li key={item}>
                                  <span className="font-medium">{item}:</span> {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="mt-2 border-t border-[var(--color-border)] pt-2">
                          รหัสผ่านบัญชีไม่รวมในไฟล์สำรอง
                        </p>
                      </details>
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
      </BaseModal>

      <ConfirmActionModal
        isOpen={Boolean(pendingRestoreCheck)}
        title={pendingRestoreCheck?.drill ? 'ยืนยันการซ้อมกู้คืนบน Staging' : 'ยืนยันการกู้คืนข้อมูลจากไฟล์สำรอง'}
        description={`ตรวจไฟล์ผ่าน (${restoreScopeLabel}): ข้อมูลตาราง ${
          Object.keys(pendingRestoreCheck?.counts || {}).length
        } รายการ และบัญชี ${pendingRestoreCheck?.loginAccounts || 0} บัญชี — ${restoreTargetLabel}`}
        detailNote={
          pendingRestoreCheck?.drill
            ? 'ปลายทางถูกกำหนดเป็น Staging ฝั่งเซิร์ฟเวอร์ และต้องเป็นคนละ Supabase project กับต้นทาง การซ้อมจะเพิ่ม/ปรับปรุงข้อมูลบน Staging โดยไม่ลบข้อมูลเดิม'
            : 'การกู้คืนเป็นแบบเพิ่ม/ปรับปรุงข้อมูล ไม่ลบข้อมูลปัจจุบัน และรหัสผ่านไม่อยู่ในไฟล์สำรอง'
        }
        confirmLabel={pendingRestoreCheck?.drill ? 'ยืนยันซ้อมกู้คืนบน Staging' : 'ยืนยันกู้คืนข้อมูล'}
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
