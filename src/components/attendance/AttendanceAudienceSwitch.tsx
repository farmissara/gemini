import React from 'react';
import { UserCheck, Users } from 'lucide-react';
import type { AppLanguage } from '../../types';

export type AttendanceAudience = 'students' | 'staff';

interface AttendanceAudienceSwitchProps {
  active: AttendanceAudience;
  lang: AppLanguage;
  onChange: (audience: AttendanceAudience) => void;
}

export const AttendanceAudienceSwitch: React.FC<AttendanceAudienceSwitchProps> = ({
  active,
  lang,
  onChange,
}) => (
  <div className="seg-tab-group" role="group" aria-label={lang === 'th' ? 'เลือกประเภทการเช็คชื่อ' : 'Choose attendance type'}>
    <button
      type="button"
      data-active={active === 'students'}
      aria-pressed={active === 'students'}
      onClick={() => onChange('students')}
      className="seg-tab-btn"
    >
      <Users className="w-3.5 h-3.5 shrink-0" />
      <span>{lang === 'th' ? 'นักเรียน' : 'Students'}</span>
    </button>
    <button
      type="button"
      data-active={active === 'staff'}
      aria-pressed={active === 'staff'}
      onClick={() => onChange('staff')}
      className="seg-tab-btn"
    >
      <UserCheck className="w-3.5 h-3.5 shrink-0" />
      <span>{lang === 'th' ? 'ครู/บุคลากร' : 'Staff'}</span>
    </button>
  </div>
);
