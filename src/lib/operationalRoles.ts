import { UserRole } from '../types';

export type OperationalRole = 'admin' | 'teacher';

export function getAvailableOperationalRoles({
  accountRole,
  isSchoolAdminTeacher,
  hasTeacherProfile,
}: {
  accountRole: UserRole | null | undefined;
  isSchoolAdminTeacher: boolean;
  hasTeacherProfile: boolean;
}): OperationalRole[] {
  const roles: OperationalRole[] = [];

  if (accountRole === 'admin' || (accountRole === 'teacher' && isSchoolAdminTeacher)) {
    roles.push('admin');
  }
  if ((accountRole === 'admin' || accountRole === 'teacher') && hasTeacherProfile) {
    roles.push('teacher');
  }

  return roles;
}
