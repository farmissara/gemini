export function belongsToSchool(
  record: { schoolId?: string | null },
  schoolId: string,
  includeUnassigned = false
): boolean {
  return Boolean(schoolId && record.schoolId === schoolId) || (includeUnassigned && !record.schoolId);
}
