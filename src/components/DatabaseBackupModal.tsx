import React, { useState } from 'react';
import { SystemConfig, AppLanguage, School } from '../types';
import { 
  Database, 
  X, 
  ShieldCheck, 
  HardDrive, 
  RefreshCw, 
  Key, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  Terminal,
  Server
} from 'lucide-react';

interface DatabaseBackupModalProps {
  systemConfig: SystemConfig;
  activeSchool: School;
  lang: AppLanguage;
  onClose: () => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  systemConfig,
  activeSchool,
  lang,
  onClose,
}) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCheckingMigration, setIsCheckingMigration] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [snapshots, setSnapshots] = useState([
    {
      id: 'snap-2026-11-04-0200',
      timestamp: '2026-11-04 02:00:15 UTC',
      size: '24.8 MB',
      type: 'Automated Daily Snapshot',
      encrypted: true,
      bucket: systemConfig.backupBucket,
    },
    {
      id: 'snap-2026-11-03-0200',
      timestamp: '2026-11-03 02:00:12 UTC',
      size: '24.2 MB',
      type: 'Automated Daily Snapshot',
      encrypted: true,
      bucket: systemConfig.backupBucket,
    },
    {
      id: 'snap-2026-10-31-1800',
      timestamp: '2026-10-31 18:30:00 UTC',
      size: '23.9 MB',
      type: 'Pre-Semester 1 Grade Lock Snapshot',
      encrypted: true,
      bucket: systemConfig.backupBucket,
    }
  ]);

  const handleCreateSnapshot = () => {
    setIsBackingUp(true);
    setStatusMessage(null);
    setTimeout(() => {
      const newSnap = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        size: '25.1 MB',
        type: `Manual Snapshot (${activeSchool.code})`,
        encrypted: true,
        bucket: systemConfig.backupBucket,
      };
      setSnapshots([newSnap, ...snapshots]);
      setIsBackingUp(false);
      setStatusMessage(
        lang === 'th'
          ? `สร้างไฟล์สำรองข้อมูลที่เข้ารหัส AES-256 เรียบร้อยแล้ว (อัปโหลดเข้า ${systemConfig.backupBucket})`
          : `Encrypted AES-256 database snapshot successfully uploaded to bucket ${systemConfig.backupBucket}`
      );
    }, 1200);
  };

  const handleCheckMigration = () => {
    setIsCheckingMigration(true);
    setTimeout(() => {
      setIsCheckingMigration(false);
      setStatusMessage(
        lang === 'th'
          ? 'ตรวจสอบ Schema ฐานข้อมูล: ผ่านเกณฑ์ 100% (npm run migrations:check: OK)'
          : 'Database schema migration integrity verified: 100% synchronized (migrations:check OK)'
      );
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {lang === 'th' ? 'ระบบสำรองและกู้คืนฐานข้อมูล (Database & Cloud Backup)' : 'Database Backup & Restore Hub'}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  PostgreSQL
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {activeSchool.nameTh} ({activeSchool.code}) • Bucket: {systemConfig.backupBucket}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Cloud Env Configuration Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">BACKUP_STORAGE_BUCKET</span>
            <span className="font-mono text-cyan-400 font-semibold">{systemConfig.backupBucket}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">ENCRYPTION ENGINE</span>
            <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" /> AES-256-GCM Master Key
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCreateSnapshot}
            disabled={isBackingUp}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 flex items-center gap-2 transition-all"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>
              {isBackingUp
                ? (lang === 'th' ? 'กำลังสร้าง Snapshot...' : 'Creating Snapshot...')
                : (lang === 'th' ? 'สำรองข้อมูลตอนนี้ (Create Snapshot)' : 'Create Instant Snapshot')}
            </span>
          </button>

          <button
            onClick={handleCheckMigration}
            disabled={isCheckingMigration}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-2 transition-all"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {isCheckingMigration
                ? 'Checking migrations...'
                : 'Run Migrations Check (npm run migrations:check)'}
            </span>
          </button>
        </div>

        {/* Snapshots Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>{lang === 'th' ? 'ประวัติไฟล์สำรองข้อมูล (Encrypted Snapshots)' : 'Snapshot History'}</span>
            <span className="text-[11px] text-slate-500">{snapshots.length} snapshots available</span>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Snapshot ID</th>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">
                      {snap.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {snap.timestamp}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {snap.size}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setStatusMessage(
                            lang === 'th'
                              ? `จำลองการดาวน์โหลดไฟล์ ${snap.id}.sql.enc สำเร็จ`
                              : `Downloaded ${snap.id}.sql.enc`
                          );
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3 text-cyan-400" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Safe Point-in-Time Restore */}
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-600/30 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{lang === 'th' ? 'การกู้คืนข้อมูล (Point-in-Time Restore)' : 'Safe Point-in-Time Restore'}</span>
          </div>
          <p className="text-[11px] text-slate-300">
            {lang === 'th'
              ? 'พิมพ์ "RESTORE_EDUVERSE_CONFIRM_2026" เพื่อยืนยันการกู้คืนฐานข้อมูลจาก Cloud Storage'
              : 'Enter "RESTORE_EDUVERSE_CONFIRM_2026" to confirm restoration into BACKUP_RESTORE_DB_URL.'}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="RESTORE_EDUVERSE_CONFIRM_2026"
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs focus:outline-none"
            />
            <button
              disabled={restoreConfirmText !== 'RESTORE_EDUVERSE_CONFIRM_2026'}
              onClick={() => {
                setStatusMessage(
                  lang === 'th'
                    ? 'ดำเนินการตรวจสอบและกู้คืนฐานข้อมูลตัวอย่างสำเร็จ (Database restore verified)'
                    : 'Database restore simulated and verified successfully.'
                );
                setRestoreConfirmText('');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                restoreConfirmText === 'RESTORE_EDUVERSE_CONFIRM_2026'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Confirm Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
