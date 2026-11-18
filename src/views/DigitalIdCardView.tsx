import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  QrCode,
  Printer,
  RotateCw,
  User,
  Sparkles,
  Search,
  Camera,
  AlertCircle,
} from 'lucide-react';
import { Student, School, AppLanguage, UserRole, AuthUser } from '../types';
import { ImageCaptureUploadModal } from '../components/modals/ImageCaptureUploadModal';
import { PagedList } from '../components/PagedList';
import { BatchIdCardPrintModal } from '../components/modals/BatchIdCardPrintModal';
import { getModuleTone } from '../lib/moduleTheme';
import { resolveLinkedStudentsForUser, resolveOwnStudent } from '../lib/attendanceScope';

interface DigitalIdCardViewProps {
  students: Student[];
  school: School;
  lang: AppLanguage;
  currentRole: UserRole;
  currentUser?: AuthUser | null;
  onUpdateStudent?: (student: Student) => void;
}

export const DigitalIdCardView: React.FC<DigitalIdCardViewProps> = ({
  students,
  school,
  lang,
  currentRole,
  currentUser,
  onUpdateStudent,
}) => {
  const effectiveRole: UserRole = currentUser?.role || currentRole;
  const isStudentViewer = effectiveRole === 'student';
  const isParentViewer = effectiveRole === 'parent';
  const isStaffViewer = !isStudentViewer && !isParentViewer;

  // Strictly scope visible cards:
  // - Students ONLY see their own student record (never another student's card).
  // - Parents ONLY see their own linked child(ren).
  // - Staff/Admins can browse and print cards for students in the school.
  const visibleStudents = useMemo<Student[]>(() => {
    if (isStudentViewer) {
      if (currentUser) {
        const own = resolveOwnStudent(currentUser, students);
        return own ? [own] : [];
      }
      return students.length === 1 ? [students[0]] : [];
    }
    if (isParentViewer) {
      return currentUser ? resolveLinkedStudentsForUser(currentUser, students) : [];
    }
    return students;
  }, [isStudentViewer, isParentViewer, currentUser, students]);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(visibleStudents[0]?.id || '');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [cardType, setCardType] = useState<'student' | 'staff'>('student');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    if (visibleStudents.length === 0) {
      if (selectedStudentId !== '') setSelectedStudentId('');
      return;
    }
    if (!visibleStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(visibleStudents[0].id);
      setIsFlipped(false);
    }
  }, [visibleStudents, selectedStudentId]);

  // Force student card mode for students and parents
  const activeCardType: 'student' | 'staff' = isStaffViewer ? cardType : 'student';

  const selectedStudent: Student | null =
    visibleStudents.find((s) => s.id === selectedStudentId) || visibleStudents[0] || null;

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return visibleStudents;
    return visibleStudents.filter((s) => {
      return (
        (s.firstNameTh || '').toLowerCase().includes(q) ||
        (s.lastNameTh || '').toLowerCase().includes(q) ||
        (s.firstNameEn || '').toLowerCase().includes(q) ||
        (s.lastNameEn || '').toLowerCase().includes(q) ||
        (s.studentIdNumber || '').toLowerCase().includes(q) ||
        (s.room || '').toLowerCase().includes(q)
      );
    });
  }, [visibleStudents, searchTerm]);

  const showSelectorSidebar = isStaffViewer || (isParentViewer && visibleStudents.length > 1);

  return (
    <div className={`${getModuleTone('student_id_cards')} lg:h-full flex flex-col min-h-0 lg:overflow-hidden space-y-2`}>
      {/* Compact Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 px-3 py-2 app-page-header text-[var(--color-text-title)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="tone-chip w-7 h-7 rounded-lg shrink-0">
            <CreditCard className="w-4 h-4" />
          </span>
          <h1 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] flex items-center gap-2 truncate">
            <span className="truncate">
              {isStudentViewer
                ? (lang === 'th' ? 'บัตรประจำตัวนักเรียนของฉัน' : 'My Student ID Card')
                : (lang === 'th' ? 'บัตรประจำตัวดิจิทัล' : 'Virtual ID Card')}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full tone-chip shrink-0 font-bold">
              Smart NFC &amp; QR
            </span>
          </h1>
        </div>

        {isStaffViewer && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {/* Card Type Toggle — Staff/Admin Only */}
            <div className="seg-tab-group">
              <button
                type="button"
                data-active={activeCardType === 'student'}
                onClick={() => setCardType('student')}
                className="seg-tab-btn"
              >
                {lang === 'th' ? 'บัตรนักเรียน' : 'Student Card'}
              </button>
              <button
                type="button"
                data-active={activeCardType === 'staff'}
                onClick={() => setCardType('staff')}
                className="seg-tab-btn"
              >
                {lang === 'th' ? 'บัตรครู/บุคลากร' : 'Staff Card'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="btn-tool-tone px-2.5 py-1.5"
            >
              <Printer className="w-3.5 h-3.5 tone-text" />
              <span>{lang === 'th' ? 'พิมพ์บัตร (A4)' : 'Print Sheet'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Showcase */}
      <div
        className={`flex-1 min-h-0 grid grid-cols-1 ${
          showSelectorSidebar ? 'lg:grid-cols-3' : ''
        } gap-3 overflow-y-auto lg:overflow-hidden pb-4`}
      >
        {/* Left Column: Student Selector List (Staff/Admin, or Parent with multiple children) */}
        {showSelectorSidebar && (
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs p-3 flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden text-[var(--color-text-title)]">
            <div className="shrink-0 flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-title)]">
                {lang === 'th' ? 'เลือกบัตรนักเรียน' : 'Select Student'}
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
                {filteredStudents.length} รายการ
              </span>
            </div>

            {isStaffViewer && (
              <div className="shrink-0 relative my-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={lang === 'th' ? 'ค้นหารหัส / ชื่อ...' : 'Search student...'}
                  className="w-full bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] text-xs pl-8 pr-3 py-1.5 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-1">
              <PagedList
                items={filteredStudents}
                pageSize={5}
                emptyState={
                  <p className="py-2 text-xs text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ไม่พบนักเรียน' : 'No students found.'}
                  </p>
                }
                renderItem={(stu) => {
                  const isSelected = stu.id === selectedStudent?.id;
                  return (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(stu.id);
                        setIsFlipped(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-text-title)] shadow-xs'
                          : 'hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border border-transparent'
                      }`}
                    >
                      {stu.avatarUrl ? (
                        <img
                          src={stu.avatarUrl}
                          alt={stu.firstNameTh}
                          className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-bold text-[var(--color-text-title)] truncate">
                          {lang === 'th' ? `${stu.firstNameTh} ${stu.lastNameTh}` : `${stu.firstNameEn} ${stu.lastNameEn}`}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
                          {stu.studentIdNumber} • {stu.room}
                        </p>
                      </div>
                    </button>
                  );
                }}
              />
            </div>
          </div>
        )}

        {/* Center & Right: 3D Flip Card View */}
        <div
          className={`${
            showSelectorSidebar ? 'lg:col-span-2' : ''
          } flex flex-col items-center justify-center p-3 sm:p-6 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs space-y-3 overflow-hidden text-[var(--color-text-title)]`}
        >
          {!selectedStudent ? (
            <div className="max-w-sm text-center py-8 px-4 space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[var(--color-text-title)]">
                {lang === 'th' ? 'ไม่พบข้อมูลบัตรประจำตัวของคุณ' : 'No Student ID Record Found'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {isStudentViewer
                  ? (lang === 'th'
                      ? 'บัญชีนักเรียนของคุณยังไม่ได้ผูกกับระเบียนนักเรียน กรุณาติดต่อผู้ดูแลระบบโรงเรียน'
                      : 'Your account is not linked to a student record yet. Please contact your school administrator.')
                  : (lang === 'th'
                      ? 'ยังไม่มีข้อมูลนักเรียนสำหรับแสดงบัตรประจำตัวดิจิทัล'
                      : 'No student records available to display.')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between w-full max-w-md">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-xs text-[var(--color-text-body)] font-semibold">
                    {isFlipped
                      ? (lang === 'th' ? 'ด้านหลังบัตร (Back)' : 'Back Side')
                      : (lang === 'th' ? 'ด้านหน้าบัตร (Front)' : 'Front Side')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs text-[var(--color-primary-text)] font-semibold border border-[var(--color-border)] transition cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'พลิกดูอีกด้าน' : 'Flip Card'}</span>
                </button>
              </div>

              {/* Realistic Card Container (ISO/IEC 7810 ID-1 standard ratio ~ 1.586) */}
              <div className="perspective-1000 w-full max-w-md h-[270px]">
                <div
                  className={`w-full h-full relative duration-500 transform-style-3d cursor-pointer transition-transform ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* FRONT OF CARD */}
                  <div className="absolute inset-0 backface-hidden rounded-2xl p-5 shadow-2xl overflow-hidden border border-cyan-400/40 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 text-white">
                    {/* Hologram / Gloss Accent */}
                    <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

                    {/* Card Top: School Branding */}
                    <div className="flex items-center justify-between relative z-10 border-b border-cyan-500/30 pb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow text-[10px] shrink-0">
                          BPK
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-bold tracking-tight text-white line-clamp-1">{school.nameTh}</h4>
                          <p className="text-[9px] text-cyan-200 font-mono tracking-wider uppercase truncate">{school.nameEn}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-900/80 text-cyan-100 border border-cyan-400/50 uppercase tracking-wider shrink-0">
                        {activeCardType === 'student' ? 'STUDENT ID' : 'STAFF ID'}
                      </span>
                    </div>

                    {/* Card Middle: Photo + Info */}
                    <div className="flex items-center gap-4 relative z-10 my-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onUpdateStudent) setShowPhotoModal(true);
                        }}
                        className={`relative shrink-0 group ${onUpdateStudent ? 'cursor-pointer' : ''}`}
                        title={onUpdateStudent ? 'แตะเพื่อถ่ายรูปสด หรืออัปโหลดรูปภาพใหม่ลงบัตร' : undefined}
                      >
                        {selectedStudent.avatarUrl ? (
                          <img
                            src={selectedStudent.avatarUrl}
                            alt={selectedStudent.firstNameTh || 'Student'}
                            className="w-20 h-24 rounded-xl object-cover border-2 border-cyan-400/60 shadow-md group-hover:ring-2 group-hover:ring-cyan-300 transition"
                          />
                        ) : (
                          <div className="w-20 h-24 rounded-xl border-2 border-cyan-400/60 shadow-md bg-slate-800 flex items-center justify-center text-cyan-200">
                            <User className="w-9 h-9" />
                          </div>
                        )}
                        {onUpdateStudent && (
                          <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md transition">
                            <Camera className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs truncate min-w-0">
                        <div>
                          <h3 className="text-sm font-bold text-white truncate">
                            {lang === 'th'
                              ? `${selectedStudent.firstNameTh || ''} ${selectedStudent.lastNameTh || ''}`.trim() || school.nameTh
                              : `${selectedStudent.firstNameEn || ''} ${selectedStudent.lastNameEn || ''}`.trim() || school.nameEn}
                          </h3>
                          <p className="text-[10px] text-slate-200 font-medium truncate">
                            {`${selectedStudent.firstNameEn || ''} ${selectedStudent.lastNameEn || ''}`.trim() || '-'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-200 pt-1">
                          <div>
                            <span className="text-slate-300">ID: </span>
                            <strong className="font-mono text-cyan-200">{selectedStudent.studentIdNumber || '-'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-300">Blood: </span>
                            <strong className="font-mono text-rose-200">{selectedStudent.bloodType || '-'}</strong>
                          </div>
                          <div className="col-span-2 truncate">
                            <span className="text-slate-300">Class: </span>
                            <strong className="text-white">
                              {[selectedStudent.gradeLevel, selectedStudent.room].filter(Boolean).join(' ') || '-'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom: Barcode & QR Code */}
                    <div className="flex items-center justify-between pt-2 border-t border-cyan-500/30 relative z-10 text-[9px] text-slate-200">
                      <div className="space-y-0.5">
                        <div className="font-mono text-[11px] font-bold text-slate-100 tracking-widest">
                          ||| | |||| | ||| || ||| |
                        </div>
                        <span className="tabular-nums">
                          {lang === 'th' ? `ปีการศึกษา ${school.academicYear}` : `AY ${school.academicYear}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-right text-[8px] leading-tight text-cyan-100">
                          สแกนเช็คชื่อ<br />เข้าโรงเรียน
                        </span>
                        <div className="w-9 h-9 p-1 rounded-lg bg-white shadow flex items-center justify-center">
                          <QrCode className="w-full h-full text-slate-950" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BACK OF CARD */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl p-5 shadow-2xl overflow-hidden border border-slate-700 flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
                    {/* Magnetic Stripe */}
                    <div className="-mx-5 -mt-2 h-9 bg-slate-950 border-y border-slate-700 flex items-center px-4">
                      <span className="text-[9px] font-mono tracking-widest text-slate-200">MAGNETIC STRIPE / NFC CHIP 13.56MHz</span>
                    </div>

                    {/* Rules & Info */}
                    <div className="space-y-1.5 text-[9px] text-slate-100 pt-1">
                      <p className="font-bold text-cyan-200">ข้อกำหนดการใช้บัตรประจำตัว:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-200 text-[8.5px]">
                        <li>บัตรนี้เป็นกรรมสิทธิ์ของโรงเรียน ต้องพกติดตัวตลอดเวลาในสถานศึกษา</li>
                        <li>ใช้สำหรับสแกนเข้า-ออกโรงเรียน, ยืมหนังสือห้องสมุด และรับสวัสดิการ</li>
                        <li>หากเก็บบัตรนี้ได้ กรุณาส่งคืน {school.phone || school.nameTh} หรือห้องกิจการนักเรียน</li>
                      </ul>
                    </div>

                    {/* Library Barcode & Emergency */}
                    <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-700 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[8px] text-slate-200">เบอร์ฉุกเฉินผู้ปกครอง:</span>
                        <p className="text-[10px] font-mono font-bold text-emerald-300 truncate">
                          {selectedStudent.guardianPhone || '-'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[8px] text-slate-200">Library ID:</span>
                        <p className="text-[10px] font-mono font-bold text-cyan-200">
                          LIB-{selectedStudent.studentIdNumber || '-'}
                        </p>
                      </div>
                    </div>

                    {/* School Verification Footer */}
                    <div className="flex items-center justify-between text-[8px] text-slate-200 border-t border-slate-700 pt-1.5 gap-2">
                      <span className="truncate">{school.nameEn || school.nameTh}</span>
                      <span className="font-mono text-cyan-200 shrink-0">
                        SECURE ID: #{selectedStudent.id?.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[var(--color-text-muted)] text-center flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                <span>
                  {lang === 'th'
                    ? 'แตะที่หน้าบัตร หรือกดปุ่ม "พลิกดูอีกด้าน" เพื่อตรวจสอบข้อมูลหลังบัตร'
                    : 'Tap the card or click "Flip Card" to view the back side'}
                </span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Batch ID Card Print Modal (Staff/Admin Only) */}
      {isStaffViewer && (
        <BatchIdCardPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          students={visibleStudents}
          school={school}
          lang={lang}
        />
      )}

      {/* Image Capture & Upload Modal */}
      {selectedStudent && onUpdateStudent && (
        <ImageCaptureUploadModal
          isOpen={showPhotoModal}
          currentImageUrl={selectedStudent.avatarUrl}
          title={`ถ่ายรูปสดหรือเปลี่ยนรูปบนบัตร: ${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`}
          onSelectImage={(newUrl) => {
            onUpdateStudent({
              ...selectedStudent,
              avatarUrl: newUrl,
            });
          }}
          onClose={() => setShowPhotoModal(false)}
        />
      )}
    </div>
  );
};
