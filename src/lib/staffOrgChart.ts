import type { Teacher } from '../types';

export interface ReportingHierarchyAnalysis {
  teacherById: Map<string, Teacher>;
  childrenByManagerId: Map<string, Teacher[]>;
  roots: Teacher[];
  hierarchyRoots: Teacher[];
  unassignedLeafTeachers: Teacher[];
  missingManagerTeacherIds: Set<string>;
  disconnectedCycleTeachers: Teacher[];
  linkedCount: number;
}

export interface RoleDepartmentStructure {
  executives: Teacher[];
  deputies: Teacher[];
  departments: Array<{
    name: string;
    members: Teacher[];
  }>;
}

export function getExecutiveRank(teacher: Teacher): number {
  const pos = (teacher.positionTitle || '').trim();
  if (!pos) return 40;
  if (/รองผู้อำนวยการ|รอง\s*ผอ\.|ผู้ช่วยผู้อำนวยการ/.test(pos)) return 20;
  if (/ผู้อำนวยการ|ผอ\.|ผู้จัดการโรงเรียน|ครูใหญ่/.test(pos)) return 10;
  if (/หัวหน้า/.test(pos)) return 30;
  if (/ครู/.test(pos)) return 40;
  return 50;
}

function compareTeachersForOrg(a: Teacher, b: Teacher): number {
  const rankDiff = getExecutiveRank(a) - getExecutiveRank(b);
  if (rankDiff !== 0) return rankDiff;
  return (a.fullNameTh || a.fullNameEn || '').localeCompare(
    b.fullNameTh || b.fullNameEn || '',
    'th'
  );
}

export function analyzeReportingHierarchy(teachers: Teacher[]): ReportingHierarchyAnalysis {
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const childrenByManagerId = new Map<string, Teacher[]>();
  const missingManagerTeacherIds = new Set<string>();

  teachers.forEach((teacher) => {
    const managerId = teacher.reportsToTeacherId?.trim();
    if (!managerId) return;
    if (!teacherById.has(managerId) || managerId === teacher.id) {
      missingManagerTeacherIds.add(teacher.id);
      return;
    }
    const children = childrenByManagerId.get(managerId) || [];
    children.push(teacher);
    childrenByManagerId.set(managerId, children);
  });

  childrenByManagerId.forEach((children, managerId) => {
    childrenByManagerId.set(managerId, [...children].sort(compareTeachersForOrg));
  });

  const roots = teachers
    .filter((teacher) => {
      const managerId = teacher.reportsToTeacherId?.trim();
      return !managerId || !teacherById.has(managerId) || managerId === teacher.id;
    })
    .sort(compareTeachersForOrg);

  // Traverse from roots BEFORE rendering so cycle detection never relies on JSX render side effects.
  const reachableIds = new Set<string>();
  const queue: Teacher[] = [...roots];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachableIds.has(current.id)) continue;
    reachableIds.add(current.id);
    const children = childrenByManagerId.get(current.id) || [];
    children.forEach((child) => {
      if (!reachableIds.has(child.id)) {
        queue.push(child);
      }
    });
  }

  const disconnectedCycleTeachers = teachers
    .filter((teacher) => !reachableIds.has(teacher.id))
    .sort(compareTeachersForOrg);

  const linkedCount = teachers.filter((teacher) => {
    const managerId = teacher.reportsToTeacherId?.trim();
    return Boolean(managerId && teacherById.has(managerId) && managerId !== teacher.id);
  }).length;

  const rootsWithSubordinates = roots.filter(
    (root) => (childrenByManagerId.get(root.id)?.length || 0) > 0
  );

  const hierarchyRoots =
    rootsWithSubordinates.length > 0 ? rootsWithSubordinates : [];
  const hierarchyRootIdSet = new Set(hierarchyRoots.map((root) => root.id));

  const unassignedLeafTeachers =
    rootsWithSubordinates.length > 0
      ? roots.filter((root) => !hierarchyRootIdSet.has(root.id))
      : roots;

  return {
    teacherById,
    childrenByManagerId,
    roots,
    hierarchyRoots,
    unassignedLeafTeachers,
    missingManagerTeacherIds,
    disconnectedCycleTeachers,
    linkedCount,
  };
}

export function buildRoleDepartmentStructure(teachers: Teacher[]): RoleDepartmentStructure {
  const executives: Teacher[] = [];
  const deputies: Teacher[] = [];
  const departmentMap = new Map<string, Teacher[]>();

  [...teachers].sort(compareTeachersForOrg).forEach((teacher) => {
    const rank = getExecutiveRank(teacher);
    if (rank === 10) {
      executives.push(teacher);
      return;
    }
    if (rank === 20) {
      deputies.push(teacher);
      return;
    }
    const deptName = teacher.department?.trim() || 'ทั่วไป / ไม่ระบุกลุ่มสาระ';
    const existing = departmentMap.get(deptName) || [];
    existing.push(teacher);
    departmentMap.set(deptName, existing);
  });

  const departments = Array.from(departmentMap.entries())
    .sort(([aName], [bName]) => {
      if (aName === 'ทั่วไป / ไม่ระบุกลุ่มสาระ') return 1;
      if (bName === 'ทั่วไป / ไม่ระบุกลุ่มสาระ') return -1;
      return aName.localeCompare(bName, 'th');
    })
    .map(([name, members]) => ({
      name,
      members: members.sort(compareTeachersForOrg),
    }));

  return {
    executives,
    deputies,
    departments,
  };
}
