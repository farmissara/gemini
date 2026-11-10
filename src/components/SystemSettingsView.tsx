import React, { useState } from 'react';
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
  MapPin
} from 'lucide-react';
import { SystemConfig, LineNotificationSettings, Student, AppLanguage, School, CampusGateGeofence } from '../types';
import { SchoolGpsSettingsCard } from './SchoolGpsSettingsCard';

interface SystemSettingsViewProps {
  systemConfig: SystemConfig;
  activeSchool: School;
  students: Student[];
  lang: AppLanguage;
  campusGates?: CampusGateGeofence[];
  onUpdateCampusGates?: (gates: CampusGateGeofence[]) => void;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radiusMeters: number) => void;
  onUpdateConfig: (updated: SystemConfig) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  systemConfig,
  activeSchool,
  students,
  lang,
  campusGates = [],
  onUpdateCampusGates,
  onUpdateSchoolCoordinates,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'line_events' | 'line_connection' | 'preview_simulator' | 'subscribers' | 'school_general' | 'school_gps'>('line_events');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewSampleType, setPreviewSampleType] = useState<'checkin' | 'infirmary' | 'billing' | 'grades' | 'homework'>('checkin');
  const [simulatedSendState, setSimulatedSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [eventCategoryPage, setEventCategoryPage] = useState(0);
  const [subscriberPage, setSubscriberPage] = useState(0);

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
    resendFromEmail: systemConfig.resendFromEmail,
    resendApiKeyConfigured: systemConfig.resendApiKeyConfigured,
    backupBucket: systemConfig.backupBucket,
  });

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleToggleEvent = (field: keyof LineNotificationSettings) => {
    setLineSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = () => {
    const updated: SystemConfig = {
      ...systemConfig,
      academicYear: generalConfig.academicYear,
      currentSemester: generalConfig.currentSemester,
      resendFromEmail: generalConfig.resendFromEmail,
      resendApiKeyConfigured: generalConfig.resendApiKeyConfigured,
      backupBucket: generalConfig.backupBucket,
      lineChannelId: lineSettings.channelId,
      lineOaAddFriendUrl: lineSettings.addFriendUrl,
      lineMessagingConfigured: true,
      lineNotificationSettings: lineSettings,
    };

    onUpdateConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
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
      badgeColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
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
      badgeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
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
      badgeColor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
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
      badgeColor: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
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
      badgeColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
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
      <div className="shrink-0 relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-md border border-emerald-600/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-emerald-100">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>LINE Official Account & System Automation Settings</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {lang === 'th' ? 'ตั้งค่าระบบ & การแจ้งเตือน LINE' : 'System & LINE Notification Settings'}
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {lang === 'th' 
                ? 'กำหนดค่าการเชื่อมต่อ LINE Messaging API, เลือกเหตุการณ์ที่ต้องการส่งแจ้งเตือนผู้ปกครอง (เข้าเรียน, ขาดเรียน, การบ้าน, ค่าเทอม, ห้องพยาบาล) พร้อมจำลองดูการ์ด Flex Message จริง'
                : 'Configure LINE Messaging API keys, customize event notification triggers for parents, and preview real-time Flex Message cards.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'th' ? 'บันทึกการตั้งค่า' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-emerald-200 text-[11px]">สถานะ LINE OA</div>
            <div className="font-bold flex items-center gap-1.5 mt-0.5 text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold">บันทึกการตั้งค่าระบบและเงื่อนไขการแจ้งเตือน LINE เรียบร้อยแล้ว!</span>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">ระบบจะใช้การตั้งค่าใหม่นี้ในการส่งการแจ้งเตือนอัตโนมัติไปยังผู้ปกครองทันที</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setSaveSuccess(false)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('line_events')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'line_events'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{lang === 'th' ? 'พิกัด GPS & Geofence ประตูโรงเรียน' : 'School GPS & Geofence'}</span>
        </button>
      </div>

      {/* Tab Panels Container */}
      <div className="flex-1 min-h-0 overflow-hidden pr-1">
      {/* TAB 1: LINE Notification Events & Rules */}
      {activeTab === 'line_events' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Rules & Cutoff Timers Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-white">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-sm">การตั้งค่าเวลาและเกณฑ์การแจ้งเตือนอัตโนมัติ (Cutoff Times & Rules)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">เวลาเริ่มกิจกรรมหน้าเสาธง</label>
                <input
                  type="time"
                  value={lineSettings.schoolStartTime}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, schoolStartTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">เวลาตัดสาย (Late Cutoff)</label>
                <input
                  type="time"
                  value={lineSettings.lateCutoffTime}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, lateCutoffTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-amber-700 dark:text-amber-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">เวลาตัดขาดเรียน (Absence Cutoff)</label>
                <input
                  type="time"
                  value={lineSettings.absenceCutoffTime}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, absenceCutoffTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-rose-700 dark:text-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">เกณฑ์เตือนตัดคะแนนพฤติกรรม</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={lineSettings.behaviorAlertThreshold}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, behaviorAlertThreshold: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300 shrink-0">คะแนนขึ้นไป</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Categories Accordion / Cards */}
          <div className="space-y-4">
            {eventCategories.slice(eventCategoryPage, eventCategoryPage + 1).map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg border ${cat.badgeColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{cat.titleTh}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">{cat.descriptionTh}</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cat.events.map((evt) => {
                      const isEnabled = Boolean(lineSettings[evt.key]);
                      return (
                        <div key={evt.key} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                          <div className="space-y-0.5 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{evt.titleTh}</span>
                              {isEnabled ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                                  เปิดใช้งาน (Active)
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                                  ปิดการส่ง (Disabled)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{evt.descTh}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleEvent(evt.key)}
                            className={`shrink-0 transition-transform active:scale-95 cursor-pointer ${
                              isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
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
                    <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      <button type="button" onClick={() => setEventCategoryPage(page => Math.max(0, page - 1))} disabled={eventCategoryPage === 0} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40">หมวดก่อนหน้า</button>
                      <span>{eventCategoryPage + 1} / {eventCategories.length}</span>
                      <button type="button" onClick={() => setEventCategoryPage(page => Math.min(eventCategories.length - 1, page + 1))} disabled={eventCategoryPage === eventCategories.length - 1} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40">หมวดถัดไป</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${previewSampleType === sample.id ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-800 dark:text-white'}`}>
                        {sample.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700">
                        {sample.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{sample.desc}</p>
                  </button>
                ))}
              </div>

              {/* Action: Simulate Send */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSimulateSend}
                  disabled={simulatedSendState === 'sending'}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-slate-800 dark:text-white">ปรับแต่งสีและข้อความท้ายบัตร (Custom Styling)</h4>
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">สีแถบหัวการ์ด (Header Accent Color)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={lineSettings.customHeaderColor}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, customHeaderColor: e.target.value }))}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700"
                  />
                  <input
                    type="text"
                    value={lineSettings.customHeaderColor}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, customHeaderColor: e.target.value }))}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">ข้อความท้ายบัตร (Footer Disclaimer)</label>
                <textarea
                  rows={2}
                  value={lineSettings.customFooterNote}
                  onChange={(e) => setLineSettings(prev => ({ ...prev, customFooterNote: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Realistic LINE Mobile Phone Frame Simulator */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-[360px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-700/80">
              {/* Phone Speaker Notch */}
              <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Phone Screen Container */}
              <div className="bg-[#78909C] rounded-[28px] overflow-hidden flex flex-col h-[580px] shadow-inner relative">
                {/* LINE Header Bar */}
                <div className="bg-[#00B900] text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white text-emerald-700 flex items-center justify-center font-black text-xs shadow-xs">
                      EV
                    </div>
                    <div>
                      <div className="font-bold text-xs truncate max-w-[170px] leading-tight">
                        {lineSettings.lineOaName}
                      </div>
                      <div className="text-[9px] text-emerald-100 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                        <span>Official Account • Verified</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-white/90">10:45</div>
                </div>

                {/* Chat Scroll Area */}
                <div className="flex-1 p-3 overflow-hidden space-y-3">
                  <div className="text-center">
                    <span className="text-[10px] bg-black/20 text-white px-2.5 py-0.5 rounded-full">
                      วันนี้ • Today
                    </span>
                  </div>

                  {/* LINE Flex Message Card */}
                  <div className="bg-white rounded-2xl shadow-md overflow-hidden text-slate-800 text-xs border border-slate-100 animate-in zoom-in-95 duration-200">
                    {/* Header Accent */}
                    <div 
                      className="p-3 text-white flex items-center justify-between"
                      style={{ backgroundColor: lineSettings.customHeaderColor || '#00B900' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="font-extrabold text-[11px] truncate">
                          {activeSchool.nameTh}
                        </span>
                      </div>
                      <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded text-white/90 font-mono">
                        SIS LIVE
                      </span>
                    </div>

                    {/* Card Content based on Preview Type */}
                    {previewSampleType === 'checkin' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">แจ้งเตือนเข้าเรียน</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                            ✓ ตรงเวลา
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          นายธนาธร สมชาย (น้องกอล์ฟ)
                        </div>

                        <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-600">รหัสนักเรียน:</span>
                            <span className="font-semibold text-slate-800">STU-2026-0842</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">ระดับชั้น:</span>
                            <span className="font-semibold text-slate-800">มัธยมศึกษาปีที่ 4/1</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">เวลาที่สแกน:</span>
                            <span className="font-semibold text-emerald-700">07:42:15 น.</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">ช่องทาง:</span>
                            <span className="font-semibold text-slate-800">Gate Turnstile 1 (หน้าโรงเรียน)</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-xs hover:bg-emerald-700"
                        >
                          ดูสถิติการมาเรียนเดือนนี้
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'infirmary' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">ห้องพยาบาลแจ้งเตือน</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                            ปฐมพยาบาลแล้ว
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          น.ส.วิภาดา รัตนโชติ (น้องฟ้า)
                        </div>

                        <div className="bg-rose-50/50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-600">อาการที่พบ:</span>
                            <span className="font-bold text-rose-700">ปวดศีรษะ เป็นไข้ (38.1°C)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">การดูแล:</span>
                            <span className="font-semibold text-slate-800">พักผ่อนเตียง 2 + พาราเซตามอล 1 เม็ด</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">ครูพยาบาล:</span>
                            <span className="font-semibold text-slate-800">อ.สุดารัตน์ พยาบาลวิชาชีพ</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold shadow-xs hover:bg-rose-700"
                        >
                          โทรติดต่อห้องพยาบาลทันที
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'billing' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">ใบแจ้งหนี้ค่าเทอม</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                            รอชำระ
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          ภาคเรียนที่ 1/2569 • นายธนาธร สมชาย
                        </div>

                        <div className="bg-purple-50/60 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-600">ยอดที่ต้องชำระ:</span>
                            <span className="font-extrabold text-purple-800 text-xs">฿14,500.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">กำหนดชำระ:</span>
                            <span className="font-semibold text-slate-800">30 พ.ย. 2569</span>
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
                          className="w-full py-1.5 rounded-lg bg-purple-600 text-white text-[11px] font-bold shadow-xs hover:bg-purple-700"
                        >
                          บันทึกภาพ QR เพื่อจ่ายในแอปธนาคาร
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'grades' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">ประกาศผลการเรียน</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                            GPA 3.92
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          ปพ.1 ดิจิทัล • นายธนาธร สมชาย
                        </div>

                        <div className="bg-blue-50/50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-600">วิทยาการคำนวณ AI:</span>
                            <span className="font-bold text-blue-700">เกรด 4.00 (A)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">คณิตศาสตร์ขั้นสูง:</span>
                            <span className="font-bold text-blue-700">เกรด 4.00 (A)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">ภาษาอังกฤษวิชาการ:</span>
                            <span className="font-bold text-blue-700">เกรด 3.50 (B+)</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold shadow-xs hover:bg-blue-700"
                        >
                          เปิดดูเล่มผลการเรียน ปพ.1 ฉบับเต็ม
                        </button>
                      </div>
                    )}

                    {previewSampleType === 'homework' && (
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">มอบหมายการบ้านใหม่</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                            ส่งใน 3 วัน
                          </span>
                        </div>

                        <div className="font-extrabold text-sm text-slate-900">
                          วิชาวิทยาการคำนวณ (CS301)
                        </div>

                        <div className="bg-amber-50/50 rounded-xl p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-600">หัวข้อ:</span>
                            <span className="font-bold text-slate-800">โครงงาน Mini AI Image Classifier</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">กำหนดส่ง:</span>
                            <span className="font-semibold text-rose-700">8 พ.ย. 2569 (23:59 น.)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">คะแนนเต็ม:</span>
                            <span className="font-semibold text-slate-800">20 คะแนน</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className="w-full py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold shadow-xs hover:bg-amber-700"
                        >
                          ส่งการบ้านในระบบ LMS
                        </button>
                      </div>
                    )}

                    {/* Disclaimer Footer */}
                    <div className="px-3 pb-2.5 pt-1 text-[9px] text-slate-600 text-center border-t border-slate-100">
                      {lineSettings.customFooterNote}
                    </div>
                  </div>
                </div>

                {/* LINE Chat Input Simulation */}
                <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-between text-slate-600 text-xs">
                  <span>พิมพ์ข้อความถึงห้องธุรการ...</span>
                  <Send className="w-4 h-4 text-emerald-600" />
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
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    API
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">LINE Developers Console Credentials</h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">ข้อมูลจาก https://developers.line.biz ในส่วน Messaging API Channel</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                  ✓ Configured
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">LINE Official Account ID</label>
                    <input
                      type="text"
                      value={lineSettings.lineOaId}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, lineOaId: e.target.value }))}
                      placeholder="@eduverse_official"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">ชื่อที่แสดงของบัญชี (LINE OA Name)</label>
                    <input
                      type="text"
                      value={lineSettings.lineOaName}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, lineOaName: e.target.value }))}
                      placeholder="EduVerse School Connect OA"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Channel ID</label>
                    <input
                      type="text"
                      value={lineSettings.channelId}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, channelId: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Channel Secret</label>
                    <input
                      type="password"
                      value={lineSettings.channelSecret}
                      onChange={(e) => setLineSettings(prev => ({ ...prev, channelSecret: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Channel Access Token (Long-Lived 24/7)</label>
                  <textarea
                    rows={2}
                    value={lineSettings.channelAccessToken}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, channelAccessToken: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-[11px]"
                  />
                </div>

                {/* Webhook Endpoint with Copy Button */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Webhook URL (นำไปใส่ใน LINE Developers Console &gt; Messaging API)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={lineSettings.webhookUrl}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-200 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(lineSettings.webhookUrl, 'webhook')}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedField === 'webhook' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-300">คัดลอกแล้ว</span>
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
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">LIFF ID (LINE Front-end Framework สำหรับบัตรดิจิทัล)</label>
                  <input
                    type="text"
                    value={lineSettings.liffId}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, liffId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">ข้อความทักทายอัตโนมัติเมื่อกดเพิ่มเพื่อน (Greeting Message)</label>
                  <textarea
                    rows={2}
                    value={lineSettings.autoReplyGreeting}
                    onChange={(e) => setLineSettings(prev => ({ ...prev, autoReplyGreeting: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Right: QR Code & Add Friend Guide */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-3">
                <h4 className="font-bold text-xs text-slate-800 dark:text-white">QR Code เพิ่มเพื่อน LINE OA โรงเรียน</h4>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner">
                  <img
                    src={lineSettings.qrCodeImageUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/R/ti/p/@eduverse_official'}
                    alt="LINE OA QR"
                    className="w-36 h-36 object-contain mx-auto"
                  />
                </div>
                <div className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {lineSettings.lineOaId}
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(lineSettings.addFriendUrl, 'addFriend')}
                    className="w-full py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedField === 'addFriend' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ข้อกำหนดในการเปิดใช้งานจริง:
                </span>
                <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
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
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                สถานะการผูก LINE ของนักเรียนและผู้ปกครอง ({connectedCount}/{students.length} คน)
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                รายชื่อนักเรียนที่มีการจับคู่บัญชี LINE Official Account เพื่อรับการแจ้งเตือนแบบตัวต่อตัว (1-on-1 Flex Message)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ผูกแล้ว {connectedPct}%
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">รหัสนักเรียน</th>
                    <th className="px-4 py-3">ชื่อ - นามสกุล</th>
                    <th className="px-4 py-3">ระดับชั้น</th>
                    <th className="px-4 py-3">ผู้ปกครอง & เบอร์โทร</th>
                    <th className="px-4 py-3">สถานะ LINE</th>
                    <th className="px-4 py-3">LINE User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.slice(subscriberPage * 6, (subscriberPage + 1) * 6).map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {stu.studentIdNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={stu.avatarUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {stu.firstNameTh} {stu.lastNameTh}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {stu.gradeLevel} {stu.room}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div>{stu.guardianName} ({stu.guardianRelation})</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{stu.guardianPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        {stu.lineLinked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ผูก LINE แล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold">
                            ยังไม่ผูก
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {stu.lineUserId || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {students.length > 6 && (
              <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                <button type="button" onClick={() => setSubscriberPage(page => Math.max(0, page - 1))} disabled={subscriberPage === 0} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40">ก่อนหน้า</button>
                <span>หน้า {subscriberPage + 1} / {Math.ceil(students.length / 6)} · {students.length} คน</span>
                <button type="button" onClick={() => setSubscriberPage(page => Math.min(Math.ceil(students.length / 6) - 1, page + 1))} disabled={subscriberPage >= Math.ceil(students.length / 6) - 1} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40">ถัดไป</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: General School Config & Database Backup */}
      {activeTab === 'school_general' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">ข้อมูลปีการศึกษา & อีเมลแจ้งเตือนสำรอง</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">กำหนดค่าระบบภาพรวมของสถานศึกษา</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">ปีการศึกษาปัจจุบัน (Academic Year)</label>
                <input
                  type="text"
                  value={generalConfig.academicYear}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, academicYear: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">ภาคเรียนปัจจุบัน (Current Semester)</label>
                <input
                  type="text"
                  value={generalConfig.currentSemester}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, currentSemester: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">อีเมลแจ้งเตือนสำรอง (Resend Sender Email)</label>
                <input
                  type="email"
                  value={generalConfig.resendFromEmail}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, resendFromEmail: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Cloud Backup Storage Bucket</label>
                <input
                  type="text"
                  value={generalConfig.backupBucket}
                  onChange={(e) => setGeneralConfig(prev => ({ ...prev, backupBucket: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Backup Info */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-white">การสำรองข้อมูลอัตโนมัติ (Automated Database Backup)</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">สำรองล่าสุด: {systemConfig.lastBackupDate}</div>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                ✓ เข้ารหัส AES-256
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
            lang={lang}
            onUpdateCampusGates={onUpdateCampusGates || (() => {})}
            onUpdateSchoolCoordinates={onUpdateSchoolCoordinates}
          />
        </div>
      )}
      </div>
    </div>
  );
};
