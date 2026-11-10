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
import { PagedList } from './PagedList';

const PaginatedTableRows = <T,>({
  items,
  colSpan,
  renderRow,
  pageSize = 8
}: {
  items: readonly T[];
  colSpan: number;
  renderRow: (item: T) => React.ReactNode;
  pageSize?: number;
}) => {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <>
      {items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(renderRow)}
      {pageCount > 1 && (
        <tr>
          <td colSpan={colSpan} className="p-2">
            <div className="flex items-center justify-between">
              <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="px-3 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40">ก่อนหน้า</button>
              <span className="text-[11px] text-slate-300">{currentPage + 1} / {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className="px-3 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40">ถัดไป</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

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
  const [sdqFormStep, setSdqFormStep] = useState<1 | 2>(1);

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
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Top Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <HeartHandshake className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
              {lang === 'th' ? 'ระบบดูแลช่วยเหลือนักเรียน & บันทึกพฤติกรรม' : 'Student Care & Behavior (SDQ)'}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                สพฐ. Standard
              </span>
            </h1>
            <p className="text-xs text-slate-300">
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
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'th' ? '1. คะแนนความประพฤติ' : 'Merit & Demerit'}
            </button>
            <button
              onClick={() => setActiveTab('sdq')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'sdq'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'th' ? '2. แบบประเมิน SDQ' : 'SDQ Screening'}
            </button>
          </div>

          {activeTab === 'merit' ? (
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'บันทึกพฤติกรรม' : 'Record Behavior'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSdqFormStep(1);
                setShowSdqModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/30 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{lang === 'th' ? 'ทำแบบคัดกรอง SDQ' : 'New SDQ Assessment'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Merit & Demerit Tracker */}
      {activeTab === 'merit' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-2.5">
          {/* Quick Metrics */}
          <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">{lang === 'th' ? 'คะแนนเฉลี่ยทั้งโรงเรียน' : 'Avg Score'}</span>
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-bold text-white mt-1">96.4 <span className="text-[10px] font-normal text-slate-300">/ 100</span></p>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">{lang === 'th' ? 'บันทึกความดี (Merit)' : 'Merits'}</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <Award className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                +{records.filter((r) => r.type === 'merit').reduce((acc, r) => acc + r.points, 0)} <span className="text-[10px] font-normal text-slate-300">แต้ม</span>
              </p>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">{lang === 'th' ? 'ตัดคะแนน (Demerit)' : 'Deductions'}</span>
                <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300">
                  <TrendingDown className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-bold text-rose-400 mt-1">
                {records.filter((r) => r.type === 'demerit').reduce((acc, r) => acc + r.points, 0)} <span className="text-[10px] font-normal text-slate-300">แต้ม</span>
              </p>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">{lang === 'th' ? 'แจ้งเตือน LINE' : 'LINE Alerts'}</span>
                <span className="p-1.5 rounded-lg bg-[#06C755]/20 text-emerald-400">
                  <Send className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-bold text-white mt-1">
                {records.filter((r) => r.lineNotified).length} <span className="text-[10px] font-normal text-slate-300">ครั้ง</span>
              </p>
            </div>
          </div>

          {/* Student Scores & Recent Records Grid */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-hidden">
            {/* Left 2 Cols: Student List with Scores */}
            <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 shadow-md flex flex-col min-h-0 overflow-hidden">
              <div className="shrink-0 p-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{lang === 'th' ? 'บัญชีคะแนนความประพฤตินักเรียน' : 'Student Behavior Ledger'}</span>
                </h3>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-300" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === 'th' ? 'ค้นหาชื่อ / รหัสนักเรียน...' : 'Search student...'}
                    className="bg-slate-800 text-white placeholder-slate-400 text-xs pl-7 pr-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 w-44"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-800 bg-slate-950 text-[11px] text-slate-300 uppercase">
                      <th className="p-2.5">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                      <th className="p-2.5">{lang === 'th' ? 'ห้องเรียน' : 'Room'}</th>
                      <th className="p-2.5 text-center">{lang === 'th' ? 'คะแนนคงเหลือ' : 'Score'}</th>
                      <th className="p-2.5 text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                      <th className="p-2.5 text-right">{lang === 'th' ? 'จัดการ' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    <PaginatedTableRows items={filteredStudents} colSpan={5} renderRow={(student) => {
                      const score = studentScores[student.id] ?? 100;
                      const badge = getStatusBadge(score);
                      return (
                        <tr key={student.id} className="hover:bg-slate-800/60 transition">
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <img
                                src={student.avatarUrl}
                                alt={student.firstNameTh}
                                className="w-7 h-7 rounded-full object-cover border border-slate-700"
                              />
                              <div>
                                <p className="font-bold text-white text-xs">
                                  {lang === 'th'
                                    ? `${student.firstNameTh} ${student.lastNameTh}`
                                    : `${student.firstNameEn} ${student.lastNameEn}`}
                                </p>
                                <p className="text-[10px] text-slate-300 font-mono">{student.studentIdNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5 text-slate-200">{student.room}</td>
                          <td className="p-2.5 text-center">
                            <span className={`font-mono font-bold text-xs ${score >= 90 ? 'text-emerald-400' : score >= 75 ? 'text-sky-400' : score >= 60 ? 'text-amber-300' : 'text-rose-400'}`}>
                              {score}
                            </span>
                            <span className="text-[10px] text-slate-300"> / 100</span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedStudentId(student.id);
                                setShowAddRecordModal(true);
                              }}
                              className="px-2 py-1 rounded-md bg-indigo-600/30 text-indigo-200 hover:bg-indigo-600 hover:text-white border border-indigo-500/40 text-[10px] font-semibold transition"
                            >
                              {lang === 'th' ? 'บันทึกคะแนน' : 'Add Record'}
                            </button>
                          </td>
                        </tr>
                      );
                    }} />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 1 Col: Recent Behavior Activity */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md p-3.5 flex flex-col min-h-0 overflow-hidden">
              <h3 className="shrink-0 text-xs font-bold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span>{lang === 'th' ? 'ประวัติพฤติกรรมล่าสุด' : 'Recent Activity'}</span>
              </h3>

              <div className="flex-1 min-h-0 overflow-hidden space-y-2 pt-2 pr-1">
              <PagedList items={records} pageSize={2} renderItem={(rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px] truncate">{rec.studentName}</span>
                      <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${rec.type === 'merit' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {rec.points > 0 ? `+${rec.points}` : rec.points}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-200">{rec.category}</p>
                    {rec.notes && <p className="text-[10px] text-slate-300 italic">"{rec.notes}"</p>}
                    <div className="flex items-center justify-between text-[9px] text-slate-300 pt-1 border-t border-slate-700">
                      <span>{rec.date}</span>
                      {rec.lineNotified && (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> LINE แล้ว
                        </span>
                      )}
                    </div>
                  </div>
                )} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SDQ Screening */}
      {activeTab === 'sdq' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-2.5">
          {/* SDQ Guidelines Card */}
          <div className="shrink-0 p-3 rounded-xl bg-indigo-950 border border-indigo-700 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <h4 className="font-bold text-indigo-200 text-[11px]">
                {lang === 'th' ? 'เกณฑ์การแปลผลแบบประเมินพฤติกรรมเด็ก (SDQ ฉบับ สพฐ.)' : 'SDQ Assessment Benchmark'}
              </h4>
              <p className="text-slate-200 leading-relaxed text-[11px]">
                แบบประเมิน SDQ ครอบคลุมพฤติกรรม 5 ด้าน (คะแนนความยากลำบาก 0-40):
                <span className="text-emerald-300 font-bold ml-1">กลุ่มปกติ (0-15)</span>,
                <span className="text-amber-300 font-bold ml-1">กลุ่มเสี่ยง (16-19)</span>,
                <span className="text-rose-300 font-bold ml-1">กลุ่มมีปัญหา (20-40)</span>
              </p>
            </div>
          </div>

          {/* SDQ Assessments List */}
          <div className="flex-1 min-h-0 bg-slate-900 rounded-xl border border-slate-800 shadow-md flex flex-col overflow-hidden">
            <div className="shrink-0 p-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'th' ? 'ผลการประเมิน SDQ รายบุคคล' : 'Individual SDQ Results'}</span>
              </h3>
              <span className="text-xs text-slate-300">
                {lang === 'th' ? 'ประเมินแล้ว' : 'Assessed'}: {sdqList.length} {lang === 'th' ? 'คน' : 'students'}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-800 bg-slate-950 text-[11px] text-slate-300 uppercase">
                    <th className="p-2.5">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'ด้านอารมณ์' : 'Emotional'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'ความประพฤติ' : 'Conduct'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'อยู่ไม่นิ่ง' : 'Hyperactivity'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'เพื่อน' : 'Peer'}</th>
                    <th className="p-2 text-center font-bold text-emerald-300">{lang === 'th' ? 'จุดแข็ง' : 'Prosocial'}</th>
                    <th className="p-2 text-center font-bold text-white">{lang === 'th' ? 'คะแนนรวม' : 'Total'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'ผลประเมิน' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  <PaginatedTableRows items={sdqList} colSpan={8} renderRow={(sdq) => {
                    const statusConfig = {
                      normal: { label: 'กลุ่มปกติ', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                      risk: { label: 'กลุ่มเสี่ยง', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                      problem: { label: 'กลุ่มมีปัญหา', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
                    }[sdq.overallStatus];

                    return (
                      <tr key={sdq.id} className="hover:bg-slate-800/60 transition">
                        <td className="p-3">
                          <p className="font-bold text-white">{sdq.studentName}</p>
                          <p className="text-[10px] text-slate-300">{sdq.studentRoom} • ประเมินโดย {sdq.assessorName}</p>
                        </td>
                        <td className="p-2 text-center font-mono text-slate-200">{sdq.emotionalScore}/10</td>
                        <td className="p-2 text-center font-mono text-slate-200">{sdq.conductScore}/10</td>
                        <td className="p-2 text-center font-mono text-slate-200">{sdq.hyperactivityScore}/10</td>
                        <td className="p-2 text-center font-mono text-slate-200">{sdq.peerScore}/10</td>
                        <td className="p-2 text-center font-mono text-emerald-300 font-bold">{sdq.prosocialScore}/10</td>
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
                  }} />
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
              <button onClick={() => setShowAddRecordModal(false)} className="text-slate-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800">✕</button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">{lang === 'th' ? 'เลือกนักเรียน' : 'Select Student'}</label>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                {lang === 'th' ? 'ทำแบบคัดกรองพฤติกรรม SDQ (5 ด้าน)' : 'SDQ Assessment'}
              </h3>
              <button onClick={() => setShowSdqModal(false)} className="text-slate-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800">✕</button>
            </div>

            <form onSubmit={handleCreateSdq} className="space-y-4 text-xs">
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-300">
                <span className={sdqFormStep === 1 ? 'font-bold text-emerald-300' : ''}>1. Student & scores</span>
                <span>→</span>
                <span className={sdqFormStep === 2 ? 'font-bold text-emerald-300' : ''}>2. Review & recommendations</span>
              </div>
              {sdqFormStep === 1 && (
                <div className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">{lang === 'th' ? 'นักเรียนที่รับการประเมิน' : 'Student'}</label>
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
              <div className="space-y-3 p-4 rounded-xl bg-slate-800 border border-slate-700">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-200 font-semibold">1. ด้านอารมณ์ (Emotional Symptoms)</span>
                    <span className="font-mono text-indigo-300 font-bold">{sdqEmotional} / 10</span>
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
                    <span className="text-slate-200 font-semibold">2. ด้านความประพฤติ / เกเร (Conduct Problems)</span>
                    <span className="font-mono text-indigo-300 font-bold">{sdqConduct} / 10</span>
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
                    <span className="text-slate-200 font-semibold">3. ด้านพฤติกรรมอยู่ไม่นิ่ง (Hyperactivity)</span>
                    <span className="font-mono text-indigo-300 font-bold">{sdqHyperactivity} / 10</span>
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
                    <span className="text-slate-200 font-semibold">4. ด้านความสัมพันธ์กับเพื่อน (Peer Problems)</span>
                    <span className="font-mono text-indigo-300 font-bold">{sdqPeer} / 10</span>
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

                <div className="pt-2 border-t border-slate-700">
                  <div className="flex justify-between mb-1">
                    <span className="text-emerald-300 font-bold">5. ด้านสัมพันธภาพทางสังคม / จุดแข็ง (Prosocial)</span>
                    <span className="font-mono text-emerald-300 font-bold">{sdqProsocial} / 10</span>
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
                  <button type="button" onClick={() => setSdqFormStep(2)} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                    Continue to review
                  </button>
                </div>
              )}

              {sdqFormStep === 2 && (
                <div className="space-y-4">
              {/* Total Calculation Preview */}
              <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-200 font-semibold">คะแนนรวมความยากลำบาก (4 ด้านแรก):</span>
                  <p className="text-[11px] text-slate-200">
                    {sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer >= 20 ? (
                      <span className="text-rose-300 font-bold">ผลการแปล: กลุ่มมีปัญหา (ต้องส่งต่อ)</span>
                    ) : sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer >= 16 ? (
                      <span className="text-amber-300 font-bold">ผลการแปล: กลุ่มเสี่ยง (ต้องติดตาม)</span>
                    ) : (
                      <span className="text-emerald-300 font-bold">ผลการแปล: กลุ่มปกติ</span>
                    )}
                  </p>
                </div>
                <span className="text-xl font-bold font-mono text-white">
                  {sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer} <span className="text-xs text-slate-300">/ 40</span>
                </span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">{lang === 'th' ? 'ข้อสังเกตและแนวทางช่วยเหลือ' : 'Teacher Recommendations'}</label>
                <textarea
                  rows={2}
                  value={sdqNotes}
                  onChange={(e) => setSdqNotes(e.target.value)}
                  placeholder="ระบุคำแนะนำหรือแผนการดูแลช่วยเหลือนักเรียน..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSdqFormStep(1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  Back
                </button>
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
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
