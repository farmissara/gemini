import React from 'react';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  TrendingUp, 
  Receipt,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  QrCode,
  Swords,
  Smartphone,
  FolderGit2
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
  courses,
  attendance,
  invoices,
  announcements,
  systemConfig,
  onNavigate,
  onQuickCheckIn,
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
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/80 via-slate-900 to-indigo-950 border border-indigo-500/30 p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>EduVerse Portal • Academic Year {systemConfig.academicYear}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Welcome to {systemConfig.schoolNameEn}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Centralized platform for real-time student tracking, automated LINE OA guardian updates, bilingual Thai/English transcripts, and curriculum gradebook.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('games')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all hover:scale-105"
            >
              <Swords className="w-4 h-4 text-amber-200" />
              <span>เล่นเกม O-NET 1v1</span>
            </button>
            <button
              onClick={() => onNavigate('mobile_checkin')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold transition-all hover:scale-105"
            >
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>เช็คชื่อมือถือ/รายคาบ</span>
            </button>
            <button
              onClick={() => onNavigate('portfolio')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-300 text-xs font-semibold transition-all hover:scale-105"
            >
              <FolderGit2 className="w-4 h-4 text-purple-400" />
              <span>TCAS/PA แฟ้มผลงาน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Enrolled Students</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalStudents}</h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span className="font-semibold">{activeStudents}</span> Active in SIS
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Attendance Rate */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Today Attendance</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{attendanceRate}%</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {presentCount} Present • {lateCount} Late • {sickCount} Sick/Leave
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Tuition Collection */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Tuition Collected</p>
            <h3 className="text-2xl font-bold text-amber-300 mt-1">{collectionRate}%</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              ฿{totalCollected.toLocaleString()} of ฿{totalInvoiced.toLocaleString()}
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* LINE Guardian Sync */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">LINE Guardian Sync</p>
            <h3 className="text-2xl font-bold text-[#06C755] mt-1">{linePercent}%</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {lineConnectedCount} of {totalStudents} parents linked
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#06C755]/10 border border-[#06C755]/20 flex items-center justify-center text-[#06C755]">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Live Gate Attendance & Academic Honor Roll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realtime Attendance Log */}
        <div className="lg:col-span-2 rounded-xl bg-slate-800/50 border border-slate-700/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Today's Gate Check-in Stream</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                Live Turnstile
              </span>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              View Full Logs <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {todayAttendance.map((rec) => {
              const student = students.find(s => s.id === rec.studentId);
              if (!student) return null;
              return (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={student.avatarUrl}
                      alt={student.firstNameEn}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {student.firstNameEn} {student.lastNameEn}
                        </span>
                        <span className="text-xs text-slate-400 font-thai">
                          ({student.firstNameTh} {student.lastNameTh})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-indigo-400">{student.studentIdNumber}</span>
                        <span>•</span>
                        <span>{student.room}</span>
                        <span>•</span>
                        <span className="text-slate-400">{rec.remarks}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-200">{rec.time}</span>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {rec.lineNotificationSent && (
                          <span className="text-[10px] text-[#06C755] flex items-center gap-0.5" title="LINE Push Delivered">
                            <MessageSquare className="w-2.5 h-2.5 fill-current" /> Push Sent
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                      rec.status === 'present'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : rec.status === 'late'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Check-in simulator */}
          <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <QrCode className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Simulate instant turnstile scan for un-scanned students:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onQuickCheckIn('stu-3')}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
              >
                Scan Arthit (ED-6903)
              </button>
              <button
                onClick={() => onQuickCheckIn('stu-5')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
              >
                Scan Teerapat (ED-6905)
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Column: Honor Roll & System Integrations */}
        <div className="space-y-6">
          {/* Honor Roll */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Dean's Honor Roll</h3>
              </div>
              <span className="text-xs text-amber-400 font-semibold">Semester 1</span>
            </div>

            <div className="space-y-2.5">
              {topStudents.map((stu, idx) => (
                <div
                  key={stu.id}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] font-bold text-slate-300 flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <img
                      src={stu.avatarUrl}
                      alt={stu.firstNameEn}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {stu.firstNameEn} {stu.lastNameEn}
                      </p>
                      <p className="text-[10px] text-slate-400">{stu.gradeLevel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-amber-400 font-mono">
                      {stu.gpa.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">GPA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements Card */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Latest Announcements
              </h3>
              <button
                onClick={() => onNavigate('announcements')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {announcements.slice(0, 2).map((ann) => (
                <div key={ann.id} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 line-clamp-1">{ann.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{ann.publishedAt.split(' ')[0]}</span>
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-2">{ann.content}</p>
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                    <span className="text-indigo-400">{ann.author}</span>
                    {ann.lineBroadcastSent && (
                      <span className="text-[#06C755] font-medium flex items-center gap-0.5">
                        • LINE Broadcasted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
