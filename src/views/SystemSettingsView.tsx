import React, { useEffect, useRef, useState } from 'react';
import { 
  BellRing, 
  MessageSquare, 
  Settings, 
  CheckCircle2, 
  QrCode, 
  Clock, 
  HeartPulse, 
  FileCheck2, 
  Award, 
  Receipt, 
  ShieldAlert, 
  Copy, 
  ExternalLink, 
  Save, 
  Smartphone, 
  Send, 
  RefreshCw, 
  HelpCircle,
  Building2,
  Calendar,
  Sparkles,
  Users,
  Check,
  ToggleLeft,
  ToggleRight,
  Database,
  Radio,
  Sliders,
  MapPin,
  Mail,
  KeyRound,
  GraduationCap,
  Upload
} from 'lucide-react';
import { SystemConfig, LineNotificationSettings, Student, AppLanguage, School, CampusGateGeofence, UserRole, SchoolFeatureFlags, SchoolTier } from '../types';
import {
  approveStudentAccountInSupabase,
  linkStudentAccountToStudent,
  listStudentAccountLinks,
  StudentAccountLink,
  updateStudentAccountStatusInSupabase,
} from '../lib/authDb';
import { SchoolGpsSettingsCard } from '../components/SchoolGpsSettingsCard';
import { SchoolStudentLoginSettingsCard } from '../components/SchoolStudentLoginSettingsCard';
import { uploadSchoolLogo } from '../lib/supabase';
import { DEFAULT_SEMESTER_OPTIONS, DEFAULT_STAFF_POSITION_OPTIONS } from '../lib/schoolSettings';
import { getAuditLogs } from '../lib/auditLog';
import { FEATURE_FLAG_LABELS, TIER_PRESETS, getSchoolFeatureFlags, saveSchoolFeatureFlags } from '../lib/schoolFeatureFlags';

interface SystemSettingsViewProps {
  systemConfig: SystemConfig;
  activeSchool: School;
  students: Student[];
  currentRole: UserRole;
  lang: AppLanguage;
  campusGates?: CampusGateGeofence[];
  onUpdateCampusGates?: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates?: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radiusMeters: number) => void;
  onUpdateSchool?: (updates: Partial<School>) => Promise<void>;
  onUpdateConfig: (updated: SystemConfig) => void;
  featureFlags?: SchoolFeatureFlags;
  onUpdateFeatureFlags?: (flags: SchoolFeatureFlags) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  systemConfig,
  activeSchool,
  students,
  currentRole,
  lang,
  campusGates = [],
  onUpdateCampusGates,
  onSaveCampusGates,
  onUpdateSchoolCoordinates,
  onUpdateSchool,
  onUpdateConfig,
  featureFlags: externalFeatureFlags,
  onUpdateFeatureFlags,
}) => {
  const [activeTab, setActiveTab] = useState<'line_events' | 'line_connection' | 'preview_simulator' | 'subscribers' | 'school_general' | 'school_gps' | 'student_accounts' | 'student_login_config' | 'saas_audit'>('line_events');
  const [localFlags, setLocalFlags] = useState<SchoolFeatureFlags>(
    () => externalFeatureFlags || getSchoolFeatureFlags(activeSchool.id, activeSchool.schoolTier || 'enterprise')
  );
  const [auditFilter, setAuditFilter] = useState<string>('all');
  useEffect(() => {
    setLocalFlags(externalFeatureFlags || getSchoolFeatureFlags(activeSchool.id, activeSchool.schoolTier || 'enterprise'));
  }, [activeSchool.id, externalFeatureFlags]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewSampleType, setPreviewSampleType] = useState<'checkin' | 'infirmary' | 'billing' | 'grades' | 'homework'>('checkin');
  const [simulatedSendState, setSimulatedSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [eventCategoryPage, setEventCategoryPage] = useState(0);
  const [subscriberPage, setSubscriberPage] = useState(0);
  const [studentAccounts, setStudentAccounts] = useState<StudentAccountLink[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentAccountsLoading, setStudentAccountsLoading] = useState(false);
  const [studentAccountSaving, setStudentAccountSaving] = useState(false);
  const [studentAccountError, setStudentAccountError] = useState<string | null>(null);
  const [studentAccountSuccess, setStudentAccountSuccess] = useState<string | null>(null);
  const [schoolLogoUploading, setSchoolLogoUploading] = useState(false);
  const [schoolLogoError, setSchoolLogoError] = useState<string | null>(null);
  const [schoolLogoSuccess, setSchoolLogoSuccess] = useState<string | null>(null);
  const schoolLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (
      activeTab !== 'student_accounts' ||
      !['admin', 'super_admin'].includes(currentRole)
    ) return;

    let active = true;
    setStudentAccountsLoading(true);
    setStudentAccountError(null);
    listStudentAccountLinks(activeSchool.id)
      .then((accounts) => {
        if (!active) return;
        setStudentAccounts(accounts);
        const defaultAccount = accounts.find((account) => account.status === 'pending' || !account.student_id) || accounts[0];
        setSelectedAccountId(defaultAccount?.id || '');
        setSelectedStudentId(defaultAccount?.student_id || '');
      })
      .catch((error: unknown) => {
        if (active) setStudentAccountError(error instanceof Error ? error.message : 'โหลดบัญชีนักเรียนไม่สำเร็จ');
      })
      .finally(() => {
        if (active) setStudentAccountsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, activeSchool.id, currentRole]);

  const reloadStudentAccounts = async () => {
    const accounts = await listStudentAccountLinks(activeSchool.id);
    setStudentAccounts(accounts);
  };

  const handleLinkStudentAccount = async () => {
    if (!selectedAccountId || !selectedStudentId) {
      setStudentAccountError('กรุณาเลือกบัญชีและรายชื่อนักเรียน');
      return;
    }

    setStudentAccountSaving(true);
    setStudentAccountError(null);
    setStudentAccountSuccess(null);
    try {
      await approveStudentAccountInSupabase(activeSchool.id, selectedAccountId, selectedStudentId);
      await linkStudentAccountToStudent(activeSchool.id, selectedAccountId, selectedStudentId);
      setStudentAccountSuccess('อนุมัติและผูกบัญชีกับระเบียนนักเรียนเรียบร้อยแล้ว');
      await reloadStudentAccounts();
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'ผูกบัญชีนักเรียนไม่สำเร็จ');
    } finally {
      setStudentAccountSaving(false);
    }
  };

  const handleApproveOrToggleStatus = async (account: StudentAccountLink, nextStatus: 'active' | 'suspended') => {
    setStudentAccountSaving(true);
    setStudentAccountError(null);
    setStudentAccountSuccess(null);
    try {
      if (nextStatus === 'active') {
        await approveStudentAccountInSupabase(activeSchool.id, account.id, account.student_id || null);
      } else {
        await updateStudentAccountStatusInSupabase(activeSchool.id, account.id, nextStatus);
      }
      setStudentAccountSuccess(
        nextStatus === 'active'
          ? `อนุมัติบัญชี "${account.full_name_th || account.full_name_en}" เปิดใช้งานเรียบร้อยแล้ว`
          : `ระงับสิทธิ์บัญชี "${account.full_name_th || account.full_name_en}" เรียบร้อยแล้ว`
      );
      await reloadStudentAccounts();
    } catch (error) {
      setStudentAccountError(error instanceof Error ? error.message : 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setStudentAccountSaving(false);
    }
  };

  // Form State
  const defaultLineSettings: LineNotificationSettings = systemConfig.lineNotificationSettings || {
    lineOaId: '@eduverse_official',
    lineOaName: 'EduVerse School Connect OA',
    channelId: systemConfig.lineChannelId || '2001928431',
    channelSecret: '8a9f3b1c6d7e2f50493817263548eabc',
    channelAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eduverse_official_line_messaging_token_long_lived_2569_production',
    liffId: '2001928431-Lx9kNmQz',
    webhookUrl: 'https://school.eduverse.in.th/api/line/webhook',
    addFriendUrl: systemConfig.lineOaAddFriendUrl || 'https://line.me/R/ti/p/@eduverse_official',
    qrCodeImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://line.me/R/ti/p/@eduverse_official',
    autoReplyGreeting: 'สวัสดีครับ ยินดีต้อนรับสู่ระบบแจ้งเตือนสารสนเทศโรงเรียน EduVerse Official สำหรับผู้ปกครองและนักเรียน',
    schoolStartTime: '08:00',
    lateCutoffTime: '08:15',
    absenceCutoffTime: '08:30',
    checkoutStartTime: '15:30',
    behaviorAlertThreshold: 5,
    notifyAttendanceCheckIn: true,
    notifyAttendanceCheckOut: true,
    notifyAttendanceLate: true,
    notifyAttendanceAbsence: true,
    notifyInfirmaryVisit: true,
    notifyBehaviorDeduction: true,
    notifyBehaviorMerit: true,
    notifyNewHomework: true,
    notifyHomeworkDeadline: true,
    notifyHomeworkGraded: true,
    notifyGradeReportReleased: true,
    notifyBillingInvoice: true,
    notifyBillingPaymentSuccess: true,
    notifyEmergencyBroadcast: true,
    customHeaderColor: '#00B900',
    customFooterNote: 'ระบบแจ้งเตือนอัตโนมัติ EduVerse SIS • หากมีข้อสงสัยติดต่อห้องธุรการ โทร 02-999-8888',
  };

  const [lineSettings, setLineSettings] = useState<LineNotificationSettings>(defaultLineSettings);
  const [generalConfig, setGeneralConfig] = useState({
    academicYear: systemConfig.academicYear,
    currentSemester: systemConfig.currentSemester,
    semesterOptions: systemConfig.semesterOptions || DEFAULT_SEMESTER_OPTIONS,
    gradingSystem: systemConfig.gradingSystem || 'thai',
    staffPositionOptions: systemConfig.staffPositionOptions || DEFAULT_STAFF_POSITION_OPTIONS,
    resendFromEmail: systemConfig.resendFromEmail,
    resendApiKeyConfigured: systemConfig.resendApiKeyConfigured,
    masterEmail: systemConfig.masterEmail || 'farmissara@gmail.com',
    replyToEmail: systemConfig.replyToEmail || 'farmissara@gmail.com',
    backupBucket: systemConfig.backupBucket,
  });

  useEffect(() => {
    setGeneralConfig((current) => ({
      ...current,
      academicYear: systemConfig.academicYear,
      currentSemester: systemConfig.currentSemester,
      semesterOptions: systemConfig.semesterOptions || DEFAULT_SEMESTER_OPTIONS,
      gradingSystem: systemConfig.gradingSystem || 'thai',
      staffPositionOptions: systemConfig.staffPositionOptions || DEFAULT_STAFF_POSITION_OPTIONS,
    }));
  }, [
    activeSchool.id,
    systemConfig.academicYear,
    systemConfig.currentSemester,
    systemConfig.semesterOptions,
    systemConfig.gradingSystem,
    systemConfig.staffPositionOptions,
  ]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSchoolLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSchoolLogoError(null);
    setSchoolLogoSuccess(null);
    setSchoolLogoUploading(true);
    try {
      const logoUrl = await uploadSchoolLogo(activeSchool.id, file);
      await onUpdateSchool?.({ logoUrl });
      setSchoolLogoSuccess('บันทึกโลโก้โรงเรียนเรียบร้อยแล้ว');
    } catch (error) {
      setSchoolLogoError(error instanceof Error ? error.message : 'ไม่สามารถบันทึกโลโก้โรงเรียนได้');
    } finally {
      setSchoolLogoUploading(false);
      event.target.value = '';
    }
  };

  const handleToggleEvent = (field: keyof LineNotificationSettings) => {
    setLineSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = async () => {
    setSaveError(null);
    const semesterOptions = [...new Set(generalConfig.semesterOptions.map((term) => term.trim()).filter(Boolean))];
    const staffPositionOptions = [...new Set(generalConfig.staffPositionOptions.map((position) => position.trim()).filter(Boolean))];
    if (semesterOptions.length === 0 || staffPositionOptions.length === 0) {
      setSaveError('กรุณาระบุภาคเรียนและตำแหน่งบุคลากรอย่างน้อยประเภทละ 1 รายการ');
      return;
    }
    const updated: SystemConfig = {
      ...systemConfig,
      academicYear: generalConfig.academicYear,
      currentSemester: generalConfig.currentSemester,
      semesterOptions,
      gradingSystem: generalConfig.gradingSystem,
      staffPositionOptions,
      resendFromEmail: generalConfig.resendFromEmail,
      resendApiKeyConfigured: generalConfig.resendApiKeyConfigured,
      masterEmail: generalConfig.masterEmail,
      replyToEmail: generalConfig.replyToEmail,
      backupBucket: generalConfig.backupBucket,
      lineChannelId: lineSettings.channelId,
      lineOaAddFriendUrl: lineSettings.addFriendUrl,
      lineMessagingConfigured: true,
      lineNotificationSettings: lineSettings,
    };

    try {
      if (['admin', 'super_admin'].includes(currentRole)) {
        await onUpdateSchool?.({
          academicYear: generalConfig.academicYear,
          currentSemester: generalConfig.currentSemester,
          semesterOptions,
          gradingSystem: generalConfig.gradingSystem,
          staffPositionOptions,
        });
      }
      onUpdateConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'บันทึกการตั้งค่าโรงเรียนไม่สำเร็จ');
    }
  };

  const handleSimulateSend = () => {
    setSimulatedSendState('sending');
    setTimeout(() => {
      setSimulatedSendState('sent');
      setTimeout(() => setSimulatedSendState('idle'), 3000);
    }, 900);
  };

  // Connected students count
  const connectedCount = students.filter(s => s.lineLinked).length;
  const connectedPct = students.length > 0 ? Math.round((connectedCount / students.length) * 100) : 0;

  // Event Categories for UI
  const eventCategories = [
    {
      id: 'attendance',
      titleTh: '1. ระบบเข้า-ออกโรงเรียน & เช็คชื่อ (Attendance & Gates)',
      descriptionTh: 'ส่งแจ้งเตือนเข้าห้องแชตผู้ปกครองทันทีที่นักเรียนสแกนบัตรหรือเช็คชื่อในชั้นเรียน',
      icon: Clock,
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
      events: [
        {
          key: 'notifyAttendanceCheckIn' as const,
          titleTh: 'แจ้งเตือนเมื่อนักเรียนแตะบัตรเข้าโรงเรียน (Check-in)',
          descTh: 'ส่งการ์ดระบุชื่อ เวลาเข้าแถว ประตูที่ผ่าน และภาพถ่ายกล้องวงจรปิดแบบเรียลไทม์',
        },
        {
          key: 'notifyAttendanceCheckOut' as const,
          titleTh: 'แจ้งเตือนเมื่อนักเรียนแตะบัตรออกจากโรงเรียน (Check-out)',
          descTh: 'แจ้งผู้ปกครองเมื่อนักเรียนเดินทางออกจากโรงเรียนหลังเวลาเลิกเรียน',
        },
        {
          key: 'notifyAttendanceLate' as const,
          titleTh: 'แจ้งเตือนกรณีมาสาย (Late Arrival Alert)',
          descTh: `แจ้งเตือนทันทีเมื่อเข้าโรงเรียนหลังเวลา ${lineSettings.lateCutoffTime} น. พร้อมแนะนำการปรับเวลา`,
        },
        {
          key: 'notifyAttendanceAbsence' as const,
          titleTh: 'แจ้งเตือนด่วนกรณีขาดเรียนหรือไม่ปรากฏตัว (Absence Alert)',
          descTh: `ส่งแจ้งเตือนเวลา ${lineSettings.absenceCutoffTime} น. หากระบบไม่พบบันทึกการสแกนบัตร`,
        },
      ]
    },
    {
      id: 'health',
      titleTh: '2. ห้องพยาบาล & การปฐมพยาบาล (Infirmary Health Alert)',
      descriptionTh: 'แจ้งเตือนเร่งด่วนเมื่อนักเรียนมีอาการเจ็บป่วยหรือเข้ารับการรักษาที่ห้องพยาบาล',
      icon: HeartPulse,
      badgeColor: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700',
      events: [
        {
          key: 'notifyInfirmaryVisit' as const,
          titleTh: 'แจ้งเตือนเมื่อนักเรียนเข้าห้องพยาบาล (Infirmary Visit)',
          descTh: 'ส่งข้อมูลอุณหภูมิร่างกาย อาการเบื้องต้น การปฐมพยาบาล และยาที่ได้รับทันที',
        },
      ]
    },
    {
      id: 'behavior',
      titleTh: '3. ความประพฤติ & วินัยนักเรียน (Behavior & Conduct)',
      descriptionTh: 'แจ้งเตือนพฤติกรรมทั้งด้านบวก (ทำความดี) และการตักเตือน (หักคะแนนพฤติกรรม)',
      icon: ShieldAlert,
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
      events: [
        {
          key: 'notifyBehaviorDeduction' as const,
          titleTh: 'แจ้งเตือนเมื่อถูกตัดคะแนนความประพฤติ (Conduct Deduction)',
          descTh: `ส่งแจ้งเตือนเหตุผล กฎระเบียบที่ผิด และคะแนนคงเหลือ (เมื่อถูกหักตั้งแต่ ${lineSettings.behaviorAlertThreshold} คะแนน)`,
        },
        {
          key: 'notifyBehaviorMerit' as const,
          titleTh: 'แจ้งเตือนเมื่อได้รับคะแนนความดี / จิตอาสา (Merit & Praise)',
          descTh: 'ส่งการ์ดยกย่องชมเชยเมื่อทำคุณงามความดีหรือช่วยเหลือสถานศึกษา',
        },
      ]
    },
    {
      id: 'academics',
      titleTh: '4. การเรียน การบ้าน & ผลการสอบ (Academics & Gradebook)',
      descriptionTh: 'รายงานความคืบหน้าทางการศึกษา มอบหมายงาน และการประเมินผลสัมฤทธิ์',
      icon: FileCheck2,
      badgeColor: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      events: [
        {
          key: 'notifyNewHomework' as const,
          titleTh: 'แจ้งเตือนเมื่อมีการบ้านใหม่ (New Assignment)',
          descTh: 'ส่งหัวข้อการบ้าน วิชา คำสั่ง และกำหนดส่ง เพื่อให้ผู้ปกครองช่วยติดตาม',
        },
        {
          key: 'notifyHomeworkDeadline' as const,
          titleTh: 'แจ้งเตือนล่วงหน้า 24 ชม. ก่อนครบกำหนดส่ง (Deadline Reminder)',
          descTh: 'ระบบส่งแจ้งเตือนอัตโนมัติเฉพาะนักเรียนที่ยังไม่ได้ส่งงาน',
        },
        {
          key: 'notifyHomeworkGraded' as const,
          titleTh: 'แจ้งผลการตรวจการบ้านและข้อเสนอแนะของครู (Graded Feedback)',
          descTh: 'ส่งคะแนนที่ได้ พร้อมคำแนะนำพัฒนาการเรียนรู้จากคุณครูผู้สอน',
        },
        {
          key: 'notifyGradeReportReleased' as const,
          titleTh: 'แจ้งเตือนเมื่อผลการเรียนประจำภาคเรียนออก (Grade & GPA Release)',
          descTh: 'ส่งสรุป GPA / GPAX พร้อมลิงก์เข้าดูและดาวน์โหลดเอกสาร ปพ.1 ดิจิทัล',
        },
      ]
    },
    {
      id: 'billing',
      titleTh: '5. ค่าธรรมเนียมการเรียน & การเงิน (Tuition & PromptPay Invoices)',
      descriptionTh: 'ส่งใบแจ้งยอดค่าเทอม พร้อม QR Code PromptPay และใบเสร็จรับเงิน',
      icon: Receipt,
      badgeColor: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700',
      events: [
        {
          key: 'notifyBillingInvoice' as const,
          titleTh: 'แจ้งเตือนใบแจ้งหนี้ค่าเทอม (Tuition Invoice with PromptPay)',
          descTh: 'ส่งการ์ดแจ้งยอดค่าใช้จ่ายพร้อมรูป QR Code PromptPay ชำระเงินได้ทันทีใน LINE',
        },
        {
          key: 'notifyBillingPaymentSuccess' as const,
          titleTh: 'ส่งใบเสร็จรับเงินดิจิทัลเมื่อชำระสำเร็จ (Payment Receipt)',
          descTh: 'ส่งใบเสร็จยืนยันการรับเงิน เลขที่ใบเสร็จ และบันทึกเข้าประวัติการเงิน',
        },
      ]
    },
    {
      id: 'broadcast',
      titleTh: '6. ข่าวสาร & ประกาศด่วนสถานศึกษา (School Broadcast)',
      descriptionTh: 'กระจายข่าวสารสำคัญ การปิดเรียนฉุกเฉิน หรือจดหมายข่าวจากโรงเรียน',
      icon: Radio,
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
      events: [
        {
          key: 'notifyEmergencyBroadcast' as const,
          titleTh: 'กระจายข้อความประกาศด่วน / ฉุกเฉิน (Emergency Broadcast)',
          descTh: 'บรอดแคสต์ตรงเข้า LINE ของผู้ปกครองทุกคนพร้อมกันใน 1 วินาที',
        },
      ]
    },
  ];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3.5">
      {/* Top Header Card */}
      <div className="shrink-0 relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-md border border-emerald-700">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-600 text-[11px] font-semibold text-emerald-100">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>LINE Official Account & System Automation Settings</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {lang === 'th' ? 'ตั้งค่าระบบ & การแจ้งเตือน LINE' : 'System & LINE Notification Settings'}
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {lang === 'th' 
                ? 'กำหนดค่าการเชื่อมต่อ LINE Messaging API, เลือกเหตุการณ์ที่ต้องการส่งแจ้งเตือนผู้ปกครอง (เข้าเรียน, ขาดเรียน, การบ้าน, ค่าเทอม, ห้องพยาบาล) พร้อมจำลองดูการ์ด Flex Message จริง'
                : 'Configure LINE Messaging API keys, customize event notification triggers for parents, and preview real-time Flex Message cards.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-700" />
              <span>{lang === 'th' ? 'บันทึกการตั้งค่า' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-emerald-200 text-[11px]">สถานะ LINE OA</div>
            <div className="font-bold flex items-center gap-1.5 mt-0.5 text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>เชื่อมต่อพร้อมใช้งาน</span>
            </div>
          </div>
          <div>
            <div className="text-emerald-200 text-[11px]">นักเรียนที่ผูก LINE</div>
            <div className="font-bold text-white mt-0.5">
              {connectedCount} จาก {students.length} คน ({connectedPct}%)
            </div>
          </div>
          <div>
            <div className="text-emerald-200 text-[11px]">เวลาตัดสาย / ขาด</div>
            <div className="font-bold text-white mt-0.5">
              {lineSettings.lateCutoffTime} น. / {lineSettings.absenceCutoffTime} น.
            </div>
          </div>
          <div>
            <div className="text-emerald-200 text-[11px]">ความเร็วส่งแจ้งเตือน</div>
            <div className="font-bold text-white mt-0.5">
              Instant (&lt; 0.8 วินาที)
            </div>
          </div>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0" />
            <div>
              <span className="font-bold">บันทึกการตั้งค่าระบบและเงื่อนไขการแจ้งเตือน LINE เรียบร้อยแล้ว!</span>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">ระบบจะใช้การตั้งค่าใหม่นี้ในการส่งการแจ้งเตือนอัตโนมัติไปยังผู้ปกครองทันที</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setSaveSuccess(false)}
            className="text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--color-border)] no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('line_events')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'line_events'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>{lang === 'th' ? 'เหตุการณ์ที่ต้องแจ้งเตือน LINE' : 'Notification Events'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview_simulator')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'preview_simulator'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{lang === 'th' ? 'จำลองหน้าจอแชต LINE & Flex Message' : 'Live Flex Message Simulator'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('line_connection')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'line_connection'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{lang === 'th' ? 'การเชื่อมต่อ LINE Messaging API' : 'LINE API & Webhook'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'subscribers'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'th' ? 'รายชื่อผู้รับแจ้งเตือน (Subscribers)' : 'Subscribers Directory'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('school_general')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'school_general'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{lang === 'th' ? 'ข้อมูลสถานศึกษา & สำรองข้อมูล' : 'General & Backup'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('school_gps')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'school_gps'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{lang === 'th' ? 'พิกัด GPS & Geofence ประตูโรงเรียน' : 'School GPS & Geofence'}</span>
        </button>

        {['admin', 'super_admin'].includes(currentRole) && (
          <button
            type="button"
            onClick={() => setActiveTab('student_accounts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'student_accounts'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>อนุมัติ &amp; ผูกบัญชีนักเรียน</span>
          </button>
        )}

        {['admin', 'super_admin'].includes(currentRole) && (
          <button
            type="button"
            onClick={() => setActiveTab('student_login_config')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'student_login_config'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>{lang === 'th' ? 'รูปแบบล็อกอินนักเรียน & ลิงก์โรงเรียน' : 'Student Login & School Link'}</span>
          </button>
        )}

        {['admin', 'super_admin'].includes(currentRole) && (
          <button
            type="button"
            onClick={() => setActiveTab('saas_audit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'saas_audit'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{lang === 'th' ? 'แพ็กเกจโมดูล & Audit Log' : 'Modules & Audit Log'}</span>
          </button>
        )}
      </div>

      {/* Tab Panels Container */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      {/* TAB 1: LINE Notification Events & Rules */}
      {activeTab === 'line_events' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Rules & Cutoff Timers Card */}
          <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-[var(--color-text-title)]">
              <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
              <h3 className="font-bold text-sm">การตั้งค่าเวลาและเกณฑ์การแจ้งเตือนอัตโนมัติ (Cutoff Times & Rules)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">เวลาเริ่มกิจกรรมหน้าเสาธง</label>
                <input
                  type="time"
                  value={lineSettings.schoolStartTime}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, schoolStartTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">เวลาตัดสาย (Late Cutoff)</label>
                <input
                  type="time"
                  value={lineSettings.lateCutoffTime}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, lateCutoffTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold text-amber-800 dark:text-amber-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">เวลาตัดขาดเรียน (Absence Cutoff)</label>
                <input
                  type="time"
                  value={lineSettings.absenceCutoffTime}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, absenceCutoffTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold text-rose-800 dark:text-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">เกณฑ์เตือนตัดคะแนนพฤติกรรม</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={lineSettings.behaviorAlertThreshold}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, behaviorAlertThreshold: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold"
                  />
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0">คะแนนขึ้นไป</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Categories Accordion / Cards */}
          <div className="space-y-4">
            {eventCategories.slice(eventCategoryPage, eventCategoryPage + 1).map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
                  <div className="p-4 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg border ${cat.badgeColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-[var(--color-text-title)]">{cat.titleTh}</h4>
                        <p className="text-[11px] text-[var(--color-text-muted)]">{cat.descriptionTh}</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--color-border)]">
                    {cat.events.map((evt) => {
                      const isEnabled = Boolean(lineSettings[evt.key]);
                      return (
                        <div key={evt.key} className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--color-card-subtle)] transition">
                          <div className="space-y-0.5 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-[var(--color-text-title)]">{evt.titleTh}</span>
                              {isEnabled ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-semibold">
                                  เปิดใช้งาน (Active)
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)] font-semibold">
                                  ปิดการส่ง (Disabled)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{evt.descTh}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleEvent(evt.key)}
                            className={`shrink-0 transition-transform active:scale-95 cursor-pointer ${
                              isEnabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                            }`}
                            title={isEnabled ? 'คลิกเพื่อปิด' : 'คลิกเพื่อเปิด'}
                          >
                            {isEnabled ? (
                              <ToggleRight className="w-9 h-9" />
                            ) : (
                              <ToggleLeft className="w-9 h-9" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {eventCategories.length > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-body)]">
                      <button type="button" onClick={() => setEventCategoryPage(page => Math.max(0, page - 1))} disabled={eventCategoryPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">หมวดก่อนหน้า</button>
                      <span>{eventCategoryPage + 1} / {eventCategories.length}</span>
                      <button type="button" onClick={() => setEventCategoryPage(page => Math.min(eventCategories.length - 1, page + 1))} disabled={eventCategoryPage === eventCategories.length - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">หมวดถัดไป</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {saveError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{saveError}</p>}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าเหตุการณ์แจ้งเตือน</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Live Smartphone Chat & Flex Message Simulator */}
      {activeTab === 'preview_simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Left Column: Sample Selector & Trigger Simulation */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-[var(--color-text-title)]">
                <Sliders className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <h3 className="font-bold text-sm">เลือกรูปแบบการ์ดจำลอง (Select Sample Message)</h3>
              </div>

              <div className="space-y-2">
                {[
                  {
                    id: 'checkin' as const,
                    title: '1. บัตรแจ้งสแกนเข้าเรียน (Check-in)',
                    desc: 'แสดงชื่อ เวลา และสถานะมาตรงเวลา/สาย',
                    badge: 'ยอดนิยม',
                  },
                  {
                    id: 'infirmary' as const,
                    title: '2. บัตรแจ้งเตือนห้องพยาบาล (Infirmary Visit)',
                    desc: 'แจ้งอาการ อุณหภูมิ และยาที่ได้รับ',
                    badge: 'เร่งด่วน',
                  },
                  {
                    id: 'billing' as const,
                    title: '3. บัตรแจ้งหนี้ค่าเทอมพร้อม PromptPay',
                    desc: 'ยอดชำระ และ QR PromptPay จ่ายในแอป',
                    badge: 'การเงิน',
                  },
                  {
                    id: 'grades' as const,
                    title: '4. บัตรสรุปผลการเรียน ปพ.1 (GPA Release)',
                    desc: 'ผลการเรียนเฉลี่ยและเกรดแต่ละวิชา',
                    badge: 'วิชาการ',
                  },
                  {
                    id: 'homework' as const,
                    title: '5. บัตรแจ้งเตือนการบ้านใหม่ (Assignment)',
                    desc: 'วิชา คำสั่ง และกำหนดส่ง',
                    badge: 'การบ้าน',
                  },
                ].map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setPreviewSampleType(sample.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      previewSampleType === sample.id
                        ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${previewSampleType === sample.id ? 'text-emerald-950 dark:text-emerald-100' : 'text-[var(--color-text-title)]'}`}>
                        {sample.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-card)] text-[var(--color-text-body)] font-semibold border border-[var(--color-border)]">
                        {sample.badge}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${previewSampleType === sample.id ? 'text-emerald-900 dark:text-emerald-200' : 'text-[var(--color-text-muted)]'}`}>{sample.desc}</p>
                  </button>
                ))}
              </div>

              {/* Action: Simulate Send */}
              <div className="pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={handleSimulateSend}
                  disabled={simulatedSendState === 'sending'}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  {simulatedSendState === 'sending' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งข้อความจำลองไปยัง LINE Webhook...</span>
                    </>
                  ) : simulatedSendState === 'sent' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>ส่งข้อความจำลองสำเร็จ! (จำลองแสดงผลในหน้าจอขวา)</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>🚀 ทดสอบส่งข้อความจำลอง (Simulate Live Send)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Customization Details */}
            <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-[var(--color-text-title)]">ปรับแต่งสีและข้อความท้ายบัตร (Custom Styling)</h4>
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">สีแถบหัวการ์ด (Header Accent Color)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={lineSettings.customHeaderColor}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, customHeaderColor: e.target.value }))}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-[var(--color-border)]"
                  />
                  <input
                    type="text"
                    value={lineSettings.customHeaderColor}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, customHeaderColor: e.target.value }))}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">ข้อความท้ายบัตร (Footer Disclaimer)</label>
                <textarea
                  rows={2}
                  value={lineSettings.customFooterNote}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, customFooterNote: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Realistic LINE Mobile Phone Frame Simulator */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-[360px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-700/80">
              {/* Phone Speaker Notch */}
              <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-600 rounded-full" />
              </div>

              {/* Phone Screen Container */}
              <div className="bg-[#78909C] rounded-[28px] overflow-hidden flex flex-col h-[580px] shadow-inner relative">
                {/* LINE Header Bar */}
                <div className="bg-emerald-700 text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white text-emerald-800 flex items-center justify-center font-black text-xs shadow-xs">
                      EV
                    </div>
                    <div>
                      <div className="font-bold text-xs truncate max-w-[170px] leading-tight text-white">
                        {lineSettings.lineOaName}
                      </div>
                      <div className="text-[9px] text-emerald-100 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                        <span>Official Account • Verified</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-white">10:45</div>
                </div>

                {/* Chat Scroll Area */}
                <div className="flex-1 p-3 overflow-hidden space-y-3">
                  <div className="text-center">
                    <span className="text-[10px] bg-black/20 text-white px-2.5 py-0.5 rounded-full">
                      วันนี้ • Today
                    </span>
                  </div>

                  {/* LINE Flex Message Card */}
                  <div className="bg-white rounded-2xl shadow-md overflow-hidden text-slate-900 text-xs border border-slate-200 animate-in zoom-in-95 duration-200">
                    {/* Header Accent */}
                    <div 
                      className="p-3 text-white flex items-center justify-between"
                      style={{ backgroundColor: lineSettings.customHeaderColor === '#00B900' ? '#047857' : (lineSettings.customHeaderColor || '#047857') }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="font-extrabold text-[11px] truncate">
                          {activeSchool.nameTh}
                        </span>
                      </div>
                      <span className="text-[9px] bg-black/35 px-1.5 py-0.5 rounded text-white font-mono">
                        SIS LIVE
                      </span>
                    </div>

                    {/* Card Content based on Preview Type */}
                    {previewSampleType === 'checkin' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">แจ้งเตือนเข้าเรียน</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                            ✓ ตรงเวลา
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          นายธนาธร สมชาย (น้องกอล์ฟ)
                        </div>

                        <div className="bg-slate-100 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">รหัสนักเรียน:</span>
                            <span className="font-semibold text-slate-900">STU-2026-0842</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">ระดับชั้น:</span>
                            <span className="font-semibold text-slate-900">มัธยมศึกษาปีที่ 4/1</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">เวลาที่สแกน:</span>
                            <span className="font-semibold text-emerald-800">07:42:15 น.</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">ช่องทาง:</span>
                            <span className="font-semibold text-slate-900">Gate Turnstile 1 (หน้าโรงเรียน)</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold shadow-xs hover:bg-emerald-800 cursor-pointer"
                        >
                          ดูสถิติการมาเรียนเดือนนี้
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'infirmary' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">ห้องพยาบาลแจ้งเตือน</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300">
                            ปฐมพยาบาลแล้ว
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          น.ส.วิภาดา รัตนโชติ (น้องฟ้า)
                        </div>

                        <div className="bg-rose-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">อาการที่พบ:</span>
                            <span className="font-bold text-rose-800">ปวดศีรษะ เป็นไข้ (38.1°C)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">การดูแล:</span>
                            <span className="font-semibold text-slate-900">พักผ่อนเตียง 2 + พาราเซตามอล 1 เม็ด</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">ครูพยาบาล:</span>
                            <span className="font-semibold text-slate-900">อ.สุดารัตน์ พยาบาลวิชาชีพ</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-rose-700 text-white text-[11px] font-bold shadow-xs hover:bg-rose-800 cursor-pointer"
                        >
                          โทรติดต่อห้องพยาบาลทันที
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'billing' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">ใบแจ้งหนี้ค่าเทอม</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-300">
                            รอชำระ
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          ภาคเรียนที่ 1/2569 • นายธนาธร สมชาย
                        </div>

                        <div className="bg-purple-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">ยอดที่ต้องชำระ:</span>
                            <span className="font-extrabold text-purple-900 text-xs">฿14,500.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">กำหนดชำระ:</span>
                            <span className="font-semibold text-slate-900">30 พ.ย. 2569</span>
                          </div>
                        </div>

                        {/* PromptPay QR Preview inside Card */}
                        <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=PROMPTPAY-0842-14500" 
                            alt="PromptPay QR" 
                            className="w-24 h-24 object-contain"
                          />
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-purple-700 text-white text-[11px] font-bold shadow-xs hover:bg-purple-800 cursor-pointer"
                        >
                          บันทึกภาพ QR เพื่อจ่ายในแอปธนาคาร
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'grades' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">ประกาศผลการเรียน</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-300">
                            GPA 3.92
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          ปพ.1 ดิจิทัล • นายธนาธร สมชาย
                        </div>

                        <div className="bg-blue-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">วิทยาการคำนวณ AI:</span>
                            <span className="font-bold text-blue-800">เกรด 4.00 (A)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">คณิตศาสตร์ขั้นสูง:</span>
                            <span className="font-bold text-blue-800">เกรด 4.00 (A)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">ภาษาอังกฤษวิชาการ:</span>
                            <span className="font-bold text-blue-800">เกรด 3.50 (B+)</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-blue-700 text-white text-[11px] font-bold shadow-xs hover:bg-blue-800 cursor-pointer"
                        >
                          เปิดดูเล่มผลการเรียน ปพ.1 ฉบับเต็ม
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'homework' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">มอบหมายการบ้านใหม่</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                            ส่งใน 3 วัน
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          วิชาวิทยาการคำนวณ (CS301)
                        </div>

                        <div className="bg-amber-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-700">หัวข้อ:</span>
                            <span className="font-bold text-slate-900">โครงงาน Mini AI Image Classifier</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">กำหนดส่ง:</span>
                            <span className="font-semibold text-rose-800">8 พ.ย. 2569 (23:59 น.)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">คะแนนเต็ม:</span>
                            <span className="font-semibold text-slate-900">20 คะแนน</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-amber-700 text-white text-[11px] font-bold shadow-xs hover:bg-amber-800 cursor-pointer"
                        >
                          ส่งการบ้านในระบบ LMS
                        </button>
                      </div>
                    )}

                    {/* Disclaimer Footer */}
                    <div className="px-3 pb-2.5 pt-1 text-[9px] text-slate-700 text-center border-t border-slate-200">
                      {lineSettings.customFooterNote}
                    </div>
                  </div>
                </div>

                {/* LINE Chat Input Simulation */}
                <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-between text-slate-700 text-xs">
                  <span>พิมพ์ข้อความถึงห้องธุรการ...</span>
                  <Send className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LINE API Connection & Webhook Configuration */}
      {activeTab === 'line_connection' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: API Keys Form */}
            <div className="lg:col-span-8 bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center font-bold text-xs">
                    API
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--color-text-title)]">LINE Developers Console Credentials</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">ข้อมูลจาก https://developers.line.biz ในส่วน Messaging API Channel</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold">
                  ✓ Configured
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-body)]">LINE Official Account ID</label>
                    <input
                      type="text"
                      value={lineSettings.lineOaId}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, lineOaId: e.target.value }))}
                      placeholder="@eduverse_official"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-body)]">ชื่อที่แสดงของบัญชี (LINE OA Name)</label>
                    <input
                      type="text"
                      value={lineSettings.lineOaName}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, lineOaName: e.target.value }))}
                      placeholder="EduVerse School Connect OA"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-body)]">Channel ID</label>
                    <input
                      type="text"
                      value={lineSettings.channelId}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, channelId: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--color-text-body)]">Channel Secret</label>
                    <input
                      type="password"
                      value={lineSettings.channelSecret}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, channelSecret: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-body)]">Channel Access Token (Long-Lived 24/7)</label>
                  <textarea
                    rows={2}
                    value={lineSettings.channelAccessToken}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, channelAccessToken: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-[11px]"
                  />
                </div>

                {/* Webhook Endpoint with Copy Button */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-body)]">Webhook URL (นำไปใส่ใน LINE Developers Console &gt; Messaging API)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={lineSettings.webhookUrl}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono text-[var(--color-text-title)] select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(lineSettings.webhookUrl, 'webhook')}
                      className="px-3.5 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-text-body)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedField === 'webhook' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                          <span className="text-emerald-800 dark:text-emerald-200">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอก URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-body)]">LIFF ID (LINE Front-end Framework สำหรับบัตรดิจิทัล)</label>
                  <input
                    type="text"
                    value={lineSettings.liffId}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, liffId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text-body)]">ข้อความทักทายอัตโนมัติเมื่อกดเพิ่มเพื่อน (Greeting Message)</label>
                  <textarea
                    rows={2}
                    value={lineSettings.autoReplyGreeting}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, autoReplyGreeting: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Right: QR Code & Add Friend Guide */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs text-center space-y-3">
                <h4 className="font-bold text-xs text-[var(--color-text-title)]">QR Code เพิ่มเพื่อน LINE OA โรงเรียน</h4>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner">
                  <img
                    src={lineSettings.qrCodeImageUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/R/ti/p/@eduverse_official'}
                    alt="LINE OA QR"
                    className="w-36 h-36 object-contain mx-auto"
                  />
                </div>
                <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {lineSettings.lineOaId}
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(lineSettings.addFriendUrl, 'addFriend')}
                    className="w-full py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedField === 'addFriend' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                        <span>คัดลอกลิงก์เรียบร้อย</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกลิงก์ Add Friend</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Developer Checklist */}
              <div className="bg-[var(--color-card-subtle)] rounded-2xl p-4 border border-[var(--color-border)] text-xs space-y-2">
                <span className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                  ข้อกำหนดในการเปิดใช้งานจริง:
                </span>
                <ul className="text-[11px] text-[var(--color-text-muted)] space-y-1 list-disc pl-4">
                  <li>เปิด <strong>Use webhook</strong> ใน LINE Developers เป็น Enabled</li>
                  <li>ปิด <strong>Auto-reply messages</strong> ใน LINE Official Account Manager เพื่อให้บอท Flex Message ทำงานได้สมบูรณ์</li>
                  <li>ตั้งค่า Webhook redelivery หากต้องการความแม่นยำสูง</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าการเชื่อมต่อ</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Subscribers & Connection Roster */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-[var(--color-text-title)]">
                สถานะการผูก LINE ของนักเรียนและผู้ปกครอง ({connectedCount}/{students.length} คน)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                รายชื่อนักเรียนที่มีการจับคู่บัญชี LINE Official Account เพื่อรับการแจ้งเตือนแบบตัวต่อตัว (1-on-1 Flex Message)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                ผูกแล้ว {connectedPct}%
              </span>
            </div>
          </div>

          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-body)] font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">รหัสนักเรียน</th>
                    <th className="px-4 py-3">ชื่อ - นามสกุล</th>
                    <th className="px-4 py-3">ระดับชั้น</th>
                    <th className="px-4 py-3">ผู้ปกครอง & เบอร์โทร</th>
                    <th className="px-4 py-3">สถานะ LINE</th>
                    <th className="px-4 py-3">LINE User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {students.slice(subscriberPage * 6, (subscriberPage + 1) * 6).map((stu) => (
                    <tr key={stu.id} className="hover:bg-[var(--color-card-subtle)] transition">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-title)]">
                        {stu.studentIdNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={stu.avatarUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)]"
                          />
                          <span className="font-bold text-[var(--color-text-title)]">
                            {stu.firstNameTh} {stu.lastNameTh}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-body)]">
                        {stu.gradeLevel} {stu.room}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-body)]">
                        <div>{stu.guardianName} ({stu.guardianRelation})</div>
                        <div className="text-[10px] text-[var(--color-text-muted)] font-mono">{stu.guardianPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        {stu.lineLinked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold">
                            <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
                            ผูก LINE แล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)] text-[10px] font-semibold">
                            ยังไม่ผูก
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--color-text-muted)]">
                        {stu.lineUserId || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {students.length > 6 && (
              <div className="flex items-center justify-between p-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-body)]">
                <button type="button" onClick={() => setSubscriberPage(page => Math.max(0, page - 1))} disabled={subscriberPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                <span>หน้า {subscriberPage + 1} / {Math.ceil(students.length / 6)} · {students.length} คน</span>
                <button type="button" onClick={() => setSubscriberPage(page => Math.min(Math.ceil(students.length / 6) - 1, page + 1))} disabled={subscriberPage >= Math.ceil(students.length / 6) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: General School Config & Database Backup */}
      {activeTab === 'school_general' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {['admin', 'super_admin'].includes(currentRole) && (
            <section className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] overflow-hidden flex items-center justify-center shrink-0">
                  {activeSchool.logoUrl ? (
                    <img src={activeSchool.logoUrl} alt={`โลโก้${activeSchool.nameTh}`} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">โลโก้โรงเรียน</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">ไฟล์ PNG, JPEG หรือ WebP ขนาดไม่เกิน 2 MB โลโก้จะแสดงบนแถบเมนูของโรงเรียน</p>
                  {schoolLogoError && <p role="alert" className="text-xs text-rose-600">{schoolLogoError}</p>}
                  {schoolLogoSuccess && <p role="status" className="text-xs text-emerald-700">{schoolLogoSuccess}</p>}
                </div>
                <input
                  ref={schoolLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleSchoolLogoUpload}
                />
                <button
                  type="button"
                  disabled={schoolLogoUploading}
                  onClick={() => schoolLogoInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  {schoolLogoUploading ? 'กำลังอัปโหลด...' : activeSchool.logoUrl ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}
                </button>
              </div>
            </section>
          )}

          <div className="bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <Building2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-title)]">ข้อมูลปีการศึกษา & อีเมลแจ้งเตือนสำรอง</h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">กำหนดค่าระบบภาพรวมของสถานศึกษา</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">ปีการศึกษาปัจจุบัน (Academic Year)</label>
                <input
                  type="text"
                  value={generalConfig.academicYear}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, academicYear: e.target.value }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">ภาคเรียนปัจจุบัน (Current Semester)</label>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {generalConfig.semesterOptions.map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      disabled={!['admin', 'super_admin'].includes(currentRole)}
                      onClick={() => setGeneralConfig(prev => ({ ...prev, currentSemester: sem }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                        generalConfig.currentSemester === sem
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
                      }`}
                    >
                      ภาคเรียนที่ {sem}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={generalConfig.currentSemester}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, currentSemester: e.target.value }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">รูปแบบเกรด</label>
                <select
                  value={generalConfig.gradingSystem}
                  onChange={(e) => setGeneralConfig((prev) => ({
                    ...prev,
                    gradingSystem: e.target.value as SystemConfig['gradingSystem'],
                  }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                >
                  <option value="thai">ไทย: 0–4 (8 ระดับ)</option>
                  <option value="international">สากล: A–F (4.0)</option>
                </select>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  ไทย: 4 ที่ 80%, 3.5 ที่ 75% ... 0 ต่ำกว่า 50% · สากล: A ที่ 90%, B ที่ 80%, C ที่ 70%, D ที่ 60%
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">รายการภาคเรียนที่ใช้ได้</label>
                <textarea
                  rows={4}
                  value={generalConfig.semesterOptions.join('\n')}
                  onChange={(e) => setGeneralConfig((prev) => ({
                    ...prev,
                    semesterOptions: e.target.value.split('\n'),
                  }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  placeholder={'1\n2\nSummer'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
                <p className="text-[10px] text-[var(--color-text-muted)]">ใส่หนึ่งรายการต่อบรรทัด ชื่อที่กำหนดจะแสดงในฟอร์มรายวิชาและหัวตาราง</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">ตำแหน่งบุคลากรที่เลือกได้</label>
                <textarea
                  rows={5}
                  value={generalConfig.staffPositionOptions.join('\n')}
                  onChange={(e) => setGeneralConfig((prev) => ({
                    ...prev,
                    staffPositionOptions: e.target.value.split('\n'),
                  }))}
                  disabled={!['admin', 'super_admin'].includes(currentRole)}
                  placeholder={DEFAULT_STAFF_POSITION_OPTIONS.join('\n')}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
                <p className="text-[10px] text-[var(--color-text-muted)]">ใส่หนึ่งตำแหน่งต่อบรรทัด รวมตำแหน่งที่โรงเรียนเพิ่มเอง</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--color-text-body)] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>อีเมล Master ระบบ (Master Authority Email)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setGeneralConfig(prev => ({ ...prev, masterEmail: 'farmissara@gmail.com' }))}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                  >
                    ตั้งเป็น farmissara@gmail.com
                  </button>
                </div>
                <input
                  type="email"
                  value={generalConfig.masterEmail}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, masterEmail: e.target.value }))}
                  placeholder="farmissara@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[10px] text-[var(--color-text-muted)] block">
                  อีเมลหลักสำหรับรับคำขอรีเซ็ตรหัสผ่าน, ยืนยันการลงทะเบียนโรงเรียน และแจ้งเตือนความปลอดภัยระบบ
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--color-text-body)] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>อีเมลตอบกลับยืนยัน (Confirmation Reply-To)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setGeneralConfig(prev => ({ ...prev, replyToEmail: 'farmissara@gmail.com' }))}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                  >
                    ตั้งเป็น farmissara@gmail.com
                  </button>
                </div>
                <input
                  type="email"
                  value={generalConfig.replyToEmail}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, replyToEmail: e.target.value }))}
                  placeholder="farmissara@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <span className="text-[10px] text-[var(--color-text-muted)] block">
                  กำหนดหัวอีเมล Reply-To เมื่อระบบส่งอีเมลยืนยันหรือแจ้งเตือนอัตโนมัติ
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">อีเมลแจ้งเตือนส่งออกจากระบบ (Resend Sender Email)</label>
                <input
                  type="email"
                  value={generalConfig.resendFromEmail}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, resendFromEmail: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-body)]">Cloud Backup Storage Bucket</label>
                <input
                  type="text"
                  value={generalConfig.backupBucket}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, backupBucket: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Master Authority Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-blue-950 dark:text-blue-100 flex items-center gap-2">
                    <span>Master Authority Email:</span>
                    <span className="font-mono bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200 font-bold">
                      {generalConfig.masterEmail || 'farmissara@gmail.com'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-1 leading-relaxed max-w-2xl">
                    อีเมลนี้ได้รับสิทธิ์สูงสุดในการเป็นตัวแทนระบบสำหรับ: ตอบกลับยืนยันการลงทะเบียนโรงเรียนใหม่, 
                    รับคำร้องขอเปลี่ยนรหัสผ่าน (Password Reset Authorization), แจ้งเตือนความปลอดภัยของระบบ Super Admin 
                    และการสื่อสารทางราชการ/ทะเบียน
                  </p>
                </div>
              </div>
              <a
                href={`mailto:${generalConfig.masterEmail || 'farmissara@gmail.com'}`}
                className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 self-center bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>เปิดโปรแกรมส่งอีเมล</span>
              </a>
            </div>

            {/* Backup Info */}
            <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                <div>
                  <div className="font-bold text-xs text-[var(--color-text-title)]">การสำรองข้อมูลอัตโนมัติ (Automated Database Backup)</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">สำรองล่าสุด: {systemConfig.lastBackupDate}</div>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold">
                ✓ เข้ารหัส AES-256
              </span>
            </div>
          </div>

          {saveError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{saveError}</p>}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่าทั่วไป</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: SCHOOL GPS & GEOFENCE */}
      {activeTab === 'school_gps' && (
        <div className="h-full">
          <SchoolGpsSettingsCard
            activeSchool={activeSchool}
            campusGates={campusGates}
            currentRole={currentRole}
            lang={lang}
            onUpdateCampusGates={onUpdateCampusGates || (() => {})}
            onSaveCampusGates={onSaveCampusGates}
            onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
          />
        </div>
      )}

      {activeTab === 'student_accounts' &&
        ['admin', 'super_admin'].includes(currentRole) && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">อนุมัติคำขอสมัคร &amp; ผูกบัญชีล็อกอินกับรายชื่อนักเรียน</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  ตรวจสอบนักเรียนที่สมัครสมาชิกเข้าโรงเรียน กดอนุมัติเปิดใช้งาน และจับคู่กับระเบียนนักเรียน DMC เพื่อระบุตัวตนและสิทธิ์เช็กอิน
                </p>
              </div>

              {studentAccountError && (
                <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {studentAccountError}
                </p>
              )}
              {studentAccountSuccess && (
                <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  {studentAccountSuccess}
                </p>
              )}

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="space-y-1 text-xs font-semibold text-[var(--color-text-body)]">
                  <span>บัญชีล็อกอิน</span>
                  <select
                    value={selectedAccountId}
                    onChange={(event) => {
                      const accountId = event.target.value;
                      setSelectedAccountId(accountId);
                      setSelectedStudentId(studentAccounts.find((account) => account.id === accountId)?.student_id || '');
                      setStudentAccountError(null);
                      setStudentAccountSuccess(null);
                    }}
                    disabled={studentAccountsLoading || studentAccounts.length === 0}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                  >
                    <option value="">เลือกบัญชี</option>
                    {studentAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.full_name_th || account.full_name_en || 'ไม่ระบุชื่อ'} ({account.status === 'pending' ? 'รออนุมัติ' : account.status})
                        {account.student_id ? ' · ผูกแล้ว' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold text-[var(--color-text-body)]">
                  <span>ระเบียนนักเรียน</span>
                  <select
                    value={selectedStudentId}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                    disabled={studentAccountsLoading || !selectedAccountId}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                  >
                    <option value="">เลือกรายชื่อนักเรียน</option>
                    {students.map((student) => {
                      const assignedElsewhere = studentAccounts.some(
                        (account) => account.id !== selectedAccountId && account.student_id === student.id
                      );
                      return (
                        <option key={student.id} value={student.id} disabled={assignedElsewhere}>
                          {student.firstNameTh} {student.lastNameTh} · {student.studentIdNumber}
                          {assignedElsewhere ? ' (ผูกกับบัญชีอื่นแล้ว)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleLinkStudentAccount}
                  disabled={studentAccountsLoading || studentAccountSaving || !selectedAccountId || !selectedStudentId}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {studentAccountSaving ? 'กำลังบันทึก...' : 'อนุมัติ & ผูกระเบียน'}
                </button>
              </div>

              {studentAccountsLoading ? (
                <p className="text-xs text-[var(--color-text-muted)]">กำลังโหลดบัญชีนักเรียน...</p>
              ) : studentAccounts.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">ไม่พบบัญชีนักเรียนของโรงเรียนนี้</p>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {studentAccounts.map((account) => {
                    const linkedStudent = students.find((student) => student.id === account.student_id);
                    return (
                      <div key={account.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[var(--color-text-title)]">
                              {account.full_name_th || account.full_name_en || 'ไม่ระบุชื่อ'}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                account.status === 'active'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                  : account.status === 'suspended'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                              }`}
                            >
                              {account.status === 'active' ? 'ใช้งานได้' : account.status === 'suspended' ? 'ระงับสิทธิ์' : 'รออนุมัติ'}
                            </span>
                          </div>
                          <p className="font-mono text-[10px] text-[var(--color-text-muted)]">
                            {account.email || account.id.slice(0, 8)} ·{' '}
                            {linkedStudent
                              ? `${linkedStudent.firstNameTh} ${linkedStudent.lastNameTh} (${linkedStudent.studentIdNumber})`
                              : 'ยังไม่ผูกกับรายชื่อนักเรียน'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {account.status !== 'active' ? (
                            <button
                              type="button"
                              disabled={studentAccountSaving}
                              onClick={() => void handleApproveOrToggleStatus(account, 'active')}
                              className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                            >
                              อนุมัติเปิดใช้งาน
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={studentAccountSaving}
                              onClick={() => void handleApproveOrToggleStatus(account, 'suspended')}
                              className="px-3 py-1 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                            >
                              ระงับสิทธิ์
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      {/* TAB 8: Student Login Configuration & Dedicated School Login Link (Requirement 1) */}
      {activeTab === 'student_login_config' &&
        ['admin', 'super_admin'].includes(currentRole) && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <SchoolStudentLoginSettingsCard
              activeSchool={activeSchool}
              lang={lang}
              onUpdateSchool={onUpdateSchool}
            />
          </div>
        )}

      {/* TAB 9: SaaS Module Feature Flags & Audit Log */}
      {activeTab === 'saas_audit' &&
        ['admin', 'super_admin'].includes(currentRole) && (() => {
          const allLogs = getAuditLogs(activeSchool.id);
          const filteredLogs = auditFilter === 'all' ? allLogs : allLogs.filter(l => l.actionType === auditFilter);
          const applyTier = (tier: SchoolTier) => {
            const next = { ...TIER_PRESETS[tier] };
            setLocalFlags(next);
            saveSchoolFeatureFlags(activeSchool.id, next);
            onUpdateFeatureFlags?.(next);
          };
          const toggleFlag = (key: keyof Omit<SchoolFeatureFlags, 'tier'>) => {
            const next = { ...localFlags, [key]: !localFlags[key] };
            setLocalFlags(next);
            saveSchoolFeatureFlags(activeSchool.id, next);
            onUpdateFeatureFlags?.(next);
          };
          return (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                      ขนาดโรงเรียน &amp; เปิด/ปิดโมดูลใช้งาน (Feature Flags)
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      ปรับความซับซ้อนของเมนูตามขนาดสถานศึกษาเพื่อลดความรกหน้าจอให้ครูและผู้ปกครอง
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['small', 'standard', 'enterprise'] as SchoolTier[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => applyTier(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          localFlags.tier === t
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-title)]'
                        }`}
                      >
                        {t === 'small' ? 'โรงเรียนขนาดเล็ก' : t === 'standard' ? 'ขนาดกลาง' : 'ครบทุกฟีเจอร์'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {FEATURE_FLAG_LABELS.map((item) => {
                    const enabled = localFlags[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleFlag(item.key)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                          enabled
                            ? 'bg-[var(--color-card)] border-[var(--color-primary)]'
                            : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] opacity-75'
                        }`}
                      >
                        <span className="font-semibold text-[var(--color-text-title)]">{item.labelTh}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          enabled
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {enabled ? 'เปิด' : 'ปิด'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                      ประวัติการเปลี่ยนแปลงข้อมูลสำคัญ (Audit Log · {filteredLogs.length})
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      บันทึกอัตโนมัติเมื่อมีการแก้เกรด อนุมัติสลิป เปลี่ยนภาคเรียน หรือลบรายวิชา
                    </p>
                  </div>
                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
                  >
                    <option value="all">ทุกประเภทเหตุการณ์ ({allLogs.length})</option>
                    <option value="grade_update">แก้ไขคะแนน/เกรด</option>
                    <option value="academic_period_update">เปลี่ยนปี/ภาคเรียน</option>
                    <option value="invoice_slip_approved">อนุมัติสลิปการเงิน</option>
                    <option value="invoice_slip_rejected">ปฏิเสธสลิปการเงิน</option>
                    <option value="feature_flags_update">ตั้งค่าโมดูลโรงเรียน</option>
                    <option value="quiz_grade_sync">ส่ง Quiz เข้าสมุดคะแนน</option>
                  </select>
                </div>

                {filteredLogs.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                    ยังไม่มีรายการ Audit Log ในหมวดที่เลือก (เมื่อมีการแก้ไขข้อมูลสำคัญ ระบบจะบันทึกที่นี่ทันที)
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--color-card-subtle)] border-y border-[var(--color-border)] text-[var(--color-text-body)]">
                        <tr>
                          <th className="py-2 px-3">เวลา</th>
                          <th className="py-2 px-3">ผู้ดำเนินการ</th>
                          <th className="py-2 px-3">ประเภท</th>
                          <th className="py-2 px-3">เป้าหมาย</th>
                          <th className="py-2 px-3">รายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {filteredLogs.slice(0, 30).map((log) => (
                          <tr key={log.id} className="hover:bg-[var(--color-card-subtle)]">
                            <td className="py-2 px-3 font-mono text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString('th-TH')}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[var(--color-text-title)]">
                              {log.actorName} <span className="text-[10px] text-[var(--color-text-muted)]">({log.actorRole})</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-mono text-[10px]">
                                {log.actionType}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-medium text-[var(--color-text-title)]">{log.targetLabel}</td>
                            <td className="py-2 px-3 text-[var(--color-text-body)]">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
