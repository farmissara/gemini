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
  FileText,
  Sliders,
  Trash2
} from 'lucide-react';
import { 
  InfirmaryVisit, 
  InfirmaryCategory, 
  InfirmaryStatus, 
  Student, 
  AppLanguage, 
  UserRole 
} from '../types';
import { PagedList } from '../components/PagedList';
import { enqueueOfflineAction, isOnlineNow } from '../lib/offlineSync';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';
import { getInfirmaryDuplicateReasons } from '../lib/duplicateRecords';
import { getLocalDateString } from '../lib/date';
import { getModuleTone } from '../lib/moduleTheme';
import { PaginatedTableRows } from '../components/common/PaginatedTableRows';
import { EmptyState } from '../components/common/EmptyState';
import { emitAppToast } from '../components/common/ToastProvider';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import { StatusBadge, type StatusBadgeStatus } from '../components/common/StatusBadge';
import { FutureNavIcon } from '../components/common/FutureIcon';
import { TableActionMenu } from '../components/common/TableActionMenu';
import { BaseModal } from '../components/common/BaseModal';
import { PageHeader } from '../components/common/PageShell';

interface InfirmaryHealthViewProps {
  schoolId?: string;
  visits: InfirmaryVisit[];
  students: Student[];
  onAddVisit: (visit: InfirmaryVisit) => void;
  lang: AppLanguage;
  currentRole: UserRole;
  currentUserId: string;
  currentUserName?: string;
}

export const InfirmaryHealthView: React.FC<InfirmaryHealthViewProps> = ({
  schoolId = 'default-school',
  visits,
  students,
  onAddVisit,
  lang,
  currentRole,
  currentUserId,
  currentUserName,
}) => {
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
  const { presets, updatePresets } = useSchoolCustomPresets(schoolId);
  const bedOptions = presets.infirmaryBeds;
  const treatmentPresets = presets.infirmaryTreatments;
  const medicationPresets = presets.infirmaryMedications;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InfirmaryStatus>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [visitFormStep, setVisitFormStep] = useState<1 | 2>(1);
  const [allowDuplicateConfirm, setAllowDuplicateConfirm] = useState(false);
  const [newBedInput, setNewBedInput] = useState('');
  const [newTreatmentInput, setNewTreatmentInput] = useState('');
  const [newMedInput, setNewMedInput] = useState('');

  // New visit form state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [temperature, setTemperature] = useState<number>(37.5);
  const [symptoms, setSymptoms] = useState('');
  const [category, setCategory] = useState<InfirmaryCategory>('fever');
  const [treatment, setTreatment] = useState(treatmentPresets[0] || 'ให้นอนพักดื่มน้ำอุ่น และเช็ดตัวลดไข้');
  const [medication, setMedication] = useState(medicationPresets[0] || 'Paracetamol 500mg 1 เม็ด');
  const [bedNumber, setBedNumber] = useState(bedOptions[0] || 'เตียง 1');
  const [visitStatus, setVisitStatus] = useState<InfirmaryStatus>('resting');
  const [nurseName, setNurseName] = useState(
    currentUserName?.trim() || (currentRole === 'teacher' ? 'ครูเวรห้องพยาบาล' : 'เจ้าหน้าที่ห้องพยาบาล')
  );
  const [notifyParent, setNotifyParent] = useState(true);
  const [infirmaryTab, setInfirmaryTab] = useState<'visits' | 'beds' | 'allergies'>('visits');

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

  const [offlineSavedNote, setOfflineSavedNote] = useState<string | null>(null);
  const todayStr = getLocalDateString();
  const visitDupReasons = showAddModal
    ? getInfirmaryDuplicateReasons(
        { studentId: selectedStudentId, visitDate: todayStr, symptoms: symptoms.trim() || 'รู้สึกไม่สบายตัว' },
        visits
      )
    : [];

  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;
    if (visitDupReasons.length > 0 && !allowDuplicateConfirm) return;

    const newVisit: InfirmaryVisit = {
      id: `inf-${Date.now()}`,
      schoolId: student.schoolId,
      studentId: student.id,
      studentName: `${student.firstNameTh} ${student.lastNameTh}`,
      gradeRoom: student.room,
      visitDate: todayStr,
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

    if (!isOnlineNow()) {
      enqueueOfflineAction({
        actionType: 'health_visit',
        userId: currentUserId,
        schoolId: student.schoolId || 'school-1',
        description: `ห้องพยาบาล (ออฟไลน์): ${newVisit.studentName} - ${newVisit.symptoms}`,
        payload: newVisit,
      });
      setOfflineSavedNote(`ไม่มีอินเทอร์เน็ต · บันทึกเคส ${newVisit.studentName} ลงคิวออฟไลน์แล้ว`);
      setTimeout(() => setOfflineSavedNote(null), 3500);
    }

    onAddVisit(newVisit);
    emitAppToast({
      tone: 'success',
      message: `บันทึกข้อมูลห้องพยาบาลของ ${newVisit.studentName} เรียบร้อยแล้ว`,
    });
    setAllowDuplicateConfirm(false);
    setShowAddModal(false);
    setSymptoms('');
  };

  const getStatusBadge = (
    status: InfirmaryStatus
  ): { label: string; title: string; status: StatusBadgeStatus } => {
    switch (status) {
      case 'resting':
        return { label: 'นอนพักเตียง', title: 'กำลังนอนพักเตียง', status: 'pending' };
      case 'discharged':
        return { label: 'กลับเข้าเรียน', title: 'กลับเข้าชั้นเรียนแล้ว', status: 'complete' };
      case 'sent_home':
        return { label: 'รับกลับบ้าน', title: 'ผู้ปกครองรับกลับบ้าน', status: 'info' };
      case 'hospital':
        return { label: 'ส่ง รพ.', title: 'นำส่งโรงพยาบาล', status: 'delayed' };
    }
  };

  return (
    <div className={`${getModuleTone('infirmary')} h-full flex flex-col min-h-0 overflow-hidden space-y-2`}>
      {/* Compact Top Header */}
      <PageHeader
        compact
        icon={<FutureNavIcon tab="infirmary" size={20} active />}
        title={lang === 'th' ? 'ห้องพยาบาล & สุขภาพนักเรียน' : 'School Infirmary & Health'}
        actions={
          <>
            <ModuleTourTrigger moduleId="infirmary" lang={lang} />
            {/* Subtabs switcher */}
            <div data-guide-id="infirmary-tabs" className="seg-tab-group overflow-x-auto no-scrollbar">
              <button
                type="button"
                data-active={infirmaryTab === 'visits'}
                onClick={() => setInfirmaryTab('visits')}
                className="seg-tab-btn"
              >
                1. รักษา ({visits.length})
              </button>
              <button
                type="button"
                data-active={infirmaryTab === 'beds'}
                onClick={() => setInfirmaryTab('beds')}
                className="seg-tab-btn"
              >
                2. เตียงพัก ({visits.filter(v => v.status === 'resting').length}/{bedOptions.length})
              </button>
              <button
                type="button"
                data-active={infirmaryTab === 'allergies'}
                onClick={() => setInfirmaryTab('allergies')}
                className="seg-tab-btn"
              >
                3. แพ้ยา ({studentsWithAllergies.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAllowDuplicateConfirm(false);
                setVisitFormStep(1);
                setShowAddModal(true);
              }}
              className="btn-action-primary px-3 py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'บันทึกการรักษา' : 'New Visit'}</span>
            </button>

            {isAdmin && (
              <TableActionMenu
                size="md"
                ariaLabel="ตั้งค่าห้องพยาบาล"
                menuWidth={210}
                items={[
                  {
                    id: 'infirmary_presets',
                    label: 'ตั้งค่าเตียง / รายการยา',
                    icon: <Sliders className="w-3.5 h-3.5 tone-text" />,
                    onClick: () => setShowPresetModal(true),
                  },
                ]}
              />
            )}
          </>
        }
      />

      {offlineSavedNote && (
        <div role="status" className="shrink-0 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-200">
          {offlineSavedNote}
        </div>
      )}

      {/* TAB 1: VISITS LOG TABLE */}
      {infirmaryTab === 'visits' && (
        <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-xs flex flex-col overflow-hidden">
          <div className="shrink-0 p-3 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-700 dark:text-rose-300" />
              <h3 className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider">
                {lang === 'th' ? 'บันทึกประวัติการเข้าห้องพยาบาล' : 'Infirmary Visit Logs'}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={lang === 'th' ? 'ค้นหาชื่อ / อาการ...' : 'Search records...'}
                  className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs pl-7 pr-2.5 py-1 rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] w-44"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)]"
              >
                <option value="all">{lang === 'th' ? 'ทุกสถานะ' : 'All Status'}</option>
                <option value="resting">{lang === 'th' ? 'กำลังนอนพัก' : 'Resting'}</option>
                <option value="discharged">{lang === 'th' ? 'กลับห้องเรียนแล้ว' : 'Discharged'}</option>
                <option value="sent_home">{lang === 'th' ? 'ผู้ปกครองรับกลับ' : 'Sent Home'}</option>
              </select>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="table-comfortable w-full text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] text-[var(--color-text-title)] uppercase">
                  <th className="p-2.5">{lang === 'th' ? 'เวลา / วันที่' : 'Date & Time'}</th>
                  <th className="p-2.5">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                  <th className="p-2 text-center">{lang === 'th' ? 'อุณหภูมิ' : 'Temp'}</th>
                  <th className="p-2.5">{lang === 'th' ? 'อาการเจ็บป่วย' : 'Symptoms'}</th>
                  <th className="p-2.5">{lang === 'th' ? 'การรักษา & ยาที่จ่าย' : 'Treatment & Medication'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                  <th className="p-2.5 text-right">{lang === 'th' ? 'ผู้บันทึก' : 'Nurse'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                <PaginatedTableRows
                  items={filteredVisits}
                  colSpan={7}
                  emptyState={(
                    <EmptyState
                      compact
                      icon={HeartPulse}
                      title={visits.length === 0 ? 'ยังไม่มีบันทึกการเข้าห้องพยาบาล' : 'ไม่พบรายการที่ตรงกับตัวกรอง'}
                      description="กดปุ่มบันทึกการรักษาเพื่อเพิ่มประวัติอาการและยาที่จ่ายให้นักเรียน"
                      action={searchTerm || statusFilter !== 'all'
                        ? { label: 'ล้างตัวกรอง', onClick: () => { setSearchTerm(''); setStatusFilter('all'); }, variant: 'neutral' }
                        : { label: 'บันทึกการรักษา', onClick: () => { setAllowDuplicateConfirm(false); setVisitFormStep(1); setShowAddModal(true); }, icon: Plus }}
                    />
                  )}
                  renderRow={(visit) => {
                  const status = getStatusBadge(visit.status);
                  const hasHighFever = visit.temperature >= 37.5;

                  return (
                    <tr key={visit.id} className="hover:bg-[var(--color-card-subtle)] transition">
                      <td className="p-2.5 font-mono text-[var(--color-text-body)]">
                        <div>{visit.visitTime} น.</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">{visit.visitDate}</div>
                      </td>
                      <td className="p-2.5">
                        <p className="font-bold text-[var(--color-text-title)] text-xs">{visit.studentName}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{visit.gradeRoom}</p>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-bold text-xs border ${
                          hasHighFever ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)]'
                        }`}>
                          <Thermometer className="w-3 h-3" />
                          {visit.temperature}°C
                        </span>
                      </td>
                      <td className="p-2.5">
                        <p className="font-semibold text-[var(--color-text-title)] text-xs">{visit.symptoms}</p>
                        {visit.notes && (
                          <p className="text-[10px] text-rose-700 dark:text-rose-300 italic mt-0.5">{visit.notes}</p>
                        )}
                      </td>
                      <td className="p-2.5 text-[var(--color-text-body)]">
                        <div>{visit.treatment}</div>
                        {visit.medicationDispensed && (
                          <div className="text-[10px] text-[var(--color-primary-text)] flex items-center gap-1 mt-0.5">
                            <Pill className="w-3 h-3 shrink-0" />
                            <span>{visit.medicationDispensed}</span>
                          </div>
                        )}
                        {visit.bedNumber && (
                          <div className="text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1 mt-0.5">
                            <Bed className="w-3 h-3 shrink-0" />
                            <span>นอนพัก {visit.bedNumber}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <StatusBadge size="xs" status={status.status} label={status.label} title={status.title} />
                      </td>
                      <td className="p-2.5 text-right">
                        <p className="text-[var(--color-text-body)] text-[11px]">{visit.recordedByNurse}</p>
                        {visit.parentNotified && (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center justify-end gap-1 mt-0.5 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> LINE แจ้งแล้ว
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }} />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BED OCCUPANCY & HEALTH KPIS */}
      {infirmaryTab === 'beds' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <span className="text-[11px] text-[var(--color-text-muted)]">{lang === 'th' ? 'ผู้เข้าห้องพยาบาลวันนี้' : 'Visits Today'}</span>
              <p className="text-lg font-bold text-[var(--color-text-title)] mt-1">
                {visits.length} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">คน</span>
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">อุณหภูมิเฉลี่ย 37.1°C</p>
            </div>

            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <span className="text-[11px] text-[var(--color-text-muted)]">{lang === 'th' ? 'กำลังนอนพักเตียง' : 'Resting on Beds'}</span>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1">
                {visits.filter((v) => v.status === 'resting').length} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">/ {bedOptions.length} เตียง</span>
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">พร้อมรองรับอีก {Math.max(0, bedOptions.length - visits.filter((v) => v.status === 'resting').length)} เตียง</p>
            </div>

            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <span className="text-[11px] text-[var(--color-text-muted)]">{lang === 'th' ? 'นักเรียนที่แพ้ยา/อาหาร' : 'Allergies'}</span>
              <p className="text-lg font-bold text-purple-800 dark:text-purple-300 mt-1">
                {studentsWithAllergies.length} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">คน</span>
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">มีบันทึกในแฟ้มประวัติ</p>
            </div>

            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <span className="text-[11px] text-[var(--color-text-muted)]">{lang === 'th' ? 'แจ้งเตือนผู้ปกครอง' : 'Parent Alerts'}</span>
              <p className="text-lg font-bold text-[var(--color-text-title)] mt-1">
                {visits.filter((v) => v.parentNotified).length} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">เคส</span>
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">ส่ง LINE เรียบร้อย</p>
            </div>
          </div>

          {/* Infirmary Beds Status Cards */}
          <div className="bg-[var(--color-card)] p-4 rounded-xl border border-[var(--color-border)] shadow-xs">
            <h3 className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider pb-2 border-b border-[var(--color-border)] flex items-center gap-1.5 mb-3">
              <Bed className="w-4 h-4 text-amber-700 dark:text-amber-300" />
              <span>ผังเตียงนอนพักห้องพยาบาล ({bedOptions.length} เตียง)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bedOptions.map((bedLabel) => {
                const restingPatient = visits.find((v) => v.status === 'resting' && v.bedNumber === bedLabel);
                return (
                  <div
                    key={bedLabel}
                    className={`p-3 rounded-xl border transition ${
                      restingPatient
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-[var(--color-border)]">
                      <span className="font-bold text-xs text-[var(--color-text-title)] flex items-center gap-1.5">
                        <Bed className={`w-3.5 h-3.5 ${restingPatient ? 'text-amber-800 dark:text-amber-300' : 'text-[var(--color-text-muted)]'}`} />
                        <span>{bedLabel}</span>
                      </span>
                      <StatusBadge
                        size="xs"
                        status={restingPatient ? 'pending' : 'complete'}
                        label={restingPatient ? 'มีผู้ป่วยนอนพัก' : 'ว่าง'}
                        title={restingPatient ? 'มีผู้ป่วยนอนพักเตียง' : 'ว่าง (พร้อมใช้งาน)'}
                      />
                    </div>

                    {restingPatient ? (
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="font-bold text-[var(--color-text-title)] text-xs">{restingPatient.studentName}</p>
                        <p className="text-[11px] text-[var(--color-text-body)]">{restingPatient.gradeRoom} • อุณหภูมิ {restingPatient.temperature}°C</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] italic">อาการ: {restingPatient.symptoms}</p>
                        <p className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">เข้าพัก: {restingPatient.visitTime} น.</p>
                      </div>
                    ) : (
                      <div className="mt-4 text-center text-xs text-[var(--color-text-muted)] py-2">
                        เตียงว่าง สะอาด ผ่านการฆ่าเชื้อ
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALLERGIES WATCHLIST */}
      {infirmaryTab === 'allergies' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          <div className="p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-700 dark:text-rose-300 shrink-0" />
            <span>
              <strong>จุดตรวจความปลอดภัยทางการแพทย์:</strong> ตรวจสอบรายชื่อนักเรียนที่มีประวัติแพ้ยาปฏิชีวนะ แพ้อาหาร หรือโรคประจำตัวก่อนจ่ายยาพยาบาลทุกครั้ง
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <PagedList items={studentsWithAllergies} pageSize={3} renderItem={(stu) => (
              <div
                key={stu.id}
                className="p-3.5 rounded-xl bg-[var(--color-card)] border border-rose-400 dark:border-rose-700 shadow-xs space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={stu.avatarUrl}
                    alt={stu.firstNameTh}
                    className="w-10 h-10 rounded-full object-cover border border-rose-400 dark:border-rose-600"
                  />
                  <div>
                    <h4 className="font-bold text-[var(--color-text-title)] text-xs">
                      {stu.firstNameTh} {stu.lastNameTh}
                    </h4>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{stu.gradeLevel} • {stu.room} (รหัส {stu.studentIdNumber})</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  {stu.allergies && stu.allergies.length > 0 && (
                    <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-[11px]">
                      <span className="font-bold block text-rose-950 dark:text-rose-100">ประวัติแพ้ยา/อาหาร:</span>
                      {stu.allergies.join(', ')}
                    </div>
                  )}

                  {stu.chronicDiseases && stu.chronicDiseases.length > 0 && (
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-[11px]">
                      <span className="font-bold block text-amber-950 dark:text-amber-100">โรคประจำตัว:</span>
                      {stu.chronicDiseases.join(', ')}
                    </div>
                  )}

                  <div className="text-[10px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
                    ผู้ปกครอง: {stu.guardianName} ({stu.guardianRelation}) • {stu.guardianPhone}
                  </div>
                </div>
              </div>
            )} />
          </div>
        </div>
      )}

      {/* Add Visit Modal */}
      <BaseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={lang === 'th' ? 'บันทึกการรักษาพยาบาลใหม่' : 'New Infirmary Record'}
        icon={<HeartPulse className="w-4 h-4 text-rose-700 dark:text-rose-300" />}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6"
      >
        <form onSubmit={handleCreateVisit} className="space-y-4 text-xs">
              <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                <span className={visitFormStep === 1 ? 'font-bold text-rose-700 dark:text-rose-300' : ''}>1. Patient & symptoms</span>
                <span>→</span>
                <span className={visitFormStep === 2 ? 'font-bold text-rose-700 dark:text-rose-300' : ''}>2. Treatment & disposition</span>
              </div>
              {visitFormStep === 1 && (
                <div className="space-y-4">
              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'เลือกนักเรียนที่มารับการรักษา' : 'Select Student'}</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
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
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'อุณหภูมิร่างกาย (°C)' : 'Body Temp (°C)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'หมวดหมู่อาการ' : 'Category'}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InfirmaryCategory)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
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
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'อาการที่พบ' : 'Symptoms'}</label>
                <input
                  type="text"
                  required
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="เช่น มีไข้ ปวดศีรษะ เจ็บคอ..."
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'การปฐมพยาบาลเบื้องต้น' : 'Treatment'}</label>
                <input
                  type="text"
                  required
                  list="infirmary-treatments-list"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  placeholder="เช่น ให้นอนพัก เช็ดตัวลดไข้..."
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
                <datalist id="infirmary-treatments-list">
                  {treatmentPresets.map((item) => <option key={item} value={item} />)}
                </datalist>
              </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentId && temperature > 0 && symptoms.trim() && treatment.trim()) setVisitFormStep(2);
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer"
                  >
                    Continue to treatment and disposition
                  </button>
                </div>
              )}

              {visitFormStep === 2 && (
                <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'ยาที่จ่าย (ถ้ามี)' : 'Medicine Dispensed'}</label>
                  <input
                    type="text"
                    list="infirmary-meds-list"
                    value={medication}
                    onChange={(e) => setMedication(e.target.value)}
                    placeholder="เช่น Paracetamol 500mg 1 เม็ด"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                  <datalist id="infirmary-meds-list">
                    {medicationPresets.map((item) => <option key={item} value={item} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'เตียงนอนพัก' : 'Bed Assigned'}</label>
                  <select
                    value={bedNumber}
                    onChange={(e) => setBedNumber(e.target.value)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  >
                    {bedOptions.map((bed) => (
                      <option key={bed} value={bed}>{bed}</option>
                    ))}
                    <option value="ไม่ต้องนอนพัก">ไม่ต้องนอนพัก</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'สถานะผู้ป่วย' : 'Patient Status'}</label>
                <select
                  value={visitStatus}
                  onChange={(e) => setVisitStatus(e.target.value as InfirmaryStatus)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                >
                  <option value="resting">กำลังนอนพักเตียง</option>
                  <option value="discharged">อาการดีขึ้น กลับเข้าห้องเรียนแล้ว</option>
                  <option value="sent_home">ประสานผู้ปกครองมารับกลับบ้าน</option>
                  <option value="hospital">ส่งต่อโรงพยาบาลฉุกเฉิน</option>
                </select>
              </div>

              {/* LINE Notification Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                  <span className="text-[var(--color-text-title)] font-semibold">แจ้งเตือนผู้ปกครองผ่าน LINE ทันที</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyParent}
                  onChange={(e) => setNotifyParent(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded"
                />
              </div>

              {visitDupReasons.length > 0 && (
                <div className="p-2.5 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
                    <span>{visitDupReasons.join(', ')}</span>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDuplicateConfirm}
                      onChange={(e) => setAllowDuplicateConfirm(e.target.checked)}
                      className="rounded accent-amber-600"
                    />
                    <span>ยืนยันบันทึกเข้าห้องพยาบาลซ้ำอีกครั้ง</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setVisitFormStep(1)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={visitDupReasons.length > 0 && !allowDuplicateConfirm}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-semibold shadow-sm cursor-pointer"
                >
                  {lang === 'th' ? 'บันทึกการรักษา' : 'Save Record'}
                </button>
              </div>
                </div>
              )}
        </form>
      </BaseModal>

      {/* Admin Infirmary Presets Modal */}
      <BaseModal
        isOpen={showPresetModal && isAdmin}
        onClose={() => setShowPresetModal(false)}
        title="ตั้งค่าเตียงพัก ยา และการปฐมพยาบาล (Admin)"
        icon={<Sliders className="w-4 h-4 text-rose-700 dark:text-rose-300" />}
        maxWidthClass="max-w-lg"
        heightClass="max-h-[85vh]"
        zIndexClass="z-50"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 text-xs"
      >
        <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-bold text-[var(--color-text-title)]">รายชื่อเตียงห้องพยาบาล ({bedOptions.length} เตียง)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBedInput}
                    onChange={(e) => setNewBedInput(e.target.value)}
                    placeholder="เช่น เตียง 5 หรือ เตียงแยกกัก"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newBedInput.trim();
                      if (!val) return;
                      updatePresets({ infirmaryBeds: [...bedOptions, val] });
                      setNewBedInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-700 text-white font-bold cursor-pointer"
                  >เพิ่ม</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {bedOptions.map((bed) => (
                    <span key={bed} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                      <span>{bed}</span>
                      {bedOptions.length > 1 && (
                        <button type="button" onClick={() => updatePresets({ infirmaryBeds: bedOptions.filter((b) => b !== bed) })} className="text-rose-600 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-[var(--color-text-title)]">ตัวเลือกรายการยา ({medicationPresets.length})</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMedInput}
                    onChange={(e) => setNewMedInput(e.target.value)}
                    placeholder="เพิ่มชื่อยา..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newMedInput.trim();
                      if (!val) return;
                      updatePresets({ infirmaryMedications: [...medicationPresets, val] });
                      setNewMedInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-700 text-white font-bold cursor-pointer"
                  >เพิ่ม</button>
                </div>
                <div className="space-y-1">
                  {medicationPresets.map((med) => (
                    <div key={med} className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                      <span className="truncate">{med}</span>
                      <button type="button" onClick={() => updatePresets({ infirmaryMedications: medicationPresets.filter((m) => m !== med) })} className="text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-[var(--color-text-title)]">ตัวเลือกการปฐมพยาบาล ({treatmentPresets.length})</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTreatmentInput}
                    onChange={(e) => setNewTreatmentInput(e.target.value)}
                    placeholder="เพิ่มแนวทางการดูแลรักษา..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newTreatmentInput.trim();
                      if (!val) return;
                      updatePresets({ infirmaryTreatments: [...treatmentPresets, val] });
                      setNewTreatmentInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-700 text-white font-bold cursor-pointer"
                  >เพิ่ม</button>
                </div>
                <div className="space-y-1">
                  {treatmentPresets.map((tr) => (
                    <div key={tr} className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                      <span className="truncate">{tr}</span>
                      <button type="button" onClick={() => updatePresets({ infirmaryTreatments: treatmentPresets.filter((t) => t !== tr) })} className="text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
        </div>
      </BaseModal>
    </div>
  );
};
