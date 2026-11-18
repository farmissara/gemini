import { Assignment, AuthUser, Course, Student, TimetableSlot } from '../types';
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
    .replace(/^(?:ห้อง|room)\s*/i, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function classRoomMatchesStudent(slotClassRoom: string, roomLabels: Set<string>): boolean {
  const normalizedSlotRoom = normalizeClassRoomLabel(slotClassRoom);
  if (!normalizedSlotRoom) return false;

  return Array.from(roomLabels).some((label) => {
    const normalizedLabel = normalizeClassRoomLabel(label);
    return normalizedLabel && (
      normalizedSlotRoom === normalizedLabel ||
      normalizedSlotRoom.startsWith(`${normalizedLabel} `) ||
      normalizedSlotRoom.startsWith(`${normalizedLabel}(`) ||
      normalizedSlotRoom.startsWith(`${normalizedLabel}/`) ||
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
  resolveLinkedStudentsForUser(currentUser, students).forEach((student) => {
    const rooms = [student.room, ...(student.enrolledRooms || [])].filter(Boolean);
    rooms.forEach((room) => {
      roomLabels.add(room);
      if (student.gradeLevel) {
        roomLabels.add(`${student.gradeLevel} ${room}`);
        roomLabels.add(`${student.gradeLevel}/${room}`);
      }
    });
  });
  if (currentUser?.role === 'student' && currentUser.room) {
    roomLabels.add(currentUser.room);
    if (currentUser.gradeLevel) {
      roomLabels.add(`${currentUser.gradeLevel} ${currentUser.room}`);
      roomLabels.add(`${currentUser.gradeLevel}/${currentUser.room}`);
    }
  }

  const studentIds = getPersonalStudentIds(currentUser, students);
  const enrolledCourses = courses.filter((course) =>
    course.enrolledStudentIds?.some((id) => studentIds.has(id))
  );
  const enrolledCourseIds = new Set(enrolledCourses.map((course) => course.id));
  const enrolledCourseCodes = new Set(enrolledCourses.map((course) => course.code));

  return slots.filter((slot) => {
    const enrolledCourse = slot.courseId
      ? enrolledCourseIds.has(slot.courseId)
      : enrolledCourseCodes.has(slot.courseCode);
    if (slot.classRoom?.trim()) {
      return classRoomMatchesStudent(slot.classRoom, roomLabels) || (roomLabels.size === 0 && enrolledCourse);
    }
    return enrolledCourse;
  });
}
