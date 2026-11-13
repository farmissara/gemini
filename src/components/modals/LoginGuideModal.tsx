import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  HelpCircle,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  Smartphone,
  UserCheck,
  X,
} from 'lucide-react';
import { AppLanguage } from '../../types';
import studentInviteImg from '../../assets/images/login_guide_student_invite_1794551973156.jpg';
import studentSigninImg from '../../assets/images/login_guide_student_signin_1794551974303.jpg';
import teacherSigninImg from '../../assets/images/login_guide_teacher_signin_1794551974875.jpg';

export type LoginGuideRoleTab = 'student' | 'teacher';

interface LoginGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: AppLanguage;
  initialRoleTab?: LoginGuideRoleTab;
  onActionFocusLogin?: () => void;
}

interface GuideStepItem {
  stepNumber: string;
  titleTh: string;
  titleEn: string;
  summaryTh: string;
  summaryEn: string;
  detailsTh: string[];
  detailsEn: string[];
  tipTh: string;
  tipEn: string;
  imageSrc: string;
  imageAltTh: string;
  imageAltEn: string;
  captionTh: string;
  captionEn: string;
}

const STUDENT_STEPS: GuideStepItem[] = [
  {
    stepNumber: '01',
    titleTh: 'ตรวจสอบอีเมลคำเชิญจากโรงเรียน',
    titleEn: 'Check Your School Invitation Email',
    summaryTh: 'ผู้ดูแลโรงเรียนจะส่งคำเชิญตั้งค่าบัญชีไปยังอีเมลของคุณหลังนำเข้าทะเบียนนักเรียนแล้ว',
    summaryEn: 'Your school administrator sends an account invitation link to your email after registering your student profile.',
    detailsTh: [
      'เปิดกล่องข้อความอีเมลของคุณ (ใช้ได้ทั้งบนมือถือและคอมพิวเตอร์)',
      'ค้นหาอีเมลหัวข้อคำเชิญเข้าใช้งานระบบ EduVerse จากโรงเรียน',
      'หากไม่พบในกล่องจดหมายหลัก ให้ตรวจสอบในโฟลเดอร์ Spam หรือ Junk ด้วย',
    ],
    detailsEn: [
      'Open your email inbox on your phone or computer.',
      'Look for the EduVerse account invitation message sent by your school.',
      'Check your Spam or Junk folder if you do not see it in your primary inbox.',
    ],
    tipTh: 'นักเรียนไม่สามารถกดสมัครเองจากแท็บ "สมัครสมาชิก" หน้าแรกได้ ต้องเข้าผ่านลิงก์เชิญที่โรงเรียนส่งให้เท่านั้น',
    tipEn: 'Students cannot self-register from the School Sign-Up tab; always use the invitation link sent by your school.',
    imageSrc: studentInviteImg,
    imageAltTh: 'ภาพประกอบนักเรียนเปิดดูอีเมลคำเชิญตั้งค่าบัญชีบนสมาร์ตโฟน',
    imageAltEn: 'Illustration of a student checking their school invitation email on a smartphone',
    captionTh: 'ขั้นตอน 01 · เปิดอีเมลคำเชิญที่โรงเรียนส่งให้เพื่อยืนยันตัวตน',
    captionEn: 'Step 01 · Open the invitation email sent by your school',
  },
  {
    stepNumber: '02',
    titleTh: 'กดลิงก์ในอีเมลเพื่อตั้งรหัสผ่าน',
    titleEn: 'Open the Link & Set Your Password',
    summaryTh: 'ตั้งรหัสผ่านส่วนตัวของคุณ (อย่างน้อย 8 ตัวอักษร) เพื่อเปิดใช้งานบัญชีนักเรียน',
    summaryEn: 'Click the invitation link and create a personal password (at least 8 characters) to activate your account.',
    detailsTh: [
      'คลิกลิงก์ยืนยันภายในอีเมลคำเชิญ (ลิงก์มีอายุใช้งานภายใน 7 วัน)',
      'กำหนดรหัสผ่านใหม่ความยาวอย่างน้อย 8 ตัวอักษร และจำไว้ใช้เข้าสู่ระบบ',
      'เมื่อตั้งรหัสผ่านเรียบร้อย ระบบจะผูกบัญชีเข้ากับรหัสนักเรียนและห้องเรียนของคุณอัตโนมัติ',
    ],
    detailsEn: [
      'Tap the confirmation link inside the email (valid for 7 days).',
      'Create a secure password with at least 8 characters and keep it private.',
      'Your login account is automatically linked to your student record and classroom.',
    ],
    tipTh: 'แนะนำให้ตั้งรหัสผ่านที่มีทั้งตัวอักษรภาษาอังกฤษและตัวเลข เพื่อความปลอดภัยและจำง่าย',
    tipEn: 'Use a mix of letters and numbers you can easily remember while keeping your account secure.',
    imageSrc: studentInviteImg,
    imageAltTh: 'ภาพประกอบนักเรียนตั้งค่ารหัสผ่านและยืนยันบัญชีผ่านมือถือ',
    imageAltEn: 'Illustration of a student activating their account via email link',
    captionTh: 'ขั้นตอน 02 · กดลิงก์จากอีเมลเพื่อตั้งรหัสผ่านและเปิดใช้งานบัญชี',
    captionEn: 'Step 02 · Set your password from the invitation link',
  },
  {
    stepNumber: '03',
    titleTh: 'กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ',
    titleEn: 'Sign In with Email & Password',
    summaryTh: 'กลับมาที่หน้าเข้าสู่ระบบ EduVerse เลือกแท็บ "เข้าสู่ระบบ" แล้วกรอกอีเมลพร้อมรหัสผ่านที่ตั้งไว้',
    summaryEn: 'Return to the EduVerse Sign In screen, enter your email and password, and click Sign In.',
    detailsTh: [
      'เปิดหน้าเว็บ EduVerse แล้วตรวจสอบว่าเลือกอยู่ที่แท็บ "เข้าสู่ระบบ"',
      'ช่องอีเมล: กรอกอีเมลเดียวกับที่รับคำเชิญจากโรงเรียน',
      'ช่องรหัสผ่าน: กรอกรหัสผ่านที่ตั้งไว้ จากนั้นกดปุ่ม "เข้าสู่ระบบ"',
    ],
    detailsEn: [
      'Open EduVerse and make sure the "Sign In" tab is selected.',
      'Email: enter the exact email address that received your school invitation.',
      'Password: enter your password and click "Sign In".',
    ],
    tipTh: 'หากกดเข้าสู่ระบบไม่ได้เพราะลืมรหัสผ่าน ให้กด "ลืมรหัสผ่าน?" ใต้ช่องกรอก เพื่อรับลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล',
    tipEn: 'If you forget your password, click "Forgot Password?" below the form to receive a reset link via email.',
    imageSrc: studentSigninImg,
    imageAltTh: 'ภาพประกอบนักเรียนเข้าสู่ระบบและเปิดใช้งานบัตร QR เช็คชื่อ',
    imageAltEn: 'Illustration of a student signing into the EduVerse portal on tablet and mobile',
    captionTh: 'ขั้นตอน 03 · ลงชื่อเข้าใช้ด้วยอีเมลและรหัสผ่านของคุณ',
    captionEn: 'Step 03 · Sign in with your email and password',
  },
  {
    stepNumber: '04',
    titleTh: 'ใช้งานเมนูนักเรียนและติดตั้งแอปบนมือถือ',
    titleEn: 'Use Student Tools & Optional Mobile App',
    summaryTh: 'หลังเข้าสู่ระบบ สามารถดูตารางเรียน เช็คชื่อมือถือ ส่งใบลา ดูเกรด และเพิ่มไอคอนแอปลงหน้าจอมือถือได้',
    summaryEn: 'Access your timetable, mobile check-in, leave requests, and grades—or install the PWA app to your home screen.',
    detailsTh: [
      'เช็คชื่อเข้าเรียน: ใช้เมนู "เช็คชื่อเข้าเรียนผ่านมือถือ" เพื่อสแกน QR รายคาบหรือเช็คอินด้วย GPS',
      'บัตรนักเรียนดิจิทัล: แสดง QR Code ประจำตัวสำหรับสแกนหน้าประตูโรงเรียน',
      'ติดตั้งแอปบนมือถือ: กดปุ่ม "ติดตั้งแอปบนมือถือ" เพื่อเปิดใช้งานเต็มจอโดยไม่ต้องเข้าเบราว์เซอร์ซ้ำ',
    ],
    detailsEn: [
      'Attendance: open "Mobile Check-in" to scan classroom period QR codes or check in with GPS.',
      'Digital Student ID: display your personal QR card at the school gate.',
      'Mobile App: tap "Install Mobile App" to add EduVerse to your phone home screen.',
    ],
    tipTh: 'หากเปิดผ่านมือถือ แนะนำให้กดเพิ่มลงหน้าจอโฮมไว้ จะเข้าเช็คชื่อและดูตารางเรียนได้เร็วขึ้นในครั้งต่อไป',
    tipEn: 'Adding EduVerse to your phone home screen gives one-tap fullscreen access for daily check-in.',
    imageSrc: studentSigninImg,
    imageAltTh: 'ภาพประกอบนักเรียนใช้งานแอป EduVerse และบัตร QR ดิจิทัล',
    imageAltEn: 'Illustration of a student using EduVerse digital ID card and mobile check-in',
    captionTh: 'ขั้นตอน 04 · พร้อมใช้งานตารางเรียน เช็คชื่อมือถือ และบัตรนักเรียนดิจิทัล',
    captionEn: 'Step 04 · Ready to use timetable, mobile check-in, and digital ID card',
  },
];

const TEACHER_STEPS: GuideStepItem[] = [
  {
    stepNumber: '01',
    titleTh: 'รับบัญชีผู้ใช้จากผู้ดูแลโรงเรียน',
    titleEn: 'Receive Your Staff Account from School Admin',
    summaryTh: 'ผู้ดูแลระบบของโรงเรียนจะสร้างบัญชีผู้สอน (อีเมล + รหัสผ่าน หรือลิงก์ตั้งรหัสผ่าน) และกำหนดสิทธิ์ครูให้คุณ',
    summaryEn: 'Your school administrator provisions your teacher account email, initial password or invite link, and teacher permissions.',
    detailsTh: [
      'ติดต่อผู้ดูแลระบบของโรงเรียนเพื่อขอรับอีเมลบัญชีและรหัสผ่านเริ่มต้น (หรือลิงก์เชิญทางอีเมล)',
      'ตรวจสอบให้แน่ใจว่าผู้ดูแลได้ผูกสิทธิ์บัญชีของคุณเข้ากับโรงเรียนและบทบาท "อาจารย์ผู้สอน" เรียบร้อยแล้ว',
      'หากได้ลิงก์ตั้งรหัสผ่านทางอีเมล ให้คลิกลิงก์เพื่อตั้งรหัสผ่านส่วนตัวก่อนเข้าสู่ระบบครั้งแรก',
    ],
    detailsEn: [
      'Obtain your provisioned school email and initial password (or invitation link) from your school admin.',
      'Ensure your account is linked to your school with the Teacher role activated.',
      'If you received a setup link via email, click it to set your personal password first.',
    ],
    tipTh: 'คุณครูไม่ต้องกดแท็บ "สมัครสมาชิก" ที่หน้าแรก เพราะแท็บนั้นใช้สำหรับลงทะเบียนเปิดโรงเรียนใหม่เท่านั้น',
    tipEn: 'Teachers should not use the "Sign Up" tab on the home screen—that tab is strictly for registering a new school.',
    imageSrc: teacherSigninImg,
    imageAltTh: 'ภาพประกอบคุณครูเตรียมเข้าสู่ระบบบริหารจัดการเรียนการสอน',
    imageAltEn: 'Illustration of a school teacher logging into EduVerse on a laptop',
    captionTh: 'ขั้นตอน 01 · ใช้บัญชีอีเมลที่ผู้ดูแลโรงเรียนกำหนดสิทธิ์อาจารย์ผู้สอนให้แล้ว',
    captionEn: 'Step 01 · Use the teacher email account provisioned by your school administrator',
  },
  {
    stepNumber: '02',
    titleTh: 'กรอกอีเมลและรหัสผ่านในหน้า "เข้าสู่ระบบ"',
    titleEn: 'Enter Your Email & Password on Sign In',
    summaryTh: 'เปิดหน้าเข้าสู่ระบบ EduVerse เลือกแท็บ "เข้าสู่ระบบ" กรอกอีเมลและรหัสผ่านของคุณ',
    summaryEn: 'Open EduVerse, keep the "Sign In" tab selected, and enter your email and password.',
    detailsTh: [
      'ไปที่ลิงก์เว็บไซต์ EduVerse ของโรงเรียน (แนะนำให้บันทึกบุ๊กมาร์กหรือติดตั้งเป็นแอป)',
      'กรอกอีเมลในช่อง "อีเมล" และรหัสผ่านในช่อง "รหัสผ่าน"',
      'กดปุ่ม "เข้าสู่ระบบ" ระบบจะตรวจสอบสิทธิ์และพาเข้าสู่หน้าหลักของคุณครูทันที',
    ],
    detailsEn: [
      'Go to your school EduVerse URL (bookmark it or install the PWA app for quick access).',
      'Enter your teacher email and password in the Sign In form.',
      'Click "Sign In" to load your school workspace automatically.',
    ],
    tipTh: 'หากกรอกรหัสผ่านไม่ผ่านหรือลืมรหัสผ่าน กดปุ่ม "ลืมรหัสผ่าน?" เพื่อส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ',
    tipEn: 'Use "Forgot Password?" below the password input if you need to reset your password via email.',
    imageSrc: teacherSigninImg,
    imageAltTh: 'ภาพประกอบคุณครูกำลังกรอกข้อมูลเข้าสู่ระบบบนคอมพิวเตอร์',
    imageAltEn: 'Illustration of a teacher entering sign-in credentials on a classroom laptop',
    captionTh: 'ขั้นตอน 02 · ลงชื่อเข้าใช้ที่แท็บ "เข้าสู่ระบบ" ด้วยอีเมลและรหัสผ่าน',
    captionEn: 'Step 02 · Sign in using your teacher email and password',
  },
  {
    stepNumber: '03',
    titleTh: 'เริ่มต้นใช้งานเช็คชื่อ รายวิชา และบันทึกคะแนน',
    titleEn: 'Start Taking Attendance, Courses & Grading',
    summaryTh: 'เมื่อเข้าสู่ระบบแล้ว เมนูเฉพาะสำหรับครูจะแสดงครบ ทั้งสแกนหน้าประตู เช็คชื่อรายคาบ และสมุดพกคะแนน',
    summaryEn: 'Once signed in, you gain access to gate scanning, classroom period QR check-in, courses, and gradebook.',
    detailsTh: [
      'เช็คชื่อหน้าประตู / สแกนรัว: ใช้เมนู "ระบบสแกนเช็คชื่อหน้าประตู" สำหรับครูเวรประจำจุดคัดกรอง',
      'เช็คชื่อในห้องเรียน: เปิด "เช็คชื่อเข้าเรียนผ่านมือถือ → รายคาบ (QR)" เพื่อสร้าง QR ให้นักเรียนสแกนเข้าคาบ',
      'งานสอนและเกรด: จัดการรายวิชา การบ้าน ห้องเรียน LMS และบันทึกคะแนนใน "ทะเบียนผลการเรียน"',
    ],
    detailsEn: [
      'Gate Duty: open "Gate QR Check-in" for rapid student card scanning and leave approvals.',
      'Classroom Periods: open "Mobile Check-in → Periods (QR)" to generate a live QR code for students.',
      'Teaching & Grades: manage courses, homework, LMS lessons, and scores in the Gradebook.',
    ],
    tipTh: 'คุณครูสามารถกดสลับไปมุมมองมือถือหรือติดตั้งเป็นแอปลงสมาร์ตโฟนเพื่อเช็คชื่อหน้าห้องเรียนได้สะดวกขึ้น',
    tipEn: 'You can also install EduVerse on your smartphone for quick in-class QR generation and attendance.',
    imageSrc: teacherSigninImg,
    imageAltTh: 'ภาพประกอบคุณครูใช้งานแดชบอร์ดเช็คชื่อและจัดการห้องเรียน',
    imageAltEn: 'Illustration of a teacher managing attendance and classroom tasks on dashboard',
    captionTh: 'ขั้นตอน 03 · จัดการเช็คชื่อรายคาบ อนุมัติใบลา และบันทึกคะแนนได้ในที่เดียว',
    captionEn: 'Step 03 · Manage classroom attendance, leave approvals, and grading in one place',
  },
];

const FAQ_ITEMS = [
  {
    qTh: 'ไม่ได้รับอีเมลคำเชิญ หรือลิงก์ตั้งรหัสผ่านหมดอายุ ต้องทำอย่างไร?',
    qEn: 'What if I did not receive the invitation email or the link expired?',
    aTh: 'ตรวจสอบในกล่อง Spam / Junk ของอีเมลก่อน หากยังไม่พบหรือลิงก์เกิน 7 วันแล้ว ให้แจ้งผู้ดูแลระบบของโรงเรียนกดส่งคำเชิญใหม่จากเมนู "ทะเบียนนักเรียน"',
    aEn: 'Check your Spam/Junk folder first. If it is missing or older than 7 days, ask your school administrator to resend the invitation from the Student Directory.',
  },
  {
    qTh: 'กรอกรหัสผ่านแล้วแจ้งเตือนว่า "บัญชีอยู่ระหว่างรออนุมัติ" ต้องทำอย่างไร?',
    qEn: 'What does "Account awaiting administrator approval" mean?',
    aTh: 'หมายความว่าบัญชียังไม่ถูกเปิดใช้งานเป็น Active ให้แจ้งผู้ดูแลโรงเรียนตรวจสอบสถานะบัญชีและผูกชื่อนักเรียน/สิทธิ์ครูให้เรียบร้อยก่อนจึงจะเข้าใช้งานได้',
    aEn: 'Your account status is still pending. Contact your school administrator to activate your account and confirm your school link.',
  },
  {
    qTh: 'นักเรียนหรือครูกดแท็บ "สมัครสมาชิก" ที่หน้าแรกเพื่อสร้างบัญชีเองได้ไหม?',
    qEn: 'Can students or teachers register themselves using the "Sign Up" tab?',
    aTh: 'ไม่ได้ครับ แท็บ "สมัครสมาชิก" มีไว้สำหรับผู้ดูแลลงทะเบียน "เปิดโรงเรียนใหม่" เท่านั้น บัญชีนักเรียนและครูต้องได้รับจากผู้ดูแลโรงเรียนเพื่อความปลอดภัยของข้อมูล',
    aEn: 'No. The "Sign Up" tab is exclusively for registering a new school tenant. Student and teacher accounts must be provisioned or invited by the school administrator.',
  },
  {
    qTh: 'ลืมรหัสผ่านเข้าสู่ระบบ ต้องขอรหัสใหม่ที่ไหน?',
    qEn: 'Where do I reset a forgotten password?',
    aTh: 'กดที่ลิงก์ "ลืมรหัสผ่าน? (ขอเปลี่ยน Password)" ใต้ช่องรหัสผ่านในหน้าเข้าสู่ระบบ กรอกอีเมลบัญชีของคุณ แล้วกดลิงก์ตั้งรหัสผ่านใหม่ที่ระบบส่งเข้าอีเมล',
    aEn: 'Click "Forgot Password?" below the password field on the Sign In form, enter your registered email, and follow the reset link sent to your inbox.',
  },
];

export const LoginGuideModal: React.FC<LoginGuideModalProps> = ({
  isOpen,
  onClose,
  lang = 'th',
  initialRoleTab = 'student',
  onActionFocusLogin,
}) => {
  const [roleTab, setRoleTab] = useState<LoginGuideRoleTab>(initialRoleTab);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setRoleTab(initialRoleTab);
      setActiveStepIndex(0);
    }
  }, [isOpen, initialRoleTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = roleTab === 'student' ? STUDENT_STEPS : TEACHER_STEPS;
  const safeIndex = Math.min(activeStepIndex, steps.length - 1);
  const activeStep = steps[safeIndex];
  const imageBroken = Boolean(failedImages[activeStep.imageSrc]);

  const handleRoleChange = (nextRole: LoginGuideRoleTab) => {
    setRoleTab(nextRole);
    setActiveStepIndex(0);
  };

  const handleGoToLogin = () => {
    onClose();
    onActionFocusLogin?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-guide-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-xs">
                <HelpCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="login-guide-modal-title"
                  className="text-base font-extrabold tracking-tight text-[var(--color-text-title)] text-balance sm:text-lg"
                >
                  {lang === 'th'
                    ? 'คู่มือขั้นตอนการเข้าสู่ระบบสำหรับนักเรียนและครู'
                    : 'Student & Teacher Sign-In Guide'}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {lang === 'th'
                    ? 'ภาพประกอบและคำแนะนำทีละขั้นตอน ลดปัญหาการสอบถามระหว่างเริ่มต้นใช้งาน'
                    : 'Step-by-step illustrated guide for activating and signing into your school account.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'th' ? 'ปิดคู่มือ' : 'Close guide'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-card-subtle)] hover:text-[var(--color-text-title)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Role Switcher Segmented Control */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label={lang === 'th' ? 'เลือกบทบาทผู้ใช้งาน' : 'Select user role'}
              className="inline-flex w-full sm:w-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={roleTab === 'student'}
                onClick={() => handleRoleChange('student')}
                className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] cursor-pointer ${
                  roleTab === 'student'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'สำหรับนักเรียน (4 ขั้นตอน)' : 'For Students (4 Steps)'}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={roleTab === 'teacher'}
                onClick={() => handleRoleChange('teacher')}
                className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] cursor-pointer ${
                  roleTab === 'teacher'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                <UserCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'สำหรับครูอาจารย์ (3 ขั้นตอน)' : 'For Teachers (3 Steps)'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] tabular-nums">
              <span>{lang === 'th' ? 'ใช้ได้ทั้งคอมพิวเตอร์และมือถือ' : 'Works on desktop & mobile'}</span>
              <span aria-hidden="true">·</span>
              <span>
                {lang === 'th'
                  ? `ขั้นตอน ${safeIndex + 1} / ${steps.length}`
                  : `Step ${safeIndex + 1} of ${steps.length}`}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 space-y-6">
          {/* Primary 2-Column Visual Guide */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            {/* Left: Visual Illustration Stage (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
                {!imageBroken ? (
                  <img
                    src={activeStep.imageSrc}
                    alt={lang === 'th' ? activeStep.imageAltTh : activeStep.imageAltEn}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [activeStep.imageSrc]: true,
                      }))
                    }
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-sky-100 via-indigo-50 to-white dark:from-slate-900 dark:via-indigo-950/60 dark:to-slate-900 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-sm">
                      {roleTab === 'student' ? (
                        <Mail className="h-7 w-7" aria-hidden="true" />
                      ) : (
                        <LogIn className="h-7 w-7" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-sm font-bold text-[var(--color-text-title)]">
                      {lang === 'th' ? activeStep.titleTh : activeStep.titleEn}
                    </p>
                  </div>
                )}

                <div className="bg-gradient-to-t from-slate-950/85 via-slate-950/55 to-transparent px-4 pb-3.5 pt-8 text-white absolute inset-x-0 bottom-0">
                  <p className="text-xs font-semibold leading-snug">
                    {lang === 'th' ? activeStep.captionTh : activeStep.captionEn}
                  </p>
                </div>
              </div>

              {/* Step Switcher Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5" role="group" aria-label={lang === 'th' ? 'เลือกหมายเลขขั้นตอน' : 'Step selector'}>
                  {steps.map((step, index) => {
                    const isActive = index === safeIndex;
                    return (
                      <button
                        key={step.stepNumber}
                        type="button"
                        onClick={() => setActiveStepIndex(index)}
                        className={`h-10 min-w-[40px] rounded-xl px-3 text-xs font-bold tabular-nums whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] cursor-pointer ${
                          isActive
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : 'border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
                        }`}
                      >
                        {step.stepNumber}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safeIndex === 0}
                    onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 text-xs font-bold text-[var(--color-text-body)] whitespace-nowrap shrink-0 transition hover:bg-[var(--color-card-subtle)] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{lang === 'th' ? 'ย้อนกลับ' : 'Back'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={safeIndex === steps.length - 1}
                    onClick={() => setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-bold text-white whitespace-nowrap shrink-0 transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                  >
                    <span>{lang === 'th' ? 'ขั้นตอนถัดไป' : 'Next Step'}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Active Step Instructions & Quick Overview (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold text-[var(--color-primary-text)] tabular-nums">
                    {roleTab === 'student'
                      ? lang === 'th'
                        ? `สำหรับนักเรียน · ขั้นตอนที่ ${activeStep.stepNumber}`
                        : `Student Guide · Step ${activeStep.stepNumber}`
                      : lang === 'th'
                        ? `สำหรับครูอาจารย์ · ขั้นตอนที่ ${activeStep.stepNumber}`
                        : `Teacher Guide · Step ${activeStep.stepNumber}`}
                  </p>
                  <h3 className="mt-1 text-base font-extrabold text-[var(--color-text-title)] leading-snug text-balance">
                    {lang === 'th' ? activeStep.titleTh : activeStep.titleEn}
                  </h3>
                  <p className="mt-1.5 text-xs text-[var(--color-text-body)] leading-relaxed">
                    {lang === 'th' ? activeStep.summaryTh : activeStep.summaryEn}
                  </p>
                </div>

                <ol className="space-y-2.5 border-t border-[var(--color-border)] pt-3.5">
                  {(lang === 'th' ? activeStep.detailsTh : activeStep.detailsEn).map((line, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-[var(--color-text-body)] leading-relaxed">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>

                <div className="rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/50 p-3 text-xs text-blue-950 dark:text-blue-100 leading-relaxed">
                  <span className="font-bold">{lang === 'th' ? 'ข้อแนะนำสำคัญ: ' : 'Important note: '}</span>
                  <span>{lang === 'th' ? activeStep.tipTh : activeStep.tipEn}</span>
                </div>
              </div>

              {/* Required Credentials Summary */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'สิ่งที่ต้องเตรียมก่อนเข้าสู่ระบบ' : 'What You Need Before Signing In'}
                </h4>
                <div className="grid grid-cols-1 gap-2 text-xs text-[var(--color-text-body)]">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-text)]" aria-hidden="true" />
                    <span>
                      {roleTab === 'student'
                        ? lang === 'th'
                          ? 'อีเมลที่แจ้งไว้กับโรงเรียนเพื่อรับลิงก์คำเชิญ'
                          : 'Email address registered with your school for the invitation link'
                        : lang === 'th'
                          ? 'อีเมลบัญชีครูที่ผู้ดูแลโรงเรียนกำหนดสิทธิ์ให้แล้ว'
                          : 'Teacher email address provisioned by your school admin'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-text)]" aria-hidden="true" />
                    <span>
                      {lang === 'th'
                        ? 'รหัสผ่านอย่างน้อย 8 ตัวอักษร (ตั้งจากอีเมลเชิญ หรือรับจากแอดมิน)'
                        : 'Password of at least 8 characters'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-text)]" aria-hidden="true" />
                    <span>
                      {lang === 'th'
                        ? 'เปิดจากเบราว์เซอร์ Chrome / Safari หรือติดตั้งเป็นแอปบนมือถือ'
                        : 'Chrome / Safari browser or installed EduVerse mobile app'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* All Steps Quick Jump Strip */}
          <div className="border-t border-[var(--color-border)] pt-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ภาพรวมทุกขั้นตอน (คลิกเพื่อดูรายละเอียด)' : 'All Steps Overview (Click to jump)'}
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                {steps.length} {lang === 'th' ? 'ขั้นตอน' : 'steps'}
              </span>
            </div>

            <div className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${steps.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {steps.map((step, index) => {
                const isSelected = index === safeIndex;
                return (
                  <button
                    key={step.stepNumber}
                    type="button"
                    onClick={() => setActiveStepIndex(index)}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                        : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <span className="text-[11px] font-extrabold text-[var(--color-primary-text)] tabular-nums">
                      {lang === 'th' ? `ขั้นตอน ${step.stepNumber}` : `Step ${step.stepNumber}`}
                    </span>
                    <span className="mt-1 text-xs font-bold text-[var(--color-text-title)] leading-snug">
                      {lang === 'th' ? step.titleTh : step.titleEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="border-t border-[var(--color-border)] pt-5 space-y-2.5">
            <h3 className="text-xs font-bold text-[var(--color-text-title)]">
              {lang === 'th' ? 'คำถามที่พบบ่อยระหว่างการเข้าสู่ระบบ' : 'Common Sign-In Questions'}
            </h3>
            <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              {FAQ_ITEMS.map((faq, idx) => (
                <details key={idx} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-[var(--color-text-title)] focus-visible:outline-none">
                    <span>{lang === 'th' ? faq.qTh : faq.qEn}</span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-2 text-xs text-[var(--color-text-body)] leading-relaxed">
                    {lang === 'th' ? faq.aTh : faq.aEn}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>
              {lang === 'th'
                ? 'ระบบแยกข้อมูลเฉพาะโรงเรียนและตรวจสอบสิทธิ์ตามบทบาท'
                : 'School-isolated access with role-based permissions'}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {onActionFocusLogin && (
              <button
                type="button"
                onClick={handleGoToLogin}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-bold text-white whitespace-nowrap shrink-0 transition hover:bg-[var(--color-primary-hover)] cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{lang === 'th' ? 'ไปยังช่องเข้าสู่ระบบ' : 'Go to Sign In'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-xs font-bold text-[var(--color-text-body)] whitespace-nowrap shrink-0 transition hover:bg-[var(--color-card-subtle)] cursor-pointer"
            >
              {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
