import React from 'react';
import { ArrowDown, UserRound } from 'lucide-react';
import { Teacher } from '../types';

interface StaffOrganizationViewProps {
  teachers: Teacher[];
  canManage: boolean;
  onEditTeacher?: (teacher: Teacher) => void;
}

export const StaffOrganizationView: React.FC<StaffOrganizationViewProps> = ({
  teachers,
  canManage,
  onEditTeacher,
}) => {
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const childrenByManagerId = new Map<string, Teacher[]>();

  teachers.forEach((teacher) => {
    if (!teacher.reportsToTeacherId || !teacherById.has(teacher.reportsToTeacherId)) return;
    const children = childrenByManagerId.get(teacher.reportsToTeacherId) || [];
    children.push(teacher);
    childrenByManagerId.set(teacher.reportsToTeacherId, children);
  });

  const roots = teachers.filter(
    (teacher) => !teacher.reportsToTeacherId || !teacherById.has(teacher.reportsToTeacherId)
  );
  const renderedIds = new Set<string>();

  const renderBranch = (teacher: Teacher, ancestorIds: Set<string>): React.ReactNode => {
    if (ancestorIds.has(teacher.id)) {
      return (
        <p key={`cycle-${teacher.id}`} className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
          พบการอ้างอิงผู้บังคับบัญชาเป็นวงจร กรุณาแก้ข้อมูลของ {teacher.fullNameTh}
        </p>
      );
    }
    if (renderedIds.has(teacher.id)) return null;

    renderedIds.add(teacher.id);
    const nextAncestors = new Set(ancestorIds).add(teacher.id);
    const reports = childrenByManagerId.get(teacher.id) || [];
    const missingManager = Boolean(
      teacher.reportsToTeacherId && !teacherById.has(teacher.reportsToTeacherId)
    );

    return (
      <div key={teacher.id} className="space-y-2">
        <article className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm">
          {teacher.avatarUrl ? (
            <img
              src={teacher.avatarUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)]">
              <UserRound className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-[var(--color-text-title)]">{teacher.fullNameTh}</h3>
            <p className="truncate text-xs text-[var(--color-text-body)]">
              {teacher.positionTitle || 'ไม่ระบุตำแหน่ง'}
              {teacher.department ? ` · ${teacher.department}` : ''}
            </p>
            {missingManager && (
              <p className="mt-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                ไม่พบหัวหน้างานที่เชื่อมโยงไว้
              </p>
            )}
          </div>
          {canManage && onEditTeacher && (
            <button
              type="button"
              onClick={() => onEditTeacher(teacher)}
              className="shrink-0 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]"
            >
              แก้ไข
            </button>
          )}
        </article>
        {reports.length > 0 && (
          <div className="ml-4 space-y-2 border-l-2 border-[var(--color-border)] py-1 pl-4 sm:ml-6 sm:pl-5">
            {reports.map((report) => (
              <div key={report.id} className="space-y-2">
                <ArrowDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                {renderBranch(report, nextAncestors)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const disconnectedTeachers = teachers.filter((teacher) => !renderedIds.has(teacher.id));
  const linkedCount = teachers.filter(
    (teacher) => teacher.reportsToTeacherId && teacherById.has(teacher.reportsToTeacherId)
  ).length;

  return (
    <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-title)]">โครงสร้างบุคลากรและครู</h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            แสดงตามผู้บังคับบัญชาที่กำหนดในทะเบียนบุคลากร · เชื่อมโยงแล้ว {linkedCount}/{teachers.length} คน
          </p>
        </div>
        {canManage && (
          <p className="text-[11px] text-[var(--color-text-muted)]">
            กด “แก้ไข” ที่บุคลากรเพื่อกำหนดหัวหน้างาน
          </p>
        )}
      </div>

      {teachers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-6 py-10 text-center text-sm text-[var(--color-text-muted)]">
          ยังไม่มีข้อมูลบุคลากรในโรงเรียนนี้
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {roots.map((root) => renderBranch(root, new Set()))}
          </div>
          {disconnectedTeachers.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                รายการที่ต้องตรวจสอบสายบังคับบัญชา ({disconnectedTeachers.length})
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                อาจมีการกำหนดหัวหน้างานเป็นวงจร จึงยังเชื่อมรายการนี้เข้ากับผังหลักไม่ได้
              </p>
              {disconnectedTeachers.map((teacher) => renderBranch(teacher, new Set()))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
