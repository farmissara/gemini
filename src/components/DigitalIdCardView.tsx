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
  Barcode
} from 'lucide-react';
import { Student, School, AppLanguage, UserRole } from '../types';

interface DigitalIdCardViewProps {
  students: Student[];
  school: School;
  lang: AppLanguage;
  currentRole: UserRole;
}

export const DigitalIdCardView: React.FC<DigitalIdCardViewProps> = ({
  students,
  school,
  lang,
  currentRole
}) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <CreditCard className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {lang === 'th' ? 'บัตรนักเรียนและบัตรประจำตัวดิจิทัล' : 'Virtual Student & Staff ID Card'}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Smart NFC & QR
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {lang === 'th'
                ? 'บัตรประจำตัวอัจฉริยะเสมือนจริง พร้อม QR Code สแกนเข้าเรียน ยืมหนังสือห้องสมุด และพิมพ์ขนาดมาตรฐาน'
                : 'Interactive digital ID card with barcodes, NFC simulation, and printable card formats.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Card Type Toggle */}
          <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700">
            <button
              onClick={() => setCardType('student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                cardType === 'student'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'th' ? 'บัตรนักเรียน' : 'Student Card'}
            </button>
            <button
              onClick={() => setCardType('staff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                cardType === 'staff'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'th' ? 'บัตรครู/บุคลากร' : 'Staff Card'}
            </button>
          </div>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'th' ? 'พิมพ์บัตร (A4)' : 'Print Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Student Selector List */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {lang === 'th' ? 'เลือกบัตรนักเรียน' : 'Select Student'}
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">{filteredStudents.length} รายการ</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหารหัส / ชื่อ...' : 'Search student...'}
              className="w-full bg-slate-800 text-white text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredStudents.map((stu) => {
              const isSelected = stu.id === selectedStudent?.id;
              return (
                <button
                  key={stu.id}
                  onClick={() => {
                    setSelectedStudentId(stu.id);
                    setIsFlipped(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition ${
                    isSelected
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-white shadow-sm'
                      : 'hover:bg-slate-800/40 text-slate-300 border border-transparent'
                  }`}
                >
                  <img
                    src={stu.avatarUrl}
                    alt={stu.firstNameTh}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                  <div className="truncate">
                    <p className="text-xs font-bold truncate">
                      {lang === 'th' ? `${stu.firstNameTh} ${stu.lastNameTh}` : `${stu.firstNameEn} ${stu.lastNameEn}`}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {stu.studentIdNumber} • {stu.room}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center & Right: 3D Flip Card View */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center p-6 bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between w-full max-w-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-semibold">
                {isFlipped ? (lang === 'th' ? 'ด้านหลังบัตร (Back)' : 'Back Side') : (lang === 'th' ? 'ด้านหน้าบัตร (Front)' : 'Front Side')}
              </span>
            </div>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 font-semibold border border-slate-700 transition"
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
              <div className="absolute inset-0 backface-hidden rounded-2xl p-5 shadow-2xl overflow-hidden border border-cyan-400/30 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 text-white">
                {/* Hologram / Gloss Accent */}
                <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

                {/* Card Top: School Branding */}
                <div className="flex items-center justify-between relative z-10 border-b border-cyan-500/20 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow">
                      EV
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold tracking-tight text-white line-clamp-1">{school.nameTh}</h4>
                      <p className="text-[9px] text-cyan-300 font-mono tracking-wider uppercase">{school.nameEn}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                    {cardType === 'student' ? 'STUDENT ID' : 'STAFF ID'}
                  </span>
                </div>

                {/* Card Middle: Photo + Info */}
                <div className="flex items-center gap-4 relative z-10 my-1">
                  <div className="relative shrink-0">
                    <img
                      src={selectedStudent?.avatarUrl}
                      alt={selectedStudent?.firstNameTh}
                      className="w-20 h-24 rounded-xl object-cover border-2 border-cyan-400/50 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-cyan-500 text-slate-950">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="space-y-1 text-xs truncate">
                    <div>
                      <h3 className="text-sm font-bold text-white truncate">
                        {lang === 'th'
                          ? `${selectedStudent?.firstNameTh} ${selectedStudent?.lastNameTh}`
                          : `${selectedStudent?.firstNameEn} ${selectedStudent?.lastNameEn}`}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">{selectedStudent?.firstNameEn} {selectedStudent?.lastNameEn}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-300 pt-1">
                      <div>
                        <span className="text-slate-400">ID: </span>
                        <strong className="font-mono text-cyan-300">{selectedStudent?.studentIdNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Blood: </span>
                        <strong className="font-mono text-rose-300">{selectedStudent?.bloodType || 'O'}</strong>
                      </div>
                      <div className="col-span-2 truncate">
                        <span className="text-slate-400">Class: </span>
                        <strong className="text-white">{selectedStudent?.room}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Barcode & QR Code */}
                <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20 relative z-10 text-[9px] text-slate-400">
                  <div className="space-y-0.5">
                    <div className="font-mono text-[11px] font-bold text-slate-200 tracking-widest">
                      ||| | |||| | ||| || ||| |
                    </div>
                    <span>EXP: 31/03/2027</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-right text-[8px] leading-tight text-cyan-200">
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
                <div className="-mx-5 -mt-2 h-9 bg-slate-950 border-y border-slate-800 flex items-center px-4">
                  <span className="text-[9px] font-mono tracking-widest text-slate-600">MAGNETIC STRIPE / NFC CHIP 13.56MHz</span>
                </div>

                {/* Rules & Info */}
                <div className="space-y-1.5 text-[9px] text-slate-300 pt-1">
                  <p className="font-bold text-cyan-400">ข้อกำหนดการใช้บัตรประจำตัว:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[8.5px]">
                    <li>บัตรนี้เป็นกรรมสิทธิ์ของโรงเรียน ต้องพกติดตัวตลอดเวลาในสถานศึกษา</li>
                    <li>ใช้สำหรับสแกนเข้า-ออกโรงเรียน, ยืมหนังสือห้องสมุด และรับสวัสดิการ</li>
                    <li>หากเก็บบัตรนี้ได้ กรุณาส่งคืน {school.phone} หรือห้องกิจการนักเรียน</li>
                  </ul>
                </div>

                {/* Library Barcode & Emergency */}
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] text-slate-400">เบอร์ฉุกเฉินผู้ปกครอง:</span>
                    <p className="text-[10px] font-mono font-bold text-emerald-400">{selectedStudent?.guardianPhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-400">Library ID:</span>
                    <p className="text-[10px] font-mono font-bold text-cyan-300">LIB-{selectedStudent?.studentIdNumber}</p>
                  </div>
                </div>

                {/* Signature Line */}
                <div className="flex items-center justify-between text-[8px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                  <span>Authorized Signature: Dr. Thanaporn K.</span>
                  <span className="font-mono text-cyan-400">SECURE ID: #{selectedStudent?.id?.slice(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>คลิกที่หน้าบัตร หรือกดปุ่ม <strong>"พลิกดูอีกด้าน"</strong> เพื่อตรวจสอบข้อมูลหลังบัตร</span>
          </p>
        </div>
      </div>

      {/* Print Modal for A4 Card Sheet */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">พิมพ์บัตรนักเรียนดิจิทัล (Print Ready)</h3>
                <p className="text-xs text-slate-600">ขนาดมาตรฐาน CR-80 (85.60 × 53.98 มม.) พร้อมตัดใส่ซองสายคล้องคอ</p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ทันที</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"
                >
                  ปิด
                </button>
              </div>
            </div>

            {/* Printable Preview of Card Front and Back */}
            <div className="grid grid-cols-2 gap-4 p-4 border border-slate-300 rounded-xl bg-slate-50">
              {/* Front Print Card */}
              <div className="border border-slate-400 rounded-xl p-3 bg-white space-y-2 text-xs shadow-sm">
                <div className="flex items-center justify-between border-b pb-1">
                  <div className="font-bold text-[10px] text-slate-800">{school.nameTh}</div>
                  <span className="text-[8px] bg-slate-200 px-1 rounded font-bold">STUDENT</span>
                </div>
                <div className="flex gap-2 items-center">
                  <img
                    src={selectedStudent?.avatarUrl}
                    alt=""
                    className="w-14 h-16 rounded object-cover border"
                  />
                  <div className="text-[10px] space-y-0.5">
                    <p className="font-bold">{selectedStudent?.firstNameTh} {selectedStudent?.lastNameTh}</p>
                    <p className="text-[9px] text-slate-600">{selectedStudent?.firstNameEn} {selectedStudent?.lastNameEn}</p>
                    <p className="text-[9px] font-mono">ID: {selectedStudent?.studentIdNumber}</p>
                    <p className="text-[9px]">ชั้น: {selectedStudent?.room}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[9px] border-t pt-1 font-mono">
                  <span>|||| | || ||||| |</span>
                  <span>Blood: {selectedStudent?.bloodType || 'O'}</span>
                </div>
              </div>

              {/* Back Print Card */}
              <div className="border border-slate-400 rounded-xl p-3 bg-white space-y-2 text-xs shadow-sm flex flex-col justify-between">
                <div className="text-[9px] space-y-1 text-slate-700">
                  <p className="font-bold text-slate-900">เงื่อนไขการใช้บัตร:</p>
                  <p>1. พกติดตัวในสถานศึกษาตลอดเวลา</p>
                  <p>2. ใช้ยืม-คืนหนังสือและอุปกรณ์</p>
                  <p>3. พบเห็นติดต่อ: {school.phone}</p>
                </div>
                <div className="border-t pt-1 text-[9px] flex justify-between font-mono">
                  <span>LIB-{selectedStudent?.studentIdNumber}</span>
                  <span>EXP: 03/2027</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
