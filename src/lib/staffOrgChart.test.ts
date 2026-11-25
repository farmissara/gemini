import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeReportingHierarchy,
  buildRoleDepartmentStructure,
} from './staffOrgChart';
import type { Teacher } from '../types';

const makeTeacher = (overrides: Partial<Teacher> & { id: string; fullNameTh: string }): Teacher => ({
  teacherIdNumber: overrides.id,
  fullNameEn: overrides.id,
  gender: 'other',
  email: `${overrides.id}@school.test`,
  phone: '',
  avatarUrl: '',
  academicDegree: '',
  major: '',
  academicStanding: '',
  department: '',
  teacherLicenseNo: '',
  teachingSubjects: [],
  homeroomClasses: [],
  teachingGrades: [],
  ...overrides,
});

test('analyzeReportingHierarchy does not flag unlinked root teachers as circular cycles', () => {
  const teachers: Teacher[] = [
    makeTeacher({ id: 't1', fullNameTh: 'นายสันติ อินทร์สุภา', positionTitle: 'ผู้อำนวยการ', department: 'วิทยาศาสตร์' }),
    makeTeacher({ id: 't2', fullNameTh: 'นางรสสุคนธ์ คำแก้ว', positionTitle: 'รองผู้อำนวยการ', department: 'วิทยาศาสตร์' }),
    makeTeacher({ id: 't3', fullNameTh: 'นางสาวสิริรัตน์ พ่วงเต็ง', positionTitle: 'ครู', department: 'วิทยาศาสตร์' }),
  ];

  const analysis = analyzeReportingHierarchy(teachers);

  assert.equal(analysis.linkedCount, 0);
  assert.equal(analysis.disconnectedCycleTeachers.length, 0);
  assert.equal(analysis.roots.length, 3);
  assert.equal(analysis.unassignedLeafTeachers.length, 3);
});

test('analyzeReportingHierarchy separates connected roots from unlinked leaves and isolates real cycles', () => {
  const teachers: Teacher[] = [
    makeTeacher({ id: 'dir', fullNameTh: 'ผอ.', positionTitle: 'ผู้อำนวยการ' }),
    makeTeacher({ id: 'dep', fullNameTh: 'รอง ผอ.', positionTitle: 'รองผู้อำนวยการ', reportsToTeacherId: 'dir' }),
    makeTeacher({ id: 't1', fullNameTh: 'ครู ก', positionTitle: 'ครู', reportsToTeacherId: 'dep' }),
    makeTeacher({ id: 'free', fullNameTh: 'ครู ข (ยังไม่ได้เชื่อม)', positionTitle: 'ครู' }),
    makeTeacher({ id: 'cyc1', fullNameTh: 'วนลูป 1', reportsToTeacherId: 'cyc2' }),
    makeTeacher({ id: 'cyc2', fullNameTh: 'วนลูป 2', reportsToTeacherId: 'cyc1' }),
  ];

  const analysis = analyzeReportingHierarchy(teachers);

  assert.equal(analysis.linkedCount, 4);
  assert.deepEqual(analysis.hierarchyRoots.map((t) => t.id), ['dir']);
  assert.deepEqual(analysis.unassignedLeafTeachers.map((t) => t.id), ['free']);
  assert.deepEqual(
    analysis.disconnectedCycleTeachers.map((t) => t.id).sort(),
    ['cyc1', 'cyc2']
  );
});

test('buildRoleDepartmentStructure tiers executives, deputies, and departments cleanly', () => {
  const teachers: Teacher[] = [
    makeTeacher({ id: 't1', fullNameTh: 'ครูไทย', positionTitle: 'ครู', department: 'กลุ่มสาระภาษาไทย' }),
    makeTeacher({ id: 't2', fullNameTh: 'รอง ผอ.', positionTitle: 'รองผู้อำนวยการ', department: 'บริหาร' }),
    makeTeacher({ id: 't3', fullNameTh: 'ผอ.', positionTitle: 'ผู้อำนวยการ', department: 'บริหาร' }),
    makeTeacher({ id: 't4', fullNameTh: 'หัวหน้าวิทย์', positionTitle: 'หัวหน้ากลุ่มสาระ', department: 'กลุ่มสาระวิทยาศาสตร์' }),
    makeTeacher({ id: 't5', fullNameTh: 'ครูวิทย์', positionTitle: 'ครู', department: 'กลุ่มสาระวิทยาศาสตร์' }),
  ];

  const structure = buildRoleDepartmentStructure(teachers);

  assert.deepEqual(structure.executives.map((t) => t.id), ['t3']);
  assert.deepEqual(structure.deputies.map((t) => t.id), ['t2']);
  assert.equal(structure.departments.length, 2);
  const sci = structure.departments.find((d) => d.name === 'กลุ่มสาระวิทยาศาสตร์');
  assert.ok(sci);
  assert.deepEqual(sci.members.map((t) => t.id), ['t4', 't5']);
});
