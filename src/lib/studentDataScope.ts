import { Announcement, Assignment, AuthUser, Course, Student, TimetableSlot, UserRole } from '../types';
import { resolveLinkedStudentsForUser } from './attendanceScope';

function isPersonalRole(currentUser: AuthUser | null | undefined): boolean {
  return currentUser?.role === 'student' || currentUser?.role === 'parent';
}

function getPersonalStudentIds(
  currentUser: AuthUser | null | undefined,
  students: Student[]
): Set<string> {
  const ids = new Set<string>();
  resolveLinkedStudentsForUser(currentUser, students).forEach((student) => {
    ids.add(student.id);
    if (student.studentIdNumber) ids.add(student.studentIdNumber);
  });
  if (currentUser?.role === 'student') {
    ids.add(currentUser.id);
    if (currentUser.studentRecordId) ids.add(currentUser.studentRecordId);
    if (currentUser.studentIdNumber) ids.add(currentUser.studentIdNumber);
  }
  return ids;
}

function normalizeClassRoomLabel(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .replace(/^(?:ห้องเรียน|ห้อง|room|class)\s*/i, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function addNormalizedRoomLabels(
  target: Set<string>,
  roomValue?: string,
  gradeValue?: string
): void {
  const cleanRoom = (roomValue || '').trim();
  const cleanGrade = (gradeValue || '').trim();
  if (!cleanRoom && !cleanGrade) return;

  const hasGradePrefixInRoom = /^(?:อ\.|ป\.|ม\.|k|p|m|g)\s*\d/i.test(cleanRoom) || cleanRoom.includes('/');

  if (cleanGrade && cleanRoom && !hasGradePrefixInRoom) {
    target.add(`${cleanGrade}/${cleanRoom}`);
    target.add(`${cleanGrade} ${cleanRoom}`);
    target.add(`${cleanGrade} ห้อง ${cleanRoom}`);
    const compactGrade = cleanGrade.replace(/\s+/g, '');
    target.add(`${compactGrade}/${cleanRoom}`);
    const numericGrade = cleanGrade.replace(/[^\d]/g, '');
    if (numericGrade) {
      target.add(`${numericGrade}/${cleanRoom}`);
    }
    return;
  }

  if (cleanRoom) {
    target.add(cleanRoom);
    if (cleanGrade && !cleanRoom.toLocaleLowerCase().includes(cleanGrade.toLocaleLowerCase())) {
      target.add(`${cleanGrade}/${cleanRoom}`);
      target.add(`${cleanGrade} ${cleanRoom}`);
    }
  }
}

function classRoomMatchesStudent(slotClassRoom: string, roomLabels: Set<string>): boolean {
  const normalizedSlotRoom = normalizeClassRoomLabel(slotClassRoom);
  if (!normalizedSlotRoom) return false;

  return Array.from(roomLabels).some((label) => {
    const normalizedLabel = normalizeClassRoomLabel(label);
    if (!normalizedLabel) return false;
    if (normalizedSlotRoom === normalizedLabel) return true;
    // Strict boundary: label followed by space, "(", or "-" (so "ป.4/1" never matches "ป.4/10" or "ป.4/2")
    return (
      normalizedSlotRoom.startsWith(`${normalizedLabel} `) ||
      normalizedSlotRoom.startsWith(`${normalizedLabel}(`) ||
      normalizedSlotRoom.startsWith(`${normalizedLabel}-`)
    );
  });
}

export function filterCoursesForPersonalRole(
  courses: Course[],
  currentUser: AuthUser | null | undefined,
  students: Student[]
): Course[] {
  if (!isPersonalRole(currentUser)) return courses;
  const studentIds = getPersonalStudentIds(currentUser, students);
  return courses.filter((course) => course.enrolledStudentIds?.some((id) => studentIds.has(id)));
}

export function filterAssignmentsForPersonalRole(
  assignments: Assignment[],
  courses: Course[],
  currentUser: AuthUser | null | undefined
): Assignment[] {
  if (!isPersonalRole(currentUser)) return assignments;
  const courseIds = new Set(courses.map((course) => course.id));
  return assignments.filter((assignment) => courseIds.has(assignment.courseId));
}

export function filterTimetableSlotsForPersonalRole(
  slots: TimetableSlot[],
  currentUser: AuthUser | null | undefined,
  students: Student[],
  courses: Course[]
): TimetableSlot[] {
  if (!isPersonalRole(currentUser)) return slots;

  const roomLabels = new Set<string>();
  const linkedStudents = resolveLinkedStudentsForUser(currentUser, students);
  linkedStudents.forEach((student) => {
    const rooms = [student.room, ...(student.enrolledRooms || [])].filter(Boolean);
    rooms.forEach((room) => addNormalizedRoomLabels(roomLabels, room, student.gradeLevel));
  });
  if (currentUser?.role === 'student' && (currentUser.room || currentUser.gradeLevel)) {
    addNormalizedRoomLabels(roomLabels, currentUser.room, currentUser.gradeLevel);
  }

  const studentIds = getPersonalStudentIds(currentUser, students);
  const enrolledCourses = courses.filter((course) =>
    course.enrolledStudentIds?.some((id) => studentIds.has(id))
  );
  const enrolledCourseIds = new Set(enrolledCourses.map((course) => course.id));
  const enrolledCourseCodes = new Set(enrolledCourses.map((course) => course.code));
  const schoolHasEnrollmentData = courses.some((c) => (c.enrolledStudentIds?.length || 0) > 0);

  return slots.filter((slot) => {
    const enrolledCourse = slot.courseId
      ? enrolledCourseIds.has(slot.courseId)
      : enrolledCourseCodes.has(slot.courseCode);

    if (slot.classRoom?.trim()) {
      const roomMatches = classRoomMatchesStudent(slot.classRoom, roomLabels);
      if (roomMatches) return true;
      // Only fall back to enrolledCourse if the slot is not bound to a different explicit room
      // or if student's room labels are missing and student is explicitly enrolled
      return roomLabels.size === 0 && enrolledCourse;
    }
    return schoolHasEnrollmentData ? enrolledCourse : roomLabels.size === 0 || enrolledCourse;
  });
}

export function isAnnouncementVisibleForRole(
  announcement: Pick<Announcement, 'targetAudience'>,
  role?: UserRole | null
): boolean {
  if (!role || role === 'admin' || role === 'super_admin') return true;
  if (announcement.targetAudience === 'all') return true;
  if (role === 'teacher') return announcement.targetAudience === 'teachers';
  if (role === 'student') return announcement.targetAudience === 'students';
  if (role === 'parent') return announcement.targetAudience === 'parents';
  return false;
}

export function filterAnnouncementsForRole(
  announcements: Announcement[],
  currentUser: AuthUser | null | undefined
): Announcement[] {
  if (!currentUser) return [];
  return announcements.filter((item) => isAnnouncementVisibleForRole(item, currentUser.role));
}
