import React, { useEffect, useMemo, useState } from 'react';
import {
  Printer,
  X,
  Filter,
  Search,
  CreditCard,
  User,
  GraduationCap,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Layers,
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
import { IdCardFrontContent } from '../id-card/IdCardFrontContent';
import { IdCardBackContent } from '../id-card/IdCardBackContent';
import {
  ID_CARD_BACK_MODE_OPTIONS,
  buildMirroredDuplexBackSlots,
  chunkPrintItems,
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
  initialSelectedStudentIds?: string[];
  initialSelectedTeacherIds?: string[];
  timetableSlots?: TimetableSlot[];
  courses?: Course[];
  schoolPeriods?: SchoolPeriodTime[];
  school: School;
  lang?: AppLanguage;
}

type PrintPageDescriptor =
  | {
      key: string;
      kind: 'front_grid';
      label: string;
      items: Array<Student | Teacher>;
    }
  | {
      key: string;
      kind: 'back_grid';
      label: string;
      items: Array<Student | Teacher | null>;
    }
  | {
      key: string;
      kind: 'fold_pairs';
      label: string;
      items: Array<Student | Teacher>;
    }
  | {
      key: string;
      kind: 'stickers';
      label: string;
      items: Array<Student | Teacher>;
    };

export const BatchIdCardPrintModal: React.FC<BatchIdCardPrintModalProps> = ({
  isOpen,
  onClose,
  students,
  teachers = [],
  initialPersonType = 'student',
  initialBackMode,
  initialSelectedStudentIds,
  initialSelectedTeacherIds,
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

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    () => new Set(students.map((s) => s.id)),
  );
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(
    () => new Set(teachers.map((t) => t.id)),
  );
  const [studentSelectionTouched, setStudentSelectionTouched] = useState(false);
  const [teacherSelectionTouched, setTeacherSelectionTouched] = useState(false);

  const [cardSide, setCardSide] = useState<'front' | 'back' | 'both'>('both');
  const [bothSideLayout, setBothSideLayout] = useState<'fold_pair' | 'duplex_sheets'>('fold_pair');
  const [backMode, setBackMode] = useState<IdCardBackMode>(
    () => initialBackMode || getSavedIdCardBackMode(school.id, initialPersonType),
  );
  const [layoutMode, setLayoutMode] = useState<'grid_a4' | 'sticker_a4'>('grid_a4');
  const [includeBarcode, setIncludeBarcode] = useState<boolean>(true);
  const [includeQrCode, setIncludeQrCode] = useState<boolean>(true);
  const [includeBloodType, setIncludeBloodType] = useState<boolean>(true);
  const [maskNationalId, setMaskNationalId] = useState<boolean>(true);

  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [showAllPreviewPages, setShowAllPreviewPages] = useState(false);

  // Keep selections automatically populated if data loads asynchronously after mount
  useEffect(() => {
    if (!studentSelectionTouched) {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
      return;
    }
    const validIds = new Set(students.map((s) => s.id));
    setSelectedStudentIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [students, studentSelectionTouched]);

  useEffect(() => {
    if (!teacherSelectionTouched) {
      setSelectedTeacherIds(new Set(teachers.map((t) => t.id)));
      return;
    }
    const validIds = new Set(teachers.map((t) => t.id));
    setSelectedTeacherIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [teachers, teacherSelectionTouched]);

  useEffect(() => {
    if (isOpen) {
      setPersonType(initialPersonType);
      setBackMode(initialBackMode || getSavedIdCardBackMode(school.id, initialPersonType));
      if (initialSelectedStudentIds) {
        setStudentSelectionTouched(true);
        setSelectedStudentIds(new Set(initialSelectedStudentIds));
      }
      if (initialSelectedTeacherIds) {
        setTeacherSelectionTouched(true);
        setSelectedTeacherIds(new Set(initialSelectedTeacherIds));
      }
      setPreviewPageIndex(0);
    }
  }, [
    isOpen,
    initialPersonType,
    initialBackMode,
    initialSelectedStudentIds,
    initialSelectedTeacherIds,
    school.id,
  ]);

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
    [students],
  );
  const rooms = useMemo(() => {
    const list =
      selectedGrade === 'all' ? students : students.filter((s) => s.gradeLevel === selectedGrade);
    return Array.from(new Set(list.map((s) => s.room).filter(Boolean)));
  }, [students, selectedGrade]);

  const departments = useMemo(
    () => Array.from(new Set(teachers.map((t) => t.department).filter(Boolean))),
    [teachers],
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (selectedGrade !== 'all' && s.gradeLevel !== selectedGrade) return false;
      if (selectedRoom !== 'all' && s.room !== selectedRoom) return false;
      if (q) {
        return (
          `${s.firstNameTh || ''} ${s.lastNameTh || ''}`.toLowerCase().includes(q) ||
          `${s.firstNameEn || ''} ${s.lastNameEn || ''}`.toLowerCase().includes(q) ||
          (s.studentIdNumber || '').toLowerCase().includes(q) ||
          (s.room || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, selectedGrade, selectedRoom, searchQuery]);

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teachers.filter((t) => {
      if (selectedDept !== 'all' && t.department !== selectedDept) return false;
      if (q) {
        return (
          (t.fullNameTh || '').toLowerCase().includes(q) ||
          (t.fullNameEn || '').toLowerCase().includes(q) ||
          (t.teacherIdNumber || '').toLowerCase().includes(q) ||
          (t.department || '').toLowerCase().includes(q) ||
          (t.positionTitle || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teachers, selectedDept, searchQuery]);

  const printableStudents = useMemo(
    () => filteredStudents.filter((s) => selectedStudentIds.has(s.id)),
    [filteredStudents, selectedStudentIds],
  );
  const printableTeachers = useMemo(
    () => filteredTeachers.filter((t) => selectedTeacherIds.has(t.id)),
    [filteredTeachers, selectedTeacherIds],
  );

  const activeFilteredList = personType === 'student' ? filteredStudents : filteredTeachers;
  const activePrintableList: Array<Student | Teacher> =
    personType === 'student' ? printableStudents : printableTeachers;
  const activeTotalCount = personType === 'student' ? students.length : teachers.length;
  const activeSelectedIds = personType === 'student' ? selectedStudentIds : selectedTeacherIds;
  const activePrintCount = activePrintableList.length;

  const hasActiveFilter =
    personType === 'student'
      ? selectedGrade !== 'all' || selectedRoom !== 'all' || searchQuery.trim() !== ''
      : selectedDept !== 'all' || searchQuery.trim() !== '';

  // Build explicit A4 pages for both WYSIWYG screen preview and crisp @media print pagination
  const printPages = useMemo<PrintPageDescriptor[]>(() => {
    if (activePrintableList.length === 0) return [];

    if (layoutMode === 'sticker_a4') {
      return chunkPrintItems(activePrintableList, 24).map((chunk, idx) => ({
        key: `sticker-page-${idx}`,
        kind: 'stickers',
        label: lang === 'th' ? `สติกเกอร์หน้า ${idx + 1}` : `Sticker Sheet ${idx + 1}`,
        items: chunk,
      }));
    }

    if (cardSide === 'front') {
      return chunkPrintItems(activePrintableList, 8).map((chunk, idx) => ({
        key: `front-page-${idx}`,
        kind: 'front_grid',
        label: lang === 'th' ? `ด้านหน้า · แผ่นที่ ${idx + 1}` : `Front · Page ${idx + 1}`,
        items: chunk,
      }));
    }

    if (cardSide === 'back') {
      return chunkPrintItems(activePrintableList, 8).map((chunk, idx) => ({
        key: `back-page-${idx}`,
        kind: 'back_grid',
        label: lang === 'th' ? `ด้านหลัง · แผ่นที่ ${idx + 1}` : `Back · Page ${idx + 1}`,
        items: chunk,
      }));
    }

    if (bothSideLayout === 'fold_pair') {
      return chunkPrintItems(activePrintableList, 4).map((chunk, idx) => ({
        key: `pair-page-${idx}`,
        kind: 'fold_pairs',
        label: lang === 'th' ? `คู่หน้า-หลังพับประกบ · แผ่นที่ ${idx + 1}` : `Fold Pairs · Page ${idx + 1}`,
        items: chunk,
      }));
    }

    // Duplex mode: All front sheets followed by mirrored back sheets
    const chunks = chunkPrintItems(activePrintableList, 8);
    const pages: PrintPageDescriptor[] = [];
    chunks.forEach((chunk, idx) => {
      pages.push({
        key: `duplex-front-${idx}`,
        kind: 'front_grid',
        label:
          lang === 'th'
            ? `ชุดที่ ${idx + 1} (แผ่นด้านหน้า)`
            : `Sheet ${idx + 1} (Fronts)`,
        items: chunk,
      });
      pages.push({
        key: `duplex-back-${idx}`,
        kind: 'back_grid',
        label:
          lang === 'th'
            ? `ชุดที่ ${idx + 1} (แผ่นด้านหลัง — กลับด้านสำหรับพิมพ์ 2 หน้า)`
            : `Sheet ${idx + 1} (Mirrored Backs)`,
        items: buildMirroredDuplexBackSlots(chunk, 2),
      });
    });
    return pages;
  }, [activePrintableList, layoutMode, cardSide, bothSideLayout, lang]);

  useEffect(() => {
    if (previewPageIndex >= printPages.length) {
      setPreviewPageIndex(Math.max(0, printPages.length - 1));
    }
  }, [printPages.length, previewPageIndex]);

  if (!isOpen) return null;

  const toggleSinglePerson = (id: string) => {
    if (personType === 'student') {
      setStudentSelectionTouched(true);
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setTeacherSelectionTouched(true);
      setSelectedTeacherIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const handleSelectAllFiltered = () => {
    if (personType === 'student') {
      setStudentSelectionTouched(true);
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.id));
        return next;
      });
    } else {
      setTeacherSelectionTouched(true);
      setSelectedTeacherIds((prev) => {
        const next = new Set(prev);
        filteredTeachers.forEach((t) => next.add(t.id));
        return next;
      });
    }
  };

  const handleSelectWholeSchool = () => {
    setSearchQuery('');
    if (personType === 'student') {
      setSelectedGrade('all');
      setSelectedRoom('all');
      setStudentSelectionTouched(false);
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    } else {
      setSelectedDept('all');
      setTeacherSelectionTouched(false);
      setSelectedTeacherIds(new Set(teachers.map((t) => t.id)));
    }
    setPreviewPageIndex(0);
  };

  const handleDeselectAllFiltered = () => {
    if (personType === 'student') {
      setStudentSelectionTouched(true);
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setTeacherSelectionTouched(true);
      setSelectedTeacherIds((prev) => {
        const next = new Set(prev);
        filteredTeachers.forEach((t) => next.delete(t.id));
        return next;
      });
    }
  };

  const handlePrint = () => {
    if (activePrintCount === 0) return;
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-6xl rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-[var(--color-text-body)]">
        {/* Top Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[var(--color-card-subtle)] no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-sm shrink-0 ${
                personType === 'staff' ? 'bg-emerald-700' : 'bg-[var(--color-primary)]'
              }`}
            >
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-[var(--color-text-title)] truncate">
                {personType === 'staff'
                  ? (lang === 'th' ? 'ระบบพิมพ์บัตรครูและบุคลากร CR80 (A4)' : 'Staff ID Card Print Sheet')
                  : (lang === 'th' ? 'ระบบพิมพ์บัตรนักเรียนมาตรฐาน CR80 (A4)' : 'Student ID Card Print Sheet')}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] truncate tabular-nums">
                {lang === 'th'
                  ? `เลือกพิมพ์แล้ว ${activePrintCount} คน (${printPages.length} แผ่น A4) · มาตรฐาน 85.60 × 53.98 มม.`
                  : `${activePrintCount} selected (${printPages.length} A4 pages) · CR80 85.60 × 53.98 mm`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {teachers.length > 0 && (
              <div className="seg-tab-group">
                <button
                  type="button"
                  data-active={personType === 'student'}
                  onClick={() => {
                    setPersonType('student');
                    setSearchQuery('');
                    setPreviewPageIndex(0);
                  }}
                  className="seg-tab-btn"
                >
                  นักเรียน ({students.length})
                </button>
                <button
                  type="button"
                  data-active={personType === 'staff'}
                  onClick={() => {
                    setPersonType('staff');
                    setSearchQuery('');
                    setPreviewPageIndex(0);
                  }}
                  className="seg-tab-btn"
                >
                  ครู/บุคลากร ({teachers.length})
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              disabled={activePrintCount === 0}
              className="btn-action-primary px-4 py-2"
            >
              <Printer className="w-4 h-4" />
              <span>
                {lang === 'th'
                  ? `พิมพ์บัตรที่เลือกทั้งหมด (${activePrintCount} ใบ)`
                  : `Print All Selected (${activePrintCount})`}
              </span>
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

        {/* Customization & Format Toolbar */}
        <div className="px-3.5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-card)] flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs no-print">
          <div className="flex flex-wrap items-center gap-2">
            {/* Format: CR80 vs Stickers */}
            <div className="seg-tab-group">
              <button
                type="button"
                data-active={layoutMode === 'grid_a4'}
                onClick={() => setLayoutMode('grid_a4')}
                className="seg-tab-btn !min-h-[26px] !px-2.5 !py-0.5 !text-[11px]"
              >
                บัตร CR80 (85.6×54 มม.)
              </button>
              <button
                type="button"
                data-active={layoutMode === 'sticker_a4'}
                onClick={() => setLayoutMode('sticker_a4')}
                className="seg-tab-btn !min-h-[26px] !px-2.5 !py-0.5 !text-[11px]"
              >
                สติกเกอร์ QR/บาร์โค้ด
              </button>
            </div>

            {layoutMode === 'grid_a4' && (
              <>
                <div className="seg-tab-group">
                  <button
                    type="button"
                    data-active={cardSide === 'front'}
                    onClick={() => setCardSide('front')}
                    className="seg-tab-btn !min-h-[26px] !px-2.5 !py-0.5 !text-[11px]"
                  >
                    เฉพาะหน้าบัตร
                  </button>
                  <button
                    type="button"
                    data-active={cardSide === 'back'}
                    onClick={() => setCardSide('back')}
                    className="seg-tab-btn !min-h-[26px] !px-2.5 !py-0.5 !text-[11px]"
                  >
                    เฉพาะหลังบัตร
                  </button>
                  <button
                    type="button"
                    data-active={cardSide === 'both'}
                    onClick={() => setCardSide('both')}
                    className="seg-tab-btn !min-h-[26px] !px-2.5 !py-0.5 !text-[11px]"
                  >
                    ทั้งสองหน้า
                  </button>
                </div>

                {cardSide === 'both' && (
                  <div className="seg-tab-group">
                    <button
                      type="button"
                      data-active={bothSideLayout === 'fold_pair'}
                      onClick={() => setBothSideLayout('fold_pair')}
                      className="seg-tab-btn !min-h-[26px] !px-2.5 !py-0.5 !text-[11px]"
                      title="วางหน้าบัตรและหลังบัตรคู่กันในแถวเดียว ตัดแล้วพับครึ่งเคลือบบัตรได้ทันที"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>พับประกบ (4 คู่/แผ่น)</span>
                    </button>
                    <button
                      type="button"
                      data-active={bothSideLayout === 'duplex_sheets'}
                      onClick={() => setBothSideLayout('duplex_sheets')}
                      className="seg-tab-btn !min-h-[26px] !px-2.5 !py-0.5 !text-[11px]"
                      title="แยกแผ่นหน้าและแผ่นหลังแบบกลับด้านซ้าย-ขวาสำหรับเครื่องพิมพ์ 2 หน้า"
                    >
                      <Layers className="w-3 h-3" />
                      <span>แยกแผ่น 2 หน้า (Duplex)</span>
                    </button>
                  </div>
                )}

                {cardSide !== 'front' && (
                  <label className="flex items-center gap-1.5 font-semibold text-[var(--color-text-title)]">
                    <span className="text-[11px]">รูปแบบหลังบัตร:</span>
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
              </>
            )}
          </div>

          {layoutMode === 'grid_a4' && cardSide !== 'back' && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-body)]">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBarcode}
                  onChange={(e) => setIncludeBarcode(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <span>บาร์โค้ด</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeQrCode}
                  onChange={(e) => setIncludeQrCode(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <span>QR Code</span>
              </label>
              {personType === 'student' && (
                <>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBloodType}
                      onChange={(e) => setIncludeBloodType(e.target.checked)}
                      className="rounded border-[var(--color-border)]"
                    />
                    <span>หมู่เลือด</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maskNationalId}
                      onChange={(e) => setMaskNationalId(e.target.checked)}
                      className="rounded border-[var(--color-border)]"
                    />
                    <span>ปิดบังเลข ปชช.</span>
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        {/* Main Body: Left Selection Roster + Right Printable A4 Preview */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[296px_1fr] overflow-hidden">
          {/* Left Selection Sidebar (Hidden on Print) */}
          <div className="border-b lg:border-b-0 lg:border-r border-[var(--color-border)] bg-[var(--color-card)] p-3 flex flex-col min-h-[210px] max-h-[280px] lg:max-h-none lg:min-h-0 overflow-hidden no-print">
            {/* Filters */}
            <div className="space-y-2 shrink-0 pb-2.5 border-b border-[var(--color-border)]">
              {personType === 'student' ? (
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={selectedGrade}
                    onChange={(e) => {
                      setSelectedGrade(e.target.value);
                      setSelectedRoom('all');
                      setPreviewPageIndex(0);
                    }}
                    aria-label="กรองระดับชั้น"
                    className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-medium cursor-pointer"
                  >
                    <option value="all">ทุกระดับชั้น ({students.length})</option>
                    {gradeLevels.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedRoom}
                    onChange={(e) => {
                      setSelectedRoom(e.target.value);
                      setPreviewPageIndex(0);
                    }}
                    aria-label="กรองห้องเรียน"
                    className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-medium cursor-pointer"
                  >
                    <option value="all">ทุกห้อง</option>
                    {rooms.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <select
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setPreviewPageIndex(0);
                    }}
                    aria-label="กรองกลุ่มสาระ"
                    className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-medium cursor-pointer"
                  >
                    <option value="all">ทุกกลุ่มสาระฯ ({teachers.length})</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={personType === 'staff' ? 'ค้นหาชื่อหรือรหัสครู...' : 'ค้นหาชื่อ รหัส หรือห้อง...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPreviewPageIndex(0);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs"
                />
              </div>

              {/* Bulk Select Actions */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 text-[11px]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="inline-flex items-center gap-1 text-[var(--color-primary-text)] font-bold hover:underline cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>เลือกทั้งหมด ({activeFilteredList.length})</span>
                  </button>
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={handleSelectWholeSchool}
                      className="text-emerald-700 dark:text-emerald-300 font-bold hover:underline cursor-pointer"
                    >
                      ทั้งโรงเรียน ({activeTotalCount})
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                >
                  ล้างที่เลือก
                </button>
              </div>
            </div>

            {/* Individual Checkboxes List */}
            <div className="flex-1 min-h-0 overflow-y-auto pt-2 space-y-1 pr-1">
              {activeFilteredList.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'ไม่พบรายชื่อตามตัวกรอง' : 'No matching records'}
                </p>
              ) : personType === 'student' ? (
                filteredStudents.map((stu) => {
                  const isChecked = activeSelectedIds.has(stu.id);
                  return (
                    <button
                      key={`pick-${stu.id}`}
                      type="button"
                      onClick={() => toggleSinglePerson(stu.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition cursor-pointer border ${
                        isChecked
                          ? 'bg-[var(--color-primary-light)]/60 border-[var(--color-primary)]/40 text-[var(--color-text-title)]'
                          : 'hover:bg-[var(--color-card-subtle)] border-transparent text-[var(--color-text-muted)]'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                      )}
                      {stu.avatarUrl ? (
                        <img
                          src={stu.avatarUrl}
                          alt={stu.firstNameTh}
                          className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold truncate leading-tight">
                          {stu.firstNameTh} {stu.lastNameTh}
                        </p>
                        <p className="text-[10px] font-mono opacity-80 truncate tabular-nums">
                          {stu.studentIdNumber} · {stu.room}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                filteredTeachers.map((t) => {
                  const isChecked = activeSelectedIds.has(t.id);
                  return (
                    <button
                      key={`pick-t-${t.id}`}
                      type="button"
                      onClick={() => toggleSinglePerson(t.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition cursor-pointer border ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-[var(--color-text-title)]'
                          : 'hover:bg-[var(--color-card-subtle)] border-transparent text-[var(--color-text-muted)]'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                      )}
                      {t.avatarUrl ? (
                        <img
                          src={t.avatarUrl}
                          alt={t.fullNameTh}
                          className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                          <GraduationCap className="w-3 h-3" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold truncate leading-tight">
                          {t.fullNameTh}
                        </p>
                        <p className="text-[10px] font-mono opacity-80 truncate tabular-nums">
                          {t.teacherIdNumber} · {t.department || t.positionTitle || '-'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: WYSIWYG A4 Print Preview & Actual Print Container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 bg-slate-100 dark:bg-slate-950/80 space-y-3">
            {/* Preview Pagination Bar (Hidden on Print) */}
            {printPages.length > 0 && (
              <div className="no-print max-w-[210mm] mx-auto flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs">
                <div className="flex items-center gap-2 font-semibold text-[var(--color-text-title)] tabular-nums">
                  <span>
                    {showAllPreviewPages
                      ? `แสดงทุกแผ่น (${printPages.length} แผ่น A4)`
                      : `ตัวอย่างแผ่นที่ ${previewPageIndex + 1} / ${printPages.length}`}
                  </span>
                  <span className="text-[var(--color-text-muted)] font-normal">
                    · {printPages[previewPageIndex]?.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {printPages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowAllPreviewPages((v) => !v)}
                        className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] font-semibold hover:bg-[var(--color-card)] cursor-pointer"
                      >
                        {showAllPreviewPages ? 'ดูทีละแผ่น' : `ดูทุกแผ่น (${printPages.length})`}
                      </button>
                      {!showAllPreviewPages && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={previewPageIndex <= 0}
                            onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                            className="p-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer"
                            aria-label="แผ่นก่อนหน้า"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={previewPageIndex >= printPages.length - 1}
                            onClick={() => setPreviewPageIndex((p) => Math.min(printPages.length - 1, p + 1))}
                            className="p-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] disabled:opacity-40 cursor-pointer"
                            aria-label="แผ่นถัดไป"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {activePrintCount === 0 ? (
              <div className="text-center py-16 space-y-2 text-[var(--color-text-muted)]">
                <CreditCard className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-sm font-bold text-[var(--color-text-title)]">
                  ไม่มีรายชื่อที่เลือกสำหรับพิมพ์บัตร
                </p>
                <p className="text-xs">กรุณาติ๊กเลือกรายชื่อทางซ้าย หรือกด &quot;เลือกทั้งหมด&quot;</p>
              </div>
            ) : (
              <div className="id-card-print-area space-y-5 print:space-y-0" data-printable="true">
                {printPages.map((page, pageIdx) => {
                  const isPreviewVisible = showAllPreviewPages || pageIdx === previewPageIndex;
                  return (
                    <div
                      key={page.key}
                      data-preview-visible={isPreviewVisible ? 'true' : 'false'}
                      className="id-card-print-page max-w-[210mm] mx-auto bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6"
                    >
                      {/* A4 Sheet Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-1.5 mb-3 text-[10px] text-slate-700">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 truncate block">
                            {school.nameTh} · {page.label}
                          </span>
                        </div>
                        <span className="font-mono shrink-0 text-slate-500 tabular-nums">
                          แผ่น {pageIdx + 1}/{printPages.length} · ปีการศึกษา {school.academicYear || '2569'}
                        </span>
                      </div>

                      {page.kind === 'stickers' ? (
                        <div className="id-card-sticker-grid grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {page.items.map((person) => {
                            if (personType === 'student') {
                              const student = person as Student;
                              return (
                                <div
                                  key={`sticker-${student.id}`}
                                  className="id-card-sticker-card rounded-xl border border-slate-300 bg-white p-2 flex flex-col items-center justify-between text-center gap-1 text-slate-900"
                                >
                                  <span className="text-[8.5px] font-bold text-slate-700 truncate w-full border-b border-slate-200 pb-0.5">
                                    {school.nameTh}
                                  </span>
                                  <QrCodeMatrix
                                    value={`EDUVERSE:STU:${student.studentIdNumber || student.id}:${school.code}`}
                                    size={64}
                                    className="p-0.5 rounded-md shadow-none"
                                    label={`QR: ${student.studentIdNumber}`}
                                  />
                                  <Barcode128Svg
                                    value={student.studentIdNumber || student.id}
                                    height={16}
                                    showValueText={false}
                                    className="w-full max-w-[120px] px-1 py-0.5"
                                  />
                                  <div className="w-full min-w-0 leading-tight">
                                    <p className="text-[10px] font-bold text-slate-900 truncate">
                                      {student.firstNameTh} {student.lastNameTh}
                                    </p>
                                    <p className="text-[8.5px] font-mono text-slate-600 truncate tabular-nums">
                                      {student.studentIdNumber} · {student.room}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            const teacher = person as Teacher;
                            return (
                              <div
                                key={`sticker-t-${teacher.id}`}
                                className="id-card-sticker-card rounded-xl border border-emerald-500 bg-white p-2 flex flex-col items-center justify-between text-center gap-1 text-slate-900"
                              >
                                <span className="text-[8.5px] font-bold text-emerald-900 truncate w-full border-b border-emerald-200 pb-0.5">
                                  {school.nameTh}
                                </span>
                                <QrCodeMatrix
                                  value={`EDUVERSE:STF:${teacher.teacherIdNumber || teacher.id}:${school.code}`}
                                  size={64}
                                  className="p-0.5 rounded-md shadow-none"
                                  label={`QR: ${teacher.teacherIdNumber}`}
                                />
                                <Barcode128Svg
                                  value={teacher.teacherIdNumber || teacher.id}
                                  height={16}
                                  showValueText={false}
                                  className="w-full max-w-[120px] px-1 py-0.5"
                                />
                                <div className="w-full min-w-0 leading-tight">
                                  <p className="text-[10px] font-bold text-slate-900 truncate">
                                    {teacher.fullNameTh}
                                  </p>
                                  <p className="text-[8.5px] font-mono text-emerald-800 truncate tabular-nums">
                                    {teacher.teacherIdNumber} · ครู/บุคลากร
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : page.kind === 'fold_pairs' ? (
                        <div className="id-card-print-pair-grid flex flex-col gap-4">
                          {page.items.map((person) => {
                            const student = personType === 'student' ? (person as Student) : null;
                            const teacher = personType === 'staff' ? (person as Teacher) : null;
                            return (
                              <div
                                key={`pair-${person.id}`}
                                className="id-card-print-pair-row grid grid-cols-1 md:grid-cols-[1fr_16px_1fr] gap-2 md:gap-0 items-center"
                              >
                                <IdCardFrontContent
                                  personType={personType}
                                  student={student}
                                  teacher={teacher}
                                  school={school}
                                  lang={lang}
                                  variant="print"
                                  includeBarcode={includeBarcode}
                                  includeQrCode={includeQrCode}
                                  includeBloodType={includeBloodType}
                                  maskNationalId={maskNationalId}
                                  issueTermLabel={issueTermLabel}
                                  expiryTermLabel={expiryTermLabel}
                                />
                                <div className="hidden md:flex print:flex h-full min-h-[120px] print:h-[53.98mm] print:min-h-[53.98mm] flex-col items-center justify-center">
                                  <div className="flex-1 border-l border-dashed border-slate-400" />
                                  <Scissors className="w-3 h-3 text-slate-400 my-0.5 rotate-90" />
                                  <div className="flex-1 border-l border-dashed border-slate-400" />
                                </div>
                                <IdCardBackContent
                                  mode={backMode}
                                  personType={personType}
                                  student={student}
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
                              </div>
                            );
                          })}
                        </div>
                      ) : page.kind === 'front_grid' ? (
                        <div className="id-card-print-grid grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {page.items.map((person) => (
                            <IdCardFrontContent
                              key={`front-${person.id}`}
                              personType={personType}
                              student={personType === 'student' ? (person as Student) : null}
                              teacher={personType === 'staff' ? (person as Teacher) : null}
                              school={school}
                              lang={lang}
                              variant="print"
                              includeBarcode={includeBarcode}
                              includeQrCode={includeQrCode}
                              includeBloodType={includeBloodType}
                              maskNationalId={maskNationalId}
                              issueTermLabel={issueTermLabel}
                              expiryTermLabel={expiryTermLabel}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="id-card-print-grid grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {page.items.map((person, slotIdx) => {
                            if (!person) {
                              return (
                                <div
                                  key={`empty-slot-${page.key}-${slotIdx}`}
                                  className="id-card-cr80-card rounded-xl border border-dashed border-slate-200 bg-slate-50/40"
                                  aria-hidden="true"
                                />
                              );
                            }
                            return (
                              <IdCardBackContent
                                key={`back-${person.id}`}
                                mode={backMode}
                                personType={personType}
                                student={personType === 'student' ? (person as Student) : null}
                                teacher={personType === 'staff' ? (person as Teacher) : null}
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
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 no-print">
          <div className="text-[11px] text-[var(--color-text-muted)]">
            มาตรฐาน CR80 (85.60 × 53.98 มม.) · จัดหน้า A4 อัตโนมัติ (ตั้งค่า Margin: Default หรือ Minimum)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={activePrintCount === 0}
              className="btn-action-primary px-4 py-2"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {lang === 'th'
                  ? `พิมพ์บัตรที่เลือกทั้งหมด (${activePrintCount} ใบ)`
                  : `Print All Selected (${activePrintCount})`}
              </span>
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
