export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

export type AppProgramMode = 'school_erp' | 'lms_classroom' | 'parent_portal';

export type AppLanguage = 'th' | 'en';

export type AppTheme = 'dark' | 'light';

export type ThemePalette = 'light_sky' | 'light_warm' | 'light_mint' | 'sapphire' | 'emerald' | 'amethyst' | 'light';

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
  status: StudentStatus;
  avatarUrl: string;
  gpa: number;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;
  lineUserId?: string;
  lineLinked: boolean;
  lineNotifyEnabled: boolean;
  enrolledDate: string;
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

