import React, { useEffect, useMemo, useState } from 'react';
import {
  Printer,
  X,
  Filter,
  Search,
  CreditCard,
  Sparkles,
  User,
  GraduationCap,
} from 'lucide-react';
import {
  Student,
  Teacher,
  School,
  AppLanguage,
  TimetableSlot,
  Course,
  SchoolPeriodTime,
} from '../../types';
import { QrCodeMatrix } from '../QrCodeMatrix';
import { Barcode128Svg } from '../Barcode128Svg';
import { IdCardBackContent } from '../id-card/IdCardBackContent';
import {
  ID_CARD_BACK_MODE_OPTIONS,
  getSavedIdCardBackMode,
  saveIdCardBackMode,
  type IdCardBackMode,
} from '../../lib/idCardBackLayout';

interface BatchIdCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  teachers?: Teacher[];
  initialPersonType?: 'student' | 'staff';
  initialBackMode?: IdCardBackMode;
  timetableSlots?: TimetableSlot[];
  courses?: Course[];
  schoolPeriods?: SchoolPeriodTime[];
  school: School;
  lang?: AppLanguage;
}

export const BatchIdCardPrintModal: React.FC<BatchIdCardPrintModalProps> = ({
  isOpen,
  onClose,
  students,
  teachers = [],
  initialPersonType = 'student',
  initialBackMode,
  timetableSlots = [],
  courses = [],
  schoolPeriods = [],
  school,
  lang = 'th',
}) => {
  const [personType, setPersonType] = useState<'student' | 'staff'>(initialPersonType);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set(students.map((s) => s.id)));
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(() => new Set(teachers.map((t) => t.id)));
  const [cardSide, setCardSide] = useState<'front' | 'back' | 'both'>('front');
  const [backMode, setBackMode] = useState<IdCardBackMode>(
    () => initialBackMode || getSavedIdCardBackMode(school.id, initialPersonType),
  );
  const [layoutMode, setLayoutMode] = useState<'grid_a4' | 'sticker_a4'>('grid_a4');
  const [includeBarcode] = useState<boolean>(true);
  const [includeQrCode] = useState<boolean>(true);
  const [includeBloodType] = useState<boolean>(true);
  const accentColor = school.primaryColor || '#1d4ed8';

  useEffect(() => {
    if (isOpen) {
      setPersonType(initialPersonType);
      setBackMode(initialBackMode || getSavedIdCardBackMode(school.id, initialPersonType));
    }
  }, [isOpen, initialPersonType, initialBackMode, school.id]);

  const handleChangeBackMode = (nextMode: IdCardBackMode) => {
    setBackMode(nextMode);
    saveIdCardBackMode(school.id, personType, nextMode);
    if (cardSide === 'front') {
      setCardSide('both');
    }
  };

  const numericAcademicYear = Number(school.academicYear || '2569') || 2569;
  const issueTermLabel = `05/${numericAcademicYear}`;
  const expiryTermLabel = `03/${numericAcademicYear + 3}`;

  const gradeLevels = useMemo(
    () => Array.from(new Set(students.map((s) => s.gradeLevel).filter(Boolean))),
    [students]
  );
  const rooms = useMemo(() => {
    const list =
      selectedGrade === 'all' ? students : students.filter((s) => s.gradeLevel === selectedGrade);
    return Array.from(new Set(list.map((s) => s.room).filter(Boolean)));
  }, [students, selectedGrade]);

  const departments = useMemo(
    () => Array.from(new Set(teachers.map((t) => t.department).filter(Boolean))),
    [teachers]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedGrade !== 'all' && s.gradeLevel !== selectedGrade) return false;
      if (selectedRoom !== 'all' && s.room !== selectedRoom) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (s.firstNameTh || '').toLowerCase().includes(q) ||
          (s.lastNameTh || '').toLowerCase().includes(q) ||
          (s.studentIdNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, selectedGrade, selectedRoom, searchQuery]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (selectedDept !== 'all' && t.department !== selectedDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (t.fullNameTh || '').toLowerCase().includes(q) ||
          (t.teacherIdNumber || '').toLowerCase().includes(q) ||
          (t.department || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teachers, selectedDept, searchQuery]);

  if (!isOpen) return null;

  const handleSelectAllFiltered = () => {
    if (personType === 'student') {
      const next = new Set(selectedStudentIds);
      filteredStudents.forEach((s) => next.add(s.id));
      setSelectedStudentIds(next);
    } else {
      const next = new Set(selectedTeacherIds);
      filteredTeachers.forEach((t) => next.add(t.id));
      setSelectedTeacherIds(next);
    }
  };

  const handleDeselectAllFiltered = () => {
    if (personType === 'student') {
      const next = new Set(selectedStudentIds);
      filteredStudents.forEach((s) => next.delete(s.id));
      setSelectedStudentIds(next);
    } else {
      const next = new Set(selectedTeacherIds);
      filteredTeachers.forEach((t) => next.delete(t.id));
      setSelectedTeacherIds(next);
    }
  };

  const printableStudents = filteredStudents.filter((s) => selectedStudentIds.has(s.id));
  const printableTeachers = filteredTeachers.filter((t) => selectedTeacherIds.has(t.id));
  const activePrintCount = personType === 'student' ? printableStudents.length : printableTeachers.length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-[var(--color-text-body)]">
        {/* Top Modal Controls */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[var(--color-card-subtle)] no-print">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0 ${
                personType === 'staff' ? 'bg-emerald-700' : 'bg-[var(--color-primary)]'
              }`}
            >
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--color-text-title)]">
                {personType === 'staff'
                  ? lang === 'th'
                    ? 'ระบบพิมพ์บัตรครูและบุคลากร CR80 (บาร์โค้ด & QR จริง)'
                    : 'Staff ID Card Print Sheet'
                  : lang === 'th'
                    ? 'ระบบพิมพ์บัตรนักเรียนมาตรฐาน CR80 (บาร์โค้ด & QR จริง)'
                    : 'Student ID Card Print Sheet'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th'
                  ? `เลือกประเภทบัตรและจัดหน้า A4 พร้อมรหัส Code 128 และ QR จริง (${activePrintCount} ใบ)`
                  : `${activePrintCount} cards ready for A4 print`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="seg-tab-group">
              <button
                type="button"
                data-active={personType === 'student'}
                onClick={() => setPersonType('student')}
                className="seg-tab-btn"
              >
                นักเรียน ({students.length})
              </button>
              <button
                type="button"
                data-active={personType === 'staff'}
                onClick={() => setPersonType('staff')}
                className="seg-tab-btn"
              >
                ครู/บุคลากร ({teachers.length})
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              disabled={activePrintCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'th' ? 'สั่งพิมพ์ / PDF (A4)' : 'Print / PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] cursor-pointer"
              aria-label="ปิดหน้าต่างพิมพ์บัตร"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Customization Toolbar */}
        <div className="p-3 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-card)] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs no-print">
          <div className="flex flex-wrap items-center gap-2">
            {personType === 'student' ? (
              <>
                <label className="flex items-center gap-1.5 font-semibold text-[var(--color-text-title)]">
                  <Filter className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  <span>ระดับชั้น:</span>
                  <select
                    value={selectedGrade}
                    onChange={(e) => {
                      setSelectedGrade(e.target.value);
                      setSelectedRoom('all');
                    }}
                    className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-medium cursor-pointer"
                  >
                    <option value="all">ทุกระดับชั้น ({students.length})</option>
                    {gradeLevels.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1.5 font-semibold text-[var(--color-text-title)]">
                  <span>ห้อง:</span>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-medium cursor-pointer"
                  >
                    <option value="all">ทุกห้อง</option>
                    {rooms.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <label className="flex items-center gap-1.5 font-semibold text-[var(--color-text-title)]">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>กลุ่มสาระ/ฝ่าย:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-medium cursor-pointer"
                >
                  <option value="all">ทุกกลุ่มสาระฯ ({teachers.length})</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={personType === 'staff' ? 'ค้นหาชื่อหรือรหัสครู...' : 'ค้นหาชื่อหรือรหัสนักเรียน...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <button
                type="button"
                onClick={() => setCardSide('front')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  cardSide === 'front' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)]'
                }`}
              >
                หน้าบัตร
              </button>
              <button
                type="button"
                onClick={() => setCardSide('back')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  cardSide === 'back' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)]'
                }`}
              >
                หลังบัตร
              </button>
              <button
                type="button"
                onClick={() => setCardSide('both')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  cardSide === 'both' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)]'
                }`}
              >
                ทั้งสองหน้า
              </button>
            </div>

            <div className="flex p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <button
                type="button"
                onClick={() => setLayoutMode('grid_a4')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  layoutMode === 'grid_a4' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)]'
                }`}
              >
                บัตร CR80
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('sticker_a4')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  layoutMode === 'sticker_a4' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)]'
                }`}
              >
                สติกเกอร์ QR/บาร์โค้ด
              </button>
            </div>

            {layoutMode === 'grid_a4' && (
              <label className="flex items-center gap-1.5 font-semibold text-[var(--color-text-title)]">
                <span className="text-[11px]">ด้านหลังบัตร:</span>
                <select
                  value={backMode}
                  onChange={(e) => handleChangeBackMode(e.target.value as IdCardBackMode)}
                  className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-semibold cursor-pointer"
                >
                  {ID_CARD_BACK_MODE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {lang === 'th'
                        ? personType === 'staff'
                          ? opt.labelThStaff
                          : opt.labelThStudent
                        : personType === 'staff'
                          ? opt.labelEnStaff
                          : opt.labelEnStudent}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-[11px] text-[var(--color-primary-text)] font-semibold hover:underline cursor-pointer"
            >
              เลือกทั้งหมด ({personType === 'student' ? filteredStudents.length : filteredTeachers.length})
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={handleDeselectAllFiltered}
              className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80 print-area">
          {activePrintCount === 0 ? (
            <div className="text-center py-16 space-y-2 text-[var(--color-text-muted)]">
              <CreditCard className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-bold text-[var(--color-text-title)]">
                ไม่มีรายชื่อที่เลือกสำหรับพิมพ์บัตร
              </p>
              <p className="text-xs">กรุณากด "เลือกทั้งหมด" หรือเลือกตัวกรองด้านบน</p>
            </div>
          ) : layoutMode === 'sticker_a4' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {personType === 'student'
                ? printableStudents.map((student) => (
                    <div
                      key={`sticker-${student.id}`}
                      className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white p-2.5 flex flex-col items-center text-center gap-1.5 text-slate-900 print:border-slate-800 print:break-inside-avoid"
                    >
                      <div className="flex items-center gap-1.5 w-full justify-center pb-1 border-b border-slate-200">
                        <span className="text-[9px] font-bold text-slate-700 truncate">
                          {school.nameTh}
                        </span>
                      </div>
                      <QrCodeMatrix
                        value={`EDUVERSE:STU:${student.studentIdNumber}:${school.code}`}
                        size={74}
                        label={`QR: ${student.studentIdNumber}`}
                      />
                      <Barcode128Svg
                        value={student.studentIdNumber || student.id}
                        height={20}
                        showValueText={false}
                        className="w-full max-w-[130px]"
                      />
                      <div className="w-full min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 truncate">
                          {student.firstNameTh} {student.lastNameTh}
                        </p>
                        <p className="text-[9px] font-mono text-slate-600">
                          {student.studentIdNumber} · {student.room}
                        </p>
                      </div>
                    </div>
                  ))
                : printableTeachers.map((teacher) => (
                    <div
                      key={`sticker-t-${teacher.id}`}
                      className="rounded-xl border border-emerald-400 bg-white p-2.5 flex flex-col items-center text-center gap-1.5 text-slate-900 print:border-slate-800 print:break-inside-avoid"
                    >
                      <div className="flex items-center gap-1.5 w-full justify-center pb-1 border-b border-emerald-200">
                        <span className="text-[9px] font-bold text-emerald-900 truncate">
                          {school.nameTh}
                        </span>
                      </div>
                      <QrCodeMatrix
                        value={`EDUVERSE:STF:${teacher.teacherIdNumber}:${school.code}`}
                        size={74}
                        label={`QR: ${teacher.teacherIdNumber}`}
                      />
                      <Barcode128Svg
                        value={teacher.teacherIdNumber || teacher.id}
                        height={20}
                        showValueText={false}
                        className="w-full max-w-[130px]"
                      />
                      <div className="w-full min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 truncate">
                          {teacher.fullNameTh}
                        </p>
                        <p className="text-[9px] font-mono text-emerald-800">
                          {teacher.teacherIdNumber} · ครู/บุคลากร
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {personType === 'student'
                ? printableStudents.map((student) => {
                    const renderFront = (
                      <div
                        key={`front-${student.id}`}
                        className="relative w-full aspect-[85.6/53.98] rounded-xl border border-slate-300 bg-white text-slate-900 p-3 shadow-md flex flex-col justify-between overflow-hidden print:border-slate-800 print:shadow-none print:break-inside-avoid"
                      >
                        <div
                          className="flex items-center justify-between border-b pb-1.5 shrink-0"
                          style={{ borderColor: accentColor }}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {school.logoUrl ? (
                              <img
                                src={school.logoUrl}
                                alt={school.nameTh}
                                className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div
                                className="w-6 h-6 rounded-md text-white flex items-center justify-center text-[10px] font-black shrink-0"
                                style={{ backgroundColor: accentColor }}
                              >
                                {school.code.slice(0, 2) || 'EV'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-[10px] font-black leading-tight truncate text-slate-900">
                                {school.nameTh}
                              </h4>
                              <span className="text-[8px] text-slate-500 font-medium block truncate">
                                {school.nameEn || school.code}
                              </span>
                            </div>
                          </div>
                          <span
                            className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded text-white shrink-0"
                            style={{ backgroundColor: accentColor }}
                          >
                            STUDENT CARD
                          </span>
                        </div>

                        <div className="flex gap-2.5 items-center my-auto">
                          <div className="relative shrink-0">
                            {student.avatarUrl ? (
                              <img
                                src={student.avatarUrl}
                                alt={student.firstNameTh}
                                className="w-14 h-18 sm:w-16 sm:h-20 rounded-lg object-cover border border-slate-300 shadow-2xs"
                              />
                            ) : (
                              <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-lg border border-slate-300 bg-slate-100 flex items-center justify-center text-slate-500">
                                <User className="w-7 h-7" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5 text-left">
                            <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {student.firstNameTh} {student.lastNameTh}
                            </p>
                            <p className="text-[10px] text-slate-600 font-medium truncate">
                              {student.firstNameEn} {student.lastNameEn}
                            </p>
                            <div className="pt-0.5 flex items-center gap-2 text-[9px] font-mono">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 font-bold text-slate-900">
                                ID: {student.studentIdNumber}
                              </span>
                              <span className="font-bold text-blue-700">
                                {student.gradeLevel} {student.room}
                              </span>
                            </div>
                            {student.nationalId && (
                              <p className="text-[8px] text-slate-500 font-mono truncate">
                                ปชช.: {student.nationalId}
                              </p>
                            )}
                          </div>

                          {includeQrCode && (
                            <div className="shrink-0">
                              <QrCodeMatrix
                                value={`EDUVERSE:STU:${student.studentIdNumber}:${school.code}`}
                                size={54}
                                label={`QR: ${student.studentIdNumber}`}
                              />
                            </div>
                          )}
                        </div>

                        <div className="border-t border-slate-200 pt-1 flex items-center justify-between gap-2 text-[8px] font-mono shrink-0">
                          {includeBarcode && (
                            <Barcode128Svg
                              value={student.studentIdNumber || student.id}
                              height={18}
                              className="max-w-[160px]"
                            />
                          )}
                          <div className="flex flex-col items-end text-right text-slate-600">
                            {includeBloodType && <span>กรุ๊ปเลือด: {student.bloodType || '-'}</span>}
                            <span>ปีการศึกษา {school.academicYear || '2569'}</span>
                          </div>
                        </div>
                      </div>
                    );

                    const renderBack = (
                      <IdCardBackContent
                        key={`back-${student.id}`}
                        mode={backMode}
                        personType="student"
                        student={student}
                        teachers={teachers}
                        school={school}
                        lang={lang}
                        timetableSlots={timetableSlots}
                        courses={courses}
                        schoolPeriods={schoolPeriods}
                        variant="print"
                        issueTermLabel={issueTermLabel}
                        expiryTermLabel={expiryTermLabel}
                      />
                    );

                    if (cardSide === 'front') return renderFront;
                    if (cardSide === 'back') return renderBack;
                    return (
                      <React.Fragment key={student.id}>
                        {renderFront}
                        {renderBack}
                      </React.Fragment>
                    );
                  })
                : printableTeachers.map((teacher) => {
                    const renderFront = (
                      <div
                        key={`t-front-${teacher.id}`}
                        className="relative w-full aspect-[85.6/53.98] rounded-xl border border-emerald-500 bg-white text-slate-900 p-3 shadow-md flex flex-col justify-between overflow-hidden print:border-slate-800 print:shadow-none print:break-inside-avoid"
                      >
                        <div className="flex items-center justify-between border-b border-emerald-700 pb-1.5 shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {school.logoUrl ? (
                              <img
                                src={school.logoUrl}
                                alt={school.nameTh}
                                className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-md bg-emerald-700 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                {school.code.slice(0, 2) || 'EV'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-[10px] font-black leading-tight truncate text-slate-900">
                                {school.nameTh}
                              </h4>
                              <span className="text-[8px] text-slate-500 font-medium block truncate">
                                {school.nameEn || school.code}
                              </span>
                            </div>
                          </div>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-800 text-amber-200 shrink-0">
                            TEACHER / STAFF
                          </span>
                        </div>

                        <div className="flex gap-2.5 items-center my-auto">
                          <div className="relative shrink-0">
                            {teacher.avatarUrl ? (
                              <img
                                src={teacher.avatarUrl}
                                alt={teacher.fullNameTh}
                                className="w-14 h-18 sm:w-16 sm:h-20 rounded-lg object-cover border border-emerald-500 shadow-2xs"
                              />
                            ) : (
                              <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-lg border border-emerald-500 bg-emerald-50 flex items-center justify-center text-emerald-700">
                                <GraduationCap className="w-7 h-7" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5 text-left">
                            <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {teacher.fullNameTh}
                            </p>
                            <p className="text-[10px] text-emerald-800 font-semibold truncate">
                              {teacher.positionTitle || teacher.academicStanding || 'ครูผู้สอน'}
                            </p>
                            <div className="pt-0.5 flex items-center gap-2 text-[9px] font-mono">
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 font-bold text-emerald-900">
                                ID: {teacher.teacherIdNumber}
                              </span>
                              <span className="font-bold text-slate-700 truncate">
                                {teacher.department}
                              </span>
                            </div>
                            {teacher.teacherLicenseNo && (
                              <p className="text-[8px] text-slate-500 font-mono truncate">
                                ใบอนุญาต: {teacher.teacherLicenseNo}
                              </p>
                            )}
                          </div>

                          {includeQrCode && (
                            <div className="shrink-0">
                              <QrCodeMatrix
                                value={`EDUVERSE:STF:${teacher.teacherIdNumber}:${school.code}`}
                                size={54}
                                label={`QR: ${teacher.teacherIdNumber}`}
                              />
                            </div>
                          )}
                        </div>

                        <div className="border-t border-slate-200 pt-1 flex items-center justify-between gap-2 text-[8px] font-mono shrink-0">
                          {includeBarcode && (
                            <Barcode128Svg
                              value={teacher.teacherIdNumber || teacher.id}
                              height={18}
                              className="max-w-[160px]"
                            />
                          )}
                          <div className="flex flex-col items-end text-right text-slate-600">
                            <span>{teacher.homeroomClasses?.join(', ') || 'บุคลากร'}</span>
                            <span>ปีการศึกษา {school.academicYear || '2569'}</span>
                          </div>
                        </div>
                      </div>
                    );

                    const renderBack = (
                      <IdCardBackContent
                        key={`t-back-${teacher.id}`}
                        mode={backMode}
                        personType="staff"
                        teacher={teacher}
                        teachers={teachers}
                        school={school}
                        lang={lang}
                        timetableSlots={timetableSlots}
                        courses={courses}
                        schoolPeriods={schoolPeriods}
                        variant="print"
                        issueTermLabel={issueTermLabel}
                        expiryTermLabel={expiryTermLabel}
                      />
                    );

                    if (cardSide === 'front') return renderFront;
                    if (cardSide === 'back') return renderBack;
                    return (
                      <React.Fragment key={teacher.id}>
                        {renderFront}
                        {renderBack}
                      </React.Fragment>
                    );
                  })}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between text-xs shrink-0 no-print">
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>มาตรฐาน CR80 (85.60 × 53.98 มม.) · บาร์โค้ด Code 128 และ QR Code สแกนได้จริง</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={activePrintCount === 0}
              className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold transition cursor-pointer disabled:opacity-40"
            >
              {lang === 'th' ? 'พิมพ์บัตร (Print)' : 'Print Now'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] font-semibold hover:bg-[var(--color-card-subtle)] cursor-pointer"
            >
              {lang === 'th' ? 'ปิด' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
