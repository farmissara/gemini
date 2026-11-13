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
import { PagedList } from '../components/PagedList';
import { formatSemesterLabel } from '../lib/schoolSettings';

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
              <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
              <span className="text-[11px] text-[var(--color-text-muted)]">{currentPage + 1} / {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
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
  academicYear: string;
  currentSemester: string;
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
  currentRole,
  academicYear,
  currentSemester
}) => {
  const [activeTab, setActiveTab] = useState<'merit' | 'sdq' | 'cct_poverty' | 'obec_care_steps'>('merit');
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
      academicYear,
      semester: currentSemester,
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
        bg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
      };
    }
    if (score >= 75) {
      return {
        label: lang === 'th' ? 'ปกติ' : 'Good',
        bg: 'bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700'
      };
    }
    if (score >= 60) {
      return {
        label: lang === 'th' ? 'เฝ้าระวัง/ตักเตือน' : 'Warning',
        bg: 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
      };
    }
    return {
      label: lang === 'th' ? 'ทัณฑ์บน' : 'Probation',
      bg: 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
    };
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Top Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-3 app-page-header">
        <div className="flex items-center gap-2 min-w-0">
          <HeartHandshake className="w-5 h-5 text-purple-700 dark:text-purple-300 shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] truncate">
            {lang === 'th' ? 'ระบบดูแลช่วยเหลือนักเรียน & SDQ' : 'Student Care & Behavior (SDQ)'}
          </h1>
        </div>

        {/* Tab switchers & action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-[var(--color-card-subtle)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
            <button
              onClick={() => setActiveTab('merit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'merit'
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
              }`}
            >
              {lang === 'th' ? '1. คะแนนความประพฤติ' : 'Merit & Demerit'}
            </button>
            <button
              onClick={() => setActiveTab('sdq')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'sdq'
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
              }`}
            >
              {lang === 'th' ? '2. คัดกรอง SDQ (5 ด้าน)' : 'SDQ Screening'}
            </button>
            <button
              onClick={() => setActiveTab('cct_poverty')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'cct_poverty'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              {lang === 'th' ? '3. ทุนยากจนพิเศษ (CCT)' : 'CCT Poverty'}
            </button>
            <button
              onClick={() => setActiveTab('obec_care_steps')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'obec_care_steps'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              {lang === 'th' ? '4. ระบบดูแล 5 ขั้น (OBEC Care)' : 'OBEC 5 Steps'}
            </button>
          </div>

          {activeTab === 'merit' && (
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-sm transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'บันทึกพฤติกรรม' : 'Record Behavior'}</span>
            </button>
          )}

          {activeTab === 'sdq' && (
            <button
              onClick={() => {
                setSdqFormStep(1);
                setShowSdqModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-sm transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
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
            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-text-muted)]">{lang === 'th' ? 'คะแนนเฉลี่ยทั้งโรงเรียน' : 'Avg Score'}</span>
                <span className="p-1.5 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary-text)]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-bold text-[var(--color-text-title)] mt-1">96.4 <span className="text-[10px] font-normal text-[var(--color-text-muted)]">/ 100</span></p>
            </div>

            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-text-muted)]">{lang === 'th' ? 'บันทึกความดี (Merit)' : 'Merits'}</span>
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                  <Award className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                +{records.filter((r) => r.type === 'merit').reduce((acc, r) => acc + r.points, 0)} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">แต้ม</span>
              </p>
            </div>

            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-text-muted)]">{lang === 'th' ? 'ตัดคะแนน (Demerit)' : 'Deductions'}</span>
                <span className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200">
                  <TrendingDown className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1">
                {records.filter((r) => r.type === 'demerit').reduce((acc, r) => acc + r.points, 0)} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">แต้ม</span>
              </p>
            </div>

            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-text-muted)]">{lang === 'th' ? 'แจ้งเตือน LINE' : 'LINE Alerts'}</span>
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                  <Send className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-bold text-[var(--color-text-title)] mt-1">
                {records.filter((r) => r.lineNotified).length} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">ครั้ง</span>
              </p>
            </div>
          </div>

          {/* Student Scores & Recent Records Grid */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-hidden">
            {/* Left 2 Cols: Student List with Scores */}
            <div className="lg:col-span-2 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-xs flex flex-col min-h-0 overflow-hidden">
              <div className="shrink-0 p-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  <span>{lang === 'th' ? 'บัญชีคะแนนความประพฤตินักเรียน' : 'Student Behavior Ledger'}</span>
                </h3>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === 'th' ? 'ค้นหาชื่อ / รหัสนักเรียน...' : 'Search student...'}
                    className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs pl-7 pr-2.5 py-1 rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] w-44"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] text-[var(--color-text-title)] uppercase">
                      <th className="p-2.5">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                      <th className="p-2.5">{lang === 'th' ? 'ห้องเรียน' : 'Room'}</th>
                      <th className="p-2.5 text-center">{lang === 'th' ? 'คะแนนคงเหลือ' : 'Score'}</th>
                      <th className="p-2.5 text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                      <th className="p-2.5 text-right">{lang === 'th' ? 'จัดการ' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    <PaginatedTableRows items={filteredStudents} colSpan={5} renderRow={(student) => {
                      const score = studentScores[student.id] ?? 100;
                      const badge = getStatusBadge(score);
                      return (
                        <tr key={student.id} className="hover:bg-[var(--color-card-subtle)] transition">
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <img
                                src={student.avatarUrl}
                                alt={student.firstNameTh}
                                className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)]"
                              />
                              <div>
                                <p className="font-bold text-[var(--color-text-title)] text-xs">
                                  {lang === 'th'
                                    ? `${student.firstNameTh} ${student.lastNameTh}`
                                    : `${student.firstNameEn} ${student.lastNameEn}`}
                                </p>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-mono">{student.studentIdNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5 text-[var(--color-text-body)]">{student.room}</td>
                          <td className="p-2.5 text-center">
                            <span className={`font-mono font-bold text-xs ${score >= 90 ? 'text-emerald-700 dark:text-emerald-300' : score >= 75 ? 'text-sky-700 dark:text-sky-300' : score >= 60 ? 'text-amber-800 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300'}`}>
                              {score}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)]"> / 100</span>
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
                              className="px-2 py-1 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--color-border)] text-[10px] font-semibold transition cursor-pointer"
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
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-xs p-3.5 flex flex-col min-h-0 overflow-hidden">
              <h3 className="shrink-0 text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5 pb-2 border-b border-[var(--color-border)]">
                <Activity className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
                <span>{lang === 'th' ? 'ประวัติพฤติกรรมล่าสุด' : 'Recent Activity'}</span>
              </h3>

              <div className="flex-1 min-h-0 overflow-hidden space-y-2 pt-2 pr-1">
              <PagedList items={records} pageSize={2} renderItem={(rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--color-text-title)] text-[11px] truncate">{rec.studentName}</span>
                      <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${rec.type === 'merit' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'}`}>
                        {rec.points > 0 ? `+${rec.points}` : rec.points}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-body)]">{rec.category}</p>
                    {rec.notes && <p className="text-[10px] text-[var(--color-text-muted)] italic">"{rec.notes}"</p>}
                    <div className="flex items-center justify-between text-[9px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
                      <span>{rec.date}</span>
                      {rec.lineNotified && (
                        <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 font-semibold">
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
          <div className="shrink-0 p-3 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-border)] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[var(--color-primary-text)] shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <h4 className="font-bold text-[var(--color-text-title)] text-[11px]">
                {lang === 'th' ? 'เกณฑ์การแปลผลแบบประเมินพฤติกรรมเด็ก (SDQ ฉบับ สพฐ.)' : 'SDQ Assessment Benchmark'}
              </h4>
              <p className="text-[var(--color-text-body)] leading-relaxed text-[11px]">
                แบบประเมิน SDQ ครอบคลุมพฤติกรรม 5 ด้าน (คะแนนความยากลำบาก 0-40):
                <span className="text-emerald-800 dark:text-emerald-300 font-bold ml-1">กลุ่มปกติ (0-15)</span>,
                <span className="text-amber-800 dark:text-amber-300 font-bold ml-1">กลุ่มเสี่ยง (16-19)</span>,
                <span className="text-rose-800 dark:text-rose-300 font-bold ml-1">กลุ่มมีปัญหา (20-40)</span>
              </p>
            </div>
          </div>

          {/* SDQ Assessments List */}
          <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-xs flex flex-col overflow-hidden">
            <div className="shrink-0 p-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                <span>{lang === 'th' ? 'ผลการประเมิน SDQ รายบุคคล' : 'Individual SDQ Results'}</span>
              </h3>
              <span className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th' ? 'ประเมินแล้ว' : 'Assessed'}: {sdqList.length} {lang === 'th' ? 'คน' : 'students'}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] text-[var(--color-text-title)] uppercase">
                    <th className="p-2.5">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'ด้านอารมณ์' : 'Emotional'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'ความประพฤติ' : 'Conduct'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'อยู่ไม่นิ่ง' : 'Hyperactivity'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'เพื่อน' : 'Peer'}</th>
                    <th className="p-2 text-center font-bold text-emerald-800 dark:text-emerald-300">{lang === 'th' ? 'จุดแข็ง' : 'Prosocial'}</th>
                    <th className="p-2 text-center font-bold text-[var(--color-text-title)]">{lang === 'th' ? 'คะแนนรวม' : 'Total'}</th>
                    <th className="p-2 text-center">{lang === 'th' ? 'ผลประเมิน' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  <PaginatedTableRows items={sdqList} colSpan={8} renderRow={(sdq) => {
                    const statusConfig = {
                      normal: { label: 'กลุ่มปกติ', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' },
                      risk: { label: 'กลุ่มเสี่ยง', color: 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' },
                      problem: { label: 'กลุ่มมีปัญหา', color: 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700' }
                    }[sdq.overallStatus];

                    return (
                      <tr key={sdq.id} className="hover:bg-[var(--color-card-subtle)] transition">
                        <td className="p-3">
                          <p className="font-bold text-[var(--color-text-title)]">{sdq.studentName}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{sdq.studentRoom} • ประเมินโดย {sdq.assessorName}</p>
                        </td>
                        <td className="p-2 text-center font-mono text-[var(--color-text-body)]">{sdq.emotionalScore}/10</td>
                        <td className="p-2 text-center font-mono text-[var(--color-text-body)]">{sdq.conductScore}/10</td>
                        <td className="p-2 text-center font-mono text-[var(--color-text-body)]">{sdq.hyperactivityScore}/10</td>
                        <td className="p-2 text-center font-mono text-[var(--color-text-body)]">{sdq.peerScore}/10</td>
                        <td className="p-2 text-center font-mono text-emerald-700 dark:text-emerald-300 font-bold">{sdq.prosocialScore}/10</td>
                        <td className="p-2 text-center font-mono font-bold text-sm text-[var(--color-primary-text)]">
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

      {/* ========================================================
          Tab 3: ระบบคัดกรองนักเรียนยากจน (CCT กสศ. / สพฐ.)
         ======================================================== */}
      {activeTab === 'cct_poverty' && (
        <div className="flex-1 min-h-0 flex flex-col bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 shadow-xs overflow-y-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  CCT กสศ. &amp; สพฐ.
                </span>
                <h2 className="text-base font-bold text-[var(--color-text-title)]">
                  ระบบคัดกรองนักเรียนยากจนและยากจนพิเศษแบบมีเงื่อนไข (Conditional Cash Transfer)
                </h2>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                การคัดกรองความยากจนตามเกณฑ์สถานะครัวเรือน (PMT), บันทึกแบบ นร.01, การรับรองผล และจัดสรรเงินอุดหนุนปัจจัยพื้นฐาน
              </p>
            </div>
            <div className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 shrink-0">
              รอบจัดสรร: {formatSemesterLabel(currentSemester)}/{academicYear}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300">กลุ่มยากจนพิเศษ (กสศ.)</div>
              <div className="text-xl font-black text-amber-900 dark:text-amber-100 mt-0.5">3 คน</div>
              <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">รับทุน 3,000 บ./ภาคเรียน</div>
            </div>
            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300">กลุ่มยากจน (สพฐ.)</div>
              <div className="text-xl font-black text-blue-900 dark:text-blue-100 mt-0.5">5 คน</div>
              <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-1">รับทุน 1,500 บ./ภาคเรียน</div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">คัดกรองแล้ว (นร.01)</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">100%</div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-1">ครูประจำชั้นรับรองครบถ้วน</div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">สถานะการโอนเงินทุน</div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>โอนตรงบัญชีนักเรียนแล้ว</span>
              </div>
            </div>
          </div>

          {/* CCT Student Table */}
          <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                <tr>
                  <th className="py-2.5 px-3">เลขประจำตัว / 13 หลัก DMC</th>
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2.5 px-3">ระดับชั้น</th>
                  <th className="py-2.5 px-3 text-right">รายได้ครัวเรือน/เดือน</th>
                  <th className="py-2.5 px-3 text-center">สถานะความยากจน</th>
                  <th className="py-2.5 px-3 text-center">แบบ นร.01 / เยี่ยมบ้าน</th>
                  <th className="py-2.5 px-3 text-center">เงินทุนจัดสรร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {students.map((stu, idx) => {
                  const isSpecialPoor = idx === 0 || idx === 3;
                  const isNormalPoor = idx === 1 || idx === 4;
                  const income = isSpecialPoor ? 2400 : (isNormalPoor ? 4200 : 18500);
                  const nationalId = stu.nationalId || `1100${idx.toString().padStart(9, '0')}`;
                  return (
                    <tr key={stu.id} className="hover:bg-[var(--color-card-subtle)] transition">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-[var(--color-primary-text)]">{stu.studentIdNumber}</div>
                        <div className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-wider">{nationalId}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--color-text-title)]">
                        {stu.firstNameTh} {stu.lastNameTh}
                        <div className="text-[10px] text-[var(--color-text-muted)] font-normal">{stu.firstNameEn} {stu.lastNameEn}</div>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text-body)]">
                        {stu.gradeLevel} ({stu.room})
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {income.toLocaleString()} บาท
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isSpecialPoor ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300">
                            ยากจนพิเศษ (CCT)
                          </span>
                        ) : isNormalPoor ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300">
                            ยากจน (สพฐ.)
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            ทั่วไป
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>รับรองแล้ว</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isSpecialPoor ? (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">3,000 บาท</span>
                        ) : isNormalPoor ? (
                          <span className="font-bold text-blue-700 dark:text-blue-400 font-mono">1,500 บาท</span>
                        ) : (
                          <span className="text-[var(--color-text-muted)] font-mono">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          Tab 4: ระบบดูแลช่วยเหลือนักเรียน 5 ขั้นตอน (OBEC Care)
         ======================================================== */}
      {activeTab === 'obec_care_steps' && (
        <div className="flex-1 min-h-0 flex flex-col bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 shadow-xs overflow-y-auto space-y-4">
          <div className="border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                OBEC Care System
              </span>
              <h2 className="text-base font-bold text-[var(--color-text-title)]">
                กระบวนการดำเนินงานระบบดูแลช่วยเหลือนักเรียน 5 ขั้นตอน (มาตรฐาน สพฐ.)
              </h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              แนวทางการดำเนินงานเชิงรุกในการดูแล ส่งเสริม ป้องกัน และแก้ไขปัญหานักเรียนในสถานศึกษาอย่างมีประสิทธิภาพ
            </p>
          </div>

          {/* 5 Steps Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-[10px]">ขั้นตอนที่ 1</span>
                <span className="text-emerald-600 font-bold text-xs">100%</span>
              </div>
              <h3 className="font-bold text-xs text-[var(--color-text-title)]">การรู้จักนักเรียนรายบุคคล</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                เก็บข้อมูลระเบียนสะสม (ปพ.8), สแกนใบหน้า/บัตรนักเรียนดิจิทัล, บันทึกประวัติครอบครัว และการออกเยี่ยมบ้าน
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold text-[10px]">ขั้นตอนที่ 2</span>
                <span className="text-emerald-600 font-bold text-xs">96%</span>
              </div>
              <h3 className="font-bold text-xs text-[var(--color-text-title)]">การคัดกรองนักเรียน</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                คัดกรอง 3 กลุ่ม (กลุ่มปกติ, กลุ่มเสี่ยง, กลุ่มมีปัญหา) ด้วยแบบประเมิน SDQ 5 ด้าน, พฤติกรรม และสถานะความยากจน CCT
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px]">ขั้นตอนที่ 3</span>
                <span className="text-emerald-600 font-bold text-xs">ดำเนินการ</span>
              </div>
              <h3 className="font-bold text-xs text-[var(--color-text-title)]">การส่งเสริมและพัฒนา</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                กิจกรรมโฮมรูม (Homeroom), คาบแนะแนว, ชมรมจิตอาสา, เสริมสร้างทักษะชีวิต และบันทึกคะแนนความดี (Merit Points)
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px]">ขั้นตอนที่ 4</span>
                <span className="text-emerald-600 font-bold text-xs">ดำเนินการ</span>
              </div>
              <h3 className="font-bold text-xs text-[var(--color-text-title)]">การป้องกันและช่วยเหลือ</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                การให้คำปรึกษาเบื้องต้น (Counseling), การประสานงานผู้ปกครองผ่าน LINE Alert, ซ่อมเสริมการเรียน และการปรับพฤติกรรม
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px]">ขั้นตอนที่ 5</span>
                <span className="text-slate-600 font-bold text-xs">พร้อมส่ง</span>
              </div>
              <h3 className="font-bold text-xs text-[var(--color-text-title)]">การส่งต่อ (Referral)</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                ส่งต่อภายใน (ห้องพยาบาล / ครูแนะแนวเฉพาะทาง) และส่งต่อภายนอก (โรงพยาบาล / กสศ. / ศูนย์สุขภาพจิตชุมชน)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Behavior Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[var(--color-primary-text)]" />
                {lang === 'th' ? 'บันทึกคะแนนความประพฤติ' : 'Add Behavior Record'}
              </h3>
              <button onClick={() => setShowAddRecordModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2 py-1 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'เลือกนักเรียน' : 'Select Student'}</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
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
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'ประเภทพฤติกรรม' : 'Record Type'}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRecordType('merit');
                      setRecordCategory(PRESET_MERITS[0].label);
                      setRecordPoints(PRESET_MERITS[0].points);
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      recordType === 'merit'
                        ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-muted)]'
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
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      recordType === 'demerit'
                        ? 'bg-rose-100 dark:bg-rose-950 border-rose-500 text-rose-900 dark:text-rose-200'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>ตัดคะแนน / ผิดระเบียบ (-แต้ม)</span>
                  </button>
                </div>
              </div>

              {/* Preset selection */}
              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'รายการมาตรฐาน' : 'Preset Categories'}</label>
                <select
                  value={recordCategory}
                  onChange={(e) => {
                    setRecordCategory(e.target.value);
                    const list = recordType === 'merit' ? PRESET_MERITS : PRESET_DEMERITS;
                    const match = list.find((item) => item.label === e.target.value);
                    if (match) setRecordPoints(Math.abs(match.points));
                  }}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                >
                  {(recordType === 'merit' ? PRESET_MERITS : PRESET_DEMERITS).map((item) => (
                    <option key={item.label} value={item.label}>
                      {item.label} ({item.points > 0 ? `+${item.points}` : item.points} คะแนน)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'จำนวนคะแนนที่ปรับ' : 'Points'}</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={recordPoints}
                  onChange={(e) => setRecordPoints(Number(e.target.value))}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)] font-mono"
                />
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'รายละเอียดเพิ่มเติม' : 'Notes / Remarks'}</label>
                <textarea
                  rows={2}
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="เช่น บันทึกเหตุการณ์ สถานที่ หรือพยาน..."
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              {/* LINE Notification Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="text-[var(--color-text-title)] font-semibold">ส่งแจ้งเตือนเข้า LINE ผู้ปกครองอัตโนมัติ</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyParentLine}
                  onChange={(e) => setNotifyParentLine(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold shadow-sm cursor-pointer"
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
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                {lang === 'th' ? 'ทำแบบคัดกรองพฤติกรรม SDQ (5 ด้าน)' : 'SDQ Assessment'}
              </h3>
              <button onClick={() => setShowSdqModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2 py-1 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateSdq} className="space-y-4 text-xs">
              <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                <span className={sdqFormStep === 1 ? 'font-bold text-emerald-700 dark:text-emerald-300' : ''}>1. Student & scores</span>
                <span>→</span>
                <span className={sdqFormStep === 2 ? 'font-bold text-emerald-700 dark:text-emerald-300' : ''}>2. Review & recommendations</span>
              </div>
              {sdqFormStep === 1 && (
                <div className="space-y-4">
              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'นักเรียนที่รับการประเมิน' : 'Student'}</label>
                <select
                  value={sdqStudentId}
                  onChange={(e) => setSdqStudentId(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstNameTh} {s.lastNameTh} ({s.room})
                    </option>
                  ))}
                </select>
              </div>

              {/* 5 Domains Sliders */}
              <div className="space-y-3 p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--color-text-title)] font-semibold">1. ด้านอารมณ์ (Emotional Symptoms)</span>
                    <span className="font-mono text-[var(--color-primary-text)] font-bold">{sdqEmotional} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqEmotional}
                    onChange={(e) => setSdqEmotional(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--color-text-title)] font-semibold">2. ด้านความประพฤติ / เกเร (Conduct Problems)</span>
                    <span className="font-mono text-[var(--color-primary-text)] font-bold">{sdqConduct} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqConduct}
                    onChange={(e) => setSdqConduct(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--color-text-title)] font-semibold">3. ด้านพฤติกรรมอยู่ไม่นิ่ง (Hyperactivity)</span>
                    <span className="font-mono text-[var(--color-primary-text)] font-bold">{sdqHyperactivity} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqHyperactivity}
                    onChange={(e) => setSdqHyperactivity(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--color-text-title)] font-semibold">4. ด้านความสัมพันธ์กับเพื่อน (Peer Problems)</span>
                    <span className="font-mono text-[var(--color-primary-text)] font-bold">{sdqPeer} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqPeer}
                    onChange={(e) => setSdqPeer(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="pt-2 border-t border-[var(--color-border)]">
                  <div className="flex justify-between mb-1">
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold">5. ด้านสัมพันธภาพทางสังคม / จุดแข็ง (Prosocial)</span>
                    <span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold">{sdqProsocial} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sdqProsocial}
                    onChange={(e) => setSdqProsocial(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>
                  <button type="button" onClick={() => setSdqFormStep(2)} className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer">
                    Continue to review
                  </button>
                </div>
              )}

              {sdqFormStep === 2 && (
                <div className="space-y-4">
              {/* Total Calculation Preview */}
              <div className="p-3 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--color-primary-text)] font-semibold">คะแนนรวมความยากลำบาก (4 ด้านแรก):</span>
                  <p className="text-[11px] text-[var(--color-text-body)]">
                    {sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer >= 20 ? (
                      <span className="text-rose-700 dark:text-rose-300 font-bold">ผลการแปล: กลุ่มมีปัญหา (ต้องส่งต่อ)</span>
                    ) : sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer >= 16 ? (
                      <span className="text-amber-800 dark:text-amber-300 font-bold">ผลการแปล: กลุ่มเสี่ยง (ต้องติดตาม)</span>
                    ) : (
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold">ผลการแปล: กลุ่มปกติ</span>
                    )}
                  </p>
                </div>
                <span className="text-xl font-bold font-mono text-[var(--color-text-title)]">
                  {sdqEmotional + sdqConduct + sdqHyperactivity + sdqPeer} <span className="text-xs text-[var(--color-text-muted)]">/ 40</span>
                </span>
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'ข้อสังเกตและแนวทางช่วยเหลือ' : 'Teacher Recommendations'}</label>
                <textarea
                  rows={2}
                  value={sdqNotes}
                  onChange={(e) => setSdqNotes(e.target.value)}
                  placeholder="ระบุคำแนะนำหรือแผนการดูแลช่วยเหลือนักเรียน..."
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSdqFormStep(1)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setShowSdqModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm cursor-pointer"
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
