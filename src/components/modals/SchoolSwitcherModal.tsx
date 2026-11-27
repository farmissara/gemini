import React from 'react';
import { School, AppLanguage } from '../../types';
import {
  Building2,
  Check,
  MapPin,
  Users,
  ExternalLink,
} from 'lucide-react';
import { PagedList } from '../PagedList';
import { BaseModal } from '../common/BaseModal';

interface SchoolSwitcherModalProps {
  schools: School[];
  activeSchool: School;
  onSelectSchool: (school: School) => void;
  onClose: () => void;
  lang: AppLanguage;
  isInspectionPrompt?: boolean;
}

export const SchoolSwitcherModal: React.FC<SchoolSwitcherModalProps> = ({
  schools,
  activeSchool,
  onSelectSchool,
  onClose,
  lang,
  isInspectionPrompt = false,
}) => {
  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      title={
        isInspectionPrompt
          ? lang === 'th'
            ? 'เลือกโรงเรียนเพื่อเข้าตรวจสอบข้อมูล (School Inspection)'
            : 'Select School to Inspect'
          : lang === 'th'
            ? 'ข้อมูลสถาบันการศึกษา (School Institution)'
            : 'School Institution Info'
      }
      subtitle={
        isInspectionPrompt
          ? lang === 'th'
            ? 'เข้าสู่ระบบภายในของโรงเรียนเพื่อตรวจสอบการทำงาน (สามารถกลับมาหน้าผู้พัฒนาได้ตลอด)'
            : 'Inspect a school workspace directly and exit back to Developer Mode anytime.'
          : lang === 'th'
            ? 'แสดงเฉพาะโรงเรียนที่บัญชีของคุณมีสิทธิ์เข้าถึง'
            : 'Only schools your account is authorized to access are shown.'
      }
      icon={<Building2 className="w-5 h-5" />}
      footer={
        <span className="text-xs text-[var(--color-text-muted)]">
          {lang === 'th' ? `ระบบมีทั้งหมด ${schools.length} โรงเรียน` : `Total ${schools.length} Schools`}
        </span>
      }
    >
      <div className="space-y-2">
        <PagedList
          items={schools}
          pageSize={3}
          renderItem={(sch) => {
            const isActive = !isInspectionPrompt && activeSchool.id === sch.id;
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
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">{sch.code}</span>
                    <span className="text-sm font-semibold text-[var(--color-text-title)]">{sch.nameTh}</span>
                  </div>

                  <p className="text-sm text-[var(--color-text-body)]">{sch.nameEn}</p>

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
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-primary-text)] transition-colors">
                      {isInspectionPrompt && <ExternalLink className="w-3.5 h-3.5" />}
                      {isInspectionPrompt
                        ? lang === 'th'
                          ? 'เข้าตรวจสอบ'
                          : 'Inspect'
                        : lang === 'th'
                          ? 'สลับ'
                          : 'Select'}
                    </span>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>
    </BaseModal>
  );
};

