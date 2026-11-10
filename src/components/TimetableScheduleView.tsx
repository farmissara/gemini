import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  User, 
  MapPin, 
  Trash2, 
  Download, 
  Share2, 
  Sparkles,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import { TimetableSlot, DayOfWeek, AppLanguage, UserRole } from '../types';

interface TimetableScheduleViewProps {
  slots: TimetableSlot[];
  onAddSlot: (slot: TimetableSlot) => void;
  onDeleteSlot: (id: string) => void;
  lang: AppLanguage;
  currentRole: UserRole;
  schoolName: string;
}

const DAYS: { key: DayOfWeek; th: string; en: string; color: string }[] = [
  { key: 'mon', th: 'วันจันทร์', en: 'Monday', color: 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200' },
  { key: 'tue', th: 'วันอังคาร', en: 'วันอังคาร (Tue)', color: 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-200' },
  { key: 'wed', th: 'วันพุธ', en: 'Wednesday', color: 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200' },
  { key: 'thu', th: 'วันพฤหัสบดี', en: 'Thursday', color: 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-700 text-orange-950 dark:text-orange-200' },
  { key: 'fri', th: 'วันศุกร์', en: 'วันศุกร์ (Fri)', color: 'bg-sky-100 dark:bg-sky-950 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-200' }
];

const PERIODS = [
  { num: 1, time: '08:30 - 09:20' },
  { num: 2, time: '09:20 - 10:10' },
  { num: 3, time: '10:20 - 11:10' },
  { num: 4, time: '11:10 - 12:00' },
  { num: 'lunch', time: '12:00 - 13:00', isBreak: true },
  { num: 5, time: '13:00 - 13:50' },
  { num: 6, time: '13:50 - 14:40' },
  { num: 7, time: '14:40 - 15:30' }
];

const CLASSROOMS = [
  'ห้อง 401 (วิทย์-คณิต)',
  'ห้อง 402 (ศิลป์-ภาษาอังกฤษ)',
  'ห้อง 501 (วิทย์-คณิต)',
  'ห้อง 601 (วิทย์-คอมพิวเตอร์)'
];

const COLOR_CLASSES: Record<string, string> = {
  sky: 'bg-sky-100 dark:bg-sky-950 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-100 hover:bg-sky-200 dark:hover:bg-sky-900',
  emerald: 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-200 dark:hover:bg-emerald-900',
  amber: 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-900',
  rose: 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 hover:bg-rose-200 dark:hover:bg-rose-900',
  purple: 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 hover:bg-purple-200 dark:hover:bg-purple-900',
  indigo: 'bg-indigo-100 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100 hover:bg-indigo-200 dark:hover:bg-indigo-900',
  cyan: 'bg-cyan-100 dark:bg-cyan-950 border-cyan-300 dark:border-cyan-700 text-cyan-950 dark:text-cyan-100 hover:bg-cyan-200 dark:hover:bg-cyan-900'
};

export const TimetableScheduleView: React.FC<TimetableScheduleViewProps> = ({
  slots,
  onAddSlot,
  onDeleteSlot,
  lang,
  currentRole,
  schoolName
}) => {
  const [selectedClassRoom, setSelectedClassRoom] = useState<string>('ห้อง 401 (วิทย์-คณิต)');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // New slot form state
  const [newDay, setNewDay] = useState<DayOfWeek>('mon');
  const [newPeriod, setNewPeriod] = useState<number>(1);
  const [newCourseCode, setNewCourseCode] = useState('CS301');
  const [newTitleTh, setNewTitleTh] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newTeacher, setNewTeacher] = useState('อ.ดร.ประเสริฐ ถาวร');
  const [newRoom, setNewRoom] = useState('ห้อง 401');
  const [newColor, setNewColor] = useState<TimetableSlot['colorTag']>('sky');

  // Filter slots for selected room
  const activeSlots = slots.filter((s) => s.classRoom === selectedClassRoom);

  // Check for teacher or room conflicts across the entire school
  const conflicts: { slotId: string; reason: string }[] = [];
  slots.forEach((s1, i) => {
    slots.slice(i + 1).forEach((s2) => {
      if (s1.dayOfWeek === s2.dayOfWeek && s1.periodNumber === s2.periodNumber) {
        if (s1.teacherName === s2.teacherName && s1.classRoom !== s2.classRoom) {
          conflicts.push({
            slotId: s1.id,
            reason: `ครูผู้สอน (${s1.teacherName}) ชนกับ ${s2.classRoom}`
          });
          conflicts.push({
            slotId: s2.id,
            reason: `ครูผู้สอน (${s2.teacherName}) ชนกับ ${s1.classRoom}`
          });
        }
        if (s1.room === s2.room && s1.classRoom !== s2.classRoom) {
          conflicts.push({
            slotId: s1.id,
            reason: `ห้องเรียน (${s1.room}) ถูกจองซ้ำซ้อนโดย ${s2.classRoom}`
          });
        }
      }
    });
  });

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newTitleTh) return;

    const periodTimes: Record<number, { start: string; end: string }> = {
      1: { start: '08:30', end: '09:20' },
      2: { start: '09:20', end: '10:10' },
      3: { start: '10:20', end: '11:10' },
      4: { start: '11:10', end: '12:00' },
      5: { start: '13:00', end: '13:50' },
      6: { start: '13:50', end: '14:40' },
      7: { start: '14:40', end: '15:30' }
    };

    const newSlot: TimetableSlot = {
      id: `time-${Date.now()}`,
      dayOfWeek: newDay,
      periodNumber: newPeriod,
      startTime: periodTimes[newPeriod]?.start || '08:30',
      endTime: periodTimes[newPeriod]?.end || '09:20',
      courseCode: newCourseCode.trim(),
      courseTitleTh: newTitleTh.trim(),
      courseTitleEn: newTitleEn.trim() || newTitleTh.trim(),
      teacherName: newTeacher.trim(),
      room: newRoom.trim(),
      classRoom: selectedClassRoom,
      colorTag: newColor
    };

    onAddSlot(newSlot);
    setShowAddModal(false);
    setNewTitleTh('');
    setNewTitleEn('');
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3">
      {/* Header & Controls */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)]">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-title)] flex items-center gap-2 flex-wrap">
                {lang === 'th' ? 'ตารางเรียนและตารางสอนรายสัปดาห์' : 'Weekly Timetable & Schedule'}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] font-semibold">
                  {lang === 'th' ? 'ตรวจคาบชนอัตโนมัติ' : 'Conflict Detection'}
                </span>
              </h1>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th' 
                  ? 'จัดตารางเรียนรายห้อง ตรวจสอบการซ้ำซ้อนของครูผู้สอนและห้องเรียน พร้อมพิมพ์ขนาด A4' 
                  : 'Manage weekly schedules, resolve room/teacher conflicts, and print classroom timetables.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Classroom Selector */}
          <div className="relative">
            <select
              value={selectedClassRoom}
              onChange={(e) => setSelectedClassRoom(e.target.value)}
              className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              {CLASSROOMS.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-text)] border border-[var(--color-border)] transition shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'th' ? 'พิมพ์ตารางเรียน' : 'Print A4'}</span>
          </button>

          {/* Add Slot Button (Admin/Teacher) */}
          {(currentRole === 'admin' || currentRole === 'teacher' || currentRole === 'super_admin') && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'เพิ่มคาบเรียน' : 'Add Class Slot'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Conflict Warning Banner (if any) */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
              {lang === 'th' ? 'ตรวจพบคาบเรียนซ้ำซ้อนในระบบ!' : 'Schedule Conflict Detected!'}
            </h4>
            <p className="text-[11px] text-amber-900 dark:text-amber-100">
              {lang === 'th'
                ? `พบข้อขัดแย้งจำนวน ${conflicts.length / 2} รายการ (ครูผู้สอนหรือห้องเรียนถูกจัดชนในเวลาเดียวกัน) กรุณาตรวจสอบคาบที่มีเครื่องหมายเตือน`
                : `${conflicts.length / 2} slot conflict(s) detected. Please check flagged periods.`}
            </p>
          </div>
        </div>
      )}

      {/* Timetable Grid View */}
      <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col">
        <div className="shrink-0 p-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-card)]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--color-primary-text)]" />
            <span className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider">
              {selectedClassRoom} — {lang === 'th' ? 'ภาคเรียนที่ 1 ปีการศึกษา 2569' : 'Semester 1, Academic Year 2026'}
            </span>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {lang === 'th' ? 'รวมทั้งหมด' : 'Total'}: <strong className="text-[var(--color-primary-text)]">{activeSlots.length}</strong> {lang === 'th' ? 'คาบ/สัปดาห์' : 'periods/week'}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] text-[var(--color-text-body)] uppercase">
                <th className="p-3 w-28 text-center font-bold text-[var(--color-text-title)]">{lang === 'th' ? 'วัน / คาบ' : 'Day / Period'}</th>
                {PERIODS.map((p, idx) => (
                  <th key={idx} className={`p-2.5 text-center font-medium ${p.isBreak ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 w-16' : ''}`}>
                    <div className={`font-bold ${p.isBreak ? 'text-amber-950 dark:text-amber-200' : 'text-[var(--color-text-title)]'}`}>
                      {p.isBreak ? (lang === 'th' ? 'พัก' : 'Lunch') : `${lang === 'th' ? 'คาบ' : 'P'}${p.num}`}
                    </div>
                    <div className={`text-[10px] font-mono mt-0.5 ${p.isBreak ? 'text-amber-900 dark:text-amber-300' : 'text-[var(--color-text-muted)]'}`}>{p.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] text-xs">
              {DAYS.map((day) => (
                <tr key={day.key} className="hover:bg-[var(--color-card-subtle)] transition">
                  {/* Day Header */}
                  <td className="p-3 text-center border-r border-[var(--color-border)]">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${day.color}`}>
                      {lang === 'th' ? day.th : day.en}
                    </span>
                  </td>

                  {/* Periods 1 to 7 with lunch */}
                  {PERIODS.map((period, pIdx) => {
                    if (period.isBreak) {
                      return (
                        <td key={pIdx} className="p-2 text-center bg-amber-50 dark:bg-amber-950/60 border-r border-[var(--color-border)]">
                          <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 writing-vertical rotate-180">
                            {lang === 'th' ? 'พักกลางวัน' : 'Lunch Break'}
                          </span>
                        </td>
                      );
                    }

                    // Find matching slot
                    const slot = activeSlots.find(
                      (s) => s.dayOfWeek === day.key && s.periodNumber === period.num
                    );

                    const hasConflict = slot && conflicts.some((c) => c.slotId === slot.id);

                    if (!slot) {
                      return (
                        <td key={pIdx} className="p-2 text-center border-r border-[var(--color-border)]">
                          <div className="h-20 rounded-xl border border-dashed border-[var(--color-border)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)] transition">
                            {lang === 'th' ? 'ว่าง' : 'Free'}
                          </div>
                        </td>
                      );
                    }

                    const colorStyle = COLOR_CLASSES[slot.colorTag] || COLOR_CLASSES.sky;

                    return (
                      <td key={pIdx} className="p-1.5 border-r border-[var(--color-border)] align-top">
                        <div className={`p-2 rounded-xl border transition group relative flex flex-col justify-between h-22 ${colorStyle} ${hasConflict ? 'ring-2 ring-amber-500 shadow-md shadow-amber-500/20' : ''}`}>
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                {slot.courseCode}
                              </span>
                              {hasConflict && (
                                <span title="มีข้อขัดแย้งคาบเรียน" className="text-amber-700 dark:text-amber-300">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <h4 className="text-[11px] font-bold mt-1 line-clamp-1 leading-tight">
                              {lang === 'th' ? slot.courseTitleTh : slot.courseTitleEn}
                            </h4>
                          </div>

                          <div className="pt-1 border-t border-current/20 space-y-0.5 text-[10px] opacity-95">
                            <div className="flex items-center gap-1 truncate">
                              <User className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{slot.teacherName}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{slot.room}</span>
                            </div>
                          </div>

                          {/* Delete on hover for admin */}
                          {(currentRole === 'admin' || currentRole === 'super_admin') && (
                            <button
                              type="button"
                              onClick={() => onDeleteSlot(slot.id)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-rose-700 hover:bg-rose-800 text-white opacity-0 group-hover:opacity-100 transition shadow-sm cursor-pointer"
                              title="ลบคาบนี้"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--color-primary-text)]" />
                {lang === 'th' ? 'เพิ่มคาบเรียนลงในตาราง' : 'Add Timetable Slot'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'วัน' : 'Day'}</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  >
                    {DAYS.map((d) => (
                      <option key={d.key} value={d.key}>{d.th}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'คาบที่' : 'Period'}</label>
                  <select
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(Number(e.target.value))}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <option key={num} value={num}>คาบที่ {num}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'รหัสวิชา' : 'Course Code'}</label>
                  <input
                    type="text"
                    required
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="เช่น CS301"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'ชื่อวิชา (ภาษาไทย)' : 'Course Title (TH)'}</label>
                  <input
                    type="text"
                    required
                    value={newTitleTh}
                    onChange={(e) => setNewTitleTh(e.target.value)}
                    placeholder="เช่น วิทยาการคำนวณและ AI"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'ครูผู้สอน' : 'Teacher'}</label>
                  <input
                    type="text"
                    required
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    placeholder="ชื่ออาจารย์"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'ห้องเรียน/แล็บ' : 'Room'}</label>
                  <input
                    type="text"
                    required
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="เช่น Lab คอมพิวเตอร์ 3"
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'โทนสีประจำวิชา' : 'Color Tag'}</label>
                <div className="flex gap-2">
                  {(['sky', 'emerald', 'amber', 'rose', 'purple', 'indigo', 'cyan'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      aria-label={color}
                      className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                        newColor === color ? 'border-[var(--color-text-title)] scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                      } ${
                        color === 'sky' ? 'bg-sky-600' :
                        color === 'emerald' ? 'bg-emerald-600' :
                        color === 'amber' ? 'bg-amber-500' :
                        color === 'rose' ? 'bg-rose-600' :
                        color === 'purple' ? 'bg-purple-600' :
                        color === 'indigo' ? 'bg-indigo-600' : 'bg-cyan-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-semibold cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold shadow-sm cursor-pointer"
                >
                  {lang === 'th' ? 'บันทึกลงตาราง' : 'Save Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Sheet Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl p-4 sm:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{schoolName}</h2>
                <p className="text-xs text-slate-600">
                  ตารางเรียนและตารางสอน ระดับชั้น {selectedClassRoom} | ภาคเรียนที่ 1 ปีการศึกษา 2569
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ / พิมพ์เป็น PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>

            {/* Print Table Grid */}
            <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 text-center w-24">วัน / คาบ</th>
                    {PERIODS.map((p, idx) => (
                      <th key={idx} className="p-2 border-r border-slate-300 text-center">
                        <div className="font-bold">{p.isBreak ? 'พัก' : `คาบ ${p.num}`}</div>
                        <div className="text-[10px] text-slate-600 font-mono">{p.time}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day.key} className="border-b border-slate-300">
                      <td className="p-2 text-center font-bold bg-slate-50 border-r border-slate-300">
                        {day.th}
                      </td>
                      {PERIODS.map((period, pIdx) => {
                        if (period.isBreak) {
                          return (
                            <td key={pIdx} className="p-2 text-center bg-slate-100 border-r border-slate-300 text-[10px] font-semibold text-slate-600">
                              พักกลางวัน
                            </td>
                          );
                        }
                        const slot = activeSlots.find(
                          (s) => s.dayOfWeek === day.key && s.periodNumber === period.num
                        );
                        return (
                          <td key={pIdx} className="p-2 border-r border-slate-300 text-center align-top h-16">
                            {slot ? (
                              <div>
                                <div className="font-bold text-slate-800">{slot.courseCode}</div>
                                <div className="text-[10px] text-slate-600 line-clamp-1">{slot.courseTitleTh}</div>
                                <div className="text-[9px] text-slate-600 mt-1">{slot.teacherName} ({slot.room})</div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 pt-8 text-center text-xs text-slate-700">
              <div>
                <p>ลงชื่อ..............................................................</p>
                <p className="mt-1 font-semibold">(อ.ดร.ประเสริฐ ถาวร)</p>
                <p className="text-slate-600">ครูที่ปรึกษาประจำชั้น</p>
              </div>
              <div>
                <p>ลงชื่อ..............................................................</p>
                <p className="mt-1 font-semibold">(ดร.ธนพร กิตติศักดิ์)</p>
                <p className="text-slate-600">ผู้อำนวยการสถานศึกษา</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
