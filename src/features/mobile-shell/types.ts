import type {
  Announcement,
  Assignment,
  AttendanceCheckType,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceUserType,
  AuthUser,
  BehaviorRecord,
  CampusGateGeofence,
  Course,
  GradeRecord,
  GradingSystem,
  HomeworkSubmission,
  InfirmaryVisit,
  LeaveRequest,
  LeaveStatus,
  Lesson,
  PeriodAttendanceRecord,
  PlayerScore,
  PortfolioItem,
  QuizQuestion,
  RewardItem,
  RewardRedemptionRequest,
  School,
  SchoolFeatureFlags,
  SchoolPeriodTime,
  SdqAssessment,
  Student,
  SystemConfig,
  Teacher,
  ThemePalette,
  TimetableSlot,
  UserRole,
  AppLanguage,
} from '../../types';
import type { SchoolPolicyId } from '../../lib/schoolPermissions';
import type { NavTab } from '../../components/layout/Sidebar';

export type MobileTab =
  | 'home'
  | 'admin_quick'
  | 'super_schools'
  | 'executive'
  | 'checkin'
  | 'student_attendance'
  | 'leave'
  | 'attendance_history'
  | 'gradebook'
  | 'student_grades'
  | 'portfolio'
  | 'career_quest'
  | 'timetable'
  | 'games'
  | 'profile'
  | 'homework'
  | 'announcements'
  | 'behavior_sdq'
  | 'infirmary'
  | 'lms';

export type ActiveGameView =
  | 'hub'
  | 'school_farm'
  | 'arcade_studio'
  | 'battle_royale_3d'
  | '1v1_arena'
  | 'boss_raid'
  | 'subject_labs'
  | 'hall_of_fame';

export const MOBILE_TONE_TARGET: Record<MobileTab, NavTab> = {
  home: 'dashboard',
  admin_quick: 'dashboard',
  super_schools: 'super_admin_console',
  executive: 'executive_monitor',
  checkin: 'mobile_checkin',
  student_attendance: 'mobile_checkin',
  leave: 'attendance',
  attendance_history: 'mobile_checkin',
  gradebook: 'gradebook',
  student_grades: 'gradebook',
  portfolio: 'portfolio',
  career_quest: 'career_quest',
  timetable: 'timetable',
  games: 'games',
  profile: 'system_settings',
  homework: 'homework',
  announcements: 'announcements',
  behavior_sdq: 'behavior_sdq',
  infirmary: 'infirmary',
  lms: 'courses',
};

export const splitAnnouncementIntoPages = (content: string, pageLength = 420) => {
  const characters = Array.from(content);
  const pages: string[] = [];

  for (let start = 0; start < characters.length; start += pageLength) {
    pages.push(characters.slice(start, start + pageLength).join(''));
  }

  return pages.length > 0 ? pages : [''];
};

export interface ExecMetrics {
  attendanceRate: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  leaveCount: number;
  avgGpa: string;
  honorCount: number;
  todayInfirmary: number;
  riskCount: number;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
}

export interface MobileAppShellProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  currentRole: UserRole;
  isSuperAdminSchoolView?: boolean;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  themePalette: ThemePalette;
  setThemePalette: (palette: ThemePalette) => void;
  onLogout: () => void;
  onSwitchToDesktopMode: () => void;
  onOpenProfileModal: () => void;
  onOpenOnboardingTutor?: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;

  // Data props
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  lessons?: Lesson[];
  grades?: GradeRecord[];
  infirmaryVisits?: InfirmaryVisit[];
  behaviorRecords?: BehaviorRecord[];
  sdqAssessments?: SdqAssessment[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  assignments: Assignment[];
  homeworkSubmissions: HomeworkSubmission[];
  announcements: Announcement[];
  questions: QuizQuestion[];
  playerScores: PlayerScore[];
  rewardItems: RewardItem[];
  campusGates: CampusGateGeofence[];

  // Action Handlers
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
      recordId?: string;
      photoStoragePath?: string;
      recordedBy?: string;
      recordedByRole?: string;
    }
  ) => void;
  onRecordPeriodAttendance: (records: PeriodAttendanceRecord[]) => void;
  onAddLeaveRequest: (req: LeaveRequest) => void;
  onUpdateLeaveStatus: (reqId: string, status: LeaveStatus, remarks?: string) => void;
  onEarnRewards: (userId: string, exp: number, gems: number, isWin: boolean) => void;
  onRedeemReward: (itemId: string, costGems: number) => void;
  onAddQuestion: (q: QuizQuestion) => void;
  onImportQuestions: (imported: QuizQuestion[]) => void;
  onUpdateStudent?: (student: Student) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
  onUpdateOwnAvatar?: (avatarUrl: string) => void;
  timetableSlots?: TimetableSlot[];
  allSchoolTimetableSlots?: TimetableSlot[];
  allSchoolCourses?: Course[];
  allSchoolTeachers?: Teacher[];
  allSchoolStudents?: Student[];
  schoolPeriods?: SchoolPeriodTime[];
  gradingSystem?: GradingSystem;
  systemConfig?: SystemConfig;
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  featureFlags?: SchoolFeatureFlags;
  onUpdateGrade?: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onAddGrade?: (grade: GradeRecord, options?: { notify?: boolean }) => void;

  // Role-first Mobile & Desktop Continuity Props
  schools?: School[];
  coordinationUnreadCount?: number;
  unclaimedCentralPacksCount?: number;
  onOpenSchoolSwitcher?: () => void;
  onUpdateSchool?: (updates: Partial<School>) => Promise<void>;
  onAddAnnouncement?: (announcement: Announcement) => void;
  onAddHomeworkAssignment?: (assignment: Assignment) => Promise<void>;
  onAddHomeworkSubmission?: (sub: HomeworkSubmission) => Promise<void>;
  onGradeHomeworkSubmission?: (id: string, score: number, feedback: string) => Promise<void>;
  onAddBehaviorRecord?: (record: BehaviorRecord) => void;
  onAddSdqAssessment?: (sdq: SdqAssessment) => void;
  onAddInfirmaryVisit?: (visit: InfirmaryVisit) => void;
  onCompleteLesson?: (lessonId: string) => Promise<void>;
  onSaveLesson?: (lesson: Lesson) => Promise<void>;
  onSubmitAssignment?: (assignmentId: string) => Promise<void>;
  onViewSchool?: (school: School) => void;
  onToggleSchoolStatus?: (schoolId: string, status: School['status']) => Promise<void>;
  onUpdateSchoolFeatureFlags?: (schoolId: string, flags: SchoolFeatureFlags) => void;
  onJumpToDesktopTab?: (tab: NavTab) => void;
  initialMobileTab?: MobileTab;
  initialAttendanceSubTab?: 'selfie_mobile' | 'history' | 'leave_request' | 'teacher_proxy' | 'period_checkin';
  initialPeriodCourseId?: string;
  initialPeriodNumber?: number;
  initialPeriodDate?: string;
  initialPeriodCode?: string;
  initialPeriodCheckType?: 'check_in' | 'check_out';
  onBiometricLock?: () => void;
  portfolioItems?: PortfolioItem[];
  onAddPortfolioItem?: (item: PortfolioItem) => void;
  onDeletePortfolioItem?: (itemId: string) => void;
  onUpdateCampusGates?: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates?: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radiusMeters: number) => void;
  rewardRedemptions?: RewardRedemptionRequest[];
  onEquipCosmetic?: (payload: { frameId?: string; title?: string }) => void;
  onReviewRedemption?: (requestId: string, status: 'approved' | 'rejected', teacherNote?: string) => void;
  onCreateCustomReward?: (item: RewardItem) => void;
  canSwitchAdminTeacherMode?: boolean;
  onSwitchOperationalRole?: (nextRole: 'admin' | 'teacher') => void;
  onToggleGameView?: () => void;
}
