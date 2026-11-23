import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, DatabaseBackup, Download, FileUp, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import type { School } from '../../types';
import { ConfirmActionModal } from './ConfirmActionModal';
import { emitAppToast } from '../common/ToastProvider';

type Props = { isSuperAdmin: boolean; schools: School[]; activeSchoolId: string; onClose: () => void };
type BackupScope = 'all' | 'school';
type Report = { valid?: boolean; ok?: boolean; partial?: boolean; scope?: { type: string; schoolId?: string }; exportedAt?: string; sourceProject?: string; counts?: Record<string, number>; loginAccounts?: number; restoredStorageFiles?: number; imported?: Record<string, number>; skipped?: Record<string, number>; missingAccounts?: Array<{email:string;role?:string|null}>; message?: string; error?: string; passwordsIncluded?: boolean };

export const BackupCenterModal: React.FC<Props> = ({ isSuperAdmin, schools, activeSchoolId, onClose }) => {
  const [scope, setScope] = useState<BackupScope>('school');
  const [schoolId, setSchoolId] = useState(activeSchoolId);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pendingRestoreCheck, setPendingRestoreCheck] = useState<Report | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedSchool = useMemo(() => schools.find((school) => school.id === schoolId), [schools, schoolId]);
  const effectiveScope = isSuperAdmin ? scope : 'school';
  useEffect(() => { if (!isSuperAdmin) setSchoolId(activeSchoolId); }, [activeSchoolId, isSuperAdmin]);

  const request = async (path: string, body?: File) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('ไม่พบการเชื่อมต่อ Supabase');
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/octet-stream' } : {}) }, body });
    if (!response.ok && response.status !== 207) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || payload.error || `คำขอล้มเหลว (${response.status})`);
    }
    return response;
  };
  const query = effectiveScope === 'all' ? '?scope=all' : `?scope=school&schoolId=${encodeURIComponent(schoolId)}`;

  const exportBackup = async () => {
    setBusy(true); setReport(null);
    try {
      const response = await request(`/api/backup${query}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `baanpakkru-${effectiveScope === 'all' ? 'system' : 'school'}-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
      setReport({ ok: true, message: 'ดาวน์โหลดไฟล์สำรองแล้ว เก็บไว้นอกเครื่องนี้ด้วย' });
      emitAppToast({ tone: 'success', title: 'สำรองข้อมูลสำเร็จ', message: 'ดาวน์โหลดไฟล์สำรอง JSON เรียบร้อยแล้ว' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'ส่งออกไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'ส่งออกข้อมูลไม่สำเร็จ', message: msg });
    }
    finally { setBusy(false); }
  };

  const importBackup = async () => {
    if (!file) return;
    setBusy(true); setReport(null);
    try {
      const validation = await request('/api/backup/validate', file);
      const checked = await validation.json() as Report;
      setReport(checked);
      if (!checked.valid) return;
      setPendingRestoreCheck(checked);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'นำเข้าไม่สำเร็จ';
      setReport({ error: msg });
      emitAppToast({ tone: 'error', title: 'ตรวจสอบไฟล์สำรองไม่สำเร็จ', message: msg });
    }
    finally { setBusy(false); }
  };

  const confirmRestoreBackup = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const restored = await request('/api/backup/restore', file);
      const result = await restored.json() as Report;
      setReport(result);
      setPendingRestoreCheck(null);
      emitAppToast({ tone: 'success', title: 'กู้คืนข้อมูลสำเร็จ', message: 'นำเข้าข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'นำเข้าไม่สำเร็จ';
      setReport({ error: msg });
      setPendingRestoreCheck(null);
      emitAppToast({ tone: 'error', title: 'กู้คืนข้อมูลไม่สำเร็จ', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const restoreScopeLabel = pendingRestoreCheck?.scope?.type === 'system' ? 'ทั้งระบบ' : 'โรงเรียนที่ระบุในไฟล์';

  return (
    <>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="backup-center-title">
        <section className="modal-enter flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] shadow-2xl">
          <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-[var(--color-primary-light)] p-2 text-[var(--color-primary-text)]">
                <DatabaseBackup className="h-5 w-5" />
              </span>
              <div>
                <h2 id="backup-center-title" className="font-bold text-[var(--color-text-title)]">สำรองและกู้คืนข้อมูล</h2>
                <p className="text-xs text-[var(--color-text-muted)]">ส่งออก/นำเข้าข้อมูลเป็นไฟล์ JSON</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="btn-icon-tool" aria-label="ปิด">
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="space-y-5 overflow-y-auto p-5">
            {isSuperAdmin && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--color-text-title)]">ขอบเขตข้อมูล</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setScope('school')} className={`rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${scope === 'school' ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold' : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'}`}>เลือกโรงเรียน</button>
                  <button type="button" onClick={() => setScope('all')} className={`rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${scope === 'all' ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-semibold' : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'}`}>ทั้งระบบ / ทุกโรงเรียน</button>
                </div>
                {scope === 'school' && (
                  <select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} className="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] p-2.5 text-sm">
                    <option value="">เลือกโรงเรียน</option>
                    {schools.map((school) => <option key={school.id} value={school.id}>{school.nameTh || school.nameEn || school.id}</option>)}
                  </select>
                )}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-title)]"><Download className="h-4 w-4 text-[var(--color-primary-text)]" /> สำรองข้อมูล</h3>
                <p className="mt-2 min-h-10 text-sm text-[var(--color-text-muted)]">{effectiveScope === 'all' ? 'ข้อมูลทุกโรงเรียนและการตั้งค่าระบบ' : `ข้อมูลโรงเรียน ${selectedSchool?.nameTh || selectedSchool?.nameEn || ''}`}</p>
                <button type="button" disabled={busy || (effectiveScope === 'school' && !schoolId)} onClick={exportBackup} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer transition">
                  <Download className="h-4 w-4" /> ดาวน์โหลดไฟล์สำรอง
                </button>
              </article>
              <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-title)]"><FileUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> กู้คืนจากไฟล์</h3>
                <p className="mt-2 min-h-10 text-sm text-[var(--color-text-muted)]">ตรวจขอบเขตและเนื้อหาไฟล์ก่อนกู้คืน</p>
                <input ref={inputRef} type="file" accept=".json,application/json" onChange={(event) => { setFile(event.target.files?.[0] || null); setReport(null); }} className="block w-full text-xs text-[var(--color-text-muted)] file:mr-2 file:rounded-md file:border file:border-[var(--color-border)] file:bg-[var(--color-card-subtle)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-text-title)]" />
                <button type="button" disabled={busy || !file} onClick={importBackup} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 dark:border-emerald-500 px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50 cursor-pointer transition">
                  <FileUp className="h-4 w-4" /> ตรวจสอบและกู้คืน
                </button>
              </article>
            </div>
            <div className="flex gap-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs leading-relaxed">ไฟล์รวมข้อมูลตารางและไฟล์ใน Storage ของโรงเรียน (โลโก้ เอกสาร และภาพเช็คชื่อ) พร้อมตรวจ checksum แต่จำกัดขนาดรวม 50 MB รายชื่อบัญชีไม่มีรหัสผ่าน บัญชีที่หายต้องสร้าง/เชิญใหม่และตั้งรหัสผ่านใหม่ ส่วนกุญแจ Push ของอุปกรณ์ไม่รวมในไฟล์</p>
            </div>
            {report && (
              <div className={`rounded-xl border p-3 text-sm ${report.error ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200' : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'}`}>
                {busy && <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />}{report.error || report.message || (report.valid ? 'ไฟล์ผ่านการตรวจสอบ' : report.ok ? 'เสร็จเรียบร้อย' : '')}
                {report.valid && <div className="mt-2 text-xs text-[var(--color-text-muted)]">{report.sourceProject && `ต้นทาง ${report.sourceProject} · `}{report.exportedAt && new Date(report.exportedAt).toLocaleString('th-TH')} · {report.loginAccounts || 0} บัญชี · {Object.keys(report.counts || {}).length} ตาราง</div>}
                {report.imported && <div className="mt-2 text-xs">นำเข้า: {Object.entries(report.imported).map(([table, count]) => `${table} ${count}`).join(' · ') || 'ไม่มีแถวใหม่'}{report.restoredStorageFiles !== undefined && ` · ไฟล์ Storage ${report.restoredStorageFiles}`}{Object.keys(report.skipped || {}).length > 0 && ` · ข้าม ${Object.entries(report.skipped || {}).map(([table, count]) => `${table} ${count}`).join(', ')}`}</div>}
                {!!report.missingAccounts?.length && <div className="mt-2 text-xs"><b>บัญชีที่ต้องสร้าง/เชิญใหม่:</b> {report.missingAccounts.map((account) => account.email).join(', ')}</div>}
              </div>
            )}
            <p className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              การกู้คืนทำงานตามสิทธิ์ของบัญชีที่เข้าสู่ระบบ และจำกัดผู้ดูแลโรงเรียนให้อยู่ในโรงเรียนของตน
            </p>
          </div>
          <footer className="flex justify-end border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4">
            <button type="button" onClick={onClose} className="btn-tool-neutral px-4 py-2 text-sm">ปิด</button>
          </footer>
        </section>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(pendingRestoreCheck)}
        title="ยืนยันการกู้คืนข้อมูลจากไฟล์สำรอง"
        description={`ตรวจไฟล์ผ่าน (${restoreScopeLabel}): ข้อมูลตาราง ${Object.keys(pendingRestoreCheck?.counts || {}).length} รายการ และบัญชี ${pendingRestoreCheck?.loginAccounts || 0} บัญชี`}
        detailNote="การกู้คืนเป็นแบบเพิ่ม/ปรับปรุงข้อมูล ไม่ลบข้อมูลปัจจุบัน และรหัสผ่านไม่อยู่ในไฟล์สำรอง"
        confirmLabel="ยืนยันกู้คืนข้อมูล"
        tone="warning"
        isBusy={busy}
        onCancel={() => {
          if (!busy) setPendingRestoreCheck(null);
        }}
        onConfirm={confirmRestoreBackup}
      />
    </>
  );
};
