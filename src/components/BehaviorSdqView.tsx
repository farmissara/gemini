import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  Minus, 
  HeartHandshake, 
  User, 
  Send, 
  Award, 
  Sparkles, 
  Search, 
  Filter, 
  CheckCircle2, 
  FileText, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Layers,
  Info
} from 'lucide-react';
import { 
  Student, 
  BehaviorRecord, 
  SdqAssessment, 
  AppLanguage, 
  UserRole 
} from '../types';

interface BehaviorSdqViewProps {
  students: Student[];
  records: BehaviorRecord[];
  sdqList: SdqAssessment[];
  onAddBehaviorRecord: (record: BehaviorRecord) => void;
  onAddSdqAssessment: (sdq: SdqAssessment) => void;
  lang: AppLanguage;
  currentRole: UserRole;
}

const PRESET_MERITS = [
  { label: 'จิตอาสาบำเพ็ญประโยชน์ต่อส่วนรวม', points: 10 },
  { label: 'สร้างชื่อเสียงให้โรงเรียน (แข่งขันทักษะวิชาการ/กีฬา)', points: 15 },
  { label: 'ความมีน้ำใจและเอื้อเฟื้อต่อเพื่อนร่วมชั้น', points: 5 },
  { label: 'ความซื่อสัตย์สุจริต (เก็บของมีค่าได้ส่งคืนอาจารย์)', points: 10 }
];

const PRESET_DEMERITS = [
  { label: 'มาสายเข้าแถวเคารพธงชาติ', points: -5 },
  { label: 'หนีเรียน / ขาดเรียนโดยไม่มีใบลา', points: -10 },
  { label: 'แต่งกายไม่ถูกระเบียบสถานศึกษา', points: -5 },
  { label: 'ใช้โทรศัพท์มือถือในเวลาเรียนโดยไม่ได้รับอนุญาต', points: -5 },
  { label: 'พฤติกรรมก้าวร้าวหรือทะเลาะวิวาท', points: -20 }
];

export const BehaviorSdqView: React.FC<BehaviorSdqViewProps> = ({
  students,
  records,
  sdqList,
  onAddBehaviorRecord,
  onAddSdqAssessment,
  lang,
  currentRole
}) => {
  const [activeTab, setActiveTab] = useState<'merit' | 'sdq'>('merit');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showSdqModal, setShowSdqModal] = useState(false);

  // Behavior Record Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [recordType, setRecordType] = useState<'merit' | 'demerit'>('merit');
  const [recordCategory, setRecordCategory] = useState<string>(PRESET_MERITS[0].label);
  const [recordPoints, setRecordPoints] = useState<number>(10);
  const [recordNotes, setRecordNotes] = useState<string>('');
  const [notifyParentLine, setNotifyParentLine] = useState<boolean>(true);

  // SDQ Form State
  const [sdqStudentId, setSdqStudentId] = useState<string>(students[0]?.id || '');
  const [sdqEmotional, setSdqEmotional] = useState<number>(2);
  const [sdqConduct, setSdqConduct] = useState<number>(1);
  const [sdqHyperactivity, setSdqHyperactivity] = useState<number>(2);
  const [sdqPeer, setSdqPeer] = useState<number>(1);
  const [sdqProsocial, setSdqProsocial] = useState<number>(8);
  const [sdqNotes, setSdqNotes] = useState<string>('');

  // Calculate current behavior score for each student
  const studentScores: Record<string, number> = {};
  students.forEach((s) => {
    let score = s.behaviorScore ?? 100;
    const studentRecords = records.filter((r) => r.studentId === s.id);
    studentRecords.forEach((r) => {
      score += r.points;
    });
    studentScores[s.id] = Math.max(0, Math.min(100, score));
  });

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.firstNameTh} ${s.lastNameTh} ${s.firstNameEn} ${s.lastNameEn} ${s.studentIdNumber}`;
    return fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const newRecord: BehaviorRecord = {
      id: `beh-${Date.now()}`,
      schoolId: student.schoolId,
      studentId: student.id,
      studentName: `${student.firstNameTh} ${student.lastNameTh}`,
      studentRoom: student.room,
      date: new Date().toISOString().split('T')[0],
      type: recordType,
      points: recordType === 'merit' ? Math.abs(recordPoints) : -Math.abs(recordPoints),
      category: recordCategory,
      notes: recordNotes || (recordType === 'merit' ? 'บันทึกคะแนนความประพฤติเชิงบวก' : 'ตัดคะแนนความประพฤติ'),
      recordedBy: currentRole === 'teacher' ? 'อ.ดร.ประเสริฐ ถาวร' : 'ฝ่ายกิจการนักเรียน',
      lineNotified: notifyParentLine
    };

    onAddBehaviorRecord(newRecord);
    setShowAddRecordModal(false);
    setRecordNotes('');
  };

  const handleCreateSdq = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === sdqStudentId);
    if (!student) return;

    const totalDifficulties = sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer;
    let status: 'normal' | 'risk' | 'problem' = 'normal';
    if (totalDifficulties >= 20) {
      status = 'problem';
    } else if (totalDifficulties >= 16) {
      status = 'risk';
    }

    const newSdq: SdqAssessment = {
      id: `sdq-${Date.now()}`,
      schoolId: student.schoolId,
      studentId: student.id,
      studentName: `${student.firstNameTh} ${student.lastNameTh}`,
      studentRoom: student.room,
      assessorType: 'teacher',
      assessorName: 'อ.ดร.ประเสริฐ ถาวร (ครูที่ปรึกษา)',
      academicYear: '2569 (2026)',
      semester: '1',
      emotionalScore: sdqEmotional,
      conductScore: sdqConduct,
      hyperactivityScore: sdqHyperactivity,
      peerScore: sdqPeer,
      prosocialScore: sdqProsocial,
      totalDifficultiesScore: totalDifficulties,
      overallStatus: status,
      date: new Date().toISOString().split('T')[0],
      notes: sdqNotes || 'ประเมินตามเกณฑ์มาตรฐาน สพฐ.'
    };

    onAddSdqAssessment(newSdq);
    setShowSdqModal(false);
    setSdqNotes('');
  };

  const getStatusBadge = (score: number) => {
    if (score >= 90) {
      return {
        label: lang === 'th' ? 'ดีเยี่ยม' : 'Excellent',
        bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      };
    }
    if (score >= 75) {
      return {
        label: lang === 'th' ? 'ปกติ' : 'Good',
        bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30'
      };
    }
    if (score >= 60) {
      return {
        label: lang === 'th' ? 'เฝ้าระวัง/ตักเตือน' : 'Warning',
        bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      };
    }
    return {
      label: lang === 'th' ? 'ทัณฑ์บน' : 'Probation',
      bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <HeartHandshake className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {lang === 'th' ? 'ระบบดูแลช่วยเหลือนักเรียน & บันทึกพฤติกรรม' : 'Student Care & Behavior (SDQ)'}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                สพฐ. Standard
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {lang === 'th'
                ? 'คะแนนความประพฤติ (Merit/Demerit) และแบบคัดกรองพฤติกรรม 5 ด้าน (SDQ) พร้อมแจ้งเตือนผู้ปกครอง'
                : 'Merit/demerit tracking, SDQ 5-domain psychometric screening, and auto parent alerts.'}
            </p>
          </div>
        </div>

        {/* Tab switchers & action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('merit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'merit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'th' ? 'คะแนนความประพฤติ' : 'Merit & Demerit'}
            </button>
            <button
              onClick={() => setActiveTab('sdq')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'sdq'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'th' ? 'แบบประเมิน SDQ' : 'SDQ Screening'}
            </button>
          </div>

          {activeTab === 'merit' ? (
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'บันทึกพฤติกรรม' : 'Record Behavior'}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowSdqModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/30 transition"
            >
              <FileText className="w-4 h-4" />
              <span>{lang === 'th' ? 'ทำแบบคัดกรอง SDQ' : 'New SDQ Assessment'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Merit & Demerit Tracker */}
      {activeTab === 'merit' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{lang === 'th' ? 'คะแนนเฉลี่ยทั้งโรงเรียน' : 'Avg Behavior Score'}</span>
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-white mt-2">96.4 <span className="text-xs font-normal text-slate-400">/ 100</span></p>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +1.2% จากภาคเรียนก่อน
              </p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{lang === 'th' ? 'บันทึกความดี (Merit)' : 'Total Merits'}</span>
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-400 mt-2">
                +{records.filter((r) => r.type === 'merit').reduce((acc, r) => acc + r.points, 0)} <span className="text-xs font-normal text-slate-400">แต้ม</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">จิตอาสาและสร้างชื่อเสียง</p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{lang === 'th' ? 'ตัดคะแนน (Demerit)' : 'Total Deductions'}</span>
                <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-rose-400 mt-2">
                {records.filter((r) => r.type === 'demerit').reduce((acc, r) => acc + r.points, 0)} <span className="text-xs font-normal text-slate-400">แต้ม</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">มาสายและผิดระเบียบ</p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{lang === 'th' ? 'แจ้งเตือน LINE ผู้ปกครอง' : 'LINE Alerts Sent'}</span>
                <span className="p-2 rounded-xl bg-[#06C755]/20 text-[#06C755]">
                  <Send className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-white mt-2">
                {records.filter((r) => r.lineNotified).length} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
              </p>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> เชื่อมโยง 100%
              </p>
            </div>
          </div>

          {/* Student Scores & Recent Records Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Student List with Scores */}
            <div className="lg:col-span-2 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  {lang === 'th' ? 'บัญชีคะแนนความประพฤตินักเรียน' : 'Student Behavior Ledger'}
                </h3>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === 'th' ? 'ค้นหาชื่อ / รหัสนักเรียน...' : 'Search student...'}
                    className="bg-slate-800 text-white text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 w-48"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 uppercase">
                      <th className="p-3">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                      <th className="p-3">{lang === 'th' ? 'ห้องเรียน' : 'Room'}</th>
                      <th className="p-3 text-center">{lang === 'th' ? 'คะแนนคงเหลือ' : 'Score'}</th>
                      <th className="p-3 text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                      <th className="p-3 text-right">{lang === 'th' ? 'จัดการ' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredStudents.map((student) => {
                      const score = studentScores[student.id] ?? 100;
                      const badge = getStatusBadge(score);
                      return (
                        <tr key={student.id} className="hover:bg-slate-800/20 transition">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={student.avatarUrl}
                                alt={student.firstNameTh}
                                className="w-8 h-8 rounded-full object-cover border border-slate-700"
                              />
                              <div>
                                <p className="font-bold text-white">
                                  {lang === 'th'
                                    ? `${student.firstNameTh} ${student.lastNameTh}`
                                    : `${student.firstNameEn} ${student.lastNameEn}`}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">{student.studentIdNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-300">{student.room}</td>
                          <td className="p-3 text-center">
                            <span className={`font-mono font-bold text-sm ${score >= 90 ? 'text-emerald-400' : score >= 75 ? 'text-sky-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {score}
                            </span>
                            <span className="text-[10px] text-slate-500"> / 100</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedStudentId(student.id);
                                setShowAddRecordModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-[11px] font-semibold transition"
                            >
                              {lang === 'th' ? 'บันทึกคะแนน' : 'Add Record'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 1 Col: Recent Behavior Activity */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                {lang === 'th' ? 'ประวัติการบันทึกพฤติกรรมล่าสุด' : 'Recent Behavior Activity'}
              </h3>

              <div className="space-y-3">
                {records.slice(0, 5).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{rec.studentName}</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded ${rec.type === 'merit' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {rec.points > 0 ? `+${rec.points}` : rec.points}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{rec.category}</p>
                    {rec.notes && <p className="text-[10px] text-slate-400 italic">"{rec.notes}"</p>}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>{rec.date} • {rec.recordedBy}</span>
                      {rec.lineNotified && (
                        <span className="text-[#06C755] flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> LINE เตือนแล้ว
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SDQ Screening */}
      {activeTab === 'sdq' && (
        <div className="space-y-6">
          {/* SDQ Guidelines Card */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-indigo-300">
                {lang === 'th' ? 'เกณฑ์การแปลผลแบบประเมินพฤติกรรมเด็ก (SDQ ฉบับ สพฐ.)' : 'SDQ Assessment Benchmark'}
              </h4>
              <p className="text-slate-300 leading-relaxed">
                แบบประเมิน SDQ ครอบคลุมพฤติกรรม 5 ด้าน (คะแนนรวมความยากลำบาก 4 ด้านแรก 0-40):
                <span className="text-emerald-400 font-bold ml-1">กลุ่มปกติ (0-15 คะแนน)</span>,
                <span className="text-amber-400 font-bold ml-1">กลุ่มเสี่ยง (16-19 คะแนน)</span>,
                <span className="text-rose-400 font-bold ml-1">กลุ่มมีปัญหา (20-40 คะแนน)</span>
              </p>
            </div>
          </div>

          {/* SDQ Assessments List */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                {lang === 'th' ? 'ผลการประเมิน SDQ รายบุคคล' : 'Individual SDQ Results'}
              </h3>
              <span className="text-xs text-slate-400">
                {lang === 'th' ? 'ประเมินแล้ว' : 'Assessed'}: {sdqList.length} {lang === 'th' ? 'คน' : 'students'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 uppercase">
                    <th className="p-3">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'ด้านอารมณ์' : 'Emotional'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'ความประพฤติ' : 'Conduct'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'อยู่ไม่นิ่ง' : 'Hyperactivity'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'เพื่อน' : 'Peer'}</th>
                    <th className="p-2 text-center font-bold text-emerald-400">{lang === 'th' ? 'จุดแข็ง (สังคม)' : 'Prosocial'}</th>
                    <th className="p-2 text-center font-bold">{lang === 'th' ? 'คะแนนรวม' : 'Total'}</th>
                    <th className="p-3 text-center">{lang === 'th' ? 'ผลการแปลผล' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sdqList.map((sdq) => {
                    const statusConfig = {
                      normal: { label: 'กลุ่มปกติ', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                      risk: { label: 'กลุ่มเสี่ยง', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                      problem: { label: 'กลุ่มมีปัญหา', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
                    }[sdq.overallStatus];

                    return (
                      <tr key={sdq.id} className="hover:bg-slate-800/20 transition">
                        <td className="p-3">
                          <p className="font-bold text-white">{sdq.studentName}</p>
                          <p className="text-[10px] text-slate-400">{sdq.studentRoom} • ประเมินโดย {sdq.assessorName}</p>
                        </td>
                        <td className="p-2 text-center font-mono text-slate-300">{sdq.emotionalScore}/10</td>
                        <td className="p-2 text-center font-mono text-slate-300">{sdq.conductScore}/10</td>
                        <td className="p-2 text-center font-mono text-slate-300">{sdq.hyperactivityScore}/10</td>
                        <td className="p-2 text-center font-mono text-slate-300">{sdq.peerScore}/10</td>
                        <td className="p-2 text-center font-mono text-emerald-400 font-bold">{sdq.prosocialScore}/10</td>
                        <td className="p-2 text-center font-mono font-bold text-sm text-indigo-300">
                          {sdq.totalDifficultiesScore}/40
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Behavior Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                {lang === 'th' ? 'บันทึกคะแนนความประพฤติ' : 'Add Behavior Record'}
              </h3>
              <button onClick={() => setShowAddRecordModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'เลือกนักเรียน' : 'Select Student'}</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstNameTh} {s.lastNameTh} ({s.room}) - คะแนนปัจจุบัน {studentScores[s.id] ?? 100}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Switcher */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'ประเภทพฤติกรรม' : 'Record Type'}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRecordType('merit');
                      setRecordCategory(PRESET_MERITS[0].label);
                      setRecordPoints(PRESET_MERITS[0].points);
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                      recordType === 'merit'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>ความดี / จิตอาสา (+แต้ม)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecordType('demerit');
                      setRecordCategory(PRESET_DEMERITS[0].label);
                      setRecordPoints(Math.abs(PRESET_DEMERITS[0].points));
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                      recordType === 'demerit'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>ตัดคะแนน / ผิดระเบียบ (-แต้ม)</span>
                  </button>
                </div>
              </div>

              {/* Preset selection */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'รายการมาตรฐาน' : 'Preset Categories'}</label>
                <select
                  value={recordCategory}
                  onChange={(e) => {
                    setRecordCategory(e.target.value);
                    const list = recordType === 'merit' ? PRESET_MERITS : PRESET_DEMERITS;
                    const match = list.find((item) => item.label === e.target.value);
                    if (match) setRecordPoints(Math.abs(match.points));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {(recordType === 'merit' ? PRESET_MERITS : PRESET_DEMERITS).map((item) => (
                    <option key={item.label} value={item.label}>
                      {item.label} ({item.points > 0 ? `+${item.points}` : item.points} คะแนน)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'จำนวนคะแนนที่ปรับ' : 'Points'}</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={recordPoints}
                  onChange={(e) => setRecordPoints(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'รายละเอียดเพิ่มเติม' : 'Notes / Remarks'}</label>
                <textarea
                  rows={2}
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="เช่น บันทึกเหตุการณ์ สถานที่ หรือพยาน..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              {/* LINE Notification Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#06C755]" />
                  <span className="text-slate-300 font-semibold">ส่งแจ้งเตือนเข้า LINE ผู้ปกครองอัตโนมัติ</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyParentLine}
                  onChange={(e) => setNotifyParentLine(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
                >
                  {lang === 'th' ? 'บันทึกคะแนน' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New SDQ Assessment Modal */}
      {showSdqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                {lang === 'th' ? 'ทำแบบคัดกรองพฤติกรรม SDQ (5 ด้าน)' : 'SDQ Assessment'}
              </h3>
              <button onClick={() => setShowSdqModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSdq} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'นักเรียนที่รับการประเมิน' : 'Student'}</label>
                <select
                  value={sdqStudentId}
                  onChange={(e) => setSdqStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstNameTh} {s.lastNameTh} ({s.room})
                    </option>
                  ))}
                </select>
              </div>

              {/* 5 Domains Sliders */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300 font-semibold">1. ด้านอารมณ์ (Emotional Symptoms)</span>
                    <span className="font-mono text-indigo-400 font-bold">{sdqEmotional} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqEmotional}
                    onChange={(e) => setSdqEmotional(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300 font-semibold">2. ด้านความประพฤติ / เกเร (Conduct Problems)</span>
                    <span className="font-mono text-indigo-400 font-bold">{sdqConduct} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqConduct}
                    onChange={(e) => setSdqConduct(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300 font-semibold">3. ด้านพฤติกรรมอยู่ไม่นิ่ง (Hyperactivity)</span>
                    <span className="font-mono text-indigo-400 font-bold">{sdqHyperactivity} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqHyperactivity}
                    onChange={(e) => setSdqHyperactivity(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300 font-semibold">4. ด้านความสัมพันธ์กับเพื่อน (Peer Problems)</span>
                    <span className="font-mono text-indigo-400 font-bold">{sdqPeer} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqPeer}
                    onChange={(e) => setSdqPeer(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <div className="flex justify-between mb-1">
                    <span className="text-emerald-400 font-bold">5. ด้านสัมพันธภาพทางสังคม / จุดแข็ง (Prosocial)</span>
                    <span className="font-mono text-emerald-400 font-bold">{sdqProsocial} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqProsocial}
                    onChange={(e) => setSdqProsocial(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-300 font-semibold">คะแนนรวมความยากลำบาก (4 ด้านแรก):</span>
                  <p className="text-[11px] text-slate-400">
                    {sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer >= 20 ? (
                      <span className="text-rose-400 font-bold">ผลการแปล: กลุ่มมีปัญหา (ต้องส่งต่อ)</span>
                    ) : sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer >= 16 ? (
                      <span className="text-amber-400 font-bold">ผลการแปล: กลุ่มเสี่ยง (ต้องติดตาม)</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">ผลการแปล: กลุ่มปกติ</span>
                    )}
                  </p>
                </div>
                <span className="text-xl font-bold font-mono text-white">
                  {sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer} <span className="text-xs text-slate-400">/ 40</span>
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'ข้อสังเกตและแนวทางช่วยเหลือ' : 'Teacher Recommendations'}</label>
                <textarea
                  rows={2}
                  value={sdqNotes}
                  onChange={(e) => setSdqNotes(e.target.value)}
                  placeholder="ระบุคำแนะนำหรือแผนการดูแลช่วยเหลือนักเรียน..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSdqModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30"
                >
                  {lang === 'th' ? 'บันทึกผลการคัดกรอง' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
