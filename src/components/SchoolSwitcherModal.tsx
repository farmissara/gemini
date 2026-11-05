import React, { useState } from 'react';
import { School, AppLanguage } from '../types';
import { 
  Building2, 
  X, 
  Check, 
  Plus, 
  MapPin, 
  Users, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface SchoolSwitcherModalProps {
  schools: School[];
  activeSchool: School;
  onSelectSchool: (school: School) => void;
  onOpenRegisterSchool: () => void;
  onClose: () => void;
  lang: AppLanguage;
}

export const SchoolSwitcherModal: React.FC<SchoolSwitcherModalProps> = ({
  schools,
  activeSchool,
  onSelectSchool,
  onOpenRegisterSchool,
  onClose,
  lang,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'th' ? 'ข้อมูลสถาบันการศึกษา (School Institution)' : 'School Institution Info'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'th' ? 'ระบบทำงานในรูปแบบโรงเรียนเดี่ยว (Dedicated Single School Demo)' : 'Operating in dedicated single school mode.'}
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

        {/* List of Schools */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {schools.map((sch) => {
            const isActive = activeSchool.id === sch.id;
            return (
              <div
                key={sch.id}
                onClick={() => {
                  onSelectSchool(sch);
                  onClose();
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {sch.code}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {sch.nameTh}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    {sch.nameEn}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      {sch.province}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-400" />
                      {sch.studentsCount.toLocaleString()} {lang === 'th' ? 'คน' : 'students'}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{sch.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {lang === 'th' ? 'ใช้งานอยู่' : 'Active'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 group-hover:text-white">
                      {lang === 'th' ? 'สลับ' : 'Select'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action button: Register New School */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {lang === 'th' ? `ระบบมีทั้งหมด ${schools.length} โรงเรียน` : `Total ${schools.length} Schools`}
          </span>

          <button
            onClick={() => {
              onClose();
              onOpenRegisterSchool();
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'th' ? '+ ลงทะเบียนเปิดโรงเรียนใหม่' : '+ Add New School'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
