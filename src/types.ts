export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

export type AppProgramMode = 'school_erp' | 'lms_classroom' | 'parent_portal';

export type AppLanguage = 'th' | 'en';

export type AppTheme = 'dark' | 'light';

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

export type StudentStatus = 'active' | 'graduated' | 'suspended' | 'transferred';

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
  lineOaId: string;
  createdAt: string;
  status: 'active' | 'pending' | 'suspended';
  subscriptionPlan?: 'Starter' | 'Professional' | 'Enterprise';
  appliedPromoCode?: string;
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

export interface Teacher {
  id: string;
  schoolId?: string;
  teacherIdNumber: string;
  fullNameTh: string;
  fullNameEn: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  avatarUrl: string;
  academicDegree: string;
  major: string;
  academicStanding: string;
  department: string;
  teacherLicenseNo: string;
  teachingSubjects: string[];
  homeroomClasses: string[]; // ครูสอนได้มากกว่า 1 ห้อง
  teachingGrades: string[]; // ครูสอนได้มากกว่า 1 ระดับชั้น
  isSchoolAdmin?: boolean; // ครูมีสิทธิ์เป็น admin ได้
  lineUserId?: string;
  lineLinked?: boolean;
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

export interface AttendanceRecord {
  id: string;
  schoolId?: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: AttendanceStatus;
  checkinMethod: 'qr_scanner' | 'rfid' | 'manual';
  remarks?: string;
  lineNotificationSent: boolean;
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
}

export interface Course {
  id: string;
  schoolId?: string;
  code: string; // e.g. "CS301", "MA201"
  titleEn: string;
  titleTh: string;
  category: 'core' | 'elective' | 'stem' | 'language' | 'arts';
  credits: number;
  teacherName: string;
  teacherEmail: string;
  department: string;
  schedule: string; // e.g. "Mon, Wed 09:00 - 10:30"
  room: string;
  academicYear: string;
  semester: '1' | '2' | 'Summer';
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
  letterGrade: 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'F';
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
  lineOaAddFriendUrl: string;
  lineChannelId: string;
  lineMessagingConfigured: boolean;
  resendApiKeyConfigured: boolean;
  resendFromEmail: string;
  supabaseConnected: boolean;
  thaiPdfFontEnabled: boolean;
  backupBucket: string;
  lastBackupDate: string;
  lineNotificationSettings?: LineNotificationSettings;
}

export interface QuizQuestion {
  id: string;
  schoolId?: string;
  subject: string; // e.g. "วิทยาศาสตร์", "คณิตศาสตร์", "ภาษาอังกฤษ"
  gradeLevel: string; // e.g. "ม.3", "ม.6"
  questionTh: string;
  questionEn: string;
  options: string[];
  correctIndex: number;
  explanationTh: string;
  category: 'onet' | 'general' | 'review' | 'exam';
  points: number;
}

export interface PlayerScore {
  userId: string;
  name: string;
  role: 'student' | 'teacher';
  avatarUrl: string;
  exp: number;
  gems: number;
  rankTitle: string;
  battleWins: number;
  streak: number;
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

