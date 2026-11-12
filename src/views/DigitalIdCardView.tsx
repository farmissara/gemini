import React, { useState } from 'react';
import { 
  CreditCard, 
  QrCode, 
  Download, 
  Printer, 
  RotateCw, 
  ShieldCheck, 
  User, 
  Phone, 
  MapPin, 
  Sparkles, 
  Award, 
  Search,
  ExternalLink,
  Barcode,
  Camera
} from 'lucide-react';
import { Student, School, AppLanguage, UserRole } from '../types';
import { ImageCaptureUploadModal } from '../components/modals/ImageCaptureUploadModal';
import { PagedList } from '../components/PagedList';
import { BatchIdCardPrintModal } from '../components/modals/BatchIdCardPrintModal';

interface DigitalIdCardViewProps {
  students: Student[];
  school: School;
  lang: AppLanguage;
  currentRole: UserRole;
  onUpdateStudent?: (student: Student) => void;
}

export const DigitalIdCardView: React.FC<DigitalIdCardViewProps> = ({
  students,
  school,
  lang,
  currentRole,
  onUpdateStudent
}) => {
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [cardType, setCardType] = useState<'student' | 'staff'>('student');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.firstNameTh.toLowerCase().includes(q) ||
      s.lastNameTh.toLowerCase().includes(q) ||
      s.studentIdNumber.toLowerCase().includes(q) ||
      s.room.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 sm:p-4 app-page-header text-[var(--color-text-title)]">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)]">
            <CreditCard className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] flex items-center gap-2 flex-wrap">
              {lang === 'th' ? 'บัตรนักเรียนและบัตรประจำตัวดิจิทัล' : 'Virtual Student & Staff ID Card'}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)]">
                Smart NFC &amp; QR
              </span>
            </h1>
            <p className="text-xs text-[var(--color-text-body)]">
              {lang === 'th'
                ? 'บัตรประจำตัวอัจฉริยะเสมือนจริง พร้อม QR Code สแกนเข้าเรียน ยืมหนังสือห้องสมุด และพิมพ์ขนาดมาตรฐาน'
                : 'Interactive digital ID card with barcodes, NFC simulation, and printable card formats.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Card Type Toggle */}
          <div className="flex p-0.5 bg-[var(--color-card-subtle)] rounded-xl border border-[var(--color-border)]">
            <button
              onClick={() => setCardType('student')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                cardType === 'student'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'บัตรนักเรียน' : 'Student Card'}
            </button>
            <button
              onClick={() => setCardType('staff')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                cardType === 'staff'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? 'บัตรครู/บุคลากร' : 'Staff Card'}
            </button>
          </div>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
            <span>{lang === 'th' ? 'พิมพ์บัตร (A4)' : 'Print Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Showcase */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-y-auto lg:overflow-hidden pb-4">
        {/* Left Column: Student Selector List */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs p-3 flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden text-[var(--color-text-title)]">
          <div className="shrink-0 flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-title)]">
              {lang === 'th' ? 'เลือกบัตรนักเรียน' : 'Select Student'}
            </h3>
            <span className="text-[11px] text-[var(--color-text-muted)] font-mono">{filteredStudents.length} รายการ</span>
          </div>

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

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <PagedList
              items={filteredStudents}
              pageSize={5}
              emptyState={<p className="py-2 text-xs text-[var(--color-text-muted)]">{lang === 'th' ? 'ไม่พบนักเรียน' : 'No students found.'}</p>}
              renderItem={(stu) => {
              const isSelected = stu.id === selectedStudent?.id;
              return (
                <button
                  key={stu.id}
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
                  <img
                    src={stu.avatarUrl}
                    alt={stu.firstNameTh}
                    className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                  />
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

        {/* Center & Right: 3D Flip Card View */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center p-2 sm:p-4 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xs space-y-3 overflow-hidden text-[var(--color-text-title)]">
          <div className="flex items-center justify-between w-full max-w-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs text-[var(--color-text-body)] font-semibold">
                {isFlipped ? (lang === 'th' ? 'ด้านหลังบัตร (Back)' : 'Back Side') : (lang === 'th' ? 'ด้านหน้าบัตร (Front)' : 'Front Side')}
              </span>
            </div>

            <button
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
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow">
                      EV
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold tracking-tight text-white line-clamp-1">{school.nameTh}</h4>
                      <p className="text-[9px] text-cyan-200 font-mono tracking-wider uppercase">{school.nameEn}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-900/80 text-cyan-100 border border-cyan-400/50 uppercase tracking-wider">
                    {cardType === 'student' ? 'STUDENT ID' : 'STAFF ID'}
                  </span>
                </div>

                {/* Card Middle: Photo + Info */}
                <div className="flex items-center gap-4 relative z-10 my-1">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPhotoModal(true);
                    }}
                    className="relative shrink-0 group cursor-pointer"
                    title="แตะเพื่อถ่ายรูปสด หรืออัปโหลดรูปภาพใหม่ลงบัตร"
                  >
                    <img
                      src={selectedStudent?.avatarUrl}
                      alt={selectedStudent?.firstNameTh}
                      className="w-20 h-24 rounded-xl object-cover border-2 border-cyan-400/60 shadow-md group-hover:ring-2 group-hover:ring-cyan-300 transition"
                    />
                    <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md transition">
                      <Camera className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="space-y-1 text-xs truncate">
                    <div>
                      <h3 className="text-sm font-bold text-white truncate">
                        {lang === 'th'
                          ? `${selectedStudent?.firstNameTh} ${selectedStudent?.lastNameTh}`
                          : `${selectedStudent?.firstNameEn} ${selectedStudent?.lastNameEn}`}
                      </h3>
                      <p className="text-[10px] text-slate-200 font-medium">{selectedStudent?.firstNameEn} {selectedStudent?.lastNameEn}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-200 pt-1">
                      <div>
                        <span className="text-slate-300">ID: </span>
                        <strong className="font-mono text-cyan-200">{selectedStudent?.studentIdNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-300">Blood: </span>
                        <strong className="font-mono text-rose-200">{selectedStudent?.bloodType || 'O'}</strong>
                      </div>
                      <div className="col-span-2 truncate">
                        <span className="text-slate-300">Class: </span>
                        <strong className="text-white">{selectedStudent?.room}</strong>
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
                    <span>EXP: 31/03/2027</span>
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
                    <li>หากเก็บบัตรนี้ได้ กรุณาส่งคืน {school.phone} หรือห้องกิจการนักเรียน</li>
                  </ul>
                </div>

                {/* Library Barcode & Emergency */}
                <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] text-slate-200">เบอร์ฉุกเฉินผู้ปกครอง:</span>
                    <p className="text-[10px] font-mono font-bold text-emerald-300">{selectedStudent?.guardianPhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-200">Library ID:</span>
                    <p className="text-[10px] font-mono font-bold text-cyan-200">LIB-{selectedStudent?.studentIdNumber}</p>
                  </div>
                </div>

                {/* Signature Line */}
                <div className="flex items-center justify-between text-[8px] text-slate-200 border-t border-slate-700 pt-1.5">
                  <span>Authorized Signature: Dr. Thanaporn K.</span>
                  <span className="font-mono text-cyan-200">SECURE ID: #{selectedStudent?.id?.slice(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[var(--color-text-muted)] text-center flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
            <span>คลิกที่หน้าบัตร หรือกดปุ่ม <strong>"พลิกดูอีกด้าน"</strong> เพื่อตรวจสอบข้อมูลหลังบัตร</span>
          </p>
        </div>
      </div>

      {/* Batch ID Card Print Modal (A4 Sheet & CR80 Multi-Student) */}
      <BatchIdCardPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        students={students}
        school={school}
        lang={lang}
      />

      {/* Image Capture & Upload Modal */}
      {selectedStudent && (
        <ImageCaptureUploadModal
          isOpen={showPhotoModal}
          currentImageUrl={selectedStudent.avatarUrl}
          title={`ถ่ายรูปสดหรือเปลี่ยนรูปบนบัตร: ${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`}
          onSelectImage={(newUrl) => {
            if (onUpdateStudent && selectedStudent) {
              onUpdateStudent({
                ...selectedStudent,
                avatarUrl: newUrl,
              });
            }
          }}
          onClose={() => setShowPhotoModal(false)}
        />
      )}
    </div>
  );
};
