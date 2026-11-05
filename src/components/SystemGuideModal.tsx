import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  Building2, 
  Users, 
  ShieldCheck, 
  GraduationCap, 
  Award, 
  QrCode, 
  Receipt, 
  BellRing, 
  Cpu, 
  Swords, 
  FolderGit2, 
  Smartphone, 
  Laptop, 
  Key, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Layers,
  Lock,
  Mail,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { AppLanguage, UserRole, School } from '../types';

interface SystemGuideModalProps {
  activeSchool: School;
  lang: AppLanguage;
  onClose: () => void;
  onNavigateTab?: (tab: any) => void;
  onSwitchRole?: (role: UserRole) => void;
}

export const SystemGuideModal: React.FC<SystemGuideModalProps> = ({
  activeSchool,
  lang,
  onClose,
  onNavigateTab,
  onSwitchRole,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'modules' | 'roles_auth' | 'workflows'>('architecture');

  const modulesList = [
    {
      id: 'dashboard',
      nameTh: '1. แดชบอร์ดภาพรวม (Dashboard Overview)',
      icon: Layers,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      description: 'ศูนย์รวมสถิติ Real-time ของโรงเรียน: จำนวนนักเรียนที่กำลังศึกษา, อัตราการมาเรียนวันนี้, ยอดจัดเก็บค่าเทอมพร้อมเพย์, สัดส่วนการผูก LINE ของผู้ปกครอง และรายชื่อนักเรียนเกียรตินิยม GPA สูงสุด',
      forRoles: ['แอดมิน', 'ครู', 'นักเรียน', 'ผู้ปกครอง'],
    },
    {
      id: 'students',
      nameTh: '2. ทะเบียนประวัตินักเรียน (Student Directory)',
      icon: Users,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      description: 'ระบบจัดการข้อมูลประวัตินักเรียนรายบุคคล (SIS): เลขประจำตัว, เลขบัตรประชาชน, เกรดเฉลี่ยสะสม (GPAX), ข้อมูลผู้ปกครองพร้อมเบอร์ติดต่อ และสถานะการเชื่อมโยง LINE Notify เพื่อแจ้งเตือนการเข้าเรียน',
      forRoles: ['แอดมิน', 'ครู'],
    },
    {
      id: 'courses',
      nameTh: '3. หลักสูตร & รายวิชา (Courses & Curriculum)',
      icon: BookOpen,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      description: 'จัดการแผนการเรียนตามกลุ่มสาระ (Core, STEM, ภาษา, ศิลปะ): รหัสวิชา, หน่วยกิต, ครูผู้สอน, ห้องเรียน, ตารางสอนรายสัปดาห์ และรายชื่อนักเรียนที่ลงทะเบียนเรียนในแต่ละวิชา',
      forRoles: ['แอดมิน', 'ครู', 'นักเรียน'],
    },
    {
      id: 'attendance',
      nameTh: '4. เช็คชื่อเข้าแถว/รายวัน (Attendance Station)',
      icon: QrCode,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'จุดเช็คชื่อหน้าประตูโรงเรียน/เข้าแถวเคารพธงชาติ: รองรับการสแกน QR Code ประจำตัวนักเรียน หรือ RFID บันทึกเวลาอัตโนมัติ พร้อมระบบยิง PUSH Notification เข้า LINE ผู้ปกครองทันทีเมื่อลูกถึงโรงเรียน',
      forRoles: ['แอดมิน', 'ครู'],
    },
    {
      id: 'mobile_checkin',
      nameTh: '5. เช็คชื่อมือถือ & รายคาบ (Mobile Period Check-in)',
      icon: Smartphone,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      description: 'ออกแบบให้ครูประจำวิชาถือสมาร์ตโฟนหรือแท็บเล็ตเดินเช็คชื่อในห้องเรียนรายคาบได้สะดวกรวดเร็ว (มา, สาย, ลา, ขาด) และสร้าง QR Code หน้าจอให้นักเรียนสแกนเช็คชื่อเข้าห้องเรียนได้',
      forRoles: ['แอดมิน', 'ครู'],
    },
    {
      id: 'games',
      nameTh: '6. EduBattle 3D Game (เกมตอบคำถามประลองความรู้)',
      icon: Swords,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description: 'เกม 3D Battle Royale ตอบคำถามวิชาการ (O-NET/TGAT) เปลี่ยนการทบทวนบทเรียนให้เป็นเกมสนุก แข่งขันแบบ 1v1 สะสมคะแนนเหรียญ EXP และแลกรับของรางวัลประจำโรงเรียน',
      forRoles: ['นักเรียน', 'ครู', 'แอดมิน'],
    },
    {
      id: 'portfolio',
      nameTh: '7. แฟ้มผลงาน TCAS/PA (Digital Portfolio)',
      icon: FolderGit2,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      description: 'ระบบสะสมเกียรติบัตรและผลงานดิจิทัลของนักเรียนสำหรับยื่นมหาวิทยาลัยรอบ Portfolio (TCAS รอบ 1) และสำหรับคุณครูใช้ประเมินวิทยฐานะ ว.PA ตามเกณฑ์กระทรวงศึกษาธิการ',
      forRoles: ['นักเรียน', 'ครู', 'แอดมิน'],
    },
    {
      id: 'gradebook',
      nameTh: '8. บันทึกคะแนน & ปพ.1 (Gradebook & Transcript)',
      icon: Award,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      description: 'บันทึกคะแนนเก็บระหว่างภาค, สอบกลางภาค, สอบปลายภาค คำนวณเกรดอัตโนมัติ (A, B+, B, C+, C, D+, D, F) พร้อมระบบสร้างใบรายงานผลการเรียน (ปพ.1) สองภาษาไทย-อังกฤษ พร้อมปรินต์หรือโหลด PDF',
      forRoles: ['แอดมิน', 'ครู', 'นักเรียน', 'ผู้ปกครอง'],
    },
    {
      id: 'billing',
      nameTh: '9. การเงิน & ค่าเทอมพร้อมเพย์ (Tuition & Invoices)',
      icon: Receipt,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      description: 'ระบบออกใบแจ้งหนี้ค่าเทอมอัตโนมัติ สร้าง QR Code พร้อมเพย์ตามยอดจริง ผู้ปกครองสามารถสแกนจ่ายผ่านแอปธนาคารใดก็ได้ และออกใบเสร็จรับเงินอย่างเป็นทางการทันที',
      forRoles: ['แอดมิน', 'ผู้ปกครอง'],
    },
    {
      id: 'announcements',
      nameTh: '10. ข่าวสาร & บรอดแคสต์ LINE (Announcements)',
      icon: BellRing,
      color: 'text-[#06C755] bg-[#06C755]/10 border-[#06C755]/30',
      description: 'ประชาสัมพันธ์ข่าวกิจกรรม วันหยุด การประชุมผู้ปกครอง พร้อมปุ่มยิง LINE Broadcast ไปยัง LINE Official Account ของโรงเรียนเพื่อแจ้งผู้ปกครองทุกคนพร้อมกันในคลิกเดียว',
      forRoles: ['แอดมิน', 'ครู', 'นักเรียน', 'ผู้ปกครอง'],
    },
    {
      id: 'supabase_studio',
      nameTh: '11. Supabase Studio (จัดการ SQL & ตารางฐานข้อมูล)',
      icon: Cpu,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'ศูนย์ควบคุมฐานข้อมูลในตัวระบบ: มี SQL Editor สำหรับพิมพ์คำสั่งและกด RUN, มี Table Editor สำหรับเปิดดูตารางคล้าย Excel และมีช่องใส่กุญแจ API เพื่อเชื่อมต่อ Supabase บน Cloud',
      forRoles: ['แอดมิน'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  คู่มือและแผนผังแนะนำระบบ EduVerse ทั้งระบบ
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Comprehensive Guide
                </span>
              </div>
              <p className="text-xs text-slate-400">
                เข้าใจโครงสร้าง Multi-Tenant, การทำงานของ 11 โมดูลหลัก และบทบาทสิทธิ์การเข้าใช้งาน
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>1. โครงสร้างโรงเรียน (Multi-Tenant)</span>
          </button>

          <button
            onClick={() => setActiveTab('modules')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'modules'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. เจาะลึก 11 โมดูลการทำงาน</span>
          </button>

          <button
            onClick={() => setActiveTab('roles_auth')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'roles_auth'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>3. บัญชีผู้ใช้ &amp; รหัสผ่านเริ่มต้น</span>
          </button>

          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'workflows'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>4. ขั้นตอนการสมัคร &amp; ยืนยันสมาชิก</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* TAB 1: ARCHITECTURE (MULTI-TENANT CONCEPT) */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              {/* Core Concept Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-indigo-950/50 border border-cyan-500/30 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Building2 className="w-5 h-5" />
                  <span>คำตอบสำหรับคำถามของคุณ: &quot;โรงเรียนสามารถเข้าไปสมัครได้ และจะมีครู นักเรียน ผู้ปกครอง ของโรงเรียนนั้นๆ ใช่มั้ย?&quot;</span>
                </div>
                <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                  <strong className="text-emerald-400">ใช่ครับ ถูกต้อง 100%!</strong> ระบบนี้ได้รับการออกแบบตามสถาปัตยกรรม <strong>Multi-Tenant School Cloud</strong> หมายความว่า:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>1 แพลตฟอร์มส่วนกลาง</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      มี <strong>Super Admin</strong> ดูแลโครงสร้างระบบภาพรวมทั้งหมด อัปเดตซอฟต์แวร์ และตรวจสอบสถานะเซิร์ฟเวอร์
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>แยกโรงเรียนอย่างอิสระ</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      แต่ละโรงเรียนที่เข้ามาสมัครจะมีรหัสเฉพาะ (เช่น SCH-BKK01, SCH-KNT02) ข้อมูลจะไม่ปะปนกันตามกฎ Row Level Security (RLS)
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>คนในโรงเรียนครบวงจร</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      ในแต่ละโรงเรียนจะมี: <strong>ผู้อำนวยการ, คุณครู, นักเรียน, ผู้ปกครอง, และหลักสูตรวิชา</strong> ของโรงเรียนตนเองโดยเฉพาะ
                    </p>
                  </div>
                </div>
              </div>

              {/* Hierarchy Tree Visual */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>แผนผังลำดับชั้นข้อมูลในระบบ (Hierarchical Structure)</span>
                </h3>

                <div className="space-y-3 font-mono text-xs">
                  {/* Level 0 */}
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">ระดับที่ 0: Super Admin (ผู้ดูแลระบบกลาง)</div>
                      <div className="text-[11px] text-slate-400">ควบคุมสถาปัตยกรรมคลาวด์, ฐานข้อมูล Supabase, เชื่อมต่อ SMS/LINE API, สำรองข้อมูล</div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center text-slate-600">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>

                  {/* Level 1 */}
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 flex items-center gap-3 ml-4 sm:ml-8">
                    <Building2 className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">ระดับที่ 1: โรงเรียนแต่ละแห่ง (Tenant: School Account)</div>
                      <div className="text-[11px] text-slate-400">ผู้อำนวยการ/ธุรการ สมัครเปิดโรงเรียนใหม่ กำหนดชื่อโรงเรียน ตราสัญลักษณ์ ปฏิทินการศึกษา และ LINE OA ของโรงเรียน</div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center text-slate-600 ml-4 sm:ml-8">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>

                  {/* Level 2: Sub-Entities */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 ml-6 sm:ml-16">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 space-y-1">
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>คุณครู (Teachers)</span>
                      </div>
                      <p className="text-[10px] text-slate-400">ลงตารางสอน, เช็คชื่อรายคาบ, กรอกคะแนนเกรด, มอบหมายการบ้าน</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 space-y-1">
                      <div className="text-sky-400 font-bold flex items-center gap-1.5 text-[11px]">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>หลักสูตร (Courses)</span>
                      </div>
                      <p className="text-[10px] text-slate-400">รายวิชาพื้นฐาน, วิชาเลือก, แผนการเรียน, ห้องเรียนประจำ</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 space-y-1">
                      <div className="text-purple-400 font-bold flex items-center gap-1.5 text-[11px]">
                        <Users className="w-3.5 h-3.5" />
                        <span>นักเรียน (Students)</span>
                      </div>
                      <p className="text-[10px] text-slate-400">สแกน QR เช็คชื่อ, ดูเกรด, ส่งงาน, เล่นเกมวิชาการ, ทำพอร์ต</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 space-y-1">
                      <div className="text-rose-400 font-bold flex items-center gap-1.5 text-[11px]">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>ผู้ปกครอง (Parents)</span>
                      </div>
                      <p className="text-[10px] text-slate-400">รับแจ้งเตือนเวลาเข้า-ออกโรงเรียนผ่าน LINE, สแกนจ่ายค่าเทอม</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 11 CORE MODULES */}
          {activeTab === 'modules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>คำอธิบายหน้าที่ของทั้ง 11 โมดูลในระบบ</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    คลิกปุ่มเพื่อกระโดดไปยังหน้าของแต่ละโมดูลได้โดยตรง
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {modulesList.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${m.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-white">{m.nameTh}</h4>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {m.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-slate-500">สำหรับ:</span>
                          {m.forRoles.map((r) => (
                            <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {r}
                            </span>
                          ))}
                        </div>

                        {onNavigateTab && (
                          <button
                            onClick={() => {
                              onNavigateTab(m.id);
                              onClose();
                            }}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                          >
                            <span>เปิดดูหน้านี้</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ROLES & STARTING PASSWORDS */}
          {activeTab === 'roles_auth' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/30 flex items-start gap-3">
                <Key className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    บัญชีสำหรับทดสอบระบบ (Built-in Demo Accounts &amp; Passwords)
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    คุณสามารถใช้ Email ด้านล่างนี้พร้อมรหัสผ่าน <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 font-bold">password123</code> ในการล็อกอิน หรือกดปุ่ม <strong>&quot;สลับบัญชี&quot;</strong> เพื่อทดสอบมุมมองของแต่ละบทบาทได้ทันที
                  </p>
                </div>
              </div>

              {/* Roles Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">บทบาท (Role)</th>
                      <th className="px-4 py-3">Email ล็อกอิน</th>
                      <th className="px-4 py-3">รหัสผ่าน</th>
                      <th className="px-4 py-3">สิทธิ์และหน้าที่หลัก</th>
                      <th className="px-4 py-3 text-right">สลับบทบาท</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                    {/* Super Admin */}
                    <tr className="hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-sans font-bold text-indigo-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        <span>Super Admin</span>
                      </td>
                      <td className="px-4 py-3 text-slate-200">superadmin@eduverse.school</td>
                      <td className="px-4 py-3 text-slate-400">password123</td>
                      <td className="px-4 py-3 font-sans text-slate-300 text-xs">
                        ดูแลระบบส่วนกลางทั้งหมด, ตรวจสอบฐานข้อมูล, จัดการโรงเรียนในเครือ
                      </td>
                      <td className="px-4 py-3 text-right">
                        {onSwitchRole && (
                          <button
                            onClick={() => {
                              onSwitchRole('admin');
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 font-sans text-xs transition-colors"
                          >
                            สลับดูมุมมองนี้
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* School Director / Admin */}
                    <tr className="hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-sans font-bold text-cyan-400 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        <span>School Director (แอดมินโรงเรียน)</span>
                      </td>
                      <td className="px-4 py-3 text-slate-200">admin@eduverse.school</td>
                      <td className="px-4 py-3 text-slate-400">password123</td>
                      <td className="px-4 py-3 font-sans text-slate-300 text-xs">
                        ผู้อำนวยการโรงเรียน: จัดการนักเรียน, ครู, ตารางสอน, การเงิน และประกาศข่าว
                      </td>
                      <td className="px-4 py-3 text-right">
                        {onSwitchRole && (
                          <button
                            onClick={() => {
                              onSwitchRole('admin');
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 font-sans text-xs transition-colors"
                          >
                            สลับดูมุมมองนี้
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Teacher */}
                    <tr className="hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-sans font-bold text-emerald-400 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <span>Teacher (ครูผู้สอน)</span>
                      </td>
                      <td className="px-4 py-3 text-slate-200">teacher@eduverse.school</td>
                      <td className="px-4 py-3 text-slate-400">password123</td>
                      <td className="px-4 py-3 font-sans text-slate-300 text-xs">
                        เช็คชื่อนักเรียนรายคาบ, บันทึกคะแนนเกรด, มอบหมายงาน, สอนห้องเรียน LMS
                      </td>
                      <td className="px-4 py-3 text-right">
                        {onSwitchRole && (
                          <button
                            onClick={() => {
                              onSwitchRole('teacher');
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-sans text-xs transition-colors"
                          >
                            สลับดูมุมมองนี้
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Student */}
                    <tr className="hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-sans font-bold text-purple-400 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span>Student (นักเรียน)</span>
                      </td>
                      <td className="px-4 py-3 text-slate-200">student@eduverse.school</td>
                      <td className="px-4 py-3 text-slate-400">password123</td>
                      <td className="px-4 py-3 font-sans text-slate-300 text-xs">
                        ดูผลการเรียนของตนเอง, ส่งการบ้าน, เล่นเกมตอบคำถาม 3D, จัดทำแฟ้มผลงาน TCAS
                      </td>
                      <td className="px-4 py-3 text-right">
                        {onSwitchRole && (
                          <button
                            onClick={() => {
                              onSwitchRole('student');
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 font-sans text-xs transition-colors"
                          >
                            สลับดูมุมมองนี้
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Parent */}
                    <tr className="hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-sans font-bold text-rose-400 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-rose-400" />
                        <span>Parent (ผู้ปกครอง)</span>
                      </td>
                      <td className="px-4 py-3 text-slate-200">parent@eduverse.school</td>
                      <td className="px-4 py-3 text-slate-400">password123</td>
                      <td className="px-4 py-3 font-sans text-slate-300 text-xs">
                        ดูการเช็คชื่อเข้า-ออกของบุตรหลานแบบเรียลไทม์, ดูเกรด, และสแกนจ่ายค่าเทอมพร้อมเพย์
                      </td>
                      <td className="px-4 py-3 text-right">
                        {onSwitchRole && (
                          <button
                            onClick={() => {
                              onSwitchRole('parent');
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-sans text-xs transition-colors"
                          >
                            สลับดูมุมมองนี้
                          </button>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: WORKFLOWS & ONBOARDING */}
          {activeTab === 'workflows' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>ขั้นตอนการทำงานจริง (Real-World Workflows)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Workflow 1: Onboarding a New School */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs border border-cyan-500/30">
                      1
                    </span>
                    <span>โรงเรียนใหม่ต้องการเข้ามาใช้งาน (Register School)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                    <li>ผู้อำนวยการหรือตัวแทนโรงเรียนเข้าหน้าแรก กด **&quot;ลงทะเบียนโรงเรียนใหม่&quot;**</li>
                    <li>กรอกชื่อโรงเรียน (ไทย-อังกฤษ), รหัสโรงเรียน, จังหวัด, และข้อมูลแอดมิน</li>
                    <li>ระบบจะสร้างพื้นที่ของโรงเรียนนั้นทันที (Tenant Isolation)</li>
                    <li>แอดมินเข้าสู่ระบบแล้วเพิ่มคุณครูและนักเรียนของโรงเรียนตนเองได้เลย</li>
                  </ol>
                </div>

                {/* Workflow 2: Daily Attendance via LINE */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs border border-emerald-500/30">
                      2
                    </span>
                    <span>การเช็คชื่อประจำวัน &amp; แจ้งเตือนผู้ปกครอง</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                    <li>ผู้ปกครองแอด LINE Official Account ของโรงเรียน และกดผูกบัญชีกับรหัสนักเรียน</li>
                    <li>นักเรียนสแกน QR Code หน้าประตู หรือครูเช็คชื่อผ่านมือถือในห้องเรียน</li>
                    <li>ระบบส่งข้อความ PUSH Notification เข้า LINE ของผู้ปกครองทันที (เช่น &quot;น้องสมชาย ถึงโรงเรียนแล้ว เวลา 07:45 น.&quot;)</li>
                  </ol>
                </div>

                {/* Workflow 3: Grade & Transcript Issuance */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs border border-purple-500/30">
                      3
                    </span>
                    <span>การตัดเกรด &amp; พิมพ์ใบรายงานผลการเรียน (ปพ.1)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                    <li>ครูประจำวิชากรอกคะแนนเก็บ, กลางภาค, ปลายภาค ในหน้า **บันทึกคะแนน**</li>
                    <li>ระบบคำนวณตัดเกรด A, B+, B, C... และคำนวณ GPA รายภาคและ GPAX ให้อัตโนมัติ</li>
                    <li>สามารถกดปุ่ม **&quot;พิมพ์ใบ ปพ.1 (Official Transcript)&quot;** สองภาษาไทย-อังกฤษ ส่งให้ผู้ปกครองหรือดาวน์โหลดเป็น PDF ทางการได้ทันที</li>
                  </ol>
                </div>

                {/* Workflow 4: Tuition Invoice with PromptPay */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs border border-rose-500/30">
                      4
                    </span>
                    <span>การจ่ายค่าเทอมด้วย PromptPay QR</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                    <li>ฝ่ายการเงินโรงเรียนออกบิลค่าเทอมประจำภาคเรียนในเมนู **การเงิน**</li>
                    <li>ผู้ปกครองเปิดดูใบแจ้งหนี้ผ่านมือถือ มี QR Code พร้อมเพย์ตามยอดเงินจริง</li>
                    <li>ผู้ปกครองเปิดแอปธนาคารสแกนจ่ายเงิน ระบบเปลี่ยนสถานะเป็น &quot;ชำระแล้ว&quot; และออกใบเสร็จรับเงินทันที</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>EduVerse Enterprise School Architecture • โรงเรียนปัจจุบัน: {activeSchool.nameTh}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            ปิดหน้าต่างคู่มือ
          </button>
        </div>

      </div>
    </div>
  );
};
