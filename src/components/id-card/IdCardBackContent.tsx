import React, { useMemo } from 'react';
import type {
  AppLanguage,
  Course,
  School,
  SchoolPeriodTime,
  Student,
  Teacher,
  TimetableSlot,
} from '../../types';
import { QrCodeMatrix } from '../QrCodeMatrix';
import { Barcode128Svg } from '../Barcode128Svg';
import { findHomeroomTeachersForRoom } from '../../lib/timetableRoomMatch';
import {
  buildCompactCardTimetableMatrix,
  getStudentTimetableSlots,
  getTeacherTimetableSlots,
  type IdCardBackMode,
} from '../../lib/idCardBackLayout';

interface IdCardBackContentProps {
  mode: IdCardBackMode;
  personType: 'student' | 'staff';
  student?: Student | null;
  teacher?: Teacher | null;
  teachers?: readonly Teacher[];
  school: School;
  lang: AppLanguage;
  timetableSlots?: readonly TimetableSlot[];
  courses?: readonly Course[];
  schoolPeriods?: readonly SchoolPeriodTime[];
  variant: 'digital' | 'print';
  issueTermLabel?: string;
  expiryTermLabel?: string;
}

function resolveStudentHomeroomLabel(
  student: Student | null | undefined,
  teachers: readonly Teacher[],
): string {
  if (!student) return '-';
  if (student.advisorName?.trim()) return student.advisorName.trim();
  const homeroomTeachers = findHomeroomTeachersForRoom(teachers, student.room);
  if (homeroomTeachers.length > 0) {
    return homeroomTeachers.map((t) => t.fullNameTh).filter(Boolean).join(', ');
  }
  return student.room || '-';
}

function compactSlotPrimaryLabel(slot: TimetableSlot, personType: 'student' | 'staff'): string {
  if (personType === 'staff') {
    return (slot.classRoom || slot.room || slot.courseCode || slot.courseTitleTh || '-')
      .replace(/^ห้องเรียน\s*/i, '')
      .replace(/^ห้อง\s*/i, '')
      .trim();
  }
  return (slot.courseCode || slot.courseTitleTh || slot.courseTitleEn || '-').trim();
}

function compactSlotSecondaryLabel(slot: TimetableSlot, personType: 'student' | 'staff'): string {
  if (personType === 'staff') {
    return (slot.courseCode || slot.courseTitleTh || '').trim();
  }
  return (slot.courseTitleTh || slot.room || '').trim();
}

export const IdCardBackContent: React.FC<IdCardBackContentProps> = React.memo(({
  mode,
  personType,
  student,
  teacher,
  teachers = [],
  school,
  lang,
  timetableSlots = [],
  courses = [],
  schoolPeriods = [],
  variant,
  issueTermLabel,
  expiryTermLabel,
}) => {
  const isStaff = personType === 'staff';
  const isDigital = variant === 'digital';

  const personCode = isStaff
    ? teacher?.teacherIdNumber || teacher?.id || 'TCH-0001'
    : student?.studentIdNumber || student?.id || 'STU-0001';

  const qrValue = isStaff
    ? `EDUVERSE:STF:${personCode}:${school.code}`
    : `EDUVERSE:STU:${personCode}:${school.code}`;

  const personDisplayName = isStaff
    ? (lang === 'th' ? teacher?.fullNameTh : teacher?.fullNameEn || teacher?.fullNameTh) || '-'
    : (
        lang === 'th'
          ? `${student?.firstNameTh || ''} ${student?.lastNameTh || ''}`.trim()
          : `${student?.firstNameEn || ''} ${student?.lastNameEn || ''}`.trim()
      ) || '-';

  const personSubLabel = isStaff
    ? teacher?.positionTitle || teacher?.academicStanding || teacher?.department || '-'
    : [student?.gradeLevel, student?.room].filter(Boolean).join(' ') || '-';

  const resolvedAdvisor = useMemo(
    () => (isStaff ? '' : resolveStudentHomeroomLabel(student, teachers)),
    [isStaff, student, teachers],
  );

  const personTimetableSlots = useMemo(() => {
    if (mode !== 'timetable') return [];
    if (isStaff) {
      return getTeacherTimetableSlots(teacher, timetableSlots, courses);
    }
    return getStudentTimetableSlots(student, timetableSlots, courses);
  }, [mode, isStaff, teacher, student, timetableSlots, courses]);

  const timetableMatrix = useMemo(
    () => buildCompactCardTimetableMatrix(personTimetableSlots, schoolPeriods, isDigital ? 8 : 7),
    [personTimetableSlots, schoolPeriods, isDigital],
  );

  const numericAcademicYear = Number(school.academicYear || '2569') || 2569;
  const issueLabel = issueTermLabel || `05/${numericAcademicYear}`;
  const expiryLabel = expiryTermLabel || `03/${numericAcademicYear + 3}`;

  const cardContainerClass = isDigital
    ? 'w-full h-full rounded-2xl p-4 sm:p-5 shadow-xl overflow-hidden border border-slate-700 flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white select-none'
    : `id-card-cr80-card relative w-full aspect-[85.6/53.98] rounded-xl border ${
        isStaff ? 'border-emerald-600' : 'border-slate-300'
      } bg-white text-slate-900 p-2.5 shadow-xs flex flex-col justify-between overflow-hidden`;

  if (mode === 'timetable') {
    const headerTitle = isStaff
      ? lang === 'th'
        ? 'ตารางสอนประจำตัว'
        : 'Teaching Schedule'
      : lang === 'th'
        ? 'ตารางเรียนประจำตัว'
        : 'Class Timetable';

    const headerSub = isStaff
      ? teacher?.homeroomClasses?.length
        ? `${lang === 'th' ? 'ประจำชั้น' : 'Homeroom'} ${teacher.homeroomClasses.join(', ')}`
        : teacher?.department || '-'
      : personSubLabel;

    return (
      <div className={cardContainerClass}>
        <div
          className={`flex items-center justify-between gap-2 pb-1 border-b shrink-0 ${
            isDigital
              ? 'border-slate-700'
              : isStaff
                ? 'border-emerald-200'
                : 'border-slate-200'
          }`}
        >
          <div className="min-w-0">
            <p
              className={`text-[9.5px] font-extrabold truncate leading-tight ${
                isDigital ? 'text-cyan-200' : isStaff ? 'text-emerald-900' : 'text-blue-900'
              }`}
            >
              {headerTitle} · {headerSub}
            </p>
            <p
              className={`text-[7.5px] truncate leading-tight ${
                isDigital ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {personDisplayName} ({personCode})
            </p>
          </div>
          <span
            className={`text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap tabular-nums ${
              isDigital
                ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                : isStaff
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {timetableMatrix.totalWeeklyPeriods} {lang === 'th' ? 'คาบ/สัปดาห์' : 'periods'}
          </span>
        </div>

        <div className="flex-1 min-h-0 flex flex-col justify-center my-0.5 overflow-hidden">
          {timetableMatrix.totalWeeklyPeriods === 0 ? (
            <div
              className={`rounded-lg border px-3 py-2.5 text-center space-y-0.5 ${
                isDigital
                  ? 'bg-slate-950/70 border-slate-700 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <p className="text-[9.5px] font-bold">
                {isStaff
                  ? lang === 'th'
                    ? 'ยังไม่มีข้อมูลคาบสอนในภาคเรียนนี้'
                    : 'No teaching periods assigned yet'
                  : lang === 'th'
                    ? 'ยังไม่มีข้อมูลตารางเรียนสำหรับห้องนี้'
                    : 'No class timetable slots found'}
              </p>
              <p className="text-[7.5px] opacity-80">
                {lang === 'th'
                  ? 'เมื่อจัดตารางในเมนูตารางเรียน/สอน ข้อมูลจะขึ้นบนหลังบัตรอัตโนมัติ'
                  : 'Slots appear automatically once configured in Timetable.'}
              </p>
            </div>
          ) : (
            <table className="w-full table-fixed border-collapse text-center">
              <thead>
                <tr>
                  <th
                    className={`w-[22px] py-[2px] text-[6.5px] font-bold border ${
                      isDigital
                        ? 'bg-slate-950/80 border-slate-700 text-slate-300'
                        : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    {lang === 'th' ? 'วัน' : 'Day'}
                  </th>
                  {timetableMatrix.periods.map((periodNo) => (
                    <th
                      key={`hdr-p-${periodNo}`}
                      className={`py-[2px] text-[6.5px] font-mono font-bold border tabular-nums ${
                        isDigital
                          ? 'bg-slate-950/80 border-slate-700 text-cyan-200'
                          : 'bg-slate-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      {lang === 'th' ? `ค.${periodNo}` : `P${periodNo}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timetableMatrix.days.map((day) => (
                  <tr key={`row-${day.key}`}>
                    <td
                      className={`py-[2px] text-[7px] font-bold border ${
                        isDigital
                          ? 'bg-slate-950/70 border-slate-700 text-slate-200'
                          : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    >
                      {lang === 'th' ? day.labelTh : day.labelEn}
                    </td>
                    {timetableMatrix.periods.map((periodNo) => {
                      const cellSlots = timetableMatrix.cellMap.get(`${day.key}::${periodNo}`) || [];
                      const first = cellSlots[0];
                      const tooltip = cellSlots
                        .map((s) =>
                          `${s.courseCode ? `${s.courseCode} ` : ''}${s.courseTitleTh} (${s.classRoom}${s.room ? ` · ${s.room}` : ''})`,
                        )
                        .join(' / ');
                      return (
                        <td
                          key={`cell-${day.key}-${periodNo}`}
                          title={tooltip || undefined}
                          className={`px-0.5 py-[1.5px] border align-middle overflow-hidden ${
                            first
                              ? isDigital
                                ? isStaff
                                  ? 'bg-emerald-950/60 border-slate-700 text-emerald-100'
                                  : 'bg-cyan-950/60 border-slate-700 text-cyan-100'
                                : isStaff
                                  ? 'bg-emerald-50/70 border-slate-300 text-slate-900'
                                  : 'bg-blue-50/70 border-slate-300 text-slate-900'
                              : isDigital
                                ? 'border-slate-800 text-slate-600'
                                : 'border-slate-200 text-slate-300'
                          }`}
                        >
                          {first ? (
                            <div className="leading-[1.08] overflow-hidden">
                              <span className="block text-[6.5px] font-extrabold truncate">
                                {compactSlotPrimaryLabel(first, personType)}
                              </span>
                              <span className="block text-[5.5px] opacity-80 truncate">
                                {compactSlotSecondaryLabel(first, personType)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[6.5px] leading-none">·</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          className={`flex items-center justify-between text-[7px] border-t pt-1 shrink-0 gap-2 ${
            isDigital ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'
          }`}
        >
          <span className="truncate">
            {school.nameTh} · {lang === 'th' ? `ปีการศึกษา ${school.academicYear || '2569'}` : `AY ${school.academicYear || '2569'}`}
          </span>
          <span className={`font-mono shrink-0 tabular-nums ${isDigital ? 'text-cyan-200' : 'text-slate-700'}`}>
            {isStaff ? `STF:${personCode}` : `STU:${personCode}`}
          </span>
        </div>
      </div>
    );
  }

  if (mode === 'medical_emergency') {
    const allergiesText = student?.allergies?.length ? student.allergies.join(', ') : '-';
    const chronicText = student?.chronicDiseases?.length ? student.chronicDiseases.join(', ') : '-';
    const emergencyName = student?.emergencyContact || student?.guardianName || '-';
    const emergencyTel = student?.emergencyPhone || student?.guardianPhone || school.phone || '-';

    return (
      <div className={cardContainerClass}>
        <div
          className={`flex items-center justify-between gap-2 border-b pb-1 shrink-0 ${
            isDigital
              ? 'border-slate-700'
              : isStaff
                ? 'border-emerald-200'
                : 'border-rose-200'
          }`}
        >
          <span
            className={`text-[9.5px] font-extrabold truncate ${
              isDigital ? 'text-rose-200' : isStaff ? 'text-emerald-900' : 'text-rose-800'
            }`}
          >
            {isStaff
              ? lang === 'th'
                ? 'ข้อมูลวิชาชีพและการติดต่อฉุกเฉิน'
                : 'Credentials & Emergency Contact'
              : lang === 'th'
                ? 'ข้อมูลสุขภาพและผู้ติดต่อฉุกเฉิน'
                : 'Medical & Emergency Info'}
          </span>
          <span
            className={`text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
              isDigital
                ? 'bg-rose-950/80 text-rose-200 border border-rose-700/60'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {isStaff
              ? teacher?.academicStanding || 'STAFF'
              : `${lang === 'th' ? 'หมู่เลือด' : 'Blood'}: ${student?.bloodType || '-'}`}
          </span>
        </div>

        {isStaff && teacher ? (
          <div className="grid grid-cols-2 grid-rows-2 gap-1.5 my-1 flex-1 min-h-0 text-[8px]">
            <div
              className={`p-1.5 rounded-lg border flex flex-col justify-center min-w-0 min-h-0 overflow-hidden ${
                isDigital ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[7px] truncate ${isDigital ? 'text-slate-400' : 'text-slate-500'}`}>
                เลขใบอนุญาตประกอบวิชาชีพ
              </span>
              <strong className={`font-mono truncate tabular-nums ${isDigital ? 'text-amber-200' : 'text-slate-900'}`}>
                {teacher.teacherLicenseNo || '-'}
              </strong>
            </div>

            <div
              className={`p-1.5 rounded-lg border flex flex-col justify-center min-w-0 min-h-0 overflow-hidden ${
                isDigital ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[7px] truncate ${isDigital ? 'text-slate-400' : 'text-slate-500'}`}>
                วุฒิการศึกษา / วิชาเอก
              </span>
              <strong className="truncate">
                {[teacher.academicDegree, teacher.major].filter(Boolean).join(' · ') || '-'}
              </strong>
            </div>

            <div
              className={`p-1.5 rounded-lg border flex flex-col justify-center min-w-0 min-h-0 overflow-hidden ${
                isDigital ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[7px] truncate ${isDigital ? 'text-slate-400' : 'text-slate-500'}`}>
                ห้องประจำชั้น / ที่ปรึกษา
              </span>
              <strong className={`truncate ${isDigital ? 'text-emerald-300' : 'text-emerald-800'}`}>
                {teacher.homeroomClasses?.length ? teacher.homeroomClasses.join(', ') : '-'}
              </strong>
            </div>

            <div
              className={`p-1.5 rounded-lg border flex flex-col justify-center min-w-0 min-h-0 overflow-hidden ${
                isDigital ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[7px] truncate ${isDigital ? 'text-slate-400' : 'text-slate-500'}`}>
                ติดต่อฉุกเฉิน / โทร.โรงเรียน
              </span>
              <strong className="font-mono truncate tabular-nums">
                {teacher.phone || school.phone || '-'}
              </strong>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-1.5 my-1 flex-1 min-h-0 text-[8px]">
            <div
              className={`p-1.5 rounded-lg border flex flex-col justify-center min-w-0 min-h-0 overflow-hidden ${
                isDigital ? 'bg-slate-950/80 border-slate-700' : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <span className={`text-[7px] truncate ${isDigital ? 'text-slate-400' : 'text-slate-500'}`}>
                ประวัติแพ้ยา / แพ้อาหาร
              </span>
              <strong className={`truncate ${isDigital ? 'text-rose-200' : 'text-rose-800'}`}>
                {allergiesText}
              </strong>
            </div>

            <div
              className={`p-1.5 rounded-lg border flex flex-col justify-center min-w-0 min-h-0 overflow-hidden ${
                isDigital ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[7px] truncate ${isDigital ? 'text-slate-400' : 'text-slate-500'}`}>
                โรคประจำตัว
              </span>
              <strong className="truncate">{chronicText}</strong>
            </div>

            <div
              className={`p-1.5 rounded-lg border flex flex-col justify-center min-w-0 min-h-0 overflow-hidden ${
                isDigital ? 'bg-slate-950/80 border-slate-700' : 'bg-emerald-50/50 border-emerald-200'
              }`}
            >
              <span className={`text-[7px] truncate ${isDigital ? 'text-slate-400' : 'text-slate-500'}`}>
                ผู้ติดต่อฉุกเฉิน
              </span>
              <strong className={`truncate leading-tight ${isDigital ? 'text-emerald-300' : 'text-emerald-900'}`}>
                {emergencyName}
              </strong>
              <span className="font-mono text-[7.5px] truncate tabular-nums">{emergencyTel}</span>
            </div>

            <div
              className={`p-1.5 rounded-lg border flex flex-col justify-center min-w-0 min-h-0 overflow-hidden ${
                isDigital ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className={`text-[7px] truncate ${isDigital ? 'text-slate-400' : 'text-slate-500'}`}>
                ครูประจำชั้น / ที่ปรึกษา
              </span>
              <strong className={`truncate leading-tight ${isDigital ? 'text-cyan-200' : 'text-blue-900'}`}>
                {resolvedAdvisor}
              </strong>
              <span className="font-mono text-[7px] truncate tabular-nums">
                โทร.รร. {school.phone || '-'}
              </span>
            </div>
          </div>
        )}

        <div
          className={`flex items-center justify-between text-[7px] border-t pt-1 shrink-0 gap-2 ${
            isDigital ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'
          }`}
        >
          <span className="truncate">{school.nameTh}</span>
          <span className="font-mono shrink-0 tabular-nums">
            {isStaff ? `STF:${personCode}` : `STU:${personCode}`}
          </span>
        </div>
      </div>
    );
  }

  if (mode === 'qr_gate_pass') {
    return (
      <div className={cardContainerClass}>
        <div
          className={`flex items-center justify-between gap-2 border-b pb-1 shrink-0 ${
            isDigital ? 'border-slate-700' : 'border-slate-200'
          }`}
        >
          <span
            className={`text-[8.5px] font-extrabold uppercase tracking-wider truncate ${
              isDigital ? 'text-cyan-200' : isStaff ? 'text-emerald-900' : 'text-blue-900'
            }`}
          >
            {isStaff ? 'STAFF GATE & LIBRARY PASS' : 'STUDENT GATE & LIBRARY PASS'}
          </span>
          <span className={`text-[7.5px] font-mono shrink-0 ${isDigital ? 'text-slate-300' : 'text-slate-500'}`}>
            {school.code}
          </span>
        </div>

        <div
          className="flex-1 min-h-0 flex items-center justify-center gap-3 my-1 overflow-hidden"
          onClick={isDigital ? (e) => e.stopPropagation() : undefined}
        >
          <div className="p-1 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0">
            <QrCodeMatrix
              value={qrValue}
              size={isDigital ? 88 : 66}
              className="p-0.5 rounded-lg shadow-none border-0"
              label={`QR ${personCode}`}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5 text-left overflow-hidden">
            <p className={`text-xs font-black truncate leading-tight ${isDigital ? 'text-white' : 'text-slate-900'}`}>
              {personDisplayName}
            </p>
            <p className={`text-[8.5px] font-medium truncate leading-tight ${isDigital ? 'text-cyan-200' : 'text-slate-600'}`}>
              {personSubLabel}
            </p>
            <p className={`text-[8.5px] font-mono font-bold truncate tabular-nums ${isDigital ? 'text-emerald-300' : 'text-blue-800'}`}>
              ID: {personCode}
            </p>
            <div className="pt-0.5">
              <Barcode128Svg
                value={personCode}
                height={15}
                showValueText={false}
                className="max-w-[145px] px-1 py-0.5"
              />
            </div>
            <p className={`text-[7px] leading-tight truncate ${isDigital ? 'text-slate-300' : 'text-slate-500'}`}>
              {lang === 'th'
                ? 'ใช้สแกนเข้า-ออกประตู เช็คชื่อ และห้องสมุด'
                : 'Scan for gate, attendance & library'}
            </p>
          </div>
        </div>

        <div
          className={`flex items-center justify-between text-[7px] border-t pt-1 shrink-0 gap-2 ${
            isDigital ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'
          }`}
        >
          <span className="truncate">{school.nameTh}</span>
          <span className="font-mono shrink-0 tabular-nums">
            {lang === 'th' ? `ปีการศึกษา ${school.academicYear || '2569'}` : `AY ${school.academicYear || '2569'}`}
          </span>
        </div>
      </div>
    );
  }

  // Default: 'rules_contact'
  if (isDigital) {
    return (
      <div className={cardContainerClass}>
        <div className="rounded-lg bg-slate-950/90 border border-slate-700 flex items-center justify-between px-3 py-1.5 shrink-0">
          <span className="text-[8.5px] font-mono tracking-wider text-slate-200 truncate">
            {isStaff ? 'OFFICIAL PERSONNEL PASS' : 'OFFICIAL STUDENT PASS'}
          </span>
          <span className="text-[8.5px] font-mono text-cyan-300 shrink-0">{school.code}</span>
        </div>

        <div className="space-y-1 text-[8.5px] text-slate-100 min-h-0 overflow-hidden my-1">
          <p className="font-bold text-cyan-200 truncate">
            {isStaff
              ? 'ข้อกำหนดการใช้บัตรประจำตัวครูและบุคลากร:'
              : 'ข้อกำหนดการใช้บัตรประจำตัวนักเรียน:'}
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-200 text-[8px] leading-snug">
            <li className="truncate">บัตรนี้เป็นเอกสารยืนยันตัวตนของ {school.nameTh}</li>
            <li className="line-clamp-2">
              {isStaff
                ? 'ใช้ลงเวลาปฏิบัติงานเข้า-ออกโรงเรียน เบิกจ่ายห้องสมุด และแสดงตัวตนราชการ'
                : 'ใช้สแกนบาร์โค้ด/QR เข้า-ออกโรงเรียน เช็คชื่อรายคาบ และยืม-คืนหนังสือห้องสมุด'}
            </li>
            <li className="truncate">หากเก็บบัตรนี้ได้ กรุณาส่งคืนห้องธุรการ โทร. {school.phone || '-'}</li>
          </ul>
        </div>

        {isStaff && teacher ? (
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <span className="text-[7.5px] text-slate-300 block">โทรศัพท์ / อีเมลบุคลากร:</span>
              <p className="text-[9.5px] font-mono font-bold text-emerald-300 truncate tabular-nums">
                {teacher.phone || teacher.email || school.phone || '-'}
              </p>
            </div>
            <div className="text-right shrink-0 max-w-[44%]">
              <span className="text-[7.5px] text-slate-300 block">ใบอนุญาตฯ:</span>
              <p className="text-[9.5px] font-mono font-bold text-amber-200 truncate tabular-nums">
                {teacher.teacherLicenseNo || teacher.teacherIdNumber || '-'}
              </p>
            </div>
          </div>
        ) : student ? (
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <span className="text-[7.5px] text-slate-300 block">ผู้ปกครอง / เบอร์ติดต่อฉุกเฉิน:</span>
              <p className="text-[9.5px] font-mono font-bold text-emerald-300 truncate tabular-nums">
                {student.guardianName ? `${student.guardianName} · ` : ''}
                {student.guardianPhone || '-'}
              </p>
            </div>
            <div className="text-right shrink-0 max-w-[42%]">
              <span className="text-[7.5px] text-slate-300 block">ที่ปรึกษาประจำชั้น:</span>
              <p className="text-[9.5px] font-bold text-cyan-200 truncate">
                {resolvedAdvisor}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between text-[7.5px] text-slate-200 border-t border-slate-700 pt-1.5 gap-2 shrink-0">
          <span className="truncate">
            {school.nameTh} · ปีการศึกษา {school.academicYear || '2569'}
          </span>
          <span className="font-mono text-cyan-200 shrink-0 tabular-nums">CODE: {personCode}</span>
        </div>
      </div>
    );
  }

  // Print variant of 'rules_contact' (tight millimeter budget, zero overlap)
  return (
    <div className={cardContainerClass}>
      <div
        className={`w-full h-3 rounded-sm shrink-0 flex items-center justify-between px-2 text-[6.5px] font-mono text-white ${
          isStaff ? 'bg-emerald-950' : 'bg-slate-900'
        }`}
      >
        <span className="truncate">{isStaff ? 'OFFICIAL STAFF PASS' : 'OFFICIAL STUDENT PASS'}</span>
        <span className="shrink-0">{school.code}</span>
      </div>

      {isStaff && teacher ? (
        <div className="text-[7.5px] space-y-0.5 text-slate-700 flex-1 min-h-0 flex flex-col justify-center overflow-hidden leading-[1.28] py-0.5">
          <p className="font-bold text-slate-900 truncate">
            บัตรประจำตัวข้าราชการครูและบุคลากรทางการศึกษา:
          </p>
          <p className="line-clamp-2">1. ใช้สแกนลงเวลาปฏิบัติงาน เข้า-ออกสถานศึกษา และยืนยันสิทธิ์วิชาการ</p>
          <p className="truncate">2. กรณีเก็บบัตรได้ โปรดนำส่งฝ่ายบริหารงานบุคคล {school.nameTh}</p>
          <div className="mt-0.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[7px] font-semibold text-emerald-900 truncate">
            โทร. {teacher.phone || school.phone || '-'} · {teacher.email || '-'}
          </div>
        </div>
      ) : (
        <div className="text-[7.5px] space-y-0.5 text-slate-700 flex-1 min-h-0 flex flex-col justify-center overflow-hidden leading-[1.28] py-0.5">
          <p className="font-bold text-slate-900 truncate">
            เงื่อนไขและข้อปฏิบัติการใช้บัตรประจำตัวนักเรียน:
          </p>
          <p className="truncate">1. บัตรนี้เป็นกรรมสิทธิ์ของ {school.nameTh} นักเรียนต้องพกติดตัวตลอดเวลา</p>
          <p className="line-clamp-2">2. ใช้สแกนบาร์โค้ด/QR เข้า-ออกโรงเรียน เช็คชื่อรายคาบ และห้องสมุด</p>
          <div className="mt-0.5 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[7px] font-semibold text-blue-900 truncate">
            ผู้ปกครอง: {student?.guardianName || '-'} ({student?.guardianPhone || '-'}) · ที่ปรึกษา: {resolvedAdvisor}
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-1 flex items-end justify-between text-[7.5px] shrink-0 font-mono gap-2">
        <div className="min-w-0">
          <span className="block truncate tabular-nums font-bold text-slate-800">
            {isStaff ? `STF-CODE: ${personCode}` : `STU-CODE: ${personCode}`}
          </span>
          <span className="block text-[6.5px] text-slate-500 truncate tabular-nums">
            ออกบัตร: {issueLabel} · หมดอายุ: {expiryLabel}
          </span>
        </div>
        <div className="text-center shrink-0">
          <div className="w-16 border-b border-slate-400 mb-0.5" />
          <span className="text-[6.5px] text-slate-600 block leading-none">ผู้อำนวยการสถานศึกษา</span>
        </div>
      </div>
    </div>
  );
});

IdCardBackContent.displayName = 'IdCardBackContent';
