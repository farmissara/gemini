import React from 'react';
import { Award, FileSpreadsheet, FileText, Search, X } from 'lucide-react';
import { Course, GradeRecord, School, Student, SystemConfig } from '../../types';
import {
  calculateStudentAcademicSummary,
  getRawScoreFeedback,
  getStudentShortPrefixTh,
} from '../../lib/moeGrading';
import {
  getPp3ApprovalStatusMeta,
  getStudentRegistryRecord,
  loadSchoolRegistryMap,
  loadSchoolRegistrySigners,
} from '../../lib/studentRegistryStore';
import { MoeDocViewSelection } from '../../components/MoeStudentDocumentCenter';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TableActionMenu } from '../../components/common/TableActionMenu';
import { PaginatedTableRows } from '../../components/common/PaginatedTableRows';

export interface OnetStudentRow {
  stu: Student;
  idx: number;
  nationalId: string;
  seatNo: string;
  thScore: number;
  mathScore: number;
  sciScore: number;
  engScore: number;
  avgNumber: number;
}

interface GradebookPp3TabProps {
  school?: School;
  systemConfig: SystemConfig;
  courses: Course[];
  grades: GradeRecord[];
  pp3EligibleStudents: Student[];
  pp3LevelFilter: 'all' | 'p6' | 'm3' | 'm6';
  setPp3LevelFilter: (val: 'all' | 'p6' | 'm3' | 'm6') => void;
  pp3RoomFilter: string;
  setPp3RoomFilter: (val: string) => void;
  pp3RoomOptions: string[];
  studentSearchTerm: string;
  setStudentSearchTerm: (val: string) => void;
  openStudentInRegistry: (studentId: string, docView?: MoeDocViewSelection) => void;
}

export const GradebookPp3Tab: React.FC<GradebookPp3TabProps> = ({
  school,
  systemConfig,
  courses,
  grades,
  pp3EligibleStudents,
  pp3LevelFilter,
  setPp3LevelFilter,
  pp3RoomFilter,
  setPp3RoomFilter,
  pp3RoomOptions,
  studentSearchTerm,
  setStudentSearchTerm,
  openStudentInRegistry,
}) => {
  const schoolId = school?.id || 'default';
  const regMap = loadSchoolRegistryMap(schoolId);
  const signers = loadSchoolRegistrySigners(schoolId);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-3 sm:p-4 shadow-xs overflow-y-auto space-y-3 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:overflow-visible">
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-2">
        <div className="flex items-center justify-center gap-3">
          {school?.logoUrl && <img src={school.logoUrl} alt="ตราโรงเรียน" className="w-14 h-14 object-contain" />}
          <div>
            <p className="text-xs font-bold">ทะเบียนเตรียมข้อมูลสำหรับจัดทำแบบรายงานผู้สำเร็จการศึกษา (ปพ.๓)</p>
            <h2 className="text-lg font-extrabold">โรงเรียน{school?.nameTh || systemConfig.schoolNameTh}</h2>
          </div>
        </div>
        <p className="text-xs">
          ปีการศึกษา {systemConfig.academicYear} • ระดับชั้น:{' '}
          {pp3LevelFilter === 'all' ? 'ทั้งหมด' : pp3LevelFilter.toUpperCase()}
        </p>
        <p className="text-[10px]">เอกสารเตรียมตรวจ ไม่ใช่แบบ ปพ.๓ ทางราชการที่รับรองแล้ว</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5 print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 shrink-0">
            ปพ.3 เตรียมข้อมูล
          </span>
          <h2 className="text-sm font-bold text-[var(--color-text-title)] truncate">
            แบบรายงานผู้สำเร็จการศึกษา ({pp3EligibleStudents.length} คน)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-end">
          <div className="relative w-full sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ รหัส ปชช. ห้อง..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-1.5 pl-8 pr-6 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
            />
            {studentSearchTerm && (
              <button
                type="button"
                onClick={() => setStudentSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={pp3RoomFilter}
            onChange={(e) => setPp3RoomFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1.5 text-xs text-[var(--color-text-title)]"
          >
            <option value="all">ทุกห้อง</option>
            {pp3RoomOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-[var(--color-card-subtle)] p-0.5 rounded-lg border border-[var(--color-border)] shrink-0">
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'p6', label: 'ป.6' },
                { id: 'm3', label: 'ม.3' },
                { id: 'm6', label: 'ม.6' },
              ] as const
            ).map((lv) => (
              <button
                key={lv.id}
                type="button"
                onClick={() => {
                  setPp3LevelFilter(lv.id);
                  setPp3RoomFilter('all');
                }}
                className={`px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  pp3LevelFilter === lv.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                }`}
              >
                {lv.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
        <table className="table-comfortable w-full text-xs text-left">
          <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
            <tr>
              <th className="py-2 px-3 w-12 text-center sticky left-0 z-10 bg-[var(--color-card-subtle)] print:static">
                ลำดับ
              </th>
              <th className="py-2 px-3 whitespace-nowrap sticky left-12 z-10 bg-[var(--color-card-subtle)] print:static">
                เลขประจำตัวนักเรียน
              </th>
              <th className="py-2 px-3 whitespace-nowrap">เลขประจำตัวประชาชน (13 หลัก DMC)</th>
              <th className="py-2 px-3 whitespace-nowrap">ชื่อ-นามสกุล</th>
              <th className="py-2 px-3 whitespace-nowrap">ระดับชั้น</th>
              <th className="py-2 px-3 text-center whitespace-nowrap">GPAX / ร้อยละสะสม</th>
              <th className="py-2 px-3 whitespace-nowrap">เลขที่ชุด / เล่มที่ ปพ.3</th>
              <th className="py-2 px-3 text-center whitespace-nowrap">สถานะอนุมัติ</th>
              <th className="py-2 px-3 text-right w-16 print:hidden">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            <PaginatedTableRows
              items={pp3EligibleStudents}
              colSpan={9}
              pageSize={15}
              keepAllInDomForPrint
              emptyState={
                <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                  ไม่พบรายชื่อนักเรียนที่ตรงกับเงื่อนไขการจบการศึกษา
                </p>
              }
              renderRow={(stu, idx, hiddenClass) => {
                const summary = calculateStudentAcademicSummary({
                  student: stu,
                  courses,
                  grades,
                  gradingSystem: systemConfig.gradingSystem,
                });
                const reg = getStudentRegistryRecord(regMap, stu, signers);
                const pp3Meta = getPp3ApprovalStatusMeta(reg.pp3ApprovalStatus);
                const hasRealGpa = summary.hasRecordedGrades && summary.gpax !== null;
                const effectiveGpax = hasRealGpa && summary.gpax !== null ? summary.gpax : 0;
                const primaryFeedback = getRawScoreFeedback(summary.averageRawScore);

                return (
                  <tr
                    key={stu.id}
                    className={`${hiddenClass} group hover:bg-[var(--color-card-subtle)] transition`}
                  >
                    <td className="py-2 px-3 text-center font-mono text-[var(--color-text-muted)] sticky left-0 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] print:static">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-[var(--color-primary-text)] whitespace-nowrap sticky left-12 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] print:static">
                      {stu.studentIdNumber}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">
                      {stu.nationalId || '—'}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[var(--color-text-title)] whitespace-nowrap">
                      {getStudentShortPrefixTh(stu)} {stu.firstNameTh} {stu.lastNameTh}
                      <div className="text-[10px] text-[var(--color-text-muted)] font-normal">
                        {stu.firstNameEn} {stu.lastNameEn}
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-medium">
                        {stu.gradeLevel} ({stu.room})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {summary.hideGpaCalculations ? (
                        summary.averageRawScore !== null ? (
                          <div>
                            <span>{summary.averageRawScore}%</span>
                            <span className="block text-[10px] text-[var(--color-text-muted)]">
                              {primaryFeedback.labelTh} (รายปี)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">รอประเมิน (รายปี)</span>
                        )
                      ) : hasRealGpa ? (
                        effectiveGpax.toFixed(2)
                      ) : (
                        <span className="text-[var(--color-text-muted)] font-normal">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">
                      {reg.pp3SetNo || reg.pp3BookNo ? (
                        <>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            ชุด {reg.pp3SetNo || '-'} / เล่ม {reg.pp3BookNo || '-'}
                          </span>
                          {reg.graduationDate && (
                            <span className="text-[10px] text-[var(--color-text-muted)] block">
                              อนุมัติ: {reg.graduationDate}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">ยังไม่กำหนด</span>
                          <span className="text-[10px] text-[var(--color-text-muted)] block">
                            แก้ไขได้ที่ศูนย์เอกสาร สพฐ.
                          </span>
                        </>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <StatusBadge
                        size="xs"
                        status={
                          reg.pp3ApprovalStatus === 'approved'
                            ? 'complete'
                            : reg.pp3ApprovalStatus === 'not_eligible'
                              ? 'delayed'
                              : reg.pp3ApprovalStatus === 'verified'
                                ? 'info'
                                : 'pending'
                        }
                        label={
                          reg.pp3ApprovalStatus === 'approved'
                            ? 'อนุมัติจบ'
                            : reg.pp3ApprovalStatus === 'not_eligible'
                              ? 'ไม่ผ่านเกณฑ์'
                              : reg.pp3ApprovalStatus === 'verified'
                                ? 'รอลงนาม'
                                : 'รอตรวจ'
                        }
                        title={pp3Meta.labelTh}
                      />
                    </td>
                    <td className="py-2 px-3 text-right print:hidden">
                      <TableActionMenu
                        ariaLabel={`จัดการรายงาน ปพ. ของ ${stu.firstNameTh} ${stu.lastNameTh}`}
                        items={[
                          {
                            id: 'moe_hub',
                            label: 'ออกเอกสาร สพฐ. & บันทึกเลข ปพ.3',
                            icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
                            variant: 'primary',
                            onClick: () => openStudentInRegistry(stu.id, 'pp3'),
                          },
                          {
                            id: 'pp1',
                            label: 'ดู & พิมพ์ ปพ.1 (ระเบียนผลการเรียน)',
                            icon: <FileText className="w-3.5 h-3.5" />,
                            onClick: () => openStudentInRegistry(stu.id, 'pp1'),
                          },
                          {
                            id: 'pp6',
                            label: 'ดู & พิมพ์ ปพ.6 ประจำตัว',
                            icon: <Award className="w-3.5 h-3.5" />,
                            onClick: () => openStudentInRegistry(stu.id, 'pp6'),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              }}
            />
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 border border-[var(--color-border)] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)] text-xs text-center bg-[var(--color-card-subtle)] print:bg-white print:border-slate-700 print:divide-slate-700">
        <div className="p-3 space-y-6">
          <p className="font-bold text-[var(--color-text-title)] print:text-slate-900">นายทะเบียนโรงเรียน</p>
          <div>
            <div className="border-b border-dotted border-slate-400 w-40 mx-auto mb-1"></div>
            <p className="text-[11px] text-[var(--color-text-muted)] print:text-slate-700">
              วันที่ ....... / ............ / ...........
            </p>
          </div>
        </div>
        <div className="p-3 space-y-6">
          <p className="font-bold text-[var(--color-text-title)] print:text-slate-900">หัวหน้าฝ่ายวิชาการ / วัดผล</p>
          <div>
            <div className="border-b border-dotted border-slate-400 w-40 mx-auto mb-1"></div>
            <p className="text-[11px] text-[var(--color-text-muted)] print:text-slate-700">
              วันที่ ....... / ............ / ...........
            </p>
          </div>
        </div>
        <div className="p-3 space-y-6">
          <p className="font-bold text-[var(--color-text-title)] print:text-slate-900">
            ผู้อำนวยการสถานศึกษา (ผู้อนุมัติจบ)
          </p>
          <div>
            <div className="border-b border-dotted border-slate-400 w-40 mx-auto mb-1"></div>
            <p className="text-[11px] text-[var(--color-text-muted)] print:text-slate-700">
              วันที่อนุมัติ ....... / ............ / ...........
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GradebookOnetTabProps {
  onetRows: OnetStudentRow[];
  onetOverallAverage: string | null;
  onetLevelFilter: 'p6' | 'm3' | 'm6';
  setOnetLevelFilter: (val: 'p6' | 'm3' | 'm6') => void;
  onetRoomFilter: string;
  setOnetRoomFilter: (val: string) => void;
  onetRoomOptions: string[];
  studentSearchTerm: string;
  setStudentSearchTerm: (val: string) => void;
}

export const GradebookOnetTab: React.FC<GradebookOnetTabProps> = ({
  onetRows,
  onetOverallAverage,
  onetLevelFilter,
  setOnetLevelFilter,
  onetRoomFilter,
  setOnetRoomFilter,
  onetRoomOptions,
  studentSearchTerm,
  setStudentSearchTerm,
}) => (
  <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-3 sm:p-4 shadow-xs overflow-y-auto space-y-3 print:overflow-visible">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5 print:hidden">
      <div className="flex items-center gap-2 min-w-0">
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary-light)] text-[var(--color-primary-text)] shrink-0">
          สทศ. O-NET
        </span>
        <h2 className="text-sm font-bold text-[var(--color-text-title)] truncate">
          ข้อมูลสอบระดับชาติ ({onetRows.length} คน · เฉลี่ย {onetOverallAverage ? `${onetOverallAverage}%` : '—'})
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-end">
        <div className="relative w-full sm:w-52">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={studentSearchTerm}
            onChange={(e) => setStudentSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อ รหัส ปชช. ห้อง..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-1.5 pl-8 pr-6 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
          />
          {studentSearchTerm && (
            <button
              type="button"
              onClick={() => setStudentSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <select
          value={onetRoomFilter}
          onChange={(e) => setOnetRoomFilter(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1.5 text-xs text-[var(--color-text-title)]"
        >
          <option value="all">ทุกห้อง</option>
          {onetRoomOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-[var(--color-card-subtle)] p-0.5 rounded-lg border border-[var(--color-border)] shrink-0">
          {(['p6', 'm3', 'm6'] as const).map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => {
                setOnetLevelFilter(lv);
                setOnetRoomFilter('all');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                onetLevelFilter === lv
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
              }`}
            >
              {lv === 'p6' ? 'ป.6' : lv === 'm3' ? 'ม.3' : 'ม.6'}
            </button>
          ))}
        </div>
      </div>
    </div>

    <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
      <table className="table-comfortable w-full text-xs text-left">
        <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
          <tr>
            <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 z-10 bg-[var(--color-card-subtle)] print:static">
              เลขที่นั่งสอบ
            </th>
            <th className="py-2.5 px-3 whitespace-nowrap">เลขประจำตัวประชาชน (13 หลัก)</th>
            <th className="py-2.5 px-3 whitespace-nowrap">ชื่อ-นามสกุล</th>
            <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)] whitespace-nowrap">
              ภาษาไทย (100)
            </th>
            <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)] whitespace-nowrap">
              คณิตศาสตร์ (100)
            </th>
            <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)] whitespace-nowrap">
              วิทยาศาสตร์ (100)
            </th>
            <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)] whitespace-nowrap">
              ภาษาอังกฤษ (100)
            </th>
            <th className="py-2.5 px-3 text-center font-bold whitespace-nowrap">เฉลี่ยรวม</th>
            <th className="py-2.5 px-3 text-center whitespace-nowrap">สถานะ สทศ.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          <PaginatedTableRows
            items={onetRows}
            colSpan={9}
            pageSize={15}
            keepAllInDomForPrint
            emptyState={
              <p className="py-4 text-center text-[var(--color-text-muted)]">
                ไม่พบรายชื่อนักเรียนระดับ {onetLevelFilter.toUpperCase()} ในโรงเรียนนี้
              </p>
            }
            renderRow={({ stu, nationalId, seatNo, thScore, mathScore, sciScore, engScore, avgNumber }, _idx, hiddenClass) => (
              <tr key={stu.id} className={`${hiddenClass} group hover:bg-[var(--color-card-subtle)] transition`}>
                <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-primary-text)] whitespace-nowrap sticky left-0 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] print:static">
                  {seatNo}
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">
                  {nationalId}
                </td>
                <td className="py-2.5 px-3 font-semibold text-[var(--color-text-title)] whitespace-nowrap">
                  {getStudentShortPrefixTh(stu)} {stu.firstNameTh} {stu.lastNameTh}
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    {stu.gradeLevel} ({stu.room})
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-semibold">{thScore}</td>
                <td className="py-2.5 px-3 text-center font-mono font-semibold">{mathScore}</td>
                <td className="py-2.5 px-3 text-center font-mono font-semibold">{sciScore}</td>
                <td className="py-2.5 px-3 text-center font-mono font-semibold">{engScore}</td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--color-primary-text)] bg-[var(--color-primary-light)]">
                  {avgNumber.toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 text-center">
                  <StatusBadge
                    size="xs"
                    status="complete"
                    label="นำส่งแล้ว"
                    title="นำส่งข้อมูลเข้าสอบ สทศ. O-NET แล้ว"
                  />
                </td>
              </tr>
            )}
          />
        </tbody>
      </table>
    </div>
  </div>
);
