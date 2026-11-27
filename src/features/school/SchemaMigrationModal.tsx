import React, { useEffect, useState } from 'react';
import { Check, Copy, Database } from 'lucide-react';
import type { AppLanguage } from '../../types';
import { loadSupabasePatchMigrationSql } from '../../lib/supabase';
import { emitAppToast } from '../../components/common/ToastProvider';
import { BaseModal } from '../../components/common/BaseModal';

interface SchemaMigrationModalProps {
  isOpen: boolean;
  lang: AppLanguage;
  onClose: () => void;
}

export const SchemaMigrationModal: React.FC<SchemaMigrationModalProps> = ({
  isOpen,
  lang,
  onClose,
}) => {
  const [patchMigrationSql, setPatchMigrationSql] = useState('');
  const [copiedMigrationSql, setCopiedMigrationSql] = useState(false);

  useEffect(() => {
    if (isOpen && !patchMigrationSql) {
      void loadSupabasePatchMigrationSql().then(setPatchMigrationSql);
    }
  }, [isOpen, patchMigrationSql]);

  const handleCopyMigrationSql = async () => {
    try {
      const sql = patchMigrationSql || await loadSupabasePatchMigrationSql();
      if (!patchMigrationSql) setPatchMigrationSql(sql);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(sql);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = sql;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedMigrationSql(true);
      emitAppToast({ tone: 'success', message: 'คัดลอกโค้ด SQL Migration แล้ว' });
      window.setTimeout(() => setCopiedMigrationSql(false), 2500);
    } catch (err) {
      console.warn('Could not copy SQL migration:', err);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        lang === 'th'
          ? 'อัปเดตโครงสร้างฐานข้อมูล Supabase (SQL Migration Patch)'
          : 'Supabase Database Schema Migration Patch'
      }
      subtitle={
        lang === 'th'
          ? 'รันครั้งเดียวเพื่อสร้างตาราง teachers, เพิ่มคอลัมน์ attendance.photo_url และรีเฟรช Schema Cache'
          : 'Run once in Supabase SQL Editor to create teachers, add attendance.photo_url, and reload schema cache'
      }
      icon={<Database className="w-5 h-5 text-amber-700 dark:text-amber-300" />}
      maxWidthClass="max-w-3xl"
      heightClass="max-h-[88dvh]"
      showMobileHandle
      bodyClassName="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 text-xs text-[var(--color-text-body)]"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
        >
          {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
        </button>
      }
    >
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
            <div className="font-bold text-amber-900 dark:text-amber-200">
              {lang === 'th' ? 'ขั้นตอนการแก้ไข (ใช้เวลา 30 วินาที):' : 'How to apply (takes 30 seconds):'}
            </div>
            <ol className="list-decimal list-inside space-y-1 text-amber-900/90 dark:text-amber-100/90">
              <li>{lang === 'th' ? 'กดปุ่ม "คัดลอก SQL Migration ทั้งหมด" ด้านล่าง' : 'Click "Copy Full SQL Migration" below'}</li>
              <li>{lang === 'th' ? 'เปิดหน้า Supabase Dashboard ของโปรเจกต์คุณ → เมนูซ้ายเลือก SQL Editor → กด New query' : 'Open your Supabase Dashboard → SQL Editor → New query'}</li>
              <li>{lang === 'th' ? 'วางโค้ด SQL ลงไป แล้วกดปุ่ม Run (ด้านล่างขวา) จนขึ้น Success' : 'Paste the SQL and click Run until Success appears'}</li>
              <li>{lang === 'th' ? 'กลับมาที่หน้าเว็บ BaanPakKru (บ้านพักครู) แล้วกดรีเฟรช (F5) ข้อมูลครูและรูปเช็คชื่อจะซิงก์ครบถ้วนทันที' : 'Return to BaanPakKru and refresh the page; teachers and attendance photos will sync immediately'}</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--color-text-muted)]">
                supabase/migrations/20261111_patch_all_latest_migrations.sql + course classification migration
              </span>
              <button
                type="button"
                onClick={handleCopyMigrationSql}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedMigrationSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMigrationSql ? (lang === 'th' ? 'คัดลอกโค้ด SQL แล้ว!' : 'Copied SQL!') : (lang === 'th' ? 'คัดลอก SQL Migration ทั้งหมด' : 'Copy Full SQL Migration')}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] max-h-72 overflow-auto leading-relaxed border border-slate-800 select-all">
              {patchMigrationSql || 'กำลังโหลด SQL Migration...'}
            </pre>
          </div>
    </BaseModal>
  );
};
