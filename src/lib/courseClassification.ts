import type { Course, CourseType, LearningStrandId } from '../types';

export const COURSE_TYPE_OPTIONS: Array<{ id: CourseType; labelTh: string; labelEn: string }> = [
  { id: 'core', labelTh: 'รายวิชาพื้นฐาน', labelEn: 'Core' },
  { id: 'elective', labelTh: 'รายวิชาเพิ่มเติม', labelEn: 'Elective' },
  { id: 'activities', labelTh: 'กิจกรรมพัฒนาผู้เรียน', labelEn: 'Student Development' },
];

export const COURSE_LEARNING_AREA_OPTIONS: Array<{
  id: LearningStrandId;
  labelTh: string;
  labelEn: string;
}> = [
  { id: 'thai', labelTh: 'ภาษาไทย', labelEn: 'Thai Language' },
  { id: 'math', labelTh: 'คณิตศาสตร์', labelEn: 'Mathematics' },
  { id: 'science_tech', labelTh: 'วิทยาศาสตร์และเทคโนโลยี', labelEn: 'Science and Technology' },
  { id: 'social', labelTh: 'สังคมศึกษา ศาสนา และวัฒนธรรม', labelEn: 'Social Studies, Religion and Culture' },
  { id: 'health_pe', labelTh: 'สุขศึกษาและพลศึกษา', labelEn: 'Health and Physical Education' },
  { id: 'arts', labelTh: 'ศิลปะ', labelEn: 'Arts' },
  { id: 'career_tech', labelTh: 'การงานอาชีพ', labelEn: 'Career and Technology' },
  { id: 'foreign_lang', labelTh: 'ภาษาต่างประเทศ', labelEn: 'Foreign Languages' },
];

const COURSE_TYPE_IDS = new Set<CourseType>(['core', 'elective', 'activities']);
const LEARNING_AREA_IDS = new Set<LearningStrandId>([
  'thai',
  'math',
  'science_tech',
  'social',
  'health_pe',
  'arts',
  'career_tech',
  'foreign_lang',
]);

export function getCourseType(
  course?: Pick<Course, 'courseType' | 'category'> | null
): CourseType | undefined {
  if (!course) return undefined;
  if (course.courseType && COURSE_TYPE_IDS.has(course.courseType)) return course.courseType;
  return COURSE_TYPE_IDS.has(course.category as CourseType)
    ? (course.category as CourseType)
    : undefined;
}

export function inferCourseLearningArea(
  course?: Pick<Course, 'learningArea' | 'category' | 'department' | 'code' | 'titleTh' | 'titleEn'> | null
): LearningStrandId | undefined {
  if (!course) return undefined;
  if (course.learningArea && LEARNING_AREA_IDS.has(course.learningArea)) return course.learningArea;

  const department = (course.department || '').toLocaleLowerCase();
  const title = `${course.titleTh || ''} ${course.titleEn || ''}`.toLocaleLowerCase();
  const code = (course.code || '').trim().toLocaleUpperCase();
  const category = (course.category || '').trim().toLocaleLowerCase();
  const subjectText = `${department} ${title}`;

  if (department.includes('ภาษาไทย') || title.includes('ภาษาไทย') || code.startsWith('ท') || code.startsWith('TH')) {
    return 'thai';
  }
  if (department.includes('คณิต') || title.includes('คณิต') || code.startsWith('ค') || code.startsWith('MA')) {
    return 'math';
  }
  if (
    department.includes('วิทยาศาสตร์') ||
    department.includes('เทคโนโลยี') ||
    title.includes('วิทยาศาสตร์') ||
    title.includes('คอมพิวเตอร์') ||
    code.startsWith('ว') ||
    code.startsWith('SC') ||
    code.startsWith('CS')
  ) {
    return 'science_tech';
  }
  if (department.includes('สังคม') || title.includes('สังคม') || code.startsWith('ส') || code.startsWith('SO')) {
    return 'social';
  }
  if (
    department.includes('สุขศึกษา') ||
    department.includes('พลศึกษา') ||
    title.includes('สุขศึกษา') ||
    title.includes('พลศึกษา') ||
    code.startsWith('พ') ||
    code.startsWith('PE')
  ) {
    return 'health_pe';
  }
  if (department.includes('ศิลปะ') || title.includes('ศิลปะ') || title.includes('ดนตรี') || code.startsWith('ศ')) {
    return 'arts';
  }
  if (department.includes('การงาน') || department.includes('อาชีพ') || title.includes('อาชีพ') || code.startsWith('ง')) {
    return 'career_tech';
  }
  if (
    department.includes('ภาษาต่างประเทศ') ||
    title.includes('ภาษาอังกฤษ') ||
    title.includes('ภาษาจีน') ||
    title.includes('ภาษาญี่ปุ่น') ||
    code.startsWith('ต') ||
    code.startsWith('EN')
  ) {
    return 'foreign_lang';
  }

  if (category === 'stem') return 'science_tech';
  if (category === 'language') return 'foreign_lang';
  if (category === 'arts') return 'arts';
  if (category === 'social') return 'social';
  if (category === 'pe') return 'health_pe';
  if (category === 'career') return 'career_tech';

  if (subjectText.includes('science') || subjectText.includes('technology')) return 'science_tech';
  if (subjectText.includes('math')) return 'math';
  if (subjectText.includes('english') || subjectText.includes('language')) return 'foreign_lang';
  if (subjectText.includes('social')) return 'social';
  if (subjectText.includes('health') || subjectText.includes('sport')) return 'health_pe';
  if (subjectText.includes('art') || subjectText.includes('music')) return 'arts';
  if (subjectText.includes('career')) return 'career_tech';
  return undefined;
}
