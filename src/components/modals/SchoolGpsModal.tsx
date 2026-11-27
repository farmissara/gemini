import React from 'react';
import { School, CampusGateGeofence, AppLanguage, UserRole } from '../../types';
import { SchoolGpsSettingsCard } from '../SchoolGpsSettingsCard';
import { X, MapPin } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';

interface SchoolGpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSchool: School;
  campusGates: CampusGateGeofence[];
  currentRole: UserRole;
  lang?: AppLanguage;
  onUpdateCampusGates: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates: (lat: number, lng: number, radius: number) => void;
}

export const SchoolGpsModal: React.FC<SchoolGpsModalProps> = ({
  isOpen,
  onClose,
  activeSchool,
  campusGates,
  currentRole,
  lang = 'th',
  onUpdateCampusGates,
  onSaveCampusGates,
  onUpdateSchoolCoordinates,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader
      maxWidthClass="max-w-5xl"
      heightClass="h-[92dvh] max-h-[92dvh]"
      surfaceClassName="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-2xl"
      bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden"
    >
      {/* Modal Top Bar */}
      <div className="shrink-0 px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
            <MapPin className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
              <span>{lang === 'th' ? 'ตั้งค่าพิกัด GPS ประจำโรงเรียน' : 'Configure School GPS Coordinates'}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/25 text-blue-200 border border-blue-400/40 font-mono">
                {activeSchool.nameTh}
              </span>
            </h2>
            <p className="text-[11px] text-slate-300 truncate">
              {lang === 'th'
                ? 'กำหนดละติจูด, ลองจิจูด, รัศมี Geofence และจุดสแกนประตูสำหรับนักเรียนและบุคลากร'
                : 'Define latitude, longitude, geofence radius, and gate check-in zones for students & faculty.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
        <SchoolGpsSettingsCard
          activeSchool={activeSchool}
          campusGates={campusGates}
          currentRole={currentRole}
          lang={lang}
          onUpdateCampusGates={onUpdateCampusGates}
          onSaveCampusGates={onSaveCampusGates}
          onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
        />
      </div>
    </BaseModal>
  );
};

