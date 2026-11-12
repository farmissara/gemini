import React, { useState, useMemo } from 'react';
import { Student, StudentStatus } from '../../types';
import { 
  ALL_GRADE_LEVELS, 
  getNextGradeLevel, 
  getNextRoom, 
  STUDENT_STATUS_DETAILS 
} from '../../data/studentAcademicData';
import { 
  GraduationCap, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Search, 
  Filter, 
  Sparkles, 
  CheckSquare, 
  Square,
  Building2,
  Calendar
} from 'lucide-react';

interface StudentPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onPromoteStudents: (updatedStudents: Student[]) => void;
}

type IndividualPromotionAction = 'promote' | 'repeat' | 'graduate';

interface StudentPromotionRow {
  student: Student;
  selected: boolean;
  action: IndividualPromotionAction;
  targetGrade: string;
  targetRoom: string;
}

export const StudentPromotionModal: React.FC<StudentPromotionModalProps> = ({
  isOpen,
  onClose,
  students,
  onPromoteStudents,
}) => {
  if (!isOpen) return null;

  // Extract distinct grade levels and rooms from existing students
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.gradeLevel) set.add(s.gradeLevel.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  const [selectedSourceGrade, setSelectedSourceGrade] = useState<string>(
    availableGrades[0] || 'มัธยมศึกษาปีที่ 4 (M.4)'
  );
  const [selectedSourceRoom, setSelectedSourceRoom] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Auto-calculated defaults for the selected source grade
  const defaultNext = useMemo(() => {
    return getNextGradeLevel(selectedSourceGrade);
  }, [selectedSourceGrade]);

  const [targetGrade, setTargetGrade] = useState<string>(defaultNext.nextGrade);
  const [targetRoom, setTargetRoom] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>(
    String(new Date().getFullYear() + 543 + 1)
  );

  // Available rooms for selected grade
  const availableRoomsForGrade = useMemo(() => {
    const rooms = new Set<string>();
    students
      .filter((s) => s.gradeLevel === selectedSourceGrade)
      .forEach((s) => {
        if (s.room) rooms.add(s.room.trim());
      });
    return Array.from(rooms).sort();
  }, [students, selectedSourceGrade]);

  // Update target grade whenever source grade changes
  React.useEffect(() => {
    const next = getNextGradeLevel(selectedSourceGrade);
    setTargetGrade(next.nextGrade);
    if (selectedSourceRoom !== 'all') {
      setTargetRoom(getNextRoom(selectedSourceRoom));
    } else {
      setTargetRoom('');
    }
  }, [selectedSourceGrade, selectedSourceRoom]);

  // Active students in the chosen source grade/room
  const sourceStudents = useMemo(() => {
    return students.filter((s) => {
      const matchGrade = s.gradeLevel === selectedSourceGrade;
      const matchRoom = selectedSourceRoom === 'all' || s.room === selectedSourceRoom;
      const matchStatus = s.status === 'active' || s.status === 'transferred_in';
      const matchSearch =
        !searchTerm.trim() ||
        s.firstNameTh.includes(searchTerm) ||
        s.lastNameTh.includes(searchTerm) ||
        s.firstNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return matchGrade && matchRoom && matchStatus && matchSearch;
    });
  }, [students, selectedSourceGrade, selectedSourceRoom, searchTerm]);

  // Row state management
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => {
    return new Set(sourceStudents.map((s) => s.id));
  });

  const [rowOverrides, setRowOverrides] = useState<Record<string, {
    action?: IndividualPromotionAction;
    targetGrade?: string;
    targetRoom?: string;
  }>>({});

  // Re-select all whenever source filter changes
  React.useEffect(() => {
    setSelectedStudentIds(new Set(sourceStudents.map((s) => s.id)));
    setRowOverrides({});
  }, [selectedSourceGrade, selectedSourceRoom]);

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === sourceStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(sourceStudents.map((s) => s.id)));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSetRowAction = (id: string, action: IndividualPromotionAction) => {
    setRowOverrides((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        action,
      },
    }));
  };

  // Execution
  const [isConfirming, setIsConfirming] = useState(false);

  const studentsToPromote = useMemo(() => {
    return sourceStudents.filter((s) => selectedStudentIds.has(s.id));
  }, [sourceStudents, selectedStudentIds]);

  const handleExecutePromotion = () => {
    if (studentsToPromote.length === 0) return;

    const updatedList: Student[] = studentsToPromote.map((s) => {
      const override = rowOverrides[s.id] || {};
      const action = override.action || (defaultNext.isGraduating ? 'graduate' : 'promote');
      
      if (action === 'graduate') {
        return {
          ...s,
          status: 'graduated' as StudentStatus,
          gradeLevel: 'สำเร็จการศึกษา (Graduated)',
        };
      } else if (action === 'repeat') {
        return {
          ...s,
          // Stays in same grade
          room: override.targetRoom?.trim() || s.room,
        };
      } else {
        // Normal promote
        const nextG = override.targetGrade?.trim() || targetGrade.trim() || defaultNext.nextGrade;
        const nextR = override.targetRoom?.trim() || targetRoom.trim() || getNextRoom(s.room);
        return {
          ...s,
          gradeLevel: nextG,
          room: nextR,
          status: 'active' as StudentStatus,
        };
      }
    });

    onPromoteStudents(updatedList);
    setIsConfirming(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-4xl bg-[var(--color-card)] rounded-3xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-200 shadow-sm">
              <GraduationCap className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  ระบบเลื่อนชั้นเรียนข้ามปีการศึกษา (Academic Year Grade Promotion)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/40 font-bold uppercase">
                  DMC / SIS
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                ส่งต่อนักเรียนขึ้นระดับชั้นถัดไป ย้ายห้องเรียน หรือบันทึกสำเร็จการศึกษา (ม.6/ป.6/อ.3) เมื่อสิ้นปีการศึกษา
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* 1. Source Grade */}
            <div>
              <label className="block text-[var(--color-text-title)] font-bold mb-1">
                1. ชั้นเรียนปัจจุบัน (Source)
              </label>
              <select
                value={selectedSourceGrade}
                onChange={(e) => setSelectedSourceGrade(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Source Room */}
            <div>
              <label className="block text-[var(--color-text-title)] font-bold mb-1">
                2. ห้องเรียนปัจจุบัน
              </label>
              <select
                value={selectedSourceRoom}
                onChange={(e) => setSelectedSourceRoom(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="all">ทุกห้องเรียน ({sourceStudents.length} คน)</option>
                {availableRoomsForGrade.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Target Grade */}
            <div>
              <label className="block text-[var(--color-text-title)] font-bold mb-1">
                3. เลื่อนขึ้นเป็นระดับชั้น (Target)
              </label>
              <input
                list="promotion-target-grades"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                placeholder="เลือกระดับชั้นใหม่"
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-bold text-[var(--color-primary-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <datalist id="promotion-target-grades">
                <option value="สำเร็จการศึกษา (Graduated)">สำเร็จการศึกษา (Graduated)</option>
                {ALL_GRADE_LEVELS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.labelTh}
                  </option>
                ))}
              </datalist>
            </div>

            {/* 4. Target Room / Year */}
            <div>
              <label className="block text-[var(--color-text-title)] font-bold mb-1">
                4. ห้องเรียนใหม่ & ปีการศึกษา
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={targetRoom}
                  onChange={(e) => setTargetRoom(e.target.value)}
                  placeholder="เช่น ม.5/1"
                  className="w-2/3 px-2.5 py-2 text-xs rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                />
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="ปี 2570"
                  className="w-1/3 px-2 py-2 text-xs rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-center font-mono"
                  title="ปีการศึกษาใหม่"
                />
              </div>
            </div>
          </div>

          {/* Quick Info Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-text-title)]">
                นักเรียนในเกณฑ์: <strong className="text-blue-700 dark:text-blue-400 font-mono">{sourceStudents.length}</strong> คน
              </span>
              <span>•</span>
              <span>
                เลือกแล้ว: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{studentsToPromote.length}</strong> คน
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                  className="pl-8 pr-3 py-1 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] w-44 sm:w-56"
                />
              </div>

              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3 py-1 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] border border-[var(--color-border)] font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {selectedStudentIds.size === sourceStudents.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>ยกเลิกเลือกทั้งหมด</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    <span>เลือกทั้งหมด ({sourceStudents.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Student Table */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-4">
          {sourceStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)] space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-40 text-[var(--color-text-muted)]" />
              <p className="font-semibold text-[var(--color-text-title)]">ไม่พบนักเรียนในระดับชั้นหรือเงื่อนไขที่เลือก</p>
              <p>กรุณาเลือกระดับชั้นหรือห้องเรียนที่มีนักเรียนอยู่ในระบบ</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.size > 0 && selectedStudentIds.size === sourceStudents.length}
                      onChange={handleToggleSelectAll}
                      className="rounded cursor-pointer"
                    />
                  </th>
                  <th className="p-2.5">นักเรียน</th>
                  <th className="p-2.5">ชั้น/ห้องปัจจุบัน</th>
                  <th className="p-2.5 text-center">GPA</th>
                  <th className="p-2.5">การเลื่อนชั้น (Action)</th>
                  <th className="p-2.5">ระดับชั้น & ห้องใหม่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {sourceStudents.map((student) => {
                  const isSelected = selectedStudentIds.has(student.id);
                  const override = rowOverrides[student.id] || {};
                  const action: IndividualPromotionAction =
                    override.action || (defaultNext.isGraduating ? 'graduate' : 'promote');
                  const targetG =
                    override.targetGrade ||
                    (action === 'graduate'
                      ? 'สำเร็จการศึกษา (Graduated)'
                      : action === 'repeat'
                      ? student.gradeLevel
                      : targetGrade || defaultNext.nextGrade);
                  const targetR =
                    override.targetRoom ||
                    (action === 'repeat' ? student.room : targetRoom || getNextRoom(student.room));

                  return (
                    <tr
                      key={student.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-[var(--color-card)] hover:bg-[var(--color-primary-light)]/40'
                          : 'opacity-50 bg-[var(--color-card-subtle)]'
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStudent(student.id)}
                          className="rounded cursor-pointer"
                        />
                      </td>

                      <td className="p-2.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={student.avatarUrl}
                            alt={student.firstNameEn}
                            className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                          />
                          <div>
                            <p className="font-bold text-[var(--color-text-title)]">
                              {student.firstNameTh} {student.lastNameTh}
                            </p>
                            <p className="text-[11px] font-mono text-[var(--color-primary-text)]">
                              {student.studentIdNumber} • {student.firstNameEn}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-2.5">
                        <div className="font-medium text-[var(--color-text-title)]">{student.gradeLevel}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">{student.room}</div>
                      </td>

                      <td className="p-2.5 text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] border ${
                            student.gpa >= 3.0
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                              : student.gpa >= 2.0
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                          }`}
                        >
                          {student.gpa.toFixed(2)}
                        </span>
                      </td>

                      <td className="p-2.5">
                        <select
                          disabled={!isSelected}
                          value={action}
                          onChange={(e) =>
                            handleSetRowAction(student.id, e.target.value as IndividualPromotionAction)
                          }
                          className="px-2.5 py-1 text-xs rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-title)] font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <option value="promote">เลื่อนชั้นปกติ</option>
                          <option value="repeat">ซ้ำชั้น / รอปรับผล</option>
                          <option value="graduate">สำเร็จการศึกษา</option>
                        </select>
                      </td>

                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-[var(--color-text-title)] block truncate max-w-[180px]">
                              {targetG}
                            </span>
                            {action !== 'graduate' && (
                              <span className="text-[11px] text-[var(--color-primary-text)] font-semibold">
                                ห้อง: {targetR || 'ตามเดิม'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[var(--color-card-subtle)] border-t border-[var(--color-border)] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-[var(--color-text-muted)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              พร้อมส่งต่อเลื่อนชั้น: <strong className="text-[var(--color-text-title)] font-bold">{studentsToPromote.length}</strong> คน 
              (จาก {sourceStudents.length} คนในห้องนี้)
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>

            {!isConfirming ? (
              <button
                type="button"
                disabled={studentsToPromote.length === 0}
                onClick={() => setIsConfirming(true)}
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold shadow-md disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition"
              >
                <GraduationCap className="w-4 h-4" />
                <span>ตรวจสอบและอนุมัติเลื่อนชั้น ({studentsToPromote.length} คน)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950 p-1.5 rounded-xl border border-amber-300 dark:border-amber-700">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 px-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  ยืนยันปรับเลื่อนชั้น {studentsToPromote.length} คน?
                </span>
                <button
                  type="button"
                  onClick={handleExecutePromotion}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  ยืนยันบันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] font-semibold cursor-pointer border border-[var(--color-border)]"
                >
                  ย้อนกลับ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
