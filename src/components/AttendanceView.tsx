import React, { useState } from 'react';
import { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  MessageSquare, 
  Filter,
  Camera,
  RefreshCw,
  Sparkles,
  UserCheck
} from 'lucide-react';

interface AttendanceViewProps {
  students: Student[];
  attendance: AttendanceRecord[];
  onRecordAttendance: (studentId: string, status: AttendanceStatus, remarks: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  attendance,
  onRecordAttendance,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [remarks, setRemarks] = useState('Main Gate Smart Scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerResult, setScannerResult] = useState<string | null>(null);

  // Filter logs by date
  const [dateFilter, setDateFilter] = useState('2026-11-04');

  const filteredLogs = attendance.filter(a => a.date === dateFilter);

  const handleSimulateScan = () => {
    if (!selectedStudentId) return;
    setIsScanning(true);
    setScannerResult(null);

    setTimeout(() => {
      const stu = students.find(s => s.id === selectedStudentId);
      onRecordAttendance(selectedStudentId, status, remarks);
      setIsScanning(false);
      setScannerResult(`Successfully verified: ${stu?.firstNameEn} (${stu?.studentIdNumber}) - Recorded as ${status.toUpperCase()}`);
      setTimeout(() => setScannerResult(null), 4000);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            Gate Attendance &amp; QR Turnstile Scanner
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time biometric &amp; QR student check-in with instantaneous LINE OA guardian notification dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Turnstile Online
          </span>
        </div>
      </div>

      {/* Grid: Scanner Terminal & Quick Scan Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Scanner Terminal */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" /> Optical Scanner Frame
              </span>
              <span className="text-[10px] text-slate-400 font-mono">1080p Optical Feed</span>
            </div>

            {/* Simulated viewfinder */}
            <div className="relative aspect-4/3 rounded-xl bg-slate-950 border-2 border-dashed border-indigo-500/40 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              {/* Animated laser line */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-bounce"></div>

              <div className="w-36 h-36 border-2 border-indigo-500/60 rounded-xl relative flex items-center justify-center bg-indigo-950/20 p-2">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-400 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-indigo-400 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-indigo-400 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-400 -mb-1 -mr-1"></div>

                <QrCode className="w-24 h-24 text-indigo-400/80 animate-pulse" />
              </div>

              <p className="text-[11px] text-slate-400 mt-4">
                Point Student ID Barcode or LINE Digital Pass at the scanner
              </p>
            </div>

            {scannerResult && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{scannerResult}</span>
              </div>
            )}
          </div>

          {/* Quick Terminal Form */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Select Student for Simulated Scan
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.studentIdNumber} - {stu.firstNameEn} {stu.lastNameEn} ({stu.firstNameTh}) - {stu.room}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="present">Present (มาตรงเวลา)</option>
                  <option value="late">Late (มาสาย)</option>
                  <option value="sick">Sick (ลาป่วย)</option>
                  <option value="leave">Personal Leave (ลากิจ)</option>
                  <option value="absent">Absent (ขาดเรียน)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Station / Note</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateScan}
              disabled={isScanning}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying QR Token...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" /> Trigger Gate Scan &amp; LINE Push
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Attendance Activity Log */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Turnstile Gate Activity Log
              </h2>
              <p className="text-xs text-slate-400">Date: {dateFilter}</p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Total Check-ins:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {filteredLogs.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">LINE OA Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No check-ins recorded for this date yet.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const student = students.find(s => s.id === log.studentId);
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-300">
                          {log.time}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">
                            {student?.firstNameEn} {student?.lastNameEn}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {student?.studentIdNumber} • {student?.room}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-mono text-slate-400">
                          {log.checkinMethod}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'present'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : log.status === 'late'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {log.lineNotificationSent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#06C755] font-medium">
                              <MessageSquare className="w-3 h-3 fill-current" />
                              Delivered
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              No LINE Account
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* LINE Webhook preview */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800/80">
              <span className="text-[#06C755] font-bold flex items-center gap-1">
                <MessageSquare className="w-3 h-3 fill-current" /> LINE Messaging API Webhook Dispatch
              </span>
              <span>200 OK</span>
            </div>
            <p className="text-slate-400">
              Endpoint: <span className="text-slate-300">https://api.line.me/v2/bot/message/push</span>
            </p>
            <p className="text-slate-400">
              Format: <span className="text-indigo-300">&#123; to: "LINE_USER_ID", messages: [&#123; type: "flex", altText: "Student Check-in Alert" &#125;] &#125;</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
