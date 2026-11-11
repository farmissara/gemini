import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  X, 
  CheckSquare, 
  Square, 
  Filter, 
  Search, 
  Download, 
  CreditCard, 
  Layers, 
  Sparkles, 
  Eye, 
  RotateCw,
  QrCode
} from 'lucide-react';
import { Student, School, AppLanguage } from '../types';
import { QrCodeMatrix } from './QrCodeMatrix';

interface BatchIdCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  school: School;
  lang?: AppLanguage;
}

export const BatchIdCardPrintModal: React.FC<BatchIdCardPrintModalProps> = ({
  isOpen,
  onClose,
  students,
  school,
  lang = 'th',
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set(students.map(s => s.id)));
  const [cardSide, setCardSide] = useState<'front' | 'back' | 'both'>('front');
  const [layoutMode, setLayoutMode] = useState<'grid_a4' | 'single'>('grid_a4');
  const [includeBarcode, setIncludeBarcode] = useState<boolean>(true);
  const [includeQrCode, setIncludeQrCode] = useState<boolean>(true);
  const [includeBloodType, setIncludeBloodType] = useState<boolean>(true);

  // Available grade levels and rooms
  const gradeLevels = useMemo(() => Array.from(new Set(students.map(s => s.gradeLevel).filter(Boolean))), [students]);
  const rooms = useMemo(() => {
    const list = selectedGrade === 'all' 
      ? students 
      : students.filter(s => s.gradeLevel === selectedGrade);
    return Array.from(new Set(list.map(s => s.room).filter(Boolean)));
  }, [students, selectedGrade]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedGrade !== 'all' && s.gradeLevel !== selectedGrade) return false;
      if (selectedRoom !== 'all' && s.room !== selectedRoom) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.firstNameTh.toLowerCase().includes(q) ||
          s.lastNameTh.toLowerCase().includes(q) ||
          s.studentIdNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, selectedGrade, selectedRoom, searchQuery]);

  if (!isOpen) return null;

  const handleToggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedStudentIds);
    filteredStudents.forEach(s => next.add(s.id));
    setSelectedStudentIds(next);
  };

  const handleDeselectAllFiltered = () => {
    const next = new Set(selectedStudentIds);
    filteredStudents.forEach(s => next.delete(s.id));
    setSelectedStudentIds(next);
  };

  const printableStudents = students.filter(s => selectedStudentIds.has(s.id));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-[var(--color-text-body)]">
        
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[var(--color-card-subtle)] no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--color-text-title)]">
                {lang === 'th' ? 'ระบบพิมพ์บัตรนักเรียนชุดมาตรฐาน CR80' : 'Batch ID Card Printing System'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {lang === 'th' 
                  ? `เลือกพิมพ์ได้ทั้งห้อง/ระดับชั้น จัดหน้า A4 อัตโนมัติ (เลือกแล้ว ${printableStudents.length} คน)` 
                  : `Print full classes on A4 sheets (${printableStudents.length} selected)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={printableStudents.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'th' ? 'สั่งพิมพ์ / บันทึก PDF (A4)' : 'Print / Export PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Customization Toolbar (Hidden in Print) */}
        <div className="p-3 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-card)] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs no-print">
          {/* Class Filters */}
          <div className="flex flex-wrap items-center gap-2">
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
                {gradeLevels.map(g => (
                  <option key={g} value={g}>{g}</option>
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
                {rooms.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs"
              />
            </div>
          </div>

          {/* Print Options */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              <button
                type="button"
                onClick={() => setCardSide('front')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  cardSide === 'front' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)]'
                }`}
              >
                หน้าบัตร (Front)
              </button>
              <button
                type="button"
                onClick={() => setCardSide('back')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  cardSide === 'back' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)]'
                }`}
              >
                หลังบัตร (Back)
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

            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-[11px] text-[var(--color-primary-text)] font-semibold hover:underline cursor-pointer"
            >
              เลือกทั้งหมด ({filteredStudents.length})
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={handleDeselectAllFiltered}
              className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
            >
              ยกเลิกทั้งหมด
            </button>
          </div>
        </div>

        {/* Printable Area: Layout of Cards */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80 print-area">
          {printableStudents.length === 0 ? (
            <div className="text-center py-16 space-y-2 text-[var(--color-text-muted)]">
              <CreditCard className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-bold text-[var(--color-text-title)]">ไม่มีนักเรียนที่ถูกเลือกพิมพ์</p>
              <p className="text-xs">กรุณาเลือกนักเรียนจากตัวกรองด้านบนเพื่อสั่งพิมพ์บัตร</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {printableStudents.map((student) => {
                const renderFront = (
                  <div 
                    key={`front-${student.id}`}
                    className="relative w-full aspect-[85.6/53.98] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 shadow-md flex flex-col justify-between overflow-hidden print:border-slate-800 print:shadow-none print:break-inside-avoid"
                  >
                    {/* Card Top Brand Header */}
                    <div className="flex items-center justify-between border-b border-blue-600/30 pb-1.5 shrink-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-blue-700 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          EV
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[10px] font-black leading-tight truncate text-blue-900 dark:text-blue-300">
                            {school.nameTh}
                          </h4>
                          <span className="text-[8px] text-slate-500 font-medium block truncate">
                            {school.nameEn}
                          </span>
                        </div>
                      </div>
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 shrink-0">
                        STUDENT CARD
                      </span>
                    </div>

                    {/* Card Center: Avatar & Info */}
                    <div className="flex gap-2.5 items-center my-auto">
                      <div className="relative shrink-0">
                        <img
                          src={student.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                          alt={student.firstNameTh}
                          className="w-14 h-18 sm:w-16 sm:h-20 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shadow-2xs"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5 text-left">
                        <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {student.firstNameTh} {student.lastNameTh}
                        </p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">
                          {student.firstNameEn} {student.lastNameEn}
                        </p>
                        <div className="pt-1 flex items-center gap-2 text-[9px] font-mono">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
                            ID: {student.studentIdNumber}
                          </span>
                          <span className="font-bold text-blue-700 dark:text-blue-300">
                            ชั้น: {student.room}
                          </span>
                        </div>
                        {student.nationalId && (
                          <p className="text-[8px] text-slate-500 font-mono">
                            เลขประจำตัวประชาชน: {student.nationalId}
                          </p>
                        )}
                      </div>

                      {includeQrCode && (
                        <div className="shrink-0 p-1 rounded-lg bg-white border border-slate-200 dark:border-slate-700 shadow-2xs">
                          <QrCodeMatrix 
                            value={`EDUVERSE:STU:${student.studentIdNumber}:${school.code}`} 
                            size={56} 
                            label={`QR: ${student.studentIdNumber}`} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Card Footer Barcode & Blood Group */}
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-1 flex items-center justify-between text-[8px] font-mono shrink-0">
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                        <span>||| | | |||| | ||| |</span>
                        <span className="text-[9px]">{student.studentIdNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {includeBloodType && <span>กรุ๊ปเลือด: {student.bloodType || 'O'}</span>}
                        <span className="text-slate-500">ปีการศึกษา {school.academicYear || '2569'}</span>
                      </div>
                    </div>
                  </div>
                );

                const renderBack = (
                  <div 
                    key={`back-${student.id}`}
                    className="relative w-full aspect-[85.6/53.98] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 shadow-md flex flex-col justify-between overflow-hidden print:border-slate-800 print:shadow-none print:break-inside-avoid"
                  >
                    {/* Back Top: Magnetic / Smart Strip simulation */}
                    <div className="w-full h-4 bg-slate-800 dark:bg-slate-950 rounded-sm mb-1 shrink-0" />

                    {/* Back Body: Rules and Contacts */}
                    <div className="text-[8px] space-y-1 text-slate-600 dark:text-slate-400 flex-1 leading-snug">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        เงื่อนไขและข้อปฏิบัติการใช้บัตรประจำตัวนักเรียน:
                      </p>
                      <p>1. บัตรนี้เป็นกรรมสิทธิ์ของ {school.nameTh} นักเรียนต้องพกติดตัวตลอดเวลาในสถานศึกษา</p>
                      <p>2. ใช้สำหรับสแกนเข้า-ออกโรงเรียน เช็คชื่อเข้าเรียน และยืม-คืนหนังสือห้องสมุดดิจิทัล</p>
                      <p>3. กรณีทำบัตรสูญหาย กรุณาแจ้งงานทะเบียนวิชาการทันที</p>
                      <p className="font-semibold text-blue-900 dark:text-blue-300">
                        ติดต่อสถานศึกษา: โทร. {school.phone || '02-123-4567'} | ผู้ปกครอง: {student.guardianName || 'ติดต่อธุรการ'} ({student.guardianPhone || '-'})
                      </p>
                    </div>

                    {/* Back Footer: Signature line & Expiry */}
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-1 flex items-end justify-between text-[8px] shrink-0 font-mono">
                      <div>
                        <span>LIB-REF: {student.studentIdNumber}</span>
                        <span className="block text-[7px] text-slate-500">ออกบัตร: 05/2569 • บัตรหมดอายุ: 03/2572</span>
                      </div>
                      <div className="text-center">
                        <div className="w-16 border-b border-slate-400 mb-0.5" />
                        <span className="text-[7px] text-slate-600 dark:text-slate-400">ผู้อำนวยการสถานศึกษา</span>
                      </div>
                    </div>
                  </div>
                );

                if (cardSide === 'front') return renderFront;
                if (cardSide === 'back') return renderBack;
                return (
                  <React.Fragment key={student.id}>
                    {renderFront}
                    {renderBack}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Controls (Hidden in Print) */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between text-xs shrink-0 no-print">
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>มาตรฐาน ISO/IEC 7810 ID-1 (CR80) 85.60 × 53.98 มม. รองรับการสั่งพิมพ์ A4 แบบตัดขอบ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={printableStudents.length === 0}
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
