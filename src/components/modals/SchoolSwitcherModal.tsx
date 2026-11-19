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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg shadow-xl p-5 sm:p-6 space-y-5 text-[var(--color-text-body)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary-text)]">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ข้อมูลสถาบันการศึกษา (School Institution)' : 'School Institution Info'}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                {lang === 'th' ? 'แสดงเฉพาะโรงเรียนที่บัญชีของคุณมีสิทธิ์เข้าถึง' : 'Only schools your account is authorized to access are shown.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 p-2 -m-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Schools */}
        <div className="space-y-2">
          <PagedList items={schools} pageSize={3} renderItem={(sch) => {
            const isActive = activeSchool.id === sch.id;
            return (
              <div
                key={sch.id}
                onClick={() => {
                  onSelectSchool(sch);
                  onClose();
                }}
                className={`group px-4 py-3.5 rounded-xl border cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)]'
                    : 'bg-transparent border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">
                      {sch.code}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-text-title)]">
                      {sch.nameTh}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--color-text-body)]">
                    {sch.nameEn}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {sch.province}
                    </span>
                    <span className="opacity-50">•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {sch.studentsCount.toLocaleString()} {lang === 'th' ? 'คน' : 'students'}
                    </span>
                    <span className="opacity-50">•</span>
                    <span className="capitalize">{sch.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary-text)]">
                      <Check className="w-4 h-4" />
                      {lang === 'th' ? 'ใช้งานอยู่' : 'Active'}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-primary-text)] transition-colors">
                      {lang === 'th' ? 'สลับ' : 'Select'}
                    </span>
                  )}
                </div>
              </div>
            );
          }} />
        </div>

        <div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {lang === 'th' ? `ระบบมีทั้งหมด ${schools.length} โรงเรียน` : `Total ${schools.length} Schools`}
          </span>
        </div>
      </div>
    </div>
  );
};
