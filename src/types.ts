export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

export type AppProgramMode = 'school_erp' | 'lms_classroom' | 'parent_portal';

export type AppLanguage = 'th' | 'en';

export type AppTheme = 'dark' | 'light';

export type GradingSystem = 'thai' | 'international';

export type ThemePalette = 
  | 'light_sky' 
  | 'light_warm' 
  | 'light_mint' 
  | 'light_pure'
  | 'light_lavender'
  | 'light'
  | 'sapphire' 
  | 'emerald' 
  | 'amethyst';

export type StudentStatus = 
  | 'active' 
  | 'transferred_in'
  | 'transferred_out'
  | 'transferred'
  | 'graduated' 
  | 'suspended' 
  | 'resigned' 
  | 'dropped';

export interface School {
  id: string;
  code: string; // e.g. "SCH-BKK01"
  nameTh: string;
  nameEn: string;
  slug: string;
  type: 'public' | 'private' | 'international' | 'demonstration';
  province: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  primaryColor: string;
  studentsCount: number;
  teachersCount: number;
  academicYear: string;
  currentSemester: string;
  semesterOptions?: string[];
  gradingSystem?: GradingSystem;
  staffPositionOptions?: string[];
  lineOaId: string;
  createdAt: string;
  status: 'active' | 'pending' | 'suspended';
  subscriptionPlan?: 'Starter' | 'Professional' | 'Enterprise';
  appliedPromoCode?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;

  // Student Login Preferences & School Portal Link (Requirement 1)
  studentLoginIdentifierType?: 'student_id_only' | 'email_only' | 'both';
  customLoginSlug?: string;
  studentDefaultPasswordType?: 'student_id' | 'birthdate' | 'custom' | 'pin';
  studentDefaultPasswordNote?: string;
  customSchoolLoginUrl?: string;
}

export interface RolePermissionConfig {
  role: UserRole;
  roleNameTh: string;
  roleNameEn: string;
  descriptionTh: string;
  permissions: {
    manageStudents: boolean;
    manageCourses: boolean;
    editGrades: boolean;
    recordAttendance: boolean;
    manageTuition: boolean;
    sendBroadcastLine: boolean;
    manageTimetable: boolean;
    manageSdq: boolean;
    viewInfirmary: boolean;
    approveTranscripts: boolean;
  };
}

export interface PromotionCampaign {
  id: string;
  code: string;
  titleTh: string;
  titleEn: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_trial_months';
  discountValue: number;
  applicableSchoolType: 'all' | 'public' | 'private' | 'demonstration' | 'international';
  validFrom: string;
  validUntil: string;
  maxRedemptions: number;
  currentRedemptions: number;
  status: 'active' | 'scheduled' | 'expired';
  descriptionTh: string;
}

export interface SchoolSubscriptionPlan {
  id: string;
  schoolId: string;
  schoolName: string;
  planName: 'Starter' | 'Professional' | 'Enterprise';
  maxStudents: number;
  monthlyFee: number;
  appliedPromoCode?: string;
  finalPrice: number;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'trial' | 'suspended';
  expiryDate: string;
}

export interface GuardianInfo {
  id: string;
  name: string;
  relation: string; // 'บิดา' | 'มารดา' | 'ผู้ปกครอง' | 'ปู่/ย่า/ตา/ยาย' | 'ญาติผู้ใหญ่'
  phone: string;
  email?: string;
  lineUserId?: string;
  occupation?: string;
  isPrimary?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  fullNameTh: string;
  fullNameEn: string;
  role: UserRole;
  schoolId: string;
  avatarUrl: string;
  lineConnected: boolean;
  phone?: string;
  studentRecordId?: string;
  teacherRecordId?: string;

  // General & Personal Information
  nickname?: string;
  nationalId?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  bloodType?: 'A' | 'B' | 'AB' | 'O';
  allergies?: string[];
  chronicDiseases?: string[];
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  bio?: string;
  lineUserId?: string;

  // Student Profile Fields (TCAS Portfolio & Academic Track)
  studentIdNumber?: string;
  gradeLevel?: string;
  room?: string;
  academicTrack?: string; // e.g. "วิทยาศาสตร์-คณิตศาสตร์", "ศิลป์-คำนวณ", "ศิลป์-ภาษา"
  advisorName?: string;
  gpax?: number;
  targetUniversity?: string; // e.g. "จุฬาลงกรณ์มหาวิทยาลัย"
  targetFaculty?: string; // e.g. "คณะวิศวกรรมศาสตร์ สาขาวิศวกรรมคอมพิวเตอร์"
  dreamCareer?: string; // e.g. "Software Engineer & AI Researcher"
  skills?: string[]; // e.g. ["Python", "Robotics", "English Debate"]
  languages?: string[]; // e.g. ["ไทย (Native)", "อังกฤษ (IELTS 7.0)"]
  interests?: string[];

  // Teacher Profile Fields (Academic Standing, Qualification & PA Evaluation)
  teacherIdNumber?: string;
  academicDegree?: string; // e.g. "ปริญญาโท ศึกษาศาสตรมหาบัณฑิต (M.Ed.)"
  major?: string; // e.g. "การสอนคณิตศาสตร์และวิทยาการคำนวณ"
  academicStanding?: string; // e.g. "ครูชำนาญการพิเศษ (คศ.3)"
  department?: string; // e.g. "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี"
  teachingSubjects?: string[]; // e.g. ["คณิตศาสตร์ ม.4", "วิทยาการคำนวณ ม.6"]
  homeroomClass?: string; // e.g. "ห้อง 401 (วิทย์-คณิต)"
  homeroomClasses?: string[]; // สอนได้มากกว่า 1 ห้องเรียน
  teachingGrades?: string[]; // สอนได้มากกว่า 1 ระดับชั้น
  teacherLicenseNo?: string; // e.g. "คส. 6210900012345"
  expertise?: string[]; // e.g. ["Active Learning", "STEM Education"]
  researchWorks?: string[];
  isSchoolAdmin?: boolean; // ครูมีสิทธิ์เป็น admin ได้!

  // Parent Profile Fields
  occupation?: string;
  workplace?: string;
  childrenStudentIds?: string[]; // ผู้ปกครอง 1 คน มีนักเรียนได้มากกว่า 1 คน

  // School Admin Profile Fields
  adminPositionTitle?: string; // e.g. "ผู้อำนวยการสถานศึกษา", "รองผู้อำนวยการกลุ่มบริหารวิชาการ"
  adminDepartment?: string; // e.g. "ฝ่ายบริหารวิชาการและทะเบียน"
  directOfficePhone?: string;
  officeRoom?: string;
}

export interface TeacherPortfolioWork {
  id: string;
  title: string;
  category: 'pa_agreement' | 'classroom_research' | 'lesson_plan' | 'teaching_media' | 'award_honor' | 'social_contribution';
  academicYear: string;
  paAspect: 'ด้านที่ 1 การจัดการเรียนรู้' | 'ด้านที่ 2 การส่งเสริมสนับสนุน' | 'ด้านที่ 3 การพัฒนาตนเองและวิชาชีพ';
  description: string;
  fileUrl?: string;
  evidenceType: 'pdf' | 'link' | 'image' | 'document';
  verifiedStatus: 'draft' | 'submitted' | 'approved';
  dateSubmitted: string;
  targetStanding?: string;
}

export interface Teacher {
  id: string;
  schoolId?: string;
  teacherIdNumber: string;
  fullNameTh: string;
  fullNameEn: string;
  positionTitle?: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  avatarUrl: string;
  academicDegree: string;
  major: string;
  minor?: string; // วิชาโท
  academicStanding: string;
  department: string;
  teacherLicenseNo: string;
  teachingSubjects: string[];
  homeroomClasses: string[]; // ครูสอนได้มากกว่า 1 ห้อง
  teachingGrades: string[]; // ครูสอนได้มากกว่า 1 ระดับชั้น
  isSchoolAdmin?: boolean; // ครูมีสิทธิ์เป็น admin ได้
  lineUserId?: string;
  lineLinked?: boolean;
  otherSkills?: string[]; // ความสามารถพิเศษอื่นๆ
  certifications?: string[]; // วุฒิบัตร/ใบรับรอง
  teachingExperienceYears?: number; // อายุราชการ/ประสบการณ์สอน (ปี)
  paPortfolio?: TeacherPortfolioWork[]; // แฟ้มผลงานเพิ่มวิทยฐานะ ว.PA
  paScore?: number; // คะแนนประเมิน PA
  selfDevelopmentPlan?: string; // แผนพัฒนาตนเอง (ID Plan)
}

export interface Student {
  id: string;
  schoolId?: string;
  studentIdNumber: string; // e.g. STU-2026-0842
  nationalId?: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameTh: string;
  lastNameTh: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  gradeLevel: string; // e.g. "Grade 10" or "มัธยมศึกษาปีที่ 4 (M.4)"
  room: string; // e.g. "Room 401"
  enrolledRooms?: string[]; // เด็กสามารถเรียนมากกว่า 1 ห้อง / ชมรม / แผนพิเศษ
  status: StudentStatus;
  avatarUrl: string;
  gpa: number;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;
  guardians?: GuardianInfo[]; // เด็ก 1 คนมีผู้ปกครองได้มากกว่า 1 คน
  lineUserId?: string;
  lineLinked: boolean;
  lineNotifyEnabled: boolean;
  enrolledDate: string;
  bloodType?: 'A' | 'B' | 'AB' | 'O';
  allergies?: string[];
  chronicDiseases?: string[];
  emergencyContact?: string;
  emergencyPhone?: string;
  behaviorScore?: number;
  phone?: string;
  address?: string;
  academicTrack?: string;
  skills?: string[];
  dreamCareer?: string;
  targetUniversity?: string;
  targetFaculty?: string;
  interests?: string[];
  languages?: string[];
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'sick' | 'leave';
export type AttendanceCheckType = 'check_in' | 'check_out';
export type AttendanceUserType = 'student' | 'teacher';

export interface AttendanceRecord {
  id: string;
  schoolId?: string;
  studentId: string;
  teacherId?: string;
  userType?: AttendanceUserType;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  userDepartmentOrRoom?: string;
  recordType?: AttendanceCheckType; // 'check_in' | 'check_out'
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  checkOutTime?: string;
  status: AttendanceStatus;
  checkinMethod: 'qr_scanner' | 'rfid' | 'manual' | 'mobile_geofence' | 'teacher_proxy' | 'selfie_geofence';
  photoUrl?: string; // Captured selfie image from phone
  photoStoragePath?: string;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    distanceMeters: number;
    inGeofence: boolean;
    geofenceZoneName?: string;
  };
  remarks?: string;
  lineNotificationSent: boolean;
  recordedBy?: string;
  recordedByRole?: string;
}

export type LeaveType = 'sick' | 'personal' | 'official' | 'vacation';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  schoolId?: string;
  userId: string;
  userName: string;
  userRole: 'student' | 'teacher';
  gradeLevelOrDepartment?: string;
  leaveScope?: 'full_day' | 'period_hourly'; // ลาเต็มวัน หรือ ลาเฉพาะคาบสอน/รายชั่วโมง
  periodNumber?: number; // คาบเรียนที่ขอลา (1-8)
  courseId?: string; // รหัสรายวิชาที่ขอลา
  courseCode?: string;
  courseTitle?: string;
  substituteTeacherId?: string; // ครูสอนแทน
  substituteTeacherName?: string;
  ccEmailsOrRoles?: string[] | string; // CC คนที่เกี่ยวข้อง เช่น หัวหน้ากลุ่มสาระ, รอง ผอ. ฝ่ายวิชาการ
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  attachmentUrl?: string; // photo of medical certificate or document / official mission order
  status: LeaveStatus;
  approvedBy?: string;
  approvalRemarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CampusGateGeofence {
  id: string;
  schoolId?: string;
  nameTh: string;
  nameEn: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  isPrimary: boolean;
  type: 'main_gate' | 'north_gate' | 'canteen' | 'bus_dropoff' | 'staff_parking';
  isActive?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface LessonMaterial {
  name: string;
  type: 'pdf' | 'doc' | 'video' | 'link';
  url: string;
}

export interface Lesson {
  id: string;
  schoolId?: string;
  courseId: string;
  chapterNumber: number;
  titleTh: string;
  titleEn: string;
  durationMinutes: number;
  videoUrl?: string;
  content: string;
  materials: LessonMaterial[];
  completedByStudentIds: string[];
}

export interface Assignment {
  id: string;
  schoolId?: string;
  courseId: string;
  titleTh: string;
  titleEn: string;
  dueDate: string;
  points: number;
  submittedStudentIds: string[];
  status: 'active' | 'closed';
  courseCode?: string;
  description?: string;
  maxScore?: number;
}

export interface Course {
  id: string;
  schoolId?: string;
  code: string; // e.g. "CS301", "MA201"
  titleEn: string;
  titleTh: string;
  category: 'core' | 'elective' | 'stem' | 'language' | 'arts' | 'social' | 'pe' | 'career' | 'activities' | string;
  credits: number;
  weeklyHours?: number;
  totalHours?: number;
  minAttendanceHours?: number;
  teacherName: string;
  teacherEmail: string;
  department: string;
  schedule: string; // e.g. "Mon, Wed 09:00 - 10:30"
  room: string;
  academicYear: string;
  semester: string;
  enrolledStudentIds: string[];
  description: string;
  coverImage?: string;
}

export interface GradeRecord {
  id: string;
  schoolId?: string;
  studentId: string;
  courseId: string;
  academicYear: string;
  semester: string;
  midtermScore: number; // / 30
  finalScore: number; // / 40
  assignmentScore: number; // / 20
  quizScore: number; // / 10
  totalScore: number; // / 100
  letterGrade: string;
  gradePoint: number; // 4.0, 3.5, etc.
}

export interface InvoiceItem {
  id: string;
  title: string;
  amount: number;
}

export interface TuitionInvoice {
  id: string;
  schoolId?: string;
  invoiceNumber: string; // e.g. INV-2026-0042
  studentId: string;
  semester: string;
  academicYear: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'paid' | 'pending' | 'overdue';
  items: InvoiceItem[];
  paymentMethod?: 'promptpay' | 'credit_card' | 'bank_transfer' | 'line_pay';
  paidAt?: string;
  receiptNumber?: string;
}

export interface Announcement {
  id: string;
  schoolId?: string;
  title: string;
  content: string;
  category: 'general' | 'academic' | 'urgent' | 'event';
  targetAudience: 'all' | 'students' | 'parents' | 'teachers';
  publishedAt: string;
  author: string;
  authorRole: string;
  pinned: boolean;
  lineBroadcastSent: boolean;
  resendEmailSent: boolean;
}

export interface LineNotificationSettings {
  lineOaId: string;
  lineOaName: string;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  liffId: string;
  webhookUrl: string;
  addFriendUrl: string;
  qrCodeImageUrl: string;
  autoReplyGreeting: string;
  schoolStartTime: string;
  lateCutoffTime: string;
  absenceCutoffTime: string;
  checkoutStartTime: string;
  behaviorAlertThreshold: number;
  notifyAttendanceCheckIn: boolean;
  notifyAttendanceCheckOut: boolean;
  notifyAttendanceLate: boolean;
  notifyAttendanceAbsence: boolean;
  notifyInfirmaryVisit: boolean;
  notifyBehaviorDeduction: boolean;
  notifyBehaviorMerit: boolean;
  notifyNewHomework: boolean;
  notifyHomeworkDeadline: boolean;
  notifyHomeworkGraded: boolean;
  notifyGradeReportReleased: boolean;
  notifyBillingInvoice: boolean;
  notifyBillingPaymentSuccess: boolean;
  notifyEmergencyBroadcast: boolean;
  customHeaderColor: string;
  customFooterNote: string;
  notifyTargetSchool?: boolean;
  notifyTargetParents?: boolean;
  notifyTargetStudents?: boolean;
}

export interface SystemConfig {
  schoolNameEn: string;
  schoolNameTh: string;
  academicYear: string;
  currentSemester: string;
  semesterOptions: string[];
  gradingSystem: GradingSystem;
  staffPositionOptions: string[];
  lineOaAddFriendUrl: string;
  lineChannelId: string;
  lineMessagingConfigured: boolean;
  resendApiKeyConfigured: boolean;
  resendFromEmail: string;
  masterEmail?: string;
  replyToEmail?: string;
  supabaseConnected: boolean;
  thaiPdfFontEnabled: boolean;
  backupBucket: string;
  lastBackupDate: string;
  lineNotificationSettings?: LineNotificationSettings;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
}

export type LearningStrandId =
  | 'thai'
  | 'math'
  | 'science_tech'
  | 'social'
  | 'health_pe'
  | 'arts'
  | 'career_tech'
  | 'foreign_lang';

export interface QuizQuestion {
  id: string;
  schoolId?: string;
  packId?: string;
  strand?: LearningStrandId;
  subject: string; // e.g. "วิทยาศาสตร์", "คณิตศาสตร์", "ภาษาอังกฤษ"
  gradeLevel: string; // e.g. "ม.3", "ม.6"
  questionTh: string;
  questionEn: string;
  options: string[];
  correctIndex: number;
  explanationTh: string;
  category: 'standard_exam' | 'onet' | 'general' | 'review' | 'exam';
  points: number;
}

export interface PlayerScore {
  userId: string;
  studentId?: string;
  name: string;
  role: 'student' | 'teacher';
  avatarUrl: string;
  exp: number;
  gems: number;
  rankTitle: string;
  battleWins: number;
  streak: number;
  attendanceDays?: number;
  attendanceStreak?: number;
  libraryVisits?: number;
  academicGpa?: number;
}

export type MilestoneCategory = 'attendance' | 'library' | 'academic';

export type MilestoneTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface MilestoneAchievementDef {
  id: string;
  category: MilestoneCategory;
  tier: MilestoneTier;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  metricLabelTh: string;
  metricLabelEn: string;
  unitTh: string;
  unitEn: string;
  thresholdValue: number;
  expThreshold?: number;
  winsThreshold?: number;
  rewardExp: number;
  rewardGems: number;
  iconKey:
    | 'clock_check'
    | 'flame_streak'
    | 'shield_perfect'
    | 'book_open'
    | 'library_stack'
    | 'crown_library'
    | 'star_academic'
    | 'award_honor'
    | 'trophy_grandmaster';
}

export interface EvaluatedMilestone {
  def: MilestoneAchievementDef;
  currentValue: number;
  currentExp: number;
  currentWins: number;
  progressPct: number;
  unlocked: boolean;
}

export interface RewardItem {
  id: string;
  titleTh: string;
  titleEn: string;
  costGems: number;
  category: 'perk' | 'item' | 'badge' | 'skin' | 'boost';
  stock: number;
  iconName: string;
  descriptionTh: string;
  skinId?: string;
  boostMultiplier?: number;
}

export interface CharacterSkin {
  id: string;
  nameTh: string;
  nameEn: string;
  colorJacket: number;
  colorPants: number;
  colorHat: number;
  colorBackpack: number;
  speedMultiplier: number;
  previewColor: string;
}

export interface RoomClassmate {
  id: string;
  name: string;
  score: number;
  chestsOpened: number;
  alive: boolean;
  x: number;
  z: number;
  avatarUrl: string;
  status: string;
}

export interface TournamentParticipant {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  avatarUrl: string;
  score: number;
  isReady: boolean;
  chestsOpened?: number;
}

export interface BattleTournamentRoom {
  id: string;
  roomCode: string;
  roomName: string;
  hostTeacherId: string;
  hostTeacherName: string;
  subject: string;
  gradeLevel: string;
  durationMinutes: number;
  status: 'waiting' | 'in_progress' | 'completed';
  participants: TournamentParticipant[];
  createdAt: string;
}


export interface PeriodAttendanceRecord {
  id: string;
  schoolId?: string;
  courseId: string;
  courseCode: string;
  periodNumber: number; // e.g. 1, 2, 3...
  timeSlot: string; // e.g. "08:30 - 09:20"
  date: string;
  studentId: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  recordType?: 'check_in' | 'check_out'; // เช็กอินเข้าคาบ หรือ เช็กเอ้าท์เลิกคาบ
  verifiedByTeacherId: string;
  verifiedByTeacherName: string;
  checkMethod: 'student_mobile' | 'teacher_proxy' | 'qr_code';
  remarks?: string;
}

export interface PortfolioItem {
  id: string;
  schoolId?: string;
  ownerId: string;
  ownerRole: 'student' | 'teacher';
  ownerName: string;
  title: string;
  category: 'academic' | 'competition' | 'activity' | 'pa_research' | 'teaching_media' | 'certificate';
  year: string;
  description: string;
  imageUrl?: string;
  attachmentName?: string;
  skills: string[];
  certifiedBySchool: boolean;
  scoreBonus?: number;
}

// 1. Timetable / Schedule Management
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export interface SchoolPeriodTime {
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

export interface TimetableSlot {
  id: string;
  schoolId?: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number; // 1 to 8
  startTime: string; // e.g. "08:30"
  endTime: string; // e.g. "09:20"
  courseCode: string; // e.g. "TH301"
  courseTitleTh: string;
  courseTitleEn: string;
  teacherName: string;
  room: string;
  classRoom: string; // e.g. "ห้อง 401 (วิทย์-คณิต)", "ห้อง 402"
  colorTag: 'sky' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo' | 'cyan';
  courseId?: string;
  credits?: number;
  totalSemesterHours?: number;
}

// 2. Behavior Points & SDQ
export interface BehaviorRecord {
  id: string;
  schoolId?: string;
  studentId: string;
  studentName: string;
  studentRoom: string;
  date: string;
  type: 'merit' | 'demerit';
  points: number; // +10 or -5
  category: string;
  notes: string;
  recordedBy: string;
  lineNotified: boolean;
}

export interface SdqAssessment {
  id: string;
  schoolId?: string;
  studentId: string;
  studentName: string;
  studentRoom: string;
  assessorType: 'teacher' | 'parent' | 'student';
  assessorName: string;
  academicYear: string;
  semester: string;
  emotionalScore: number; // 0-10
  conductScore: number; // 0-10
  hyperactivityScore: number; // 0-10
  peerScore: number; // 0-10
  prosocialScore: number; // 0-10 (Strength)
  totalDifficultiesScore: number; // sum of 4 risk scores (0-40)
  overallStatus: 'normal' | 'risk' | 'problem';
  date: string;
  notes?: string;
}

// 3. School Infirmary & Health
export type InfirmaryCategory = 'fever' | 'stomach' | 'injury' | 'headache' | 'allergy' | 'other';
export type InfirmaryStatus = 'resting' | 'discharged' | 'sent_home' | 'hospital';

export interface InfirmaryVisit {
  id: string;
  schoolId?: string;
  studentId: string;
  studentName: string;
  gradeRoom: string;
  visitDate: string;
  visitTime: string;
  temperature: number; // e.g. 37.8
  symptoms: string;
  category: InfirmaryCategory;
  treatment: string;
  medicationDispensed?: string;
  bedNumber?: string;
  status: InfirmaryStatus;
  recordedByNurse: string;
  parentNotified: boolean;
  notes?: string;
}

// 4. Homework & Assignment Submission
export interface HomeworkSubmission {
  id: string;
  schoolId?: string;
  assignmentId: string;
  assignmentTitle: string;
  courseCode: string;
  courseTitleTh: string;
  studentId: string;
  studentName: string;
  studentRoom: string;
  dueDate: string;
  submittedAt?: string;
  status: 'submitted' | 'late' | 'pending' | 'graded';
  fileAttachment?: {
    name: string;
    size: string;
    type: string;
  };
  textSubmission?: string;
  score?: number;
  maxScore: number;
  teacherFeedback?: string;
  gradedAt?: string;
  gradedBy?: string;
}

export type LabSubjectCategory = 'chemistry' | 'math' | 'english' | 'computer' | 'thai' | 'social';

export interface LabChemicalItem {
  id: string;
  nameTh: string;
  nameEn: string;
  formula: string;
  color: string;
  state: 'liquid' | 'solid' | 'gas';
  ph?: number;
  hazard?: string;
  descriptionTh: string;
}

export interface LabSimulationQuest {
  id: string;
  schoolId?: string;
  subject: LabSubjectCategory;
  titleTh: string;
  titleEn: string;
  gradeLevel: string;
  conceptTh: string;
  conceptEn?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  scenarioTh: string;
  scenarioEn?: string;
  targetGoalTh: string;
  goalTh?: string;
  goalEn?: string;
  availableItems: LabChemicalItem[];
  correctItemIds: string[];
  requiredTool?: 'none' | 'burner' | 'stirrer';
  requiresHeating?: boolean;
  requiresStirring?: boolean;
  successTitleTh: string;
  successDescTh: string;
  successDescEn?: string;
  successMessageTh?: string;
  successMessageEn?: string;
  successProductColor: string;
  resultingColor?: string;
  successAnimation: 'bubbling_glow' | 'golden_crystal' | 'rocket_orbit' | 'gourmet_dish' | 'robot_dance' | 'lotus_aura' | 'world_discovery';
  failTitleTh: string;
  failDescTh: string;
  failDescEn?: string;
  failAnimation: 'lab_explosion' | 'rocket_crash' | 'burnt_food' | 'short_circuit' | 'banana_slip' | 'lost_explorer';
  scientificExplanationTh: string;
  expReward: number;
  gemReward: number;
  createdByTeacherName?: string;
}

export interface CompetencyDimension {
  id: string;
  nameTh: string;
  nameEn: string;
  score: number;
  benchmark: number;
  status: 'mastered' | 'proficient' | 'developing' | 'needs_support';
  color: string;
}

export interface StudentWeaknessDiagnostic {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  topicTh: string;
  accuracyRate: number;
  rootCauseTh: string;
  recommendedActionTh: string;
  microQuests: {
    questionTh: string;
    options: string[];
    correctIndex: number;
    explanationTh: string;
  }[];
  isResolved: boolean;
}

export interface HallOfFameTrophy {
  id: string;
  trophyType: 'grand_champion' | 'master_chemist' | 'orbital_astronaut' | 'eduarena_mvp';
  titleTh: string;
  titleEn: string;
  recipientStudentId: string;
  recipientName: string;
  studentRoom: string;
  avatarUrl: string;
  achievedDate: string;
  certificateCode: string;
  descriptionTh: string;
  primaryColor: string;
  materialName: string;
  pointsEarned: number;
}

export interface AtRiskStudentForecast {
  studentId: string;
  studentName: string;
  studentRoom: string;
  riskLevel: 'high' | 'moderate' | 'low';
  attendanceRate: number;
  homeworkCompletionRate: number;
  midtermAverageScore: number;
  sdqRiskStatus: 'normal' | 'risk' | 'problem';
  predictedOutcome: 'เสี่ยง มส. (เวลาเรียนไม่พอ)' | 'เสี่ยง ร. (งานค้างส่ง)' | 'เสี่ยงเกรดตกต่ำกว่าเกณฑ์' | 'ปกติ';
  earlyInterventionActions: {
    id: string;
    actionType: 'line_parent_alert' | 'counselor_meeting' | 'remedial_task';
    titleTh: string;
    status: 'pending' | 'in_progress' | 'completed';
    sentAt?: string;
  }[];
}

// 5. Daily Study Streaks, Season Battle Pass & Classroom Perks
export interface ClassroomPerk {
  id: string;
  titleTh: string;
  titleEn: string;
  costTokens: number;
  category: 'homework_pass' | 'seat_choice' | 'coop_coupon' | 'teacher_hint' | 'music_dj';
  descriptionTh: string;
  stock: number;
  iconName: string;
  redeemedCount: number;
}

export interface SeasonPassTier {
  level: number;
  requiredXp: number;
  freeRewardTh: string;
  premiumRewardTh: string;
  isUnlocked: boolean;
  isClaimed: boolean;
}

export interface DailyMicroQuest {
  id: string;
  date: string;
  subject: string;
  questionTh: string;
  options: string[];
  correctIndex: number;
  explanationTh: string;
  rewardTokens: number;
  rewardXp: number;
}

// 6. Cooperative Boss Raid (Team Peer-Tutoring)
export interface RaidPartyMember {
  id: string;
  name: string;
  avatarUrl: string;
  roleTitle: string; // e.g. "แนวหน้าคำนวณ", "จอมเวทไวยากรณ์", "วิศวกรซ่อมแซม"
  hasAnswered: boolean;
  damageDealt: number;
  isHelping: boolean;
}

export interface RaidParty {
  id: string;
  partyName: string;
  totalDamage: number;
  members: RaidPartyMember[];
  comboMultiplier: number;
}

export interface BossRaidConfig {
  id: string;
  bossNameTh: string;
  bossTitleTh: string;
  bossMaxHp: number;
  bossCurrentHp: number;
  subject: string;
  topicTh: string;
  timeRemainingSeconds: number;
  status: 'waiting' | 'in_battle' | 'defeated' | 'time_out';
  activeQuestion: {
    id: string;
    questionTh: string;
    options: string[];
    correctIndex: number;
    explanationTh: string;
    baseDamage: number;
  };
}

// 7. AI Socratic Voice & Chat Tutor + Teacher Insight
export interface SocraticChatMessage {
  id: string;
  sender: 'student' | 'socratic_tutor';
  textTh: string;
  timestamp: string;
  scaffoldingHint?: string;
  followUpPrompt?: string;
  audioPlaying?: boolean;
}

export interface TeacherStruggleInsight {
  id: string;
  subject: string;
  topicTh: string;
  studentStrugglePercent: number; // e.g. 34%
  questionCount: number;
  commonMisconceptionTh: string;
  suggestedLessonPlanTh: string;
  generatedAt: string;
}

// 8. Real-World Snap & Solve Quests
export interface RealWorldSnapQuest {
  id: string;
  subject: 'biology' | 'math' | 'physics' | 'english' | 'social';
  titleTh: string;
  titleEn: string;
  scenarioTh: string;
  instructionTh: string;
  exampleObjectTh: string;
  rewardXp: number;
  rewardTokens: number;
  status: 'available' | 'submitted' | 'verified';
  submittedPhotoUrl?: string;
  aiVerificationResult?: {
    identifiedObject: string;
    confidencePercent: number;
    feedbackTh: string;
    isPass: boolean;
  };
}

// 9. Admin <-> Super Admin Urgent Coordination Chat & Official Mail Desk
export interface AdminCoordinationAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl: string;
}

export interface AdminCoordinationMessage {
  id: string;
  schoolId: string;
  schoolName: string;
  senderRole: 'admin' | 'super_admin';
  senderName: string;
  senderEmail: string;
  channelType: 'chat' | 'letter';
  priority: 'urgent' | 'high' | 'normal';
  subject: string;
  body: string;
  attachments: AdminCoordinationAttachment[];
  status: 'open' | 'acknowledged' | 'resolved';
  readByAdmin: boolean;
  readBySuperAdmin: boolean;
  createdAt: string;
}

// 10. Imported User Login Credentials Tracking
export interface ImportedUserCredential {
  id: string;
  schoolId: string;
  role: 'student' | 'teacher';
  personCode: string;
  fullName: string;
  email: string;
  username: string;
  initialPassword: string;
  createdAt: string;
}

// 11. Central Exam Bank & School Licensing Marketplace (8 Learning Strands)
export interface CentralExamPack {
  id: string;
  titleTh: string;
  titleEn: string;
  strand: LearningStrandId;
  gradeLevel: string;
  descriptionTh: string;
  pricingType: 'free' | 'paid';
  priceThb: number;
  status: 'draft' | 'published';
  questions: QuizQuestion[];
  questionCount?: number;
  createdBy: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolExamEntitlement {
  id: string;
  schoolId: string;
  packId: string;
  claimType: 'free' | 'purchased';
  amountPaidThb: number;
  paymentMethod: 'free' | 'promptpay' | 'invoice';
  claimedBy: string;
  claimedAt: string;
  slipUrl?: string; // แนบสลิปหลักฐานการโอน 100% (บังคับสำหรับชุดข้อสอบที่สั่งซื้อ)
  slipAttachedAt?: string;
  auditStatus?: 'pending_audit' | 'verified' | 'revoked'; // โมเดลที่ 2: ปลดล็อกทันที + Super Admin ตรวจสอบสลิปย้อนหลัง
  verifiedAt?: string;
  verifiedBy?: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

// 12. Central Exam Bank Payment & PromptPay Settings (Requirement 2)
export interface CentralExamPaymentSettings {
  promptPayId: string;
  promptPayType: 'phone' | 'national_id' | 'tax_id' | 'e_wallet';
  accountName: string;
  bankName: string;
  accountNumber?: string;
  qrImageUrl: string; // Base64 Data URL or public image URL uploaded by Super Admin
  transferInstructions: string;
  notes?: string;
  enablePromptPay: boolean;
  enableInvoice: boolean;
  lastUpdated: string;
  updatedBy: string;
}

