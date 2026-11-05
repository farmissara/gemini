import React from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Receipt,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  QrCode,
  Calendar,
  FileCheck2,
  Award
} from 'lucide-react';
import { Student, Course, AttendanceRecord, TuitionInvoice, Announcement, SystemConfig } from '../types';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  students: Student[];
  courses: Course[];
  attendance: AttendanceRecord[];
  invoices: TuitionInvoice[];
  announcements: Announcement[];
  systemConfig: SystemConfig;
  onNavigate: (tab: NavTab) => void;
  onQuickCheckIn: (studentId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  attendance,
  invoices,
  announcements,
  systemConfig,
  onNavigate,
}) => {
  // Compute key stats
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const lineConnectedCount = students.filter(s => s.lineLinked).length;
  const linePercent = totalStudents > 0 ? Math.round((lineConnectedCount / totalStudents) * 100) : 0;

  // Attendance stats today
  const todayAttendance = attendance.filter(a => a.date === '2026-11-04');
  const presentCount = todayAttendance.filter(a => a.status === 'present').length;
  const lateCount = todayAttendance.filter(a => a.status === 'late').length;
  const sickCount = todayAttendance.filter(a => a.status === 'sick' || a.status === 'leave').length;
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

  // Tuition stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalCollected = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Top honor students
  const topStudents = [...students].sort((a, b) => b.gpa - a.gpa).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Welcome Header - Clean & Academic */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ปีการศึกษา {systemConfig.academicYear} • ภาคเรียนที่ 1</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            ยินดีต้อนรับสู่ {systemConfig.schoolNameTh}
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            {systemConfig.schoolNameEn} — ศูนย์รวมการบริหารวิชาการ ทะเบียนนักเรียน และการติดตามผลการเรียนรู้
          </p>
        </div>

        {/* Quick Functional Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium shadow-xs transition"
          >
            <QrCode className="w-4 h-4" />
            <span>สแกนเข้าเรียน</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('homework')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
          >
            <FileCheck2 className="w-4 h-4 text-slate-600" />
            <span>ตรวจการบ้าน</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('gradebook')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
          >
            <Award className="w-4 h-4 text-slate-600" />
            <span>บันทึกคะแนน</span>
          </button>
        </div>
      </div>

      {/* 4 Balanced Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">จำนวนนักเรียนทั้งหมด</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalStudents} <span className="text-xs font-normal text-slate-400">คน</span></h3>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              {activeStudents} คน สถานะปกติในระบบ
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Attendance Rate */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">อัตราเข้าเรียนวันนี้</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{attendanceRate}%</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              มา {presentCount} • สาย {lateCount} • ขาด/ลา {sickCount}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Tuition Collection */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">การจัดเก็บค่าเล่าเรียน</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{collectionRate}%</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              ฿{totalCollected.toLocaleString()} จาก ฿{totalInvoiced.toLocaleString()}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* LINE Guardian Sync */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">ผูก LINE ผู้ปกครอง</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{linePercent}%</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {lineConnectedCount} จาก {totalStudents} รายชื่อ
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Gate Attendance & Academic Honor Roll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realtime Attendance Log */}
        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">บันทึกการผ่านประตูและเข้าเรียนวันนี้</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                ถ่ายทอดสด
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              ดูบันทึกทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {todayAttendance.map((rec) => {
              const student = students.find(s => s.id === rec.studentId);
              if (!student) return null;
              return (
                <div
                  key={rec.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={student.avatarUrl}
                      alt={student.firstNameEn}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {student.firstNameTh} {student.lastNameTh}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({student.studentIdNumber})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ชั้น {student.gradeLevel} ห้อง {student.room} • เวลา {rec.time} น.
                      </div>
                    </div>
                  </div>

                  <div>
                    {rec.status === 'present' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ตรงเวลา</span>
                      </span>
                    ) : rec.status === 'late' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium text-[11px] border border-amber-200">
                        <Clock className="w-3 h-3" />
                        <span>มาสาย</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-medium text-[11px] border border-rose-200">
                        <span>ขาด / ลา</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Honor Students Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">นักเรียนผลการเรียนดีเด่น</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('gradebook')}
              className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              สมุดคะแนน <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {topStudents.map((st, idx) => (
              <div
                key={st.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 text-center font-bold text-slate-400 text-xs">
                    #{idx + 1}
                  </div>
                  <img
                    src={st.avatarUrl}
                    alt={st.firstNameEn}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {st.firstNameTh} {st.lastNameTh}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ชั้น {st.gradeLevel} ห้อง {st.room}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-blue-700 font-mono text-sm">
                    {st.gpa.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">เกรดเฉลี่ย</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>ข่าวสารและประกาศสำคัญของโรงเรียน</span>
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('announcements')}
            className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            ดูประกาศทั้งหมด <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {announcements.slice(0, 2).map((item) => (
            <div key={item.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{item.title}</span>
                <span className="text-[10px] text-slate-400">{item.publishedAt}</span>
              </div>
              <p className="text-slate-600 line-clamp-2 text-[11px] leading-relaxed">
                {item.content}
              </p>
              <div className="text-[10px] text-slate-500 pt-1">
                ประกาศโดย: {item.author} ({item.authorRole})
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
