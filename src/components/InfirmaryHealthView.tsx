import React, { useState } from 'react';
import { 
  HeartPulse, 
  Thermometer, 
  AlertTriangle, 
  Bed, 
  Pill, 
  Plus, 
  Search, 
  User, 
  CheckCircle2, 
  Send, 
  ShieldAlert, 
  Activity, 
  Clock, 
  Calendar,
  FileText
} from 'lucide-react';
import { 
  InfirmaryVisit, 
  InfirmaryCategory, 
  InfirmaryStatus, 
  Student, 
  AppLanguage, 
  UserRole 
} from '../types';

interface InfirmaryHealthViewProps {
  visits: InfirmaryVisit[];
  students: Student[];
  onAddVisit: (visit: InfirmaryVisit) => void;
  lang: AppLanguage;
  currentRole: UserRole;
}

export const InfirmaryHealthView: React.FC<InfirmaryHealthViewProps> = ({
  visits,
  students,
  onAddVisit,
  lang,
  currentRole
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InfirmaryStatus>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New visit form state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [temperature, setTemperature] = useState<number>(37.5);
  const [symptoms, setSymptoms] = useState('');
  const [category, setCategory] = useState<InfirmaryCategory>('fever');
  const [treatment, setTreatment] = useState('ให้นอนพักดื่มน้ำอุ่น และเช็ดตัวลดไข้');
  const [medication, setMedication] = useState('Paracetamol 500mg 1 เม็ด');
  const [bedNumber, setBedNumber] = useState('เตียง 1');
  const [visitStatus, setVisitStatus] = useState<InfirmaryStatus>('resting');
  const [nurseName, setNurseName] = useState('พว.สุดารัตน์ เจริญสุข (พยาบาลวิชาชีพ)');
  const [notifyParent, setNotifyParent] = useState(true);

  // Filtered visits
  const filteredVisits = visits.filter((v) => {
    const matchSearch = v.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.symptoms.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.gradeRoom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Students with allergies
  const studentsWithAllergies = students.filter(
    (s) => (s.allergies && s.allergies.length > 0) || (s.chronicDiseases && s.chronicDiseases.length > 0)
  );

  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const newVisit: InfirmaryVisit = {
      id: `inf-${Date.now()}`,
      schoolId: student.schoolId,
      studentId: student.id,
      studentName: `${student.firstNameTh} ${student.lastNameTh}`,
      gradeRoom: student.room,
      visitDate: new Date().toISOString().split('T')[0],
      visitTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      temperature: Number(temperature),
      symptoms: symptoms.trim() || 'รู้สึกไม่สบายตัว',
      category,
      treatment: treatment.trim(),
      medicationDispensed: medication.trim() || undefined,
      bedNumber: visitStatus === 'resting' ? bedNumber : undefined,
      status: visitStatus,
      recordedByNurse: nurseName,
      parentNotified: notifyParent,
      notes: student.allergies?.length ? `ผู้ป่วยมีประวัติแพ้: ${student.allergies.join(', ')}` : undefined
    };

    onAddVisit(newVisit);
    setShowAddModal(false);
    setSymptoms('');
  };

  const getStatusBadge = (status: InfirmaryStatus) => {
    switch (status) {
      case 'resting':
        return { label: 'กำลังนอนพักเตียง', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'discharged':
        return { label: 'กลับเข้าชั้นเรียนแล้ว', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'sent_home':
        return { label: 'ผู้ปกครองรับกลับบ้าน', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' };
      case 'hospital':
        return { label: 'นำส่งโรงพยาบาล', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <HeartPulse className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {lang === 'th' ? 'ห้องพยาบาล & ระบบสถิติสุขภาพนักเรียน' : 'School Infirmary & Health Tracker'}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                First Aid & Safety
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {lang === 'th'
                ? 'บันทึกการรักษา จ่ายยา เฝ้าระวังโรคระบาด และระบบแจ้งเตือนการแพ้ยา/แพ้อาหารฉุกเฉิน'
                : 'Infirmary visit logs, medicine dispensing, allergy safety tags, and illness surveillance.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-md shadow-rose-600/30 transition self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'th' ? 'บันทึกการรักษาใหม่' : 'New Clinic Visit'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{lang === 'th' ? 'ผู้เข้าห้องพยาบาลวันนี้' : 'Visits Today'}</span>
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {visits.length} <span className="text-xs font-normal text-slate-400">คน</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">อุณหภูมิเฉลี่ย 37.1°C</p>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{lang === 'th' ? 'กำลังนอนพักเตียง' : 'Resting on Beds'}</span>
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Bed className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">
            {visits.filter((v) => v.status === 'resting').length} <span className="text-xs font-normal text-slate-400">/ 6 เตียง</span>
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">พร้อมรองรับอีก 5 เตียง</p>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{lang === 'th' ? 'นักเรียนที่มีประวัติแพ้' : 'Allergy Watchlist'}</span>
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-400 mt-2">
            {studentsWithAllergies.length} <span className="text-xs font-normal text-slate-400">คน</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">แพ้ยาปฏิชีวนะ / อาหาร</p>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{lang === 'th' ? 'แจ้งเตือน LINE ผู้ปกครอง' : 'Parent Alerts'}</span>
            <span className="p-2 rounded-xl bg-[#06C755]/20 text-[#06C755]">
              <Send className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {visits.filter((v) => v.parentNotified).length} <span className="text-xs font-normal text-slate-400">เคส</span>
          </p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> แจ้งทันทีเมื่อมีไข้
          </p>
        </div>
      </div>

      {/* Critical Allergy Safety Alert Bar */}
      {studentsWithAllergies.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-rose-300">
                {lang === 'th' ? 'จุดตรวจความปลอดภัย: รายชื่อนักเรียนที่มีประวัติแพ้ยาและแพ้อาหารรุนแรง' : 'Critical Medical Alert: Students with Allergies'}
              </h4>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {studentsWithAllergies.map((stu) => (
                  <span
                    key={stu.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-900/50 text-rose-200 border border-rose-500/40"
                  >
                    <span>{stu.firstNameTh} ({stu.room})</span>
                    <span className="text-white/60">•</span>
                    <span className="text-rose-300 font-normal">{stu.allergies?.join(', ')}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinic Log Table & Controls */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">
              {lang === 'th' ? 'บันทึกประวัติการเข้าห้องพยาบาล' : 'Infirmary Visit Logs'}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'th' ? 'ค้นหาชื่อ / อาการ...' : 'Search records...'}
                className="bg-slate-800 text-white text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500 w-44"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-xl border border-slate-700"
            >
              <option value="all">{lang === 'th' ? 'ทุกสถานะ' : 'All Status'}</option>
              <option value="resting">{lang === 'th' ? 'กำลังนอนพัก' : 'Resting'}</option>
              <option value="discharged">{lang === 'th' ? 'กลับห้องเรียนแล้ว' : 'Discharged'}</option>
              <option value="sent_home">{lang === 'th' ? 'ผู้ปกครองรับกลับ' : 'Sent Home'}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 uppercase">
                <th className="p-3">{lang === 'th' ? 'เวลา / วันที่' : 'Date & Time'}</th>
                <th className="p-3">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                <th className="p-2 text-center">{lang === 'th' ? 'อุณหภูมิ' : 'Temp'}</th>
                <th className="p-3">{lang === 'th' ? 'อาการเจ็บป่วย' : 'Symptoms'}</th>
                <th className="p-3">{lang === 'th' ? 'การรักษา & ยาที่จ่าย' : 'Treatment & Medication'}</th>
                <th className="p-3 text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                <th className="p-3 text-right">{lang === 'th' ? 'ผู้บันทึก' : 'Nurse'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVisits.map((visit) => {
                const status = getStatusBadge(visit.status);
                const hasHighFever = visit.temperature >= 37.5;

                return (
                  <tr key={visit.id} className="hover:bg-slate-800/20 transition">
                    <td className="p-3 font-mono text-slate-300">
                      <div>{visit.visitTime} น.</div>
                      <div className="text-[10px] text-slate-500">{visit.visitDate}</div>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-white">{visit.studentName}</p>
                      <p className="text-[10px] text-slate-400">{visit.gradeRoom}</p>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
                        hasHighFever ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-300'
                      }`}>
                        <Thermometer className="w-3 h-3" />
                        {visit.temperature}°C
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-200">{visit.symptoms}</p>
                      {visit.notes && (
                        <p className="text-[10px] text-rose-300/80 italic mt-0.5">{visit.notes}</p>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">
                      <div>{visit.treatment}</div>
                      {visit.medicationDispensed && (
                        <div className="text-[10px] text-indigo-300 flex items-center gap-1 mt-0.5">
                          <Pill className="w-3 h-3 shrink-0" />
                          <span>{visit.medicationDispensed}</span>
                        </div>
                      )}
                      {visit.bedNumber && (
                        <div className="text-[10px] text-amber-300 flex items-center gap-1 mt-0.5">
                          <Bed className="w-3 h-3 shrink-0" />
                          <span>นอนพัก {visit.bedNumber}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <p className="text-slate-300 text-[11px]">{visit.recordedByNurse}</p>
                      {visit.parentNotified && (
                        <span className="text-[10px] text-[#06C755] flex items-center justify-end gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> LINE แจ้งแล้ว
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Visit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-400" />
                {lang === 'th' ? 'บันทึกการรักษาพยาบาลใหม่' : 'New Infirmary Record'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateVisit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'เลือกนักเรียนที่มารับการรักษา' : 'Select Student'}</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstNameTh} {s.lastNameTh} ({s.room}) {s.allergies?.length ? `⚠️ แพ้: ${s.allergies.join(', ')}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'อุณหภูมิร่างกาย (°C)' : 'Body Temp (°C)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'หมวดหมู่อาการ' : 'Category'}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InfirmaryCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="fever">มีไข้ / ตัวร้อน / หวัด</option>
                    <option value="headache">ปวดศีรษะ / ไมเกรน</option>
                    <option value="stomach">ปวดท้อง / ท้องเสีย</option>
                    <option value="injury">แผลสด / บาดเจ็บจากการเล่นกีฬา</option>
                    <option value="allergy">ผื่นแพ้ / ภูมิแพ้</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'อาการที่พบ' : 'Symptoms'}</label>
                <input
                  type="text"
                  required
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="เช่น มีไข้ ปวดศีรษะ เจ็บคอ..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'การปฐมพยาบาลเบื้องต้น' : 'Treatment'}</label>
                <input
                  type="text"
                  required
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  placeholder="เช่น ให้นอนพัก เช็ดตัวลดไข้..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'ยาที่จ่าย (ถ้ามี)' : 'Medicine Dispensed'}</label>
                  <input
                    type="text"
                    value={medication}
                    onChange={(e) => setMedication(e.target.value)}
                    placeholder="เช่น Paracetamol 500mg 1 เม็ด"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'เตียงนอนพัก' : 'Bed Assigned'}</label>
                  <select
                    value={bedNumber}
                    onChange={(e) => setBedNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="เตียง 1">เตียง 1</option>
                    <option value="เตียง 2">เตียง 2</option>
                    <option value="เตียง 3">เตียง 3</option>
                    <option value="เตียง 4">เตียง 4</option>
                    <option value="ไม่ต้องนอนพัก">ไม่ต้องนอนพัก</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'สถานะผู้ป่วย' : 'Patient Status'}</label>
                <select
                  value={visitStatus}
                  onChange={(e) => setVisitStatus(e.target.value as InfirmaryStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="resting">กำลังนอนพักเตียง</option>
                  <option value="discharged">อาการดีขึ้น กลับเข้าห้องเรียนแล้ว</option>
                  <option value="sent_home">ประสานผู้ปกครองมารับกลับบ้าน</option>
                  <option value="hospital">ส่งต่อโรงพยาบาลฉุกเฉิน</option>
                </select>
              </div>

              {/* LINE Notification Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#06C755]" />
                  <span className="text-slate-300 font-semibold">แจ้งเตือนผู้ปกครองผ่าน LINE ทันที</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyParent}
                  onChange={(e) => setNotifyParent(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/30"
                >
                  {lang === 'th' ? 'บันทึกการรักษา' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
