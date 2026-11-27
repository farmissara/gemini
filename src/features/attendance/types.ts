import type {
  AppLanguage,
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceUserType,
  AuthUser,
  CampusGateGeofence,
  Course,
  LeaveRequest,
  LeaveStatus,
  PeriodAttendanceRecord,
  School,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
  UserRole,
} from '../../types';
import type { LeaveApprovalScope } from '../../lib/leaveApprovalRouting';
import type { CorrectionPrefillSeed } from '../../components/attendance/AttendanceCorrectionHub';

export type AttendanceSubTab =
  | 'selfie_mobile'
  | 'nfc_tap'
  | 'leave_request'
  | 'teacher_proxy'
  | 'period_checkin'
  | 'daily_report'
  | 'corrections';

export type PeriodRosterFilter = 'all' | 'unchecked' | 'proxy' | 'mobile';

export interface CheckinSuccessFeedback {
  userName: string;
  userRole: string;
  checkType: AttendanceCheckType;
  time: string;
  distance: number;
  photoUrl: string;
  gateName: string;
}

export interface NfcRecentLogEntry {
  id: string;
  uid: string;
  name: string;
  roleLabel: string;
  userType: AttendanceUserType;
  checkType: AttendanceCheckType;
  status: AttendanceStatus;
  time: string;
  gateName: string;
}

export interface MobileAttendanceViewProps {
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  currentUser: AuthUser | null;
  school?: School;
  campusGates?: CampusGateGeofence[];
  leaveRequests?: LeaveRequest[];
  lang: AppLanguage;
  onRecordAttendance: (
    studentId: string,
    status: AttendanceStatus,
    remarks: string,
    method?: AttendanceRecord['checkinMethod'],
    extra?: {
      recordType?: AttendanceCheckType;
      photoUrl?: string;
      location?: AttendanceRecord['location'];
      userType?: AttendanceUserType;
      teacherId?: string;
      userName?: string;
      userRole?: string;
      userAvatar?: string;
      userDepartmentOrRoom?: string;
      date?: string;
      time?: string;
      recordId?: string;
      photoStoragePath?: string;
      recordedBy?: string;
      recordedByRole?: string;
      confirmedByHomeroom?: boolean;
      confirmedByTeacherName?: string;
      correctionRequestId?: string;
    }
  ) => void;
  onRecordPeriodAttendance: (records: PeriodAttendanceRecord[]) => void;
  onAddLeaveRequest?: (req: LeaveRequest) => void;
  onUpdateLeaveStatus?: (
    reqId: string,
    status: LeaveStatus,
    remarks?: string,
    scope?: LeaveApprovalScope
  ) => void;
  initialSubTab?: AttendanceSubTab;
  initialCorrectionPrefill?: CorrectionPrefillSeed | null;
  initialLeaveDate?: string;
  embeddedMobile?: boolean;
  initialPeriodCourseId?: string;
  initialPeriodNumber?: number;
  initialPeriodDate?: string;
  initialPeriodCode?: string;
  initialPeriodCheckType?: 'check_in' | 'check_out';
  initialPeriodExpiresAt?: number;
  initialPeriodToken?: string;
  currentRole?: UserRole;
  showAttendanceAudienceSwitch?: boolean;
  onAttendanceAudienceChange?: (audience: 'students' | 'staff') => void;
  filterTabsByAudience?: boolean;
  hideStaffOverviewTabs?: boolean;
  schoolPeriods?: SchoolPeriodTime[];
  timetableSlots?: TimetableSlot[];
  onUpdateCampusGates?: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates?: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radiusMeters: number) => void;
}
