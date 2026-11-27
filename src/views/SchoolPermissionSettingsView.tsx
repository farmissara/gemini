import React, { useState } from 'react';
import { 
  User, 
  GraduationCap, 
  Users, 
  Check, 
  X, 
  Save, 
  CheckCircle2, 
  Building2, 
  Lock, 
  Sparkles, 
  Info 
} from 'lucide-react';
import { School, AppLanguage } from '../types';
import { PagedList } from '../components/PagedList';
import { getModuleTone } from '../lib/moduleTheme';
import {
  getSchoolRolePolicies,
  saveSchoolRolePolicies,
  type SchoolRolePolicy,
} from '../lib/schoolPermissions';
import { FutureNavIcon } from '../components/common/FutureIcon';
import { PageHeader } from '../components/common/PageShell';

interface SchoolPermissionSettingsViewProps {
  activeSchool: School;
  lang: AppLanguage;
}

export const SchoolPermissionSettingsView: React.FC<SchoolPermissionSettingsViewProps> = ({
  activeSchool,
  lang,
}) => {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | 'parent'>('teacher');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [policies, setPolicies] = useState<SchoolRolePolicy[]>(() =>
    getSchoolRolePolicies(activeSchool.id)
  );

  React.useEffect(() => {
    setPolicies(getSchoolRolePolicies(activeSchool.id));
  }, [activeSchool.id]);

  const togglePolicy = (policyId: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === policyId ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const savePolicies = () => {
    saveSchoolRolePolicies(activeSchool.id, policies);
    setFeedbackToast(
      lang === 'th'
        ? `บันทึกการกำหนดสิทธิ์ของ ${activeSchool.nameTh} และบังคับใช้ทันทีแล้ว`
        : `Saved and applied permissions for ${activeSchool.nameEn}`
    );
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const currentRolePolicies = policies.filter(p => p.role === selectedRole);

  return (
    <div className={`space-y-4 max-w-full overflow-hidden ${getModuleTone('school_permissions')}`}>
      {/* Toast Alert */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <PageHeader
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>การบริหารจัดการสิทธิ์เฉพาะสถาบัน • School Administrator Console</span>
          </span>
        }
        title="กำหนดสิทธิ์ผู้ใช้งานภายในโรงเรียน"
        description={`${activeSchool.nameTh} (${activeSchool.code}) — ผู้อำนวยการและผู้บริหารโรงเรียนเป็นผู้กำหนดสิทธิ์การเข้าถึงข้อมูลของครู นักเรียน และผู้ปกครองในโรงเรียนนี้`}
        icon={<FutureNavIcon tab="school_permissions" size={20} active />}
        actions={
          <button
            type="button"
            onClick={savePolicies}
            className="btn-action-primary shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกการกำหนดสิทธิ์ (Save)</span>
          </button>
        }
      />

      {/* Role Selection Tabs */}
      <div className="seg-tab-group overflow-x-auto no-scrollbar w-fit max-w-full">
        <button
          type="button"
          data-active={selectedRole === 'teacher'}
          onClick={() => setSelectedRole('teacher')}
          className="seg-tab-btn"
        >
          <User className="w-3.5 h-3.5" />
          <span>อาจารย์ผู้สอน / บุคลากร (Teachers)</span>
        </button>

        <button
          type="button"
          data-active={selectedRole === 'student'}
          onClick={() => setSelectedRole('student')}
          className="seg-tab-btn"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>นักเรียน (Students)</span>
        </button>

        <button
          type="button"
          data-active={selectedRole === 'parent'}
          onClick={() => setSelectedRole('parent')}
          className="seg-tab-btn"
        >
          <Users className="w-3.5 h-3.5" />
          <span>ผู้ปกครอง (Parents)</span>
        </button>
      </div>

      {/* Policy Switches Grid */}
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-title)]">
              {selectedRole === 'teacher' && 'สิทธิ์การทำงานของคณะครูและอาจารย์'}
              {selectedRole === 'student' && 'สิทธิ์การเข้าถึงข้อมูลของนักเรียน'}
              {selectedRole === 'parent' && 'สิทธิ์และการแจ้งเตือนของผู้ปกครอง'}
            </h3>
            <p className="text-xs text-[var(--color-text-body)]">
              เปิดหรือปิดสิทธิ์การใช้งานของบทบาทนี้ในโรงเรียนของคุณ
            </p>
          </div>

          <span className="text-[11px] font-semibold text-[var(--color-primary-text)] bg-[var(--color-primary-light)] px-2.5 py-1 rounded-full border border-[var(--color-border)]">
            {currentRolePolicies.filter(p => p.enabled).length} / {currentRolePolicies.length} สิทธิ์ที่เปิดใช้งาน
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <PagedList items={currentRolePolicies} pageSize={2} renderItem={(pol) => (
            <div
              key={pol.id}
              className={`p-4 rounded-xl border transition flex items-center justify-between gap-3 ${
                pol.enabled
                  ? 'bg-[var(--color-card)] border-[var(--color-primary)] shadow-xs'
                  : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold text-[var(--color-text-title)] text-xs flex items-center gap-1.5">
                  {pol.enabled ? (
                    <Check className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  )}
                  <span className="truncate">{pol.titleTh}</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{pol.descTh}</div>
              </div>

              <button
                type="button"
                onClick={() => togglePolicy(pol.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  pol.enabled ? 'bg-blue-700' : 'bg-slate-400 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    pol.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )} />
        </div>
      </div>
    </div>
  );
};
