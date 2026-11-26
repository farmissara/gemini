import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatBackupSchemaError,
  getBackupDrillTargetError,
  getSupabaseProjectRef,
} from './backupRoutes.ts';

test('only allows restore drills on a different explicitly marked staging project', () => {
  assert.equal(getBackupDrillTargetError('production', 'source-ref', 'target-ref')?.includes('staging'), true);
  assert.equal(getBackupDrillTargetError('staging', null, 'target-ref')?.includes('รหัสโปรเจกต์ต้นทาง'), true);
  assert.equal(getBackupDrillTargetError('staging', 'same-ref', 'SAME-REF')?.includes('โปรเจกต์เดียวกัน'), true);
  assert.equal(getBackupDrillTargetError('staging', 'source-ref', 'target-ref'), null);
});

test('extracts the Supabase project reference from its URL', () => {
  assert.equal(getSupabaseProjectRef('https://school-project.supabase.co'), 'school-project');
});

test('formats missing campus backup tables with the migration needed to restore schema readiness', () => {
  const message = formatBackupSchemaError('school_campus_records', {
    code: 'PGRST205',
    message: "Could not find the table 'public.school_campus_records' in the schema cache",
  });

  assert.ok(message.includes('school_campus_records'));
  assert.ok(message.includes('20261129000001_campus_moe_persistence.sql'));
  assert.ok(message.includes('SQL Editor'));
  assert.ok(message.includes('คัดลอก SQL ทั้งหมด'));
});

test('formats other missing backup tables as a migration prerequisite', () => {
  const message = formatBackupSchemaError('school_questions', {
    code: 'PGRST205',
    message: "Could not find the table 'public.school_questions' in the schema cache",
  });

  assert.ok(message.includes('school_questions'));
  assert.ok(message.includes('ไฟล์ migration'));
  assert.ok(message.includes('SQL Editor'));
});

test('preserves the original error for failures that are not missing-table errors', () => {
  assert.equal(
    formatBackupSchemaError('school_campus_records', {
      code: '42501',
      message: 'permission denied',
    }),
    'school_campus_records: permission denied'
  );
});
