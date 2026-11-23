import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, DatabaseBackup, Download, FileUp, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import type { School } from '../../types';

type Props = { isSuperAdmin: boolean; schools: School[]; activeSchoolId: string; onClose: () => void };
type BackupScope = 'all' | 'school';
type Report = { valid?: boolean; ok?: boolean; partial?: boolean; scope?: { type: string; schoolId?: string }; exportedAt?: string; sourceProject?: string; counts?: Record<string, number>; loginAccounts?: number; imported?: Record<string, number>; skipped?: Record<string, number>; missingAccounts?: Array<{email:string;role?:string|null}>; message?: string; error?: string; passwordsIncluded?: boolean };

export const BackupCenterModal: React.FC<Props> = ({ isSuperAdmin, schools, activeSchoolId, onClose }) => {
  const [scope, setScope] = useState<BackupScope>('school');
  const [schoolId, setSchoolId] = useState(activeSchoolId);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [file, setFile] = useState<File | null>(null);
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
    } catch (error) { setReport({ error: error instanceof Error ? error.message : 'ส่งออกไม่สำเร็จ' }); }
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
      const scopeLabel = checked.scope?.type === 'system' ? 'ทั้งระบบ' : 'โรงเรียนที่ระบุในไฟล์';
      if (!window.confirm(`ตรวจไฟล์ผ่าน: ${scopeLabel}\nข้อมูลตาราง ${Object.keys(checked.counts || {}).length} รายการ และบัญชี ${checked.loginAccounts || 0} บัญชี\n\nการกู้คืนเป็นแบบเพิ่ม/ปรับปรุงข้อมูล ไม่ลบข้อมูลปัจจุบัน รหัสผ่านไม่อยู่ในไฟล์ ต้องยืนยันเพื่อดำเนินการต่อ`)) return;
      const restored = await request('/api/backup/restore', file);
      setReport(await restored.json() as Report);
    } catch (error) { setReport({ error: error instanceof Error ? error.message : 'นำเข้าไม่สำเร็จ' }); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="backup-center-title">
    <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><DatabaseBackup className="h-5 w-5" /></span><div><h2 id="backup-center-title" className="font-bold text-slate-900">สำรองและกู้คืนข้อมูล</h2><p className="text-xs text-slate-500">ส่งออก/นำเข้าข้อมูลเป็นไฟล์ JSON</p></div></div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="ปิด"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-5 overflow-y-auto p-5">
        {isSuperAdmin && <div><label className="mb-2 block text-sm font-semibold text-slate-700">ขอบเขตข้อมูล</label><div className="flex flex-wrap gap-2"><button onClick={() => setScope('school')} className={`rounded-lg border px-3 py-2 text-sm ${scope === 'school' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200'}`}>เลือกโรงเรียน</button><button onClick={() => setScope('all')} className={`rounded-lg border px-3 py-2 text-sm ${scope === 'all' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200'}`}>ทั้งระบบ / ทุกโรงเรียน</button></div>{scope === 'school' && <select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="">เลือกโรงเรียน</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.nameTh || school.nameEn || school.id}</option>)}</select>}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 p-4"><h3 className="flex items-center gap-2 font-semibold text-slate-900"><Download className="h-4 w-4 text-blue-700"/> สำรองข้อมูล</h3><p className="mt-2 min-h-10 text-sm text-slate-600">{effectiveScope === 'all' ? 'ข้อมูลทุกโรงเรียนและการตั้งค่าระบบ' : `ข้อมูลโรงเรียน ${selectedSchool?.nameTh || selectedSchool?.nameEn || ''}`}</p><button disabled={busy || (effectiveScope === 'school' && !schoolId)} onClick={exportBackup} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4"/> ดาวน์โหลดไฟล์สำรอง</button></article>
          <article className="rounded-xl border border-slate-200 p-4"><h3 className="flex items-center gap-2 font-semibold text-slate-900"><FileUp className="h-4 w-4 text-emerald-700"/> กู้คืนจากไฟล์</h3><p className="mt-2 min-h-10 text-sm text-slate-600">ตรวจขอบเขตและเนื้อหาไฟล์ก่อนกู้คืน</p><input ref={inputRef} type="file" accept=".json,application/json" onChange={(event) => { setFile(event.target.files?.[0] || null); setReport(null); }} className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2"/><button disabled={busy || !file} onClick={importBackup} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 px-3 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-50"><FileUp className="h-4 w-4"/> ตรวจสอบและกู้คืน</button></article>
        </div>
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><p>ไฟล์มีรายชื่อบัญชีและอีเมล แต่ไม่มีรหัสผ่าน การกู้คืนไม่ลบข้อมูลเดิม บัญชีที่หายต้องสร้าง/เชิญใหม่และตั้งรหัสผ่านใหม่ ข้อมูลกุญแจ Push ของอุปกรณ์ไม่รวมในไฟล์</p></div>
        {report && <div className={`rounded-xl border p-3 text-sm ${report.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
          {busy && <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin"/>}{report.error || report.message || (report.valid ? 'ไฟล์ผ่านการตรวจสอบ' : report.ok ? 'เสร็จเรียบร้อย' : '')}
          {report.valid && <div className="mt-2 text-xs">{report.sourceProject && `ต้นทาง ${report.sourceProject} · `}{report.exportedAt && new Date(report.exportedAt).toLocaleString('th-TH')} · {report.loginAccounts || 0} บัญชี · {Object.keys(report.counts || {}).length} ตาราง</div>}
          {report.imported && <div className="mt-2 text-xs">นำเข้า: {Object.entries(report.imported).map(([table,count])=>`${table} ${count}`).join(' · ') || 'ไม่มีแถวใหม่'}{Object.keys(report.skipped || {}).length > 0 && ` · ข้าม ${Object.entries(report.skipped || {}).map(([table,count])=>`${table} ${count}`).join(', ')}`}</div>}
          {!!report.missingAccounts?.length && <div className="mt-2 text-xs"><b>บัญชีที่ต้องสร้าง/เชิญใหม่:</b> {report.missingAccounts.map((account)=>account.email).join(', ')}</div>}
        </div>}
        <p className="flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700"/>การกู้คืนทำงานตามสิทธิ์ของบัญชีที่เข้าสู่ระบบ และจำกัดผู้ดูแลโรงเรียนให้อยู่ในโรงเรียนของตน</p>
      </div>
      <footer className="flex justify-end border-t border-slate-200 p-4"><button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">ปิด</button></footer>
    </section>
  </div>;
};
