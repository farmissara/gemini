export async function loadSupabaseSchemaSql(): Promise<string> {
  const mod = await import('../../supabase/schema.sql?raw');
  return mod.default;
}

export async function loadSupabasePatchMigrationSql(): Promise<string> {
  const [
    patchMigrationSql,
    courseClassificationMigrationSql,
    homeworkWorkflowMigrationSql,
    studentRecordsMigrationSql,
    schoolLmsLessonsMigrationSql,
    schoolLmsTeacherCourseRlsMigrationSql,
    teacherWorkspaceScopeMigrationSql,
    rbacPermissionHardeningMigrationSql,
    schoolWideTimetableActivityReadMigrationSql,
    dualRoleTeacherSchoolAdminMigrationSql,
  ] = await Promise.all([
    import('../../supabase/migrations/20261111000002_patch_all_latest_migrations.sql?raw'),
    import('../../supabase/migrations/20261125_course_classification.sql?raw'),
    import('../../supabase/migrations/20261120000004_teacher_homework_workflow.sql?raw'),
    import('../../supabase/migrations/20261120000002_school_student_records.sql?raw'),
    import('../../supabase/migrations/20261120_school_lms_lessons.sql?raw'),
    import('../../supabase/migrations/20261120000001_school_lms_teacher_course_rls.sql?raw'),
    import('../../supabase/migrations/20261123000006_teacher_workspace_scope_admin_writes.sql?raw'),
    import('../../supabase/migrations/20261123000007_rbac_permission_hardening.sql?raw'),
    import('../../supabase/migrations/20261124000001_school_wide_timetable_activity_read.sql?raw'),
    import('../../supabase/migrations/20261124000002_dual_role_teacher_school_admin.sql?raw'),
  ]);

  return [
    patchMigrationSql.default,
    courseClassificationMigrationSql.default,
    homeworkWorkflowMigrationSql.default,
    studentRecordsMigrationSql.default,
    schoolLmsLessonsMigrationSql.default,
    schoolLmsTeacherCourseRlsMigrationSql.default,
    teacherWorkspaceScopeMigrationSql.default,
    rbacPermissionHardeningMigrationSql.default,
    schoolWideTimetableActivityReadMigrationSql.default,
    dualRoleTeacherSchoolAdminMigrationSql.default,
  ].join('\n\n');
}

export async function loadStaffInviteRpcSql(): Promise<string> {
  const mod = await import('../../supabase/migrations/20261124_staff_invite_link_rpc.sql?raw');
  return mod.default;
}
