import React from 'react';
import { Camera, GraduationCap, User } from 'lucide-react';
import type { AppLanguage, School, Student, Teacher } from '../../types';
import { Barcode128Svg } from '../Barcode128Svg';
import { QrCodeMatrix } from '../QrCodeMatrix';
import { formatMaskedNationalId } from '../../lib/idCardBackLayout';

interface IdCardFrontContentProps {
  personType: 'student' | 'staff';
  student?: Student | null;
  teacher?: Teacher | null;
  school: School;
  lang: AppLanguage;
  variant: 'digital' | 'print';
  avatarUrl?: string;
  canUpdatePhoto?: boolean;
  onRequestPhotoUpdate?: () => void;
  includeBarcode?: boolean;
  includeQrCode?: boolean;
  includeBloodType?: boolean;
  maskNationalId?: boolean;
  issueTermLabel?: string;
  expiryTermLabel?: string;
}

export const IdCardFrontContent: React.FC<IdCardFrontContentProps> = React.memo(({
  personType,
  student,
  teacher,
  school,
  lang,
  variant,
  avatarUrl,
  canUpdatePhoto = false,
  onRequestPhotoUpdate,
  includeBarcode = true,
  includeQrCode = true,
  includeBloodType = true,
  maskNationalId = true,
  issueTermLabel,
  expiryTermLabel,
}) => {
  const isStaff = personType === 'staff';
  const isDigital = variant === 'digital';
  const accentColor = school.primaryColor || '#1d4ed8';

  const personCode = isStaff
    ? teacher?.teacherIdNumber || teacher?.id || 'TCH-0001'
    : student?.studentIdNumber || student?.id || 'STU-0001';

  const resolvedAvatarUrl =
    avatarUrl ?? (isStaff ? teacher?.avatarUrl : student?.avatarUrl) ?? '';

  const qrValue = isStaff
    ? `EDUVERSE:STF:${personCode}:${school.code}`
    : `EDUVERSE:STU:${personCode}:${school.code}`;

  const numericAcademicYear = Number(school.academicYear || '2569') || 2569;
  const issueLabel = issueTermLabel || `05/${numericAcademicYear}`;
  const expiryLabel = expiryTermLabel || `03/${numericAcademicYear + 3}`;

  if (isDigital) {
    return (
      <div
        className={`w-full h-full rounded-2xl p-4 sm:p-5 shadow-xl overflow-hidden border flex flex-col justify-between text-white relative select-none ${
          isStaff
            ? 'border-emerald-400/50 bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950'
            : 'border-cyan-400/50 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950'
        }`}
      >
        <div
          className={`absolute -top-24 -right-24 w-56 h-56 rounded-full blur-2xl pointer-events-none ${
            isStaff ? 'bg-amber-400/10' : 'bg-cyan-500/15'
          }`}
        />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 relative z-10 border-b border-white/15 pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.nameTh}
                className="w-8 h-8 rounded-lg object-cover border border-white/30 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow text-[10px] shrink-0">
                {school.code.slice(0, 3) || 'SCH'}
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-[11px] font-bold tracking-tight text-white truncate">
                {school.nameTh}
              </h4>
              <p className="text-[9px] text-cyan-200 font-mono tracking-wider uppercase truncate">
                {school.nameEn || school.code}
              </p>
            </div>
          </div>
          <span
            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0 whitespace-nowrap ${
              isStaff
                ? 'bg-emerald-800/90 text-amber-200 border-amber-300/60'
                : 'bg-cyan-900/90 text-cyan-100 border-cyan-300/60'
            }`}
          >
            {isStaff ? 'TEACHER / STAFF ID' : 'STUDENT ID'}
          </span>
        </div>

        {/* Middle */}
        <div className="flex items-center gap-3 relative z-10 my-1 min-h-0 flex-1">
          <div
            onClick={(e) => {
              if (!canUpdatePhoto || !onRequestPhotoUpdate) return;
              e.stopPropagation();
              onRequestPhotoUpdate();
            }}
            className={`relative shrink-0 group ${canUpdatePhoto ? 'cursor-pointer' : ''}`}
            title={canUpdatePhoto ? 'แตะเพื่อถ่ายรูปสด หรืออัปโหลดรูปภาพใหม่ลงบัตร' : undefined}
          >
            {resolvedAvatarUrl ? (
              <img
                src={resolvedAvatarUrl}
                alt={isStaff ? teacher?.fullNameTh || 'Staff' : student?.firstNameTh || 'Student'}
                className={`w-[68px] h-[86px] sm:w-[76px] sm:h-[96px] rounded-xl object-cover border-2 shadow-md group-hover:ring-2 transition ${
                  isStaff
                    ? 'border-amber-300/75 group-hover:ring-amber-300'
                    : 'border-cyan-400/75 group-hover:ring-cyan-300'
                }`}
              />
            ) : (
              <div
                className={`w-[68px] h-[86px] sm:w-[76px] sm:h-[96px] rounded-xl border-2 shadow-md bg-slate-800 flex items-center justify-center ${
                  isStaff
                    ? 'border-amber-300/70 text-amber-200'
                    : 'border-cyan-400/70 text-cyan-200'
                }`}
              >
                {isStaff ? <GraduationCap className="w-8 h-8" /> : <User className="w-8 h-8" />}
              </div>
            )}
            {canUpdatePhoto && onRequestPhotoUpdate && (
              <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md transition">
                <Camera className="w-3 h-3" />
              </span>
            )}
          </div>

          {isStaff && teacher ? (
            <div className="space-y-1 text-xs min-w-0 flex-1 overflow-hidden">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate leading-snug">
                  {lang === 'th' ? teacher.fullNameTh : teacher.fullNameEn || teacher.fullNameTh}
                </h3>
                <p className="text-[10px] text-amber-200 font-medium truncate">
                  {teacher.fullNameEn || teacher.academicStanding || '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-200 pt-0.5">
                <div className="min-w-0 truncate">
                  <span className="text-slate-300">รหัสครู: </span>
                  <strong className="font-mono text-amber-200 tabular-nums">{teacher.teacherIdNumber || '-'}</strong>
                </div>
                <div className="min-w-0 truncate">
                  <span className="text-slate-300">ตำแหน่ง: </span>
                  <strong className="text-white">{teacher.positionTitle || teacher.academicStanding || 'ครูผู้สอน'}</strong>
                </div>
                <div className="col-span-2 min-w-0 truncate">
                  <span className="text-slate-300">กลุ่มสาระ/ฝ่าย: </span>
                  <strong className="text-white">{teacher.department || '-'}</strong>
                </div>
                <div className="col-span-2 min-w-0 truncate">
                  <span className="text-slate-300">ที่ปรึกษา: </span>
                  <strong className="text-emerald-200">
                    {teacher.homeroomClasses?.length ? teacher.homeroomClasses.join(', ') : '-'}
                  </strong>
                </div>
              </div>
            </div>
          ) : student ? (
            <div className="space-y-1 text-xs min-w-0 flex-1 overflow-hidden">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate leading-snug">
                  {lang === 'th'
                    ? `${student.firstNameTh || ''} ${student.lastNameTh || ''}`.trim() || school.nameTh
                    : `${student.firstNameEn || ''} ${student.lastNameEn || ''}`.trim() || school.nameEn}
                </h3>
                <p className="text-[10px] text-slate-200 font-medium truncate">
                  {`${student.firstNameEn || ''} ${student.lastNameEn || ''}`.trim() || '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-200 pt-0.5">
                <div className="min-w-0 truncate">
                  <span className="text-slate-300">รหัส: </span>
                  <strong className="font-mono text-cyan-200 tabular-nums">{student.studentIdNumber || '-'}</strong>
                </div>
                <div className="min-w-0 truncate">
                  <span className="text-slate-300">หมู่เลือด: </span>
                  <strong className="font-mono text-rose-200">{student.bloodType || '-'}</strong>
                </div>
                <div className="col-span-2 min-w-0 truncate">
                  <span className="text-slate-300">ชั้นเรียน: </span>
                  <strong className="text-white">
                    {[student.gradeLevel, student.room].filter(Boolean).join(' ') || '-'}
                  </strong>
                </div>
                <div className="col-span-2 min-w-0 truncate">
                  <span className="text-slate-300">เลขบัตร ปชช.: </span>
                  <strong className="font-mono text-slate-100 tabular-nums">
                    {formatMaskedNationalId(student.nationalId)}
                  </strong>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 pt-2 border-t border-white/15 relative z-10 text-[9px] text-slate-200 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Barcode128Svg
              value={personCode}
              height={20}
              className="max-w-[162px]"
              label={isStaff ? `บาร์โค้ดรหัสครู ${personCode}` : `บาร์โค้ดรหัสนักเรียน ${personCode}`}
            />
            <div className="hidden sm:block text-[8px] text-slate-300 leading-tight tabular-nums shrink-0">
              <span>{lang === 'th' ? `ปีการศึกษา ${school.academicYear || '2569'}` : `AY ${school.academicYear || '2569'}`}</span>
              <span className="block font-mono text-slate-200">{school.code}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-right text-[8px] leading-tight text-cyan-100 hidden sm:inline">
              {isStaff ? 'สแกนลงเวลา' : 'สแกนเช็คชื่อ'}
              <br />
              Code 128 / QR
            </span>
            <QrCodeMatrix
              value={qrValue}
              size={48}
              className="p-1 rounded-lg"
              label={isStaff ? `QR บัตรครู ${personCode}` : `QR บัตรนักเรียน ${personCode}`}
            />
          </div>
        </div>
      </div>
    );
  }

  // PRINT VARIANT (Exact CR80 85.6mm x 53.98mm physical layout — zero overlap)
  return (
    <div
      className={`id-card-cr80-card relative w-full aspect-[85.6/53.98] rounded-xl border ${
        isStaff ? 'border-emerald-600' : 'border-slate-300'
      } bg-white text-slate-900 p-2.5 shadow-xs flex flex-col justify-between overflow-hidden`}
    >
      {/* Top School Header */}
      <div
        className="flex items-center justify-between gap-2 border-b pb-1 shrink-0"
        style={{ borderColor: isStaff ? '#047857' : accentColor }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt={school.nameTh}
              className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div
              className="w-6 h-6 rounded text-white flex items-center justify-center text-[9px] font-black shrink-0"
              style={{ backgroundColor: isStaff ? '#047857' : accentColor }}
            >
              {school.code.slice(0, 2) || 'EV'}
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <h4 className="text-[9.5px] font-black leading-tight truncate text-slate-900">
              {school.nameTh}
            </h4>
            <span className="text-[7.5px] text-slate-500 font-medium block truncate leading-tight">
              {school.nameEn || school.code}
            </span>
          </div>
        </div>
        <span
          className="text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded text-white shrink-0 whitespace-nowrap"
          style={{ backgroundColor: isStaff ? '#065f46' : accentColor }}
        >
          {isStaff ? 'STAFF ID' : 'STUDENT ID'}
        </span>
      </div>

      {/* Middle Body: Full-width right column next to Photo (no QR squeeze!) */}
      <div className="flex items-center gap-2.5 my-auto min-h-0 py-0.5">
        <div className="shrink-0">
          {resolvedAvatarUrl ? (
            <img
              src={resolvedAvatarUrl}
              alt={isStaff ? teacher?.fullNameTh || 'Staff' : student?.firstNameTh || 'Student'}
              className={`w-[54px] h-[68px] rounded-md object-cover border ${
                isStaff ? 'border-emerald-600' : 'border-slate-300'
              }`}
            />
          ) : (
            <div
              className={`w-[54px] h-[68px] rounded-md border flex items-center justify-center ${
                isStaff
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-slate-100 text-slate-500'
              }`}
            >
              {isStaff ? <GraduationCap className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
          )}
        </div>

        {isStaff && teacher ? (
          <div className="flex-1 min-w-0 space-y-0.5 text-left overflow-hidden">
            <p className="text-[11px] font-black text-slate-900 truncate leading-tight">
              {lang === 'th' ? teacher.fullNameTh : teacher.fullNameEn || teacher.fullNameTh}
            </p>
            <p className="text-[8.5px] text-emerald-800 font-semibold truncate leading-tight">
              {teacher.positionTitle || teacher.academicStanding || 'ครูผู้สอน'}
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5 text-[8px] leading-tight">
              <div className="min-w-0 truncate font-mono text-slate-900">
                <span className="text-slate-500">รหัส: </span>
                <strong className="tabular-nums">{teacher.teacherIdNumber || '-'}</strong>
              </div>
              <div className="min-w-0 truncate text-slate-800">
                <span className="text-slate-500">กลุ่มสาระ: </span>
                <strong>{teacher.department || '-'}</strong>
              </div>
              <div className="col-span-2 min-w-0 truncate text-slate-700">
                <span className="text-slate-500">ที่ปรึกษา: </span>
                <strong className="text-emerald-900">
                  {teacher.homeroomClasses?.length ? teacher.homeroomClasses.join(', ') : '-'}
                </strong>
              </div>
              {teacher.teacherLicenseNo && (
                <div className="col-span-2 min-w-0 truncate font-mono text-slate-600">
                  ใบอนุญาตฯ: {teacher.teacherLicenseNo}
                </div>
              )}
            </div>
          </div>
        ) : student ? (
          <div className="flex-1 min-w-0 space-y-0.5 text-left overflow-hidden">
            <p className="text-[11px] font-black text-slate-900 truncate leading-tight">
              {lang === 'th'
                ? `${student.firstNameTh || ''} ${student.lastNameTh || ''}`.trim()
                : `${student.firstNameEn || ''} ${student.lastNameEn || ''}`.trim() || `${student.firstNameTh || ''} ${student.lastNameTh || ''}`.trim()}
            </p>
            <p className="text-[8.5px] text-slate-600 font-medium truncate leading-tight">
              {`${student.firstNameEn || ''} ${student.lastNameEn || ''}`.trim() || '-'}
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5 text-[8px] leading-tight">
              <div className="min-w-0 truncate font-mono text-slate-900">
                <span className="text-slate-500">รหัส: </span>
                <strong className="tabular-nums">{student.studentIdNumber || '-'}</strong>
              </div>
              {includeBloodType && (
                <div className="min-w-0 truncate text-slate-800">
                  <span className="text-slate-500">หมู่เลือด: </span>
                  <strong className="font-mono text-rose-700">{student.bloodType || '-'}</strong>
                </div>
              )}
              <div className="col-span-2 min-w-0 truncate text-slate-800">
                <span className="text-slate-500">ชั้นเรียน: </span>
                <strong className="text-blue-900">
                  {[student.gradeLevel, student.room].filter(Boolean).join(' ') || '-'}
                </strong>
              </div>
              {student.nationalId && (
                <div className="col-span-2 min-w-0 truncate font-mono text-slate-600">
                  ปชช.: {maskNationalId ? formatMaskedNationalId(student.nationalId) : student.nationalId}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Barcode & QR Strip */}
      <div className="border-t border-slate-200 pt-1 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {includeBarcode && (
            <Barcode128Svg
              value={personCode}
              height={15}
              className="max-w-[138px] px-1 py-0.5"
            />
          )}
          <div className="text-[7px] font-mono text-slate-600 leading-tight tabular-nums min-w-0 truncate">
            <span className="block truncate">ปีการศึกษา {school.academicYear || '2569'}</span>
            <span className="block truncate">ออก {issueLabel} · หมด {expiryLabel}</span>
          </div>
        </div>

        {includeQrCode && (
          <div className="shrink-0">
            <QrCodeMatrix
              value={qrValue}
              size={42}
              className="p-0.5 rounded-md shadow-none"
              label={`QR: ${personCode}`}
            />
          </div>
        )}
      </div>
    </div>
  );
});

IdCardFrontContent.displayName = 'IdCardFrontContent';
