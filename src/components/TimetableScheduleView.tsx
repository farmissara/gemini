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
  { key: 'mon', th: 'วันจันทร์', en: 'Monday', color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300' },
  { key: 'tue', th: 'วันอังคาร', en: 'วันอังคาร (Tue)', color: 'from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-300' },
  { key: 'wed', th: 'วันพุธ', en: 'Wednesday', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300' },
  { key: 'thu', th: 'วันพฤหัสบดี', en: 'Thursday', color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30 text-orange-300' },
  { key: 'fri', th: 'วันศุกร์', en: 'วันศุกร์ (Fri)', color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-300' }
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
  sky: 'bg-sky-900/90 border-sky-500/50 text-sky-100 hover:bg-sky-800',
  emerald: 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100 hover:bg-emerald-800',
  amber: 'bg-amber-900/90 border-amber-500/50 text-amber-100 hover:bg-amber-800',
  rose: 'bg-rose-900/90 border-rose-500/50 text-rose-100 hover:bg-rose-800',
  purple: 'bg-purple-900/90 border-purple-500/50 text-purple-100 hover:bg-purple-800',
  indigo: 'bg-indigo-900/90 border-indigo-500/50 text-indigo-100 hover:bg-indigo-800',
  cyan: 'bg-cyan-900/90 border-cyan-500/50 text-cyan-100 hover:bg-cyan-800'
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
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/25 text-indigo-300 border border-indigo-500/40">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                {lang === 'th' ? 'ตารางเรียนและตารางสอนรายสัปดาห์' : 'Weekly Timetable & Schedule'}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-200 border border-indigo-500/40">
                  {lang === 'th' ? 'ตรวจคาบชนอัตโนมัติ' : 'Conflict Detection'}
                </span>
              </h1>
              <p className="text-xs text-slate-300">
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
              className="bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>{lang === 'th' ? 'พิมพ์ตารางเรียน' : 'Print A4'}</span>
          </button>

          {/* Add Slot Button (Admin/Teacher) */}
          {(currentRole === 'admin' || currentRole === 'teacher' || currentRole === 'super_admin') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'เพิ่มคาบเรียน' : 'Add Class Slot'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Conflict Warning Banner (if any) */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950 border border-amber-500/50 flex items-start gap-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300">
              {lang === 'th' ? 'ตรวจพบคาบเรียนซ้ำซ้อนในระบบ!' : 'Schedule Conflict Detected!'}
            </h4>
            <p className="text-[11px] text-amber-100">
              {lang === 'th'
                ? `พบข้อขัดแย้งจำนวน ${conflicts.length / 2} รายการ (ครูผู้สอนหรือห้องเรียนถูกจัดชนในเวลาเดียวกัน) กรุณาตรวจสอบคาบที่มีเครื่องหมายเตือน`
                : `${conflicts.length / 2} slot conflict(s) detected. Please check flagged periods.`}
            </p>
          </div>
        </div>
      )}

      {/* Timetable Grid View */}
      <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <div className="shrink-0 p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {selectedClassRoom} — {lang === 'th' ? 'ภาคเรียนที่ 1 ปีการศึกษา 2569' : 'Semester 1, Academic Year 2026'}
            </span>
          </div>
          <span className="text-xs text-slate-300">
            {lang === 'th' ? 'รวมทั้งหมด' : 'Total'}: <strong className="text-indigo-300">{activeSlots.length}</strong> {lang === 'th' ? 'คาบ/สัปดาห์' : 'periods/week'}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-[11px] text-slate-300 uppercase">
                <th className="p-3 w-28 text-center font-bold">{lang === 'th' ? 'วัน / คาบ' : 'Day / Period'}</th>
                {PERIODS.map((p, idx) => (
                  <th key={idx} className={`p-2.5 text-center font-medium ${p.isBreak ? 'bg-amber-950/60 text-amber-300 w-16' : ''}`}>
                    <div className="font-bold text-slate-200">
                      {p.isBreak ? (lang === 'th' ? 'พัก' : 'Lunch') : `${lang === 'th' ? 'คาบ' : 'P'}${p.num}`}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {DAYS.map((day) => (
                <tr key={day.key} className="hover:bg-slate-800/20 transition">
                  {/* Day Header */}
                  <td className="p-3 text-center border-r border-slate-800/60">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${day.color}`}>
                      {lang === 'th' ? day.th : day.en}
                    </span>
                  </td>

                  {/* Periods 1 to 7 with lunch */}
                  {PERIODS.map((period, pIdx) => {
                    if (period.isBreak) {
                      return (
                        <td key={pIdx} className="p-2 text-center bg-amber-950/40 border-r border-slate-800">
                          <span className="text-[10px] font-bold text-amber-300 writing-vertical rotate-180">
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
                        <td key={pIdx} className="p-2 text-center border-r border-slate-800">
                          <div className="h-20 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-400 hover:border-slate-600 transition">
                            {lang === 'th' ? 'ว่าง' : 'Free'}
                          </div>
                        </td>
                      );
                    }

                    const colorStyle = COLOR_CLASSES[slot.colorTag] || COLOR_CLASSES.sky;

                    return (
                      <td key={pIdx} className="p-1.5 border-r border-slate-800 align-top">
                        <div className={`p-2 rounded-xl border transition group relative flex flex-col justify-between h-22 ${colorStyle} ${hasConflict ? 'ring-2 ring-amber-500 shadow-md shadow-amber-500/20' : ''}`}>
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-950/60 text-white">
                                {slot.courseCode}
                              </span>
                              {hasConflict && (
                                <span title="มีข้อขัดแย้งคาบเรียน" className="text-amber-400">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <h4 className="text-[11px] font-bold mt-1 line-clamp-1 leading-tight text-white">
                              {lang === 'th' ? slot.courseTitleTh : slot.courseTitleEn}
                            </h4>
                          </div>

                          <div className="pt-1 border-t border-white/15 space-y-0.5 text-[10px] text-slate-100">
                            <div className="flex items-center gap-1 truncate">
                              <User className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{slot.teacherName}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate text-slate-200">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{slot.room}</span>
                            </div>
                          </div>

                          {/* Delete on hover for admin */}
                          {(currentRole === 'admin' || currentRole === 'super_admin') && (
                            <button
                              onClick={() => onDeleteSlot(slot.id)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition shadow-sm"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                {lang === 'th' ? 'เพิ่มคาบเรียนลงในตาราง' : 'Add Timetable Slot'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'วัน' : 'Day'}</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    {DAYS.map((d) => (
                      <option key={d.key} value={d.key}>{d.th}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'คาบที่' : 'Period'}</label>
                  <select
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <option key={num} value={num}>คาบที่ {num}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'รหัสวิชา' : 'Course Code'}</label>
                  <input
                    type="text"
                    required
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="เช่น CS301"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'ชื่อวิชา (ภาษาไทย)' : 'Course Title (TH)'}</label>
                  <input
                    type="text"
                    required
                    value={newTitleTh}
                    onChange={(e) => setNewTitleTh(e.target.value)}
                    placeholder="เช่น วิทยาการคำนวณและ AI"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'ครูผู้สอน' : 'Teacher'}</label>
                  <input
                    type="text"
                    required
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    placeholder="ชื่ออาจารย์"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'ห้องเรียน/แล็บ' : 'Room'}</label>
                  <input
                    type="text"
                    required
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="เช่น Lab คอมพิวเตอร์ 3"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'โทนสีประจำวิชา' : 'Color Tag'}</label>
                <div className="flex gap-2">
                  {(['sky', 'emerald', 'amber', 'rose', 'purple', 'indigo', 'cyan'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        newColor === color ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                      } ${
                        color === 'sky' ? 'bg-sky-500' :
                        color === 'emerald' ? 'bg-emerald-500' :
                        color === 'amber' ? 'bg-amber-500' :
                        color === 'rose' ? 'bg-rose-500' :
                        color === 'purple' ? 'bg-purple-500' :
                        color === 'indigo' ? 'bg-indigo-500' : 'bg-cyan-500'
                      }`}
                    />
                  ))}
                </div>
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
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
