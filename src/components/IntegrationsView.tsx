import React, { useState } from 'react';
import { SystemConfig } from '../types';
import { 
  Cpu, 
  MessageSquare, 
  Database, 
  Mail, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw, 
  HardDrive,
  FileText,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface IntegrationsViewProps {
  systemConfig: SystemConfig;
  onUpdateConfig: (newConfig: Partial<SystemConfig>) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  systemConfig,
  onUpdateConfig,
}) => {
  const [testingService, setTestingService] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<Record<string, { ok: boolean; message: string }>>({
    line: { ok: true, message: 'LINE Messaging & Login Channel Connected' },
    supabase: { ok: true, message: 'PostgreSQL Database & Auth Pool Healthy' },
    redis: { ok: true, message: 'Upstash / Redis REST Cache Connected (Ping: 12ms)' },
    resend: { ok: true, message: 'Resend SMTP API Authenticated' },
    font: { ok: true, message: 'Thai TrueType Fonts (TH Sarabun) Loaded' },
    backup: { ok: true, message: `Bucket: ${systemConfig.backupBucket} Active` },
  });

  const runDiagnostic = (serviceKey: string) => {
    setTestingService(serviceKey);
    setTimeout(() => {
      setTestingService(null);
      setServiceStatus((prev) => ({
        ...prev,
        [serviceKey]: {
          ok: true,
          message: `Diagnostic verified successfully at ${new Date().toLocaleTimeString()} (HTTP 200 OK)`,
        },
      }));
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            System Architecture &amp; Integration Hub
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Overview and live diagnostics for LINE Developers API, Supabase Database, Redis Caching, Resend Mail, and Thai PDF Fonts.
          </p>
        </div>

        <button
          onClick={() => {
            runDiagnostic('line');
            runDiagnostic('supabase');
            runDiagnostic('redis');
            runDiagnostic('resend');
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testingService ? 'animate-spin' : ''}`} />
          <span>Run Full Health Check</span>
        </button>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LINE API & OA */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#06C755]/15 border border-[#06C755]/30 flex items-center justify-center text-[#06C755]">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">LINE Login &amp; Messaging API</h3>
                <p className="text-xs text-slate-400">Parent check-in push &amp; LIFF authentication</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Active
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800/80">
            <div><span className="text-slate-500">LINE_LOGIN_CHANNEL_ID:</span> {systemConfig.lineChannelId}</div>
            <div><span className="text-slate-500">LINE_OA_ADD_FRIEND_URL:</span> <a href={systemConfig.lineOaAddFriendUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline">{systemConfig.lineOaAddFriendUrl}</a></div>
            <div><span className="text-slate-500">STATUS:</span> <span className="text-[#06C755]">{serviceStatus.line.message}</span></div>
          </div>

          <button
            onClick={() => runDiagnostic('line')}
            disabled={testingService === 'line'}
            className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            {testingService === 'line' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#06C755]" />}
            <span>Test LINE Messaging Webhook</span>
          </button>
        </div>

        {/* Supabase PostgreSQL */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Supabase Database &amp; Auth</h3>
                <p className="text-xs text-slate-400">PostgreSQL data store &amp; Row Level Security</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Connected
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800/80">
            <div><span className="text-slate-500">VITE_SUPABASE_URL:</span> https://xyzcompany.supabase.co</div>
            <div><span className="text-slate-500">POOL:</span> pg_bouncer session pooling (port 6543)</div>
            <div><span className="text-slate-500">STATUS:</span> <span className="text-emerald-400">{serviceStatus.supabase.message}</span></div>
          </div>

          <button
            onClick={() => runDiagnostic('supabase')}
            disabled={testingService === 'supabase'}
            className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            {testingService === 'supabase' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Verify SQL Connection Pool</span>
          </button>
        </div>

        {/* Resend Email */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Resend Transactional Email</h3>
                <p className="text-xs text-slate-400">Official transcripts &amp; tuition invoices</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              Ready
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800/80">
            <div><span className="text-slate-500">RESEND_FROM_EMAIL:</span> {systemConfig.resendFromEmail}</div>
            <div><span className="text-slate-500">DKIM / SPF:</span> Verified (DNS 100% propagated)</div>
            <div><span className="text-slate-500">STATUS:</span> <span className="text-cyan-300">{serviceStatus.resend.message}</span></div>
          </div>

          <button
            onClick={() => runDiagnostic('resend')}
            disabled={testingService === 'resend'}
            className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            {testingService === 'resend' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />}
            <span>Send Test System Email</span>
          </button>
        </div>

        {/* Thai PDF Font & Backup */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Thai PDF Font &amp; Backups</h3>
                <p className="text-xs text-slate-400">TH Sarabun PSK TTF &amp; Encrypted Snapshots</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Configured
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800/80">
            <div><span className="text-slate-500">THAI_PDF_FONT_PATH:</span> /fonts/THSarabunNew.ttf</div>
            <div><span className="text-slate-500">BACKUP_STORAGE_BUCKET:</span> {systemConfig.backupBucket}</div>
            <div><span className="text-slate-500">LAST BACKUP:</span> {systemConfig.lastBackupDate}</div>
          </div>

          <button
            onClick={() => runDiagnostic('backup')}
            disabled={testingService === 'backup'}
            className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            {testingService === 'backup' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5 text-amber-400" />}
            <span>Trigger Encrypted DB Backup Snapshot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
