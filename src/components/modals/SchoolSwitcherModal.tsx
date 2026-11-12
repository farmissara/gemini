import React, { useState } from 'react';
import { School, AppLanguage } from '../../types';
import { 
  Building2, 
  X, 
  Check, 
  MapPin, 
  Users, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { PagedList } from '../PagedList';

interface SchoolSwitcherModalProps {
  schools: School[];
  activeSchool: School;
  onSelectSchool: (school: School) => void;
  onClose: () => void;
  lang: AppLanguage;
}

export const SchoolSwitcherModal: React.FC<SchoolSwitcherModalProps> = ({
  schools,
  activeSchool,
  onSelectSchool,
  onClose,
  lang,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-5 text-[var(--color-text-body)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary-text)]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ข้อมูลสถาบันการศึกษา (School Institution)' : 'School Institution Info'}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th' ? 'แสดงเฉพาะโรงเรียนที่บัญชีของคุณมีสิทธิ์เข้าถึง' : 'Only schools your account is authorized to access are shown.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Schools */}
        <div className="space-y-2.5 pr-1">
          <PagedList items={schools} pageSize={3} renderItem={(sch) => {
            const isActive = activeSchool.id === sch.id;
            return (
              <div
                key={sch.id}
                onClick={() => {
                  onSelectSchool(sch);
                  onClose();
                }}
                className={`group p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-sm'
                    : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--color-primary-text)] bg-[var(--color-card)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                      {sch.code}
                    </span>
                    <span className="text-xs font-bold text-[var(--color-text-title)]">
                      {sch.nameTh}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-text-body)]">
                    {sch.nameEn}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      {sch.province}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
                      {sch.studentsCount.toLocaleString()} {lang === 'th' ? 'คน' : 'students'}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{sch.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {lang === 'th' ? 'ใช้งานอยู่' : 'Active'}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[var(--color-primary-text)] group-hover:underline">
                      {lang === 'th' ? 'สลับ' : 'Select'}
                    </span>
                  )}
                </div>
              </div>
            );
          }} />
        </div>

        <div className="pt-3 border-t border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-muted)]">
            {lang === 'th' ? `ระบบมีทั้งหมด ${schools.length} โรงเรียน` : `Total ${schools.length} Schools`}
          </span>
        </div>
      </div>
    </div>
  );
};
