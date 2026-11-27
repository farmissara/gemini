export {
  getSupabaseCredentials,
  getSupabaseClient,
  saveCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
  testSupabaseConnection,
} from './client';
export {
  loadSupabaseSchemaSql,
  loadSupabasePatchMigrationSql,
  loadStaffInviteRpcSql,
} from '../../lib/sqlMigrations';
export {
  type SchoolData,
  loadAttendanceRangeFromSupabase,
  loadSchoolData,
  fetchSchoolCounts,
} from './schoolDataLoader';
export { syncDataToSupabase } from './syncRepo';
export {
  saveStudentSelfAttendance,
  uploadAttendanceSelfiePhoto,
  saveQueuedAttendanceToDb,
  saveLeaveRequestToDb,
  updateLeaveRequestStatusInDb,
  savePeriodAttendanceBatchToDb,
} from './attendanceRepo';
export {
  saveSchoolAssignmentToDb,
  saveHomeworkSubmissionToDb,
  saveHomeworkGradeToDb,
  deleteCoursesFromDb,
  deleteStaleGradesFromDb,
  updateCourseEnrollmentInDb,
  deleteGradesForEnrollmentFromDb,
  saveTimetableSlotsToDb,
  deleteTimetableSlotFromDb,
} from './academicsRepo';
export {
  saveSchoolPeriodTimes,
  saveSchoolCampusGates,
  saveTeachersToDb,
  saveSchoolGpsCoordinates,
  deleteStudentFromDb,
  deleteTeacherFromDb,
  uploadSchoolLogo,
  uploadSchoolAttachment,
  persistAvatarChangeToSupabase,
} from './peopleAndSchoolRepo';
