import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  CloudUpload,
  DatabaseBackup,
  Download,
  ExternalLink,
  FileUp,
  FolderArchive,
  HardDrive,
  LoaderCircle,
  LogOut,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import type { School } from '../../types';
import { ConfirmActionModal } from './ConfirmActionModal';
import { emitAppToast } from '../common/ToastProvider';
import {
  GoogleCalendarAuthUser,
  clearGoogleCalendarAccessToken,
  disconnectGoogleCalendarUser,
  getCurrentGoogleCalendarUser,
  getGoogleCalendarAccessToken,
  initGoogleCalendarAuth,
  signInGoogleCalendarUser,
} from '../../lib/googleCalendarAuth';
import {
  GoogleDriveAuthExpiredError,
  type GoogleDriveBackupFile,
  deleteGoogleDriveBackupFile,
  downloadGoogleDriveBackupFile,
  listGoogleDriveBackups,
  uploadBackupToGoogleDrive,
} from '../../lib/googleDriveBackup';
import {
  AUTO_BACKUP_UPDATED_EVENT,
  type AutoBackupScheduleConfig,
  type AutoBackupScopeMode,
  executeGoogleDriveBackupRun,
  readAutoBackupScheduleConfig,
  updateAutoBackupScheduleConfig,
} from '../../lib/autoBackupScheduler';

type Props = { isSuperAdmin: boolean; schools: School[]; activeSchoolId: string; onClose: () => void };
type BackupScopeChoice = 'all_schools_separately' | 'school' | 'all';
type ModalTab = 'backup' | 'restore' | 'schedule';

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

type ServerBackupStatus = {
  ok: boolean;
  supabaseServiceRoleConfigured: boolean;
  backupBucket: string;
  retentionDays: number;
  cronSecretConfigured: boolean;
  midnightTimeBangkok: string;
  lastServerSnapshotDate: string | null;
  lastServerSnapshotAt: string | null;
  lastServerSnapshotFiles: number;
  lastServerSnapshotError: string | null;
};

type ServerSnapshotItem = {
  path: string;
  date: string;
  name: string;
  scope: 'school' | 'system';
  schoolId?: string;
  size: number;
  createdAt: string;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const BackupCenterModal: React.FC<Props> = ({
  isSuperAdmin,
  schools,
  activeSchoolId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('backup');
  const [scopeChoice, setScopeChoice] = useState<BackupScopeChoice>(
    isSuperAdmin ? 'all_schools_separately' : 'school'
  );
  const [schoolId, setSchoolId] = useState(activeSchoolId);
  const [busy, setBusy] = useState(false);
  const [progressInfo, setProgressInfo] = useState<{
    completed: number;
    total: number;
    label: string;
  } | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  // Local restore file state
  const [file, setFile] = useState<File | null>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [pendingRestoreCheck, setPendingRestoreCheck] = useState<Report | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Google Drive Auth & Files (in-memory access token only)
  const [googleUser, setGoogleUser] = useState<GoogleCalendarAuthUser | null>(() =>
    getCurrentGoogleCalendarUser()
  );
  const [googleToken, setGoogleToken] = useState<string | null>(() =>
    getGoogleCalendarAccessToken()
  );
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveBackupFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [driveFilter, setDriveFilter] = useState<'all' | 'school' | 'system'>('all');
  const [pendingDeleteDriveFile, setPendingDeleteDriveFile] = useState<GoogleDriveBackupFile | null>(null);

  // Schedule & Server Snapshots
  const [scheduleConfig, setScheduleConfig] = useState<AutoBackupScheduleConfig>(() =>
    readAutoBackupScheduleConfig(isSuperAdmin)
  );
  const [serverStatus, setServerStatus] = useState<ServerBackupStatus | null>(null);
  const [serverSnapshots, setServerSnapshots] = useState<ServerSnapshotItem[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [serverUnavailableNote, setServerUnavailableNote] = useState<string | null>(null);

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

  useEffect(() => {
    const unsubscribe = initGoogleCalendarAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onScheduleUpdated = () => {
      setScheduleConfig(readAutoBackupScheduleConfig(isSuperAdmin));
    };
    window.addEventListener(AUTO_BACKUP_UPDATED_EVENT, onScheduleUpdated);
    return () => window.removeEventListener(AUTO_BACKUP_UPDATED_EVENT, onScheduleUpdated);
  }, [isSuperAdmin]);

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

  const refreshServerSnapshots = useCallback(async () => {
    setIsLoadingSnapshots(true);
    setServerUnavailableNote(null);
    try {
      const [statusRes, snapsRes] = await Promise.all([
        request('/api/backup/status'),
        request('/api/backup/snapshots'),
      ]);
      const statusData = (await statusRes.json()) as ServerBackupStatus;
      const snapsData = (await snapsRes.json()) as { snapshots?: ServerSnapshotItem[] };
      setServerStatus(statusData);
      setServerSnapshots(snapsData.snapshots || []);
    } catch (err) {
      setServerUnavailableNote(err instanceof Error ? err.message : 'ยังไม่ได้เชื่อมต่อศูนย์สำรองบนเซิร์ฟเวอร์');
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, [request]);

  const refreshDriveBackups = useCallback(async (tokenOverride?: string) => {
    const token = tokenOverride || googleToken;
    if (!token) return;
    setIsLoadingDriveFiles(true);
    try {
      const files = await listGoogleDriveBackups(
        token,
        isSuperAdmin ? undefined : { scopeType: 'school', schoolId: activeSchoolId }
      );
      setDriveFiles(files);
    } catch (err) {
      if (err instanceof GoogleDriveAuthExpiredError) {
        clearGoogleCalendarAccessToken();
        setGoogleToken(null);
        setGoogleUser(null);
      }
      emitAppToast({
        tone: 'error',
        title: 'โหลดรายการจาก Google Drive ไม่สำเร็จ',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoadingDriveFiles(false);
    }
  }, [googleToken, isSuperAdmin, activeSchoolId]);

  useEffect(() => {
    if (activeTab === 'restore' && googleToken) {
      void refreshDriveBackups();
    }
    if (activeTab === 'schedule') {
      void refreshServerSnapshots();
    }
  }, [activeTab, googleToken, refreshDriveBackups, refreshServerSnapshots]);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setReport(null);
    try {
      const { user, accessToken } = await signInGoogleCalendarUser();
      setGoogleUser(user);
      setGoogleToken(accessToken);
      emitAppToast({
        tone: 'success',
        title: 'เชื่อมต่อ Google Drive สำเร็จ',
        message: `เชื่อมต่อบัญชี ${user.email} พร้อมสำหรับสำรองและกู้คืนข้อมูลแล้ว`,
      });
      void refreshDriveBackups(accessToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เชื่อมต่อ Google ไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'เชื่อมต่อ Google ไม่สำเร็จ', message: msg });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    await disconnectGoogleCalendarUser();
    setGoogleUser(null);
    setGoogleToken(null);
    setDriveFiles([]);
  };

  const handleBackupToGoogleDrive = async () => {
    if (!googleToken) {
      await handleConnectGoogle();
      return;
    }
    setBusy(true);
    setReport(null);
    setProgressInfo(null);
    try {
      const mode: AutoBackupScopeMode =
        !isSuperAdmin || scopeChoice === 'school'
          ? 'per_school'
          : scopeChoice === 'all_schools_separately'
            ? 'all_schools_separately'
            : 'system_all';

      const result = await executeGoogleDriveBackupRun({
        googleAccessToken: googleToken,
        isSuperAdmin,
        activeSchoolId: scopeChoice === 'school' ? schoolId : activeSchoolId,
        schools,
        mode,
        scheduleKind: 'manual',
        onProgress: (completed, total, label) => {
          setProgressInfo({ completed, total, label });
        },
      });

      const uploadedCount = result.uploadedFiles.length;
      const failCount = result.failures.length;
      if (uploadedCount === 0 && failCount > 0) {
        throw new Error(result.failures.map((f) => `${f.label}: ${f.error}`).join('; '));
      }

      const summaryMsg =
        failCount > 0
          ? `อัปโหลดขึ้น Google Drive สำเร็จ ${uploadedCount} ไฟล์ (ไม่สำเร็จ ${failCount} รายการ: ${result.failures.map((f) => f.label).join(', ')})`
          : `สำรองข้อมูลขึ้น Google Drive โฟลเดอร์ BaanPakKru-Backups สำเร็จแล้ว (${uploadedCount} ไฟล์)`;

      setReport({ ok: true, message: summaryMsg });
      emitAppToast({
        tone: failCount > 0 ? 'warning' : 'success',
        title: 'สำรองขึ้น Google Drive เสร็จสิ้น',
        message: summaryMsg,
      });
      await refreshDriveBackups();
    } catch (err) {
      if (err instanceof GoogleDriveAuthExpiredError) {
        clearGoogleCalendarAccessToken();
        setGoogleToken(null);
        setGoogleUser(null);
      }
      const msg = err instanceof Error ? err.message : 'อัปโหลดขึ้น Google Drive ไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'สำรองขึ้น Google Drive ไม่สำเร็จ', message: msg });
    } finally {
      setBusy(false);
      setProgressInfo(null);
    }
  };

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
      URL.revokeObjectURL(url);
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

  const handleRestoreFromDriveFile = async (driveFile: GoogleDriveBackupFile) => {
    if (!googleToken) return;
    setBusy(true);
    setReport(null);
    try {
      const downloaded = await downloadGoogleDriveBackupFile(
        googleToken,
        driveFile.id,
        driveFile.name
      );
      await validateAndPromptRestore(downloaded);
    } catch (err) {
      if (err instanceof GoogleDriveAuthExpiredError) {
        clearGoogleCalendarAccessToken();
        setGoogleToken(null);
        setGoogleUser(null);
      }
      const msg = err instanceof Error ? err.message : 'ดาวน์โหลดจาก Google Drive ไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'กู้คืนไม่สำเร็จ', message: msg });
      setBusy(false);
    }
  };

  const handleDownloadDriveFile = async (driveFile: GoogleDriveBackupFile) => {
    if (!googleToken) return;
    setBusy(true);
    try {
      const downloaded = await downloadGoogleDriveBackupFile(
        googleToken,
        driveFile.id,
        driveFile.name
      );
      const url = URL.createObjectURL(downloaded);
      const a = document.createElement('a');
      a.href = url;
      a.download = driveFile.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      emitAppToast({
        tone: 'error',
        title: 'ดาวน์โหลดจาก Drive ไม่สำเร็จ',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteDriveFile = async () => {
    if (!googleToken || !pendingDeleteDriveFile) return;
    setBusy(true);
    try {
      await deleteGoogleDriveBackupFile(googleToken, pendingDeleteDriveFile.id);
      setDriveFiles((prev) => prev.filter((f) => f.id !== pendingDeleteDriveFile.id));
      emitAppToast({
        tone: 'success',
        title: 'ลบไฟล์สำรองแล้ว',
        message: `ลบไฟล์ ${pendingDeleteDriveFile.name} ออกจาก Google Drive เรียบร้อย`,
      });
      setPendingDeleteDriveFile(null);
    } catch (err) {
      if (err instanceof GoogleDriveAuthExpiredError) {
        clearGoogleCalendarAccessToken();
        setGoogleToken(null);
        setGoogleUser(null);
      }
      emitAppToast({
        tone: 'error',
        title: 'ลบไฟล์ไม่สำเร็จ',
        message: err instanceof Error ? err.message : String(err),
      });
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
      emitAppToast({
        tone: 'success',
        title: 'กู้คืนข้อมูลสำเร็จ',
        message: 'นำเข้าข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว',
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

  const handleRunServerSnapshotNow = async () => {
    setBusy(true);
    setReport(null);
    try {
      const res = await request('/api/backup/snapshots/run-now', undefined, 'POST');
      const data = (await res.json()) as {
        saved?: Array<{ path: string }>;
        errors?: Array<{ target: string; error: string }>;
      };
      const savedCount = data.saved?.length || 0;
      const errCount = data.errors?.length || 0;
      setReport({
        ok: true,
        message: `สร้าง Snapshot บนเซิร์ฟเวอร์สำเร็จ ${savedCount} ไฟล์${errCount ? ` (ผิดพลาด ${errCount} รายการ)` : ''}`,
      });
      emitAppToast({
        tone: 'success',
        title: 'สร้าง Snapshot สำเร็จ',
        message: `บันทึกไฟล์สำรอง ${savedCount} รายการบนเซิร์ฟเวอร์แล้ว`,
      });
      await refreshServerSnapshots();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'สร้าง Snapshot ไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'สร้าง Snapshot ไม่สำเร็จ', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const handleSyncSnapshotToDrive = async (snap: ServerSnapshotItem) => {
    if (!googleToken) {
      await handleConnectGoogle();
      return;
    }
    setBusy(true);
    setReport(null);
    try {
      const res = await request(
        `/api/backup/snapshots/download?path=${encodeURIComponent(snap.path)}`
      );
      const jsonContent = await res.text();
      const schoolName = snap.schoolId
        ? schoolNameById.get(snap.schoolId) || snap.schoolId
        : 'System (All Schools)';
      await uploadBackupToGoogleDrive(googleToken, {
        filename: `baanpakkru-${snap.date}-${snap.name}`,
        jsonContent,
        scopeType: snap.scope,
        schoolId: snap.schoolId,
        schoolName,
        scheduleKind: 'server_sync',
      });
      setReport({
        ok: true,
        message: `ส่ง Snapshot (${snap.date} · ${schoolName}) ขึ้น Google Drive เรียบร้อยแล้ว`,
      });
      emitAppToast({
        tone: 'success',
        title: 'อัปโหลด Snapshot ขึ้น Google Drive สำเร็จ',
        message: `${schoolName} (${snap.date})`,
      });
    } catch (err) {
      if (err instanceof GoogleDriveAuthExpiredError) {
        clearGoogleCalendarAccessToken();
        setGoogleToken(null);
        setGoogleUser(null);
      }
      const msg = err instanceof Error ? err.message : 'ส่งขึ้น Google Drive ไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'ส่งขึ้น Google Drive ไม่สำเร็จ', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreFromSnapshot = async (snap: ServerSnapshotItem) => {
    setBusy(true);
    setReport(null);
    try {
      const res = await request(
        `/api/backup/snapshots/download?path=${encodeURIComponent(snap.path)}`
      );
      const blob = await res.blob();
      const snapshotFile = new File([blob], `${snap.date}-${snap.name}`, {
        type: 'application/json',
      });
      await validateAndPromptRestore(snapshotFile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'โหลด Snapshot ไม่สำเร็จ';
      setReport({ error: msg });
      setBusy(false);
    }
  };

  const filteredDriveFiles = useMemo(() => {
    return driveFiles.filter((item) => {
      if (driveFilter === 'all') return true;
      return item.appProperties?.scopeType === driveFilter;
    });
  }, [driveFiles, driveFilter]);

  const restoreScopeLabel =
    pendingRestoreCheck?.scope?.type === 'system'
      ? 'ทั้งระบบ'
      : `โรงเรียน ${
          pendingRestoreCheck?.scope?.schoolId
            ? schoolNameById.get(pendingRestoreCheck.scope.schoolId) ||
              pendingRestoreCheck.scope.schoolId
            : 'ที่ระบุในไฟล์'
        }`;

  const updateSchedule = (patch: Partial<AutoBackupScheduleConfig>) => {
    const next = updateAutoBackupScheduleConfig(patch, isSuperAdmin);
    setScheduleConfig(next);
  };

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
                  ศูนย์สำรองและกู้คืนข้อมูล (Google Drive & อัตโนมัติรายวัน)
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  สำรองฐานข้อมูลและไฟล์ Storage แยกตามรายโรงเรียนหรือทั้งระบบ พร้อมกู้คืนทันที
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
              <span>สำรองลง Google Drive</span>
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
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition ${
                activeTab === 'schedule'
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>ตั้งเวลาอัตโนมัติ (00:00 น.)</span>
              {scheduleConfig.enabled && (
                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  เปิด
                </span>
              )}
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto p-5">
            {/* Google Drive Account Connection Bar */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary-text)]" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--color-text-title)]">
                      เชื่อมต่อ Google Drive (โฟลเดอร์ BaanPakKru-Backups)
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      จัดเก็บไฟล์สำรองในบัญชี Google Drive ของคุณโดยแยกโฟลเดอร์รายโรงเรียนและทั้งระบบอัตโนมัติ
                    </p>
                  </div>
                </div>

                {!googleToken || !googleUser ? (
                  <button
                    type="button"
                    disabled={isConnectingGoogle}
                    onClick={() => void handleConnectGoogle()}
                    className="gsi-material-button"
                  >
                    <div className="gsi-material-button-state" />
                    <div className="gsi-material-button-content-wrapper">
                      <div className="gsi-material-button-icon">
                        <svg
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 48 48"
                          style={{ display: 'block' }}
                        >
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                          />
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                          />
                          <path fill="none" d="M0 0h48v48H0z" />
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents">
                        {isConnectingGoogle
                          ? 'กำลังเชื่อมต่อ...'
                          : 'Sign in with Google'}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5">
                    {googleUser.photoURL && (
                      <img
                        src={googleUser.photoURL}
                        alt={googleUser.displayName}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    )}
                    <div className="text-xs leading-tight">
                      <div className="font-semibold text-[var(--color-text-title)] flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{googleUser.displayName}</span>
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        {googleUser.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isConnectingGoogle || busy}
                      onClick={() => void handleConnectGoogle()}
                      className="ml-1 inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-title)] hover:bg-[var(--color-card)] cursor-pointer disabled:opacity-50"
                      title="เปลี่ยนไปใช้บัญชี Google อื่น"
                    >
                      <RefreshCw className={`h-3 w-3 ${isConnectingGoogle ? 'animate-spin' : ''}`} />
                      <span>สลับบัญชี</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDisconnectGoogle()}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text-muted)] hover:text-rose-600 cursor-pointer disabled:opacity-50"
                      title="ออกจากบัญชี Google"
                    >
                      <LogOut className="h-3 w-3" />
                      <span>ออก</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* TAB 1: BACKUP */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                {isSuperAdmin && (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                    <label className="mb-2 block text-sm font-semibold text-[var(--color-text-title)]">
                      รูปแบบการสำรองข้อมูล (แนะนำ: แยกเป็นรายโรงเรียน)
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setScopeChoice('all_schools_separately')}
                        className={`rounded-xl border p-3 text-left text-xs cursor-pointer transition ${
                          scopeChoice === 'all_schools_separately'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)]'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>แยกไฟล์ทุกโรงเรียน (แนะนำ)</span>
                        </div>
                        <p className="mt-1 opacity-85">
                          สำรองแยก 1 ไฟล์ต่อ 1 โรงเรียน + ไฟล์ระบบกลาง กู้คืนเฉพาะโรงเรียนได้
                        </p>
                      </button>

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

                <div className="grid gap-4 md:grid-cols-2">
                  <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-title)]">
                        <CloudUpload className="h-4 w-4 text-[var(--color-primary-text)]" />
                        <span>อัปโหลดสำรองขึ้น Google Drive</span>
                      </h3>
                      <p className="mt-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
                        {!isSuperAdmin || scopeChoice === 'school'
                          ? `จัดเก็บในโฟลเดอร์ BaanPakKru-Backups/Schools/${selectedSchool?.nameTh || selectedSchool?.nameEn || 'School'}`
                          : scopeChoice === 'all_schools_separately'
                            ? `สำรองแยกทีละโรงเรียน (${schools.filter((s) => s.status === 'active').length || schools.length} โรงเรียน) พร้อมไฟล์ระบบกลาง`
                            : 'จัดเก็บไฟล์รวมทั้งระบบในโฟลเดอร์ BaanPakKru-Backups/System'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy || (scopeChoice === 'school' && !schoolId)}
                      onClick={() => void handleBackupToGoogleDrive()}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer transition"
                    >
                      {busy && progressInfo ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <CloudUpload className="h-4 w-4" />
                      )}
                      <span>
                        {googleToken
                          ? 'สำรองขึ้น Google Drive ทันที'
                          : 'เชื่อมต่อ Google เพื่อสำรองข้อมูล'}
                      </span>
                    </button>
                  </article>

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
                      disabled={
                        busy ||
                        (scopeChoice === 'school' && !schoolId) ||
                        scopeChoice === 'all_schools_separately'
                      }
                      onClick={() => void exportLocalBackup()}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text-title)] disabled:opacity-50 cursor-pointer transition"
                    >
                      <Download className="h-4 w-4" />
                      <span>
                        {scopeChoice === 'all_schools_separately'
                          ? 'เลือก "ทั้งระบบ" หรือ "1 โรงเรียน" เพื่อดาวน์โหลดลงเครื่อง'
                          : 'ดาวน์โหลดไฟล์ .json'}
                      </span>
                    </button>
                  </article>
                </div>

                {progressInfo && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-200">
                    กำลังสำรองข้อมูล ({progressInfo.completed}/{progressInfo.total}):{' '}
                    <b>{progressInfo.label}</b>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RESTORE */}
            {activeTab === 'restore' && (
              <div className="space-y-4">
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-title)]">
                        <HardDrive className="h-4 w-4 text-[var(--color-primary-text)]" />
                        <span>ดึงไฟล์สำรองจาก Google Drive มากู้คืนทันที</span>
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        ตรวจ SHA-256 checksum และสิทธิ์โรงเรียนอัตโนมัติก่อนกู้คืน
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSuperAdmin && (
                        <select
                          value={driveFilter}
                          onChange={(e) =>
                            setDriveFilter(e.target.value as 'all' | 'school' | 'system')
                          }
                          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)]"
                        >
                          <option value="all">ทุกประเภท</option>
                          <option value="school">เฉพาะรายโรงเรียน</option>
                          <option value="system">เฉพาะทั้งระบบ</option>
                        </select>
                      )}
                      <button
                        type="button"
                        disabled={!googleToken || isLoadingDriveFiles}
                        onClick={() => void refreshDriveBackups()}
                        className="btn-tool-neutral px-2.5 py-1.5 text-xs inline-flex items-center gap-1"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isLoadingDriveFiles ? 'animate-spin' : ''}`}
                        />
                        <span>รีเฟรช</span>
                      </button>
                    </div>
                  </div>

                  {!googleToken ? (
                    <div className="rounded-xl border border-dashed border-[var(--color-border)] p-5 text-center text-xs text-[var(--color-text-muted)]">
                      กรุณากด <b>Sign in with Google</b> ด้านบนเพื่อดูและกู้คืนไฟล์สำรองจาก Google Drive
                    </div>
                  ) : isLoadingDriveFiles ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-[var(--color-text-muted)]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      <span>กำลังโหลดรายการไฟล์จาก Google Drive...</span>
                    </div>
                  ) : filteredDriveFiles.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--color-border)] p-5 text-center text-xs text-[var(--color-text-muted)]">
                      ยังไม่มีไฟล์สำรองใน Google Drive (โฟลเดอร์ BaanPakKru-Backups)
                    </div>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {filteredDriveFiles.map((item) => {
                        const isSystem = item.appProperties?.scopeType === 'system';
                        const kind = item.appProperties?.scheduleKind;
                        return (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2.5 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                    isSystem
                                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                                  }`}
                                >
                                  {isSystem ? 'ทั้งระบบ' : 'รายโรงเรียน'}
                                </span>
                                {kind === 'auto_midnight' && (
                                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                                    อัตโนมัติ 00:00
                                  </span>
                                )}
                                <span className="font-semibold text-[var(--color-text-title)] truncate">
                                  {item.appProperties?.schoolName || item.name}
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                                {item.name} · {formatBytes(item.size)} ·{' '}
                                {item.createdTime
                                  ? new Date(item.createdTime).toLocaleString('th-TH')
                                  : '-'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleRestoreFromDriveFile(item)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>กู้คืน</span>
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleDownloadDriveFile(item)}
                                className="btn-tool-neutral px-2 py-1.5 text-xs"
                                title="ดาวน์โหลดลงเครื่อง"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              {item.webViewLink && (
                                <a
                                  href={item.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-tool-neutral px-2 py-1.5 text-xs"
                                  title="เปิดดูใน Google Drive"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setPendingDeleteDriveFile(item)}
                                className="rounded-lg border border-rose-200 dark:border-rose-800 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="ลบไฟล์สำรองจาก Google Drive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Local JSON file restore */}
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-title)]">
                    <FileUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>หรือกู้คืนจากไฟล์ JSON ในเครื่อง</span>
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

            {/* TAB 3: AUTO DAILY MIDNIGHT SCHEDULE */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-title)]">
                        <Clock className="h-4 w-4 text-[var(--color-primary-text)]" />
                        <span>ตั้งเวลาสำรองข้อมูลอัตโนมัติรายวันเข้า Google Drive</span>
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        ทำงานอัตโนมัติทุกวันตามเวลาที่ตั้งไว้ (ค่าเริ่มต้น 00:00 น. เวลาประเทศไทย) เมื่อเปิดแอปผู้ดูแลระบบค้างไว้และเชื่อมต่อ Google
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleConfig.enabled}
                        onChange={(e) => updateSchedule({ enabled: e.target.checked })}
                        className="h-4 w-4 rounded accent-[var(--color-primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--color-text-title)]">
                        {scheduleConfig.enabled ? 'เปิดใช้งานรายวัน' : 'ปิดอยู่'}
                      </span>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--color-text-body)]">
                        เวลาสำรองข้อมูลอัตโนมัติ (Asia/Bangkok)
                      </label>
                      <input
                        type="time"
                        value={scheduleConfig.scheduleTime}
                        onChange={(e) =>
                          updateSchedule({ scheduleTime: e.target.value || '00:00' })
                        }
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                      />
                    </div>
                    {isSuperAdmin && (
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[var(--color-text-body)]">
                          รูปแบบการจัดเก็บรายวัน
                        </label>
                        <select
                          value={scheduleConfig.scopeMode}
                          onChange={(e) =>
                            updateSchedule({
                              scopeMode: e.target.value as AutoBackupScopeMode,
                            })
                          }
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                        >
                          <option value="all_schools_separately">
                            แยกไฟล์รายโรงเรียนทุกโรงเรียน + ระบบกลาง (แนะนำ)
                          </option>
                          <option value="per_school">
                            เฉพาะโรงเรียนที่เลือกใช้งานอยู่
                          </option>
                          <option value="system_all">ทั้งระบบรวมเป็นไฟล์เดียว</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {scheduleConfig.lastRunAt && (
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs">
                      <span className="font-semibold">ทำงานล่าสุด:</span>{' '}
                      {new Date(scheduleConfig.lastRunAt).toLocaleString('th-TH')} ·{' '}
                      <span>{scheduleConfig.lastRunMessage || scheduleConfig.lastRunStatus}</span>
                    </div>
                  )}
                </section>

                {/* Server-side Midnight Snapshot Engine */}
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-title)]">
                        <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Snapshot อัตโนมัติบนเซิร์ฟเวอร์ทุกเที่ยงคืน (00:00 น.)</span>
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        บันทึก Snapshot แยกเป็นรายโรงเรียนเก็บไว้ในพื้นที่ส่วนตัวบนเซิร์ฟเวอร์ทุกคืน 00:00 น. แม้ปิดหน้าเว็บไปแล้ว และส่งขึ้น Google Drive หรือกู้คืนได้ทันที
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy || Boolean(serverUnavailableNote)}
                        onClick={() => void handleRunServerSnapshotNow()}
                        className="btn-action-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                      >
                        <DatabaseBackup className="h-3.5 w-3.5" />
                        <span>สร้าง Snapshot เดี๋ยวนี้</span>
                      </button>
                      <button
                        type="button"
                        disabled={isLoadingSnapshots}
                        onClick={() => void refreshServerSnapshots()}
                        className="btn-tool-neutral px-2.5 py-1.5 text-xs"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isLoadingSnapshots ? 'animate-spin' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {serverUnavailableNote ? (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
                      {serverUnavailableNote} (จำเป็นต้องตั้งค่า <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> บนเซิร์ฟเวอร์เพื่อให้ Snapshot อัตโนมัติทำงาน)
                    </div>
                  ) : (
                    <>
                      {serverStatus && (
                        <div className="flex flex-wrap gap-3 rounded-lg bg-[var(--color-card-subtle)] px-3 py-2 text-[11px] text-[var(--color-text-muted)]">
                          <span>
                            Bucket: <b className="font-mono text-[var(--color-text-title)]">{serverStatus.backupBucket}</b>
                          </span>
                          <span>
                            เก็บรักษา: <b>{serverStatus.retentionDays} วัน</b>
                          </span>
                          <span>
                            เที่ยงคืนล่าสุด:{' '}
                            <b>
                              {serverStatus.lastServerSnapshotDate || 'ยังไม่เคยรันอัตโนมัติในรอบเซสชันนี้'}
                            </b>
                          </span>
                        </div>
                      )}

                      {serverSnapshots.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs text-[var(--color-text-muted)]">
                          ยังไม่มีไฟล์ Snapshot บนเซิร์ฟเวอร์ — กด <b>สร้าง Snapshot เดี๋ยวนี้</b> เพื่อทดสอบหรือรอระบบรันอัตโนมัติเวลา 00:00 น.
                        </div>
                      ) : (
                        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                          {serverSnapshots.map((snap) => {
                            const label = snap.schoolId
                              ? schoolNameById.get(snap.schoolId) || snap.schoolId
                              : 'ทั้งระบบ (System)';
                            return (
                              <div
                                key={snap.path}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <div className="font-semibold text-[var(--color-text-title)]">
                                    {snap.date} · {label}
                                  </div>
                                  <div className="text-[11px] text-[var(--color-text-muted)]">
                                    {snap.name} · {formatBytes(snap.size)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void handleSyncSnapshotToDrive(snap)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
                                  >
                                    <CloudUpload className="h-3 w-3" />
                                    <span>ส่งขึ้น Drive</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void handleRestoreFromSnapshot(snap)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>กู้คืน</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
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
              การสำรองและกู้คืนทำงานตามสิทธิ์ของบัญชีที่เข้าสู่ระบบ จำกัดผู้ดูแลโรงเรียนให้อยู่ในโรงเรียนของตน และเข้าถึงเฉพาะโฟลเดอร์สำรองของแอปบน Google Drive
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

      <ConfirmActionModal
        isOpen={Boolean(pendingDeleteDriveFile)}
        title="ยืนยันลบไฟล์สำรองออกจาก Google Drive"
        description={`ต้องการลบไฟล์ "${pendingDeleteDriveFile?.name || ''}" ออกจาก Google Drive ใช่หรือไม่?`}
        detailNote="การลบไฟล์สำรองบน Google Drive ไม่สามารถย้อนกลับได้"
        confirmLabel="ยืนยันลบไฟล์"
        tone="danger"
        isBusy={busy}
        onCancel={() => {
          if (!busy) setPendingDeleteDriveFile(null);
        }}
        onConfirm={confirmDeleteDriveFile}
      />
    </>
  );
};
