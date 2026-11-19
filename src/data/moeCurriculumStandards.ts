import type { Course, LearningIndicator, LearningIndicatorSet, LearningStrandId } from '../types';

export interface MoeLearningAreaMeta {
  id: LearningStrandId | 'activities';
  codePrefix: string;
  nameTh: string;
  nameEn: string;
  shortTh: string;
}

export const MOE_LEARNING_AREAS: MoeLearningAreaMeta[] = [
  { id: 'thai', codePrefix: 'ท', nameTh: 'กลุ่มสาระการเรียนรู้ภาษาไทย', nameEn: 'Thai Language', shortTh: 'ภาษาไทย' },
  { id: 'math', codePrefix: 'ค', nameTh: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', nameEn: 'Mathematics', shortTh: 'คณิตศาสตร์' },
  { id: 'science_tech', codePrefix: 'ว', nameTh: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', nameEn: 'Science and Technology', shortTh: 'วิทยาศาสตร์ฯ' },
  { id: 'social', codePrefix: 'ส', nameTh: 'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม', nameEn: 'Social Studies, Religion and Culture', shortTh: 'สังคมศึกษาฯ' },
  { id: 'health_pe', codePrefix: 'พ', nameTh: 'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา', nameEn: 'Health and Physical Education', shortTh: 'สุขศึกษาฯ' },
  { id: 'arts', codePrefix: 'ศ', nameTh: 'กลุ่มสาระการเรียนรู้ศิลปะ', nameEn: 'Arts', shortTh: 'ศิลปะ' },
  { id: 'career_tech', codePrefix: 'ง', nameTh: 'กลุ่มสาระการเรียนรู้การงานอาชีพ', nameEn: 'Occupations', shortTh: 'การงานอาชีพ' },
  { id: 'foreign_lang', codePrefix: 'ต', nameTh: 'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ', nameEn: 'Foreign Languages', shortTh: 'ภาษาต่างประเทศ' },
  { id: 'activities', codePrefix: 'ก', nameTh: 'กิจกรรมพัฒนาผู้เรียน', nameEn: 'Learner Development Activities', shortTh: 'กิจกรรมฯ' },
];

export function resolveMoeLearningArea(course?: Pick<Course, 'code' | 'titleTh' | 'titleEn' | 'department' | 'category'> | null): MoeLearningAreaMeta {
  if (!course) return MOE_LEARNING_AREAS[2];
  if (course.category === 'activities') return MOE_LEARNING_AREAS[8];

  const text = `${course.department || ''} ${course.titleTh || ''} ${course.titleEn || ''}`.toLowerCase();
  const code = (course.code || '').trim().toUpperCase();

  if (code.startsWith('ท') || code.startsWith('TH') || text.includes('ภาษาไทย') || text.includes('thai')) {
    return MOE_LEARNING_AREAS[0];
  }
  if (code.startsWith('ค') || code.startsWith('MA') || text.includes('คณิต') || text.includes('math')) {
    return MOE_LEARNING_AREAS[1];
  }
  if (
    code.startsWith('ว') ||
    code.startsWith('SC') ||
    code.startsWith('CS') ||
    text.includes('วิทยา') ||
    text.includes('คอมพิวเตอร์') ||
    text.includes('science') ||
    text.includes('technology') ||
    text.includes('stem')
  ) {
    return MOE_LEARNING_AREAS[2];
  }
  if (
    code.startsWith('ส') ||
    code.startsWith('SO') ||
    text.includes('สังคม') ||
    text.includes('ประวัติ') ||
    text.includes('หน้าที่พลเมือง') ||
    text.includes('social')
  ) {
    return MOE_LEARNING_AREAS[3];
  }
  if (code.startsWith('พ') || code.startsWith('PE') || code.startsWith('HE') || text.includes('สุขศึกษา') || text.includes('พลศึกษา') || text.includes('health')) {
    return MOE_LEARNING_AREAS[4];
  }
  if (code.startsWith('ศ') || code.startsWith('AR') || text.includes('ศิลปะ') || text.includes('ดนตรี') || text.includes('นาฏศิลป์') || text.includes('art')) {
    return MOE_LEARNING_AREAS[5];
  }
  if (code.startsWith('ง') || code.startsWith('OC') || text.includes('การงาน') || text.includes('อาชีพ') || text.includes('career')) {
    return MOE_LEARNING_AREAS[6];
  }
  if (
    code.startsWith('อ') ||
    code.startsWith('ต') ||
    code.startsWith('EN') ||
    text.includes('อังกฤษ') ||
    text.includes('ภาษาต่างประเทศ') ||
    text.includes('english') ||
    text.includes('chinese') ||
    text.includes('japanese')
  ) {
    return MOE_LEARNING_AREAS[7];
  }
  if (text.includes('กิจกรรมพัฒนาผู้เรียน') || text.includes('แนะแนว') || text.includes('ลูกเสือ') || text.includes('ชุมนุม')) {
    return MOE_LEARNING_AREAS[8];
  }

  return MOE_LEARNING_AREAS[2];
}

export type ObcIndicatorNature = 'formative' | 'summative'; // ระหว่างทาง / ปลายทาง

export interface ObcUnitIndicatorSeed {
  code: string;
  title: string;
  maxScore: number;
  nature: ObcIndicatorNature;
}

export interface ObcUnitSeed {
  unitNumber: number;
  unitTitle: string;
  standardCode: string;
  standardTitle: string;
  hours: number;
  indicators: ObcUnitIndicatorSeed[];
}

export const OBEC_UNITS_1_TO_3_BY_AREA: Record<string, ObcUnitSeed[]> = {
  science_tech: [
    {
      unitNumber: 1,
      unitTitle: 'หน่วยที่ 1 ระบบนิเวศและความหลากหลายทางชีวภาพ',
      standardCode: 'ว 1.1',
      standardTitle: 'เข้าใจความหลากหลายของระบบนิเวศ ความสัมพันธ์ระหว่างสิ่งไม่มีชีวิตกับสิ่งมีชีวิต และการถ่ายทอดพลังงาน',
      hours: 18,
      indicators: [
        { code: 'ว 1.1 (1)', title: 'อธิบายปฏิสัมพันธ์ขององค์ประกอบของระบบนิเวศที่ได้จากการสำรวจ', maxScore: 5, nature: 'formative' },
        { code: 'ว 1.1 (2)', title: 'อธิบายรูปแบบความสัมพันธ์ระหว่างสิ่งมีชีวิตกับสิ่งมีชีวิตรูปแบบต่างๆ ในแหล่งที่อยู่เดียวกัน', maxScore: 5, nature: 'formative' },
        { code: 'ว 1.1 (3)', title: 'สร้างแบบจำลองในการอธิบายการถ่ายทอดพลังงานในสายใยอาหารและสมดุลของระบบนิเวศ', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 2,
      unitTitle: 'หน่วยที่ 2 พันธุศาสตร์และการถ่ายทอดลักษณะทางพันธุกรรม',
      standardCode: 'ว 1.3',
      standardTitle: 'เข้าใจกระบวนการและความสำคัญของการแบ่งเซลล์ การถ่ายทอดลักษณะทางพันธุกรรม และการแปรผันทางพันธุกรรม',
      hours: 20,
      indicators: [
        { code: 'ว 1.3 (1)', title: 'อธิบายความสัมพันธ์ระหว่างยีน ดีเอ็นเอ และโครโมโซม โดยใช้แบบจำลอง', maxScore: 5, nature: 'formative' },
        { code: 'ว 1.3 (2)', title: 'อธิบายการถ่ายทอดลักษณะทางพันธุกรรมและคำนวณอัตราส่วนจีโนไทป์-ฟีโนไทป์ของลูก', maxScore: 10, nature: 'summative' },
        { code: 'ว 1.3 (3)', title: 'อธิบายความแตกต่างของการแบ่งเซลล์แบบไมโทซิสและไมโอซิส รวมถึงโรคทางพันธุกรรม', maxScore: 5, nature: 'formative' },
        { code: 'ว 1.3 (4)', title: 'วิเคราะห์ประโยชน์และผลกระทบของสิ่งมีชีวิตดัดแปรพันธุกรรมต่อมนุษย์และสิ่งแวดล้อม', maxScore: 5, nature: 'summative' },
      ],
    },
    {
      unitNumber: 3,
      unitTitle: 'หน่วยที่ 3 คลื่น แสง และเทคโนโลยีอวกาศ',
      standardCode: 'ว 2.3 / ว 3.1',
      standardTitle: 'เข้าใจธรรมชาติของคลื่นกล คลื่นแม่เหล็กไฟฟ้า แสง และปฏิสัมพันธ์ในระบบสุริยะ',
      hours: 22,
      indicators: [
        { code: 'ว 2.3 (1)', title: 'สร้างแบบจำลองการเกิดคลื่น บรรยายส่วนประกอบของคลื่น และสเปกตรัมแม่เหล็กไฟฟ้า', maxScore: 5, nature: 'formative' },
        { code: 'ว 2.3 (2)', title: 'ออกแบบการทดลองกฎการสะท้อน การหักเหของแสง และเขียนแผนภาพการเกิดภาพจากกระจกและเลนส์', maxScore: 10, nature: 'summative' },
        { code: 'ว 3.1 (1)', title: 'อธิบายการโคจรของดาวเคราะห์ด้วยแรงโน้มถ่วง การเกิดฤดูกาล และข้างขึ้นข้างแรม', maxScore: 10, nature: 'summative' },
      ],
    },
  ],
  math: [
    {
      unitNumber: 1,
      unitTitle: 'หน่วยที่ 1 จำนวน พีชคณิต และอสมการเชิงเส้นตัวแปรเดียว',
      standardCode: 'ค 1.3',
      standardTitle: 'ใช้นิพจน์ สมการ อสมการ และฟังก์ชันอธิบายความสัมพันธ์หรือช่วยแก้ปัญหาที่กำหนดให้',
      hours: 18,
      indicators: [
        { code: 'ค 1.3 (1)', title: 'เข้าใจและใช้สมบัติของการไม่เท่ากันในการวิเคราะห์และแก้อสมการเชิงเส้นตัวแปรเดียว', maxScore: 10, nature: 'formative' },
        { code: 'ค 1.3 (2)', title: 'ประยุกต์ใช้อสมการเชิงเส้นตัวแปรเดียวในการแก้ปัญหาสถานการณ์จริงอย่างสมเหตุสมผล', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 2,
      unitTitle: 'หน่วยที่ 2 สมการกำลังสองตัวแปรเดียวและฟังก์ชันกำลังสอง',
      standardCode: 'ค 1.2 / ค 1.3',
      standardTitle: 'เข้าใจและวิเคราะห์แบบรูป ความสัมพันธ์ ฟังก์ชัน และการแยกตัวประกอบของพหุนาม',
      hours: 20,
      indicators: [
        { code: 'ค 1.2 (1)', title: 'แยกตัวประกอบของพหุนามที่มีดีกรีสูงกว่าสองและพหุนามดีกรีสองได้ถูกต้อง', maxScore: 10, nature: 'formative' },
        { code: 'ค 1.3 (3)', title: 'แก้สมการกำลังสองตัวแปรเดียวโดยใช้การแยกตัวประกอบหรือสูตรและนำไปใช้แก้โจทย์ปัญหา', maxScore: 10, nature: 'summative' },
        { code: 'ค 1.2 (2)', title: 'เขียนกราฟและบอกลักษณะสำคัญของฟังก์ชันกำลังสอง (พาราโบลา) ในชีวิตจริง', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 3,
      unitTitle: 'หน่วยที่ 3 เรขาคณิตวิเคราะห์ ความคล้าย และสถิติ',
      standardCode: 'ค 2.2 / ค 3.1',
      standardTitle: 'เข้าใจและวิเคราะห์รูปเรขาคณิต สมบัติความคล้าย และกระบวนการทางสถิติในการวิเคราะห์ข้อมูล',
      hours: 22,
      indicators: [
        { code: 'ค 2.2 (1)', title: 'เข้าใจและใช้สมบัติของรูปสามเหลี่ยมที่คล้ายกันในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง', maxScore: 10, nature: 'summative' },
        { code: 'ค 3.1 (1)', title: 'เข้าใจและใช้ความรู้ทางสถิติในการนำเสนอ วิเคราะห์ และแปลความหมายแผนภาพกล่อง', maxScore: 10, nature: 'summative' },
      ],
    },
  ],
  thai: [
    {
      unitNumber: 1,
      unitTitle: 'หน่วยที่ 1 การอ่านจับใจความสำคัญและวิเคราะห์สื่ออย่างมีวิจารณญาณ',
      standardCode: 'ท 1.1',
      standardTitle: 'ใช้กระบวนการอ่านสร้างความรู้และความคิด เพื่อนำไปใช้ตัดสินใจ แก้ปัญหาในการดำเนินชีวิต',
      hours: 18,
      indicators: [
        { code: 'ท 1.1 (1)', title: 'อ่านออกเสียงบทร้อยแก้วและบทร้อยกรองได้อย่างถูกต้องเหมาะสมกับเรื่องที่อ่าน', maxScore: 5, nature: 'formative' },
        { code: 'ท 1.1 (2)', title: 'ระบุความแตกต่างของคำที่มีความหมายโดยตรงและความหมายโดยนัย และสรุปใจความสำคัญ', maxScore: 10, nature: 'formative' },
        { code: 'ท 1.1 (3)', title: 'วิเคราะห์ วิจารณ์ และประเมินความน่าเชื่อถือของข้อมูลจากสื่อสิ่งพิมพ์และสื่ออิเล็กทรอนิกส์', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 2,
      unitTitle: 'หน่วยที่ 2 การเขียนสื่อสาร เชิงสร้างสรรค์ และเรียงความเชิงวิเคราะห์',
      standardCode: 'ท 2.1',
      standardTitle: 'ใช้กระบวนการเขียนเขียนสื่อสาร เขียนเรียงความ ย่อความ และเขียนเรื่องราวในรูปแบบต่างๆ',
      hours: 20,
      indicators: [
        { code: 'ท 2.1 (1)', title: 'คัดลายมือตัวบรรจงและเขียนสื่อสารโดยใช้ถ้อยคำถูกต้องตามระดับภาษาและอักขรวิธี', maxScore: 5, nature: 'formative' },
        { code: 'ท 2.1 (2)', title: 'เขียนย่อความ เขียนอธิบาย ชี้แจง แสดงความคิดเห็นและโต้แย้งอย่างมีเหตุผล', maxScore: 10, nature: 'summative' },
        { code: 'ท 2.1 (3)', title: 'เขียนรายงานการศึกษาค้นคว้าและอ้างอิงแหล่งข้อมูลได้อย่างถูกต้องตามหลักวิชาการ', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 3,
      unitTitle: 'หน่วยที่ 3 หลักการใช้ภาษาไทยและวรรณคดีมรดกไทย',
      standardCode: 'ท 4.1 / ท 5.1',
      standardTitle: 'เข้าใจธรรมชาติของภาษา หลักภาษาไทย และคุณค่าของวรรณคดีและวรรณกรรม',
      hours: 22,
      indicators: [
        { code: 'ท 4.1 (1)', title: 'วิเคราะห์โครงสร้างประโยคซับซ้อน ระดับภาษา และการใช้คำภาษาต่างประเทศในภาษาไทย', maxScore: 10, nature: 'formative' },
        { code: 'ท 5.1 (1)', title: 'สรุปเนื้อหา วิเคราะห์คุณค่าด้านวรรณศิลป์และข้อคิดจากวรรณคดีที่ศึกษาสู่การประยุกต์ใช้', maxScore: 10, nature: 'summative' },
      ],
    },
  ],
  foreign_lang: [
    {
      unitNumber: 1,
      unitTitle: 'หน่วยที่ 1 Communication & Daily Life Comprehension',
      standardCode: 'ต 1.1 / ต 1.2',
      standardTitle: 'เข้าใจและตีความเรื่องที่ฟังและอ่านจากสื่อประเภทต่างๆ และมีทักษะการสื่อสารภาษาต่างประเทศ',
      hours: 18,
      indicators: [
        { code: 'ต 1.1 (1)', title: 'ปฏิบัติตามคำขอร้อง คำแนะนำ คำชี้แจง และคำอธิบายที่ฟังและอ่านได้ถูกต้อง', maxScore: 5, nature: 'formative' },
        { code: 'ต 1.1 (2)', title: 'อ่านออกเสียงข้อความ ข่าว โฆษณา และจับใจความสำคัญพร้อมระบุรายละเอียดสนับสนุน', maxScore: 10, nature: 'summative' },
        { code: 'ต 1.2 (1)', title: 'สนทนาแลกเปลี่ยนข้อมูลเกี่ยวกับตนเอง กิจวัตร และสถานการณ์รอบตัวอย่างเหมาะสม', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 2,
      unitTitle: 'หน่วยที่ 2 Reading Analysis, Writing & Presentation',
      standardCode: 'ต 1.3',
      standardTitle: 'นำเสนอข้อมูลข่าวสาร ความคิดรวบยอด และความคิดเห็นในเรื่องต่างๆ โดยการพูดและการเขียน',
      hours: 20,
      indicators: [
        { code: 'ต 1.3 (1)', title: 'พูดและเขียนบรรยายเปรียบเทียบเกี่ยวกับประสบการณ์ ข่าว และประเด็นสังคมร่วมสมัย', maxScore: 10, nature: 'formative' },
        { code: 'ต 1.3 (2)', title: 'พูดและเขียนแสดงความคิดเห็นพร้อมให้เหตุผลประกอบอย่างเป็นระบบและสร้างสรรค์', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 3,
      unitTitle: 'หน่วยที่ 3 Cross-Cultural Understanding & Global Media',
      standardCode: 'ต 2.1 / ต 4.1',
      standardTitle: 'เข้าใจความสัมพันธ์ระหว่างภาษากับวัฒนธรรมของเจ้าของภาษา และใช้ภาษาในการสืบค้นความรู้',
      hours: 22,
      indicators: [
        { code: 'ต 2.1 (1)', title: 'เลือกใช้ภาษา น้ำเสียง และกิริยาท่าทางเหมาะสมกับบุคคลและโอกาสตามมารยาทสังคมของเจ้าของภาษา', maxScore: 10, nature: 'formative' },
        { code: 'ต 4.1 (1)', title: 'ใช้ภาษาต่างประเทศในการสืบค้น ค้นคว้า และสรุปความรู้จากแหล่งข้อมูลหลากหลายเพื่อเผยแพร่', maxScore: 10, nature: 'summative' },
      ],
    },
  ],
  social: [
    {
      unitNumber: 1,
      unitTitle: 'หน่วยที่ 1 ศาสนา ศีลธรรม จริยธรรม และหน้าที่พลเมือง',
      standardCode: 'ส 1.1 / ส 2.1',
      standardTitle: 'รู้และเข้าใจประวัติ ความสำคัญ หลักธรรมของศาสนา และปฏิบัติตนตามกฎหมายและวิถีประชาธิปไตย',
      hours: 18,
      indicators: [
        { code: 'ส 1.1 (1)', title: 'วิเคราะห์หลักธรรมสำคัญของศาสนาที่ตนนับถือและนำมาประยุกต์ใช้ในการพัฒนาตนและสังคม', maxScore: 10, nature: 'formative' },
        { code: 'ส 2.1 (1)', title: 'อธิบายสิทธิ หน้าที่ พลเมืองดีตามกฎหมายและมีส่วนร่วมในกิจกรรมสาธารณประโยชน์', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 2,
      unitTitle: 'หน่วยที่ 2 เศรษฐศาสตร์พอเพียงและการบริหารจัดการทรัพยากร',
      standardCode: 'ส 3.1 / ส 3.2',
      standardTitle: 'เข้าใจและสามารถบริหารจัดการทรัพยากรในการผลิตและการบริโภคอย่างมีประสิทธิภาพและยั่งยืน',
      hours: 20,
      indicators: [
        { code: 'ส 3.1 (1)', title: 'วิเคราะห์กลไกราคาในระบบเศรษฐกิจและการประยุกต์ใช้ปรัชญาของเศรษฐกิจพอเพียง', maxScore: 10, nature: 'formative' },
        { code: 'ส 3.2 (1)', title: 'อธิบายบทบาทของรัฐ นโยบายการเงินการคลัง และความร่วมมือทางเศรษฐกิจระหว่างประเทศ', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 3,
      unitTitle: 'หน่วยที่ 3 ประวัติศาสตร์และภูมิศาสตร์ภูมิภาคโลก',
      standardCode: 'ส 4.1 / ส 5.1',
      standardTitle: 'เข้าใจความหมาย ความสำคัญของเวลาและยุคสมัยทางประวัติศาสตร์ และความสัมพันธ์ระหว่างมนุษย์กับสิ่งแวดล้อม',
      hours: 22,
      indicators: [
        { code: 'ส 4.1 (1)', title: 'ใช้วิธีการทางประวัติศาสตร์วิเคราะห์เหตุการณ์สำคัญทางประวัติศาสตร์ไทยและสากลอย่างเป็นกลาง', maxScore: 10, nature: 'summative' },
        { code: 'ส 5.1 (1)', title: 'วิเคราะห์ลักษณะทางกายภาพ แผนที่ ระบบสารสนเทศภูมิศาสตร์ และการอนุรักษ์สิ่งแวดล้อม', maxScore: 10, nature: 'summative' },
      ],
    },
  ],
  health_pe: [
    {
      unitNumber: 1,
      unitTitle: 'หน่วยที่ 1 การเจริญเติบโต พัฒนาการ และสมรรถภาพทางกาย',
      standardCode: 'พ 1.1 / พ 3.1',
      standardTitle: 'เข้าใจธรรมชาติของการเจริญเติบโตและพัฒนาการของมนุษย์ และทักษะการเคลื่อนไหวออกกำลังกาย',
      hours: 14,
      indicators: [
        { code: 'พ 1.1 (1)', title: 'วิเคราะห์ภาวะการเจริญเติบโตทางร่างกายและวางแผนดูแลสุขภาพให้เหมาะสมกับวัย', maxScore: 10, nature: 'formative' },
        { code: 'พ 3.1 (1)', title: 'ทดสอบและพัฒนาสมรรถภาพทางกายและทักษะการเคลื่อนไหวพื้นฐานในการเล่นกีฬา', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 2,
      unitTitle: 'หน่วยที่ 2 ทักษะกีฬา การทำงานเป็นทีม และน้ำใจนักกีฬา',
      standardCode: 'พ 3.2',
      standardTitle: 'รักการออกกำลังกาย การเล่นกีฬา และปฏิบัติเป็นประจำอย่างสม่ำเสมอ มีวินัย เคารพกฎกติกา',
      hours: 14,
      indicators: [
        { code: 'พ 3.2 (1)', title: 'ปฏิบัติตามกฎ กติกา และกลยุทธ์ในการเล่นกีฬาประเภทบุคคลและทีมอย่างมีน้ำใจนักกีฬา', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 3,
      unitTitle: 'หน่วยที่ 3 การสร้างเสริมสุขภาพ การป้องกันโรค และความปลอดภัยในชีวิต',
      standardCode: 'พ 4.1 / พ 5.1',
      standardTitle: 'เห็นคุณค่าและมีทักษะในการสร้างเสริมสุขภาพ การป้องกันโรค และป้องกันลดความเสี่ยงอันตราย',
      hours: 12,
      indicators: [
        { code: 'พ 4.1 (1)', title: 'วางแผนจัดรายการอาหาร โภชนาการ และการป้องกันโรคติดต่อและโรคไม่ติดต่อเรื้อรัง', maxScore: 10, nature: 'formative' },
        { code: 'พ 5.1 (1)', title: 'แสดงวิธีปฐมพยาบาลเบื้องต้น การช่วยฟื้นคืนชีพ (CPR) และหลีกเลี่ยงปัจจัยเสี่ยงและสารเสพติด', maxScore: 10, nature: 'summative' },
      ],
    },
  ],
  arts: [
    {
      unitNumber: 1,
      unitTitle: 'หน่วยที่ 1 ทัศนศิลป์ การออกแบบ และองค์ประกอบศิลป์',
      standardCode: 'ศ 1.1',
      standardTitle: 'สร้างสรรค์งานทัศนศิลป์ตามจินตนาการและความคิดสร้างสรรค์ วิเคราะห์ วิพากษ์ วิจารณ์คุณค่างานทัศนศิลป์',
      hours: 14,
      indicators: [
        { code: 'ศ 1.1 (1)', title: 'บรรยายและใช้ทัศนธาตุ หลักการจัดองค์ประกอบศิลป์ในการออกแบบสร้างสรรค์ผลงาน', maxScore: 10, nature: 'formative' },
        { code: 'ศ 1.1 (2)', title: 'สร้างสรรค์งานทัศนศิลป์สื่อความหมายด้วยเทคนิคที่หลากหลายและวิจารณ์งานศิลปะอย่างสร้างสรรค์', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 2,
      unitTitle: 'หน่วยที่ 2 ดนตรีสากล ดนตรีไทย และการถ่ายทอดสุนทรียภาพ',
      standardCode: 'ศ 2.1 / ศ 2.2',
      standardTitle: 'เข้าใจและแสดงออกทางดนตรีอย่างสร้างสรรค์ วิเคราะห์ วิพากษ์วิจารณ์คุณค่าดนตรี',
      hours: 14,
      indicators: [
        { code: 'ศ 2.1 (1)', title: 'อ่าน เขียน โน้ตดนตรีและขับร้องหรือบรรเลงเครื่องดนตรีได้ถูกต้องตามจังหวะและทำนอง', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 3,
      unitTitle: 'หน่วยที่ 3 นาฏศิลป์ไทยและการอนุรักษ์ศิลปวัฒนธรรม',
      standardCode: 'ศ 3.1 / ศ 3.2',
      standardTitle: 'เข้าใจและแสดงออกทางนาฏศิลป์อย่างสร้างสรรค์ เข้าใจความสัมพันธ์ระหว่างนาฏศิลป์ ประวัติศาสตร์ และวัฒนธรรม',
      hours: 12,
      indicators: [
        { code: 'ศ 3.1 (1)', title: 'แสดงนาฏยศัพท์ ภาษาท่า และประยุกต์การแสดงสื่ออารมณ์ร่วมกับการอนุรักษ์วัฒนธรรมไทย', maxScore: 10, nature: 'summative' },
      ],
    },
  ],
  career_tech: [
    {
      unitNumber: 1,
      unitTitle: 'หน่วยที่ 1 กระบวนการทำงานและการจัดการงานบ้าน/งานเกษตรอย่างเป็นระบบ',
      standardCode: 'ง 1.1',
      standardTitle: 'เข้าใจการทำงาน มีความคิดสร้างสรรค์ มีทักษะกระบวนการทำงาน ทักษะการจัดการ และทักษะการทำงานร่วมกัน',
      hours: 14,
      indicators: [
        { code: 'ง 1.1 (1)', title: 'อภิปรายขั้นตอนการทำงานที่มีประสิทธิภาพ ใช้พลังงานและทรัพยากรอย่างประหยัดและคุ้มค่า', maxScore: 10, nature: 'formative' },
        { code: 'ง 1.1 (2)', title: 'ปฏิบัติงานสร้างสรรค์ชิ้นงานหรืองานบริการตามกระบวนการทำงานอย่างปลอดภัยและมีคุณธรรม', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 2,
      unitTitle: 'หน่วยที่ 2 การออกแบบผลิตภัณฑ์ อาชีพ และผู้ประกอบการยุคใหม่',
      standardCode: 'ง 1.1 / ง 2.1',
      standardTitle: 'เข้าใจความหมาย ความสำคัญของอาชีพ และเลือกแนวทางอาชีพที่เหมาะสมกับตนเอง',
      hours: 14,
      indicators: [
        { code: 'ง 2.1 (1)', title: 'วิเคราะห์แนวทางเข้าสู่อาชีพที่สุจริตและวางแผนพัฒนาทักษะอาชีพหรือโครงงานสร้างรายได้', maxScore: 10, nature: 'summative' },
      ],
    },
    {
      unitNumber: 3,
      unitTitle: 'หน่วยที่ 3 โครงงานอาชีพและการประเมินผลผลิตอย่างยั่งยืน',
      standardCode: 'ง 1.1 / ง 2.1',
      standardTitle: 'ประยุกต์ใช้เทคโนโลยีและทักษะอาชีพในการพัฒนาโครงงานสร้างสรรค์',
      hours: 12,
      indicators: [
        { code: 'ง 2.1 (2)', title: 'จัดทำโครงงานอาชีพ ประเมินคุณภาพชิ้นงาน/บริการ และนำเสนอผลงานได้ชัดเจน', maxScore: 10, nature: 'summative' },
      ],
    },
  ],
};

export function createObcUnitSetsForCourse(params: {
  schoolId: string;
  course: Course;
  academicYear: string;
  semester: string;
}): LearningIndicatorSet[] {
  const now = new Date().toISOString();
  const area = resolveMoeLearningArea(params.course);
  const seeds = OBEC_UNITS_1_TO_3_BY_AREA[area.id] || OBEC_UNITS_1_TO_3_BY_AREA.science_tech;
  const gradeLabel = params.course.room || 'ทุกระดับชั้น';

  return seeds.map((seed) => {
    const safeArea = area.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const setId = `obec-${params.course.id}-u${seed.unitNumber}-${safeArea}-${params.academicYear}-${params.semester}`;
    const indicators: LearningIndicator[] = seed.indicators.map((item, idx) => ({
      id: `${setId}-ind-${idx + 1}`,
      schoolId: params.schoolId,
      courseId: params.course.id,
      setId,
      code: item.code,
      title: item.title,
      description: `${seed.unitTitle} · ${seed.standardCode} (${item.nature === 'formative' ? 'ตัวชี้วัดระหว่างทาง' : 'ตัวชี้วัดปลายทาง'})`,
      maxScore: item.maxScore,
      sortOrder: idx + 1,
      academicYear: params.academicYear,
      semester: params.semester,
    }));

    return {
      id: setId,
      schoolId: params.schoolId,
      courseId: params.course.id,
      title: `หน่วยที่ ${seed.unitNumber}: ${seed.unitTitle.replace(/^หน่วยที่\s*\d+\s*/, '')}`,
      standardCode: seed.standardCode,
      subjectArea: area.nameTh,
      gradeLevel: gradeLabel,
      unitTitle: seed.unitTitle,
      isTemplate: true,
      source: 'moe',
      academicYear: params.academicYear,
      semester: params.semester,
      indicators,
      createdAt: now,
      updatedAt: now,
    };
  });
}

// =========================================================================
// Item 7, 9, 10: เกณฑ์การประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ (ฉบับ สพฐ.)
// =========================================================================
export interface DesirableAttributeRubric {
  index: number;
  titleTh: string;
  subIndicators: string[];
  level3Desc: string; // ดีเยี่ยม (3)
  level2Desc: string; // ดี (2)
  level1Desc: string; // ผ่าน (1)
  level0Desc: string; // ไม่ผ่าน (0)
}

export const MOE_DESIRABLE_ATTRIBUTES_RUBRIC: DesirableAttributeRubric[] = [
  {
    index: 1,
    titleTh: '๑. รักชาติ ศาสน์ กษัตริย์',
    subIndicators: ['ยืนตรงเคารพธงชาติและร้องเพลงชาติได้', 'เข้าร่วมกิจกรรมทางศาสนาและปฏิบัติตนตามหลักธรรม', 'แสดงความจงรักภักดีต่อสถาบันพระมหากษัตริย์'],
    level3Desc: 'ปฏิบัติสม่ำเสมอด้วยความภาคภูมิใจ เป็นแบบอย่างที่ดีแก่ผู้อื่นได้ทุกสถานการณ์',
    level2Desc: 'ปฏิบัติตามกิจกรรมทางชาติ ศาสนา และพระมหากษัตริย์ด้วยความตั้งใจสม่ำเสมอ',
    level1Desc: 'เข้าร่วมกิจกรรมสำคัญของสถานศึกษาและปฏิบัติตามเกณฑ์ขั้นต่ำได้',
    level0Desc: 'ไม่เข้าร่วมหรือไม่ให้ความร่วมมือในการปฏิบัติกิจกรรมขั้นพื้นฐาน',
  },
  {
    index: 2,
    titleTh: '๒. ซื่อสัตย์สุจริต',
    subIndicators: ['ให้ข้อมูลที่ถูกต้องเป็นจริง ไม่คัดลอกผลงาน/ทุจริตในการสอบ', 'ปฏิบัติตนตรงต่อคำพูดและรักษาทรัพย์สินส่วนรวม'],
    level3Desc: 'ประพฤติตรงทั้งกาย วาจา ใจ ไม่ทุจริตตลอดเวลา และตักเตือนแนะนำผู้อื่นได้',
    level2Desc: 'ไม่ทุจริตในการเรียนและการสอบ รักษาสัจจะและของส่วนรวมสม่ำเสมอ',
    level1Desc: 'ปฏิบัติงานด้วยตนเอง ไม่ทุจริตตามข้อตกลงของชั้นเรียน',
    level0Desc: 'มีพฤติกรรมทุจริต ลอกข้อสอบ/ผลงาน หรือไม่ซื่อสัตย์ซ้ำหลายครั้ง',
  },
  {
    index: 3,
    titleTh: '๓. มีวินัย',
    subIndicators: ['ปฏิบัติตามข้อตกลง กฎเกณฑ์ ระเบียบของโรงเรียนและครอบครัว', 'ตรงต่อเวลาในการเข้าเรียนและส่งงาน'],
    level3Desc: 'ปฏิบัติตามระเบียบและตรงต่อเวลาเป็นนิสัย รับผิดชอบตนเองได้โดยไม่ต้องตักเตือน',
    level2Desc: 'ปฏิบัติตามกฎระเบียบของโรงเรียนและส่งงานตรงเวลาเป็นส่วนใหญ่',
    level1Desc: 'ปฏิบัติตามระเบียบข้อบังคับพื้นฐานได้เมื่อได้รับคำแนะนำจากครู',
    level0Desc: 'ฝ่าฝืนระเบียบ ขาดเรียน/ส่งงานล่าช้าบ่อยครั้งแม้ได้รับการตักเตือนแล้ว',
  },
  {
    index: 4,
    titleTh: '๔. ใฝ่เรียนรู้',
    subIndicators: ['ตั้งใจ เพียรพยายามในการเรียนและเข้าร่วมกิจกรรมการเรียนรู้', 'แสวงหาความรู้จากแหล่งเรียนรู้และแลกเปลี่ยนเรียนรู้'],
    level3Desc: 'ตั้งใจเรียน ซักถาม ค้นคว้าเพิ่มเติมด้วยตนเองและแบ่งปันความรู้แก่เพื่อนเสมอ',
    level2Desc: 'ตั้งใจเรียน จดบันทึก ร่วมอภิปราย และค้นคว้าตามที่ได้รับมอบหมายครบถ้วน',
    level1Desc: 'เข้าเรียนและทำกิจกรรมตามที่ครูมอบหมายผ่านเกณฑ์ขั้นต่ำ',
    level0Desc: 'ไม่ตั้งใจเรียน ไม่สนใจร่วมกิจกรรมและไม่ปรับปรุงเมื่อครูแนะนำ',
  },
  {
    index: 5,
    titleTh: '๕. อยู่อย่างพอเพียง',
    subIndicators: ['ดำเนินชีวิตอย่างพอประมาณ มีเหตุผล และมีภูมิคุ้มกันในตัว', 'ใช้อุปกรณ์การเรียน ทรัพยากร น้ำ ไฟฟ้า อย่างประหยัดคุ้มค่า'],
    level3Desc: 'ใช้จ่ายและใช้ทรัพยากรอย่างประหยัด วางแผนการออมและเป็นแบบอย่างที่ดี',
    level2Desc: 'ใช้อุปกรณ์และทรัพยากรของตนและส่วนรวมอย่างรู้คุณค่า ไม่ฟุ่มเฟือย',
    level1Desc: 'ใช้สิ่งของและทรัพยากรตามความจำเป็น ไม่ทำลายทรัพย์สิน',
    level0Desc: 'ใช้จ่ายสุรุ่ยสุร่ายหรือใช้ทรัพยากรส่วนรวมอย่างสิ้นเปลืองโดยไม่ระมัดระวัง',
  },
  {
    index: 6,
    titleTh: '๖. มุ่งมั่นในการทำงาน',
    subIndicators: ['ตั้งใจและรับผิดชอบในการปฏิบัติหน้าที่การงาน', 'ทำงานด้วยความเพียรพยายาม อดทน เพื่อให้งานสำเร็จตามเป้าหมาย'],
    level3Desc: 'ทำงานสำเร็จสมบูรณ์ ประณีต แก้ปัญหาอุปสรรคได้ด้วยตนเองและพัฒนาผลงานให้ดียิ่งขึ้น',
    level2Desc: 'รับผิดชอบงานที่ได้รับมอบหมายจนสำเร็จเรียบร้อยตรงตามกำหนด',
    level1Desc: 'ปฏิบัติงานให้เสร็จตามเกณฑ์ขั้นต่ำภายใต้การติดตามดูแลของครู',
    level0Desc: 'ละทิ้งงาน ไม่ส่งงานตามกำหนด และไม่ปรับปรุงแก้ไขเมื่อได้รับโอกาส',
  },
  {
    index: 7,
    titleTh: '๗. รักความเป็นไทย',
    subIndicators: ['ภาคภูมิใจในขนบธรรมเนียม ประเพณี ศิลปะ วัฒนธรรม และภูมิปัญญาไทย', 'ใช้ภาษาไทยในการสื่อสารได้อย่างถูกต้องเหมาะสม'],
    level3Desc: 'ภาคภูมิใจ ใช้ภาษาไทยถูกต้อง ร่วมสืบสานและเผยแพร่วัฒนธรรมไทยอย่างสม่ำเสมอ',
    level2Desc: 'แสดงออกถึงความเคารพวัฒนธรรมไทย ใช้ภาษาไทยเหมาะสม และร่วมกิจกรรมประเพณี',
    level1Desc: 'เข้าร่วมกิจกรรมวัฒนธรรมไทยของโรงเรียนและใช้ภาษาไทยได้เหมาะสม',
    level0Desc: 'ไม่ให้ความร่วมมือในกิจกรรมวัฒนธรรมไทยหรือใช้ภาษาไม่เหมาะสมซ้ำซาก',
  },
  {
    index: 8,
    titleTh: '๘. มีจิตสาธารณะ',
    subIndicators: ['ช่วยเหลือผู้อื่นด้วยความเต็มใจโดยไม่หวังผลตอบแทน', 'เข้าร่วมกิจกรรมเพื่อสังคมและดูแลรักษาสิ่งแวดล้อมส่วนรวม'],
    level3Desc: 'อาสาช่วยเหลือผู้อื่น ดูแลรักษาความสะอาดและความสงบเรียบร้อยส่วนรวมโดยสม่ำเสมอ',
    level2Desc: 'ให้ความร่วมมือในการช่วยเหลือเพื่อนและรักษาความสะอาดในห้องเรียน/โรงเรียน',
    level1Desc: 'ร่วมกิจกรรมบำเพ็ญประโยชน์ตามที่โรงเรียนหรือห้องเรียนจัดขึ้น',
    level0Desc: 'เพิกเฉยต่อส่วนรวมหรือไม่ร่วมกิจกรรมสาธารณประโยชน์ของห้องเรียน',
  },
];

export const MOE_ATTRIBUTES_DECISION_RULES = [
  { level: 3, label: 'ดีเยี่ยม (๓)', rule: 'ได้ระดับ ๓ (ดีเยี่ยม) อย่างน้อย ๕–๘ คุณลักษณะ และไม่มีคุณลักษณะใดได้ต่ำกว่าระดับ ๒ (ดี)' },
  { level: 2, label: 'ดี (๒)', rule: 'ได้ระดับ ๒ (ดี) ขึ้นไปครบทุกคุณลักษณะ (หรือได้ระดับ ๓ ไม่ถึง ๕ ข้อ และไม่มีข้อใดต่ำกว่า ๒)' },
  { level: 1, label: 'ผ่าน (๑)', rule: 'ได้ระดับ ๑ (ผ่าน) ขึ้นไปทุกคุณลักษณะ โดยไม่มีคุณลักษณะใดได้ระดับ ๐ (ไม่ผ่าน)' },
  { level: 0, label: 'ไม่ผ่าน (๐)', rule: 'มีคุณลักษณะอันพึงประสงค์ข้อใดข้อหนึ่งได้ระดับ ๐ (ต้องจัดกิจกรรมซ่อมเสริมพฤติกรรม)' },
];

export function evaluateObecAttributeSummary(scores: number[]): { level: 3 | 2 | 1 | 0; label: string } {
  const normalized = scores.slice(0, 8).map((v) => (Number.isFinite(v) ? Math.max(0, Math.min(3, Math.round(v))) : 3));
  while (normalized.length < 8) normalized.push(3);
  if (normalized.some((v) => v === 0)) return { level: 0, label: 'ไม่ผ่าน (๐)' };
  if (normalized.some((v) => v === 1)) return { level: 1, label: 'ผ่าน (๑)' };
  const count3 = normalized.filter((v) => v === 3).length;
  if (count3 >= 5) return { level: 3, label: 'ดีเยี่ยม (๓)' };
  return { level: 2, label: 'ดี (๒)' };
}

// =========================================================================
// Item 8 & 11: เกณฑ์การประเมินการอ่าน คิดวิเคราะห์ และการเขียนสื่อความหมาย (สพฐ.)
// =========================================================================
export interface ReadingWritingRubricDimension {
  index: number;
  titleTh: string;
  shortTh: string;
  description: string;
  level3Desc: string;
  level2Desc: string;
  level1Desc: string;
  level0Desc: string;
}

export const MOE_READING_WRITING_RUBRIC: ReadingWritingRubricDimension[] = [
  {
    index: 1,
    titleTh: '๑. ความสามารถในการอ่านเพื่อหาข้อมูลสารสนเทศ',
    shortTh: 'อ่านหาสารสนเทศ',
    description: 'อ่านสื่อสิ่งพิมพ์ สื่ออิเล็กทรอนิกส์ และข้อมูลเชิงวิชาการเพื่อค้นหาความรู้และประสบการณ์ใหม่',
    level3Desc: 'คัดกรองและสืบค้นสารสนเทศจากสื่อหลากหลายได้อย่างแม่นยำ รวดเร็ว และกว้างขวาง',
    level2Desc: 'อ่านและค้นหาข้อมูลสารสนเทศตามหัวข้อที่ศึกษาได้ครบถ้วนและถูกต้อง',
    level1Desc: 'อ่านและจับข้อมูลพื้นฐานจากสื่อที่ครูกำหนดให้ได้ตามเกณฑ์ขั้นต่ำ',
    level0Desc: 'ไม่สามารถค้นหาหรือระบุสารสนเทศสำคัญจากเรื่องที่อ่านได้',
  },
  {
    index: 2,
    titleTh: '๒. ความสามารถในการจับประเด็นสำคัญและแยกข้อเท็จจริง',
    shortTh: 'จับประเด็นสำคัญ',
    description: 'สรุปใจความสำคัญ แยกแยะข้อเท็จจริงกับข้อคิดเห็น และลำดับความสำคัญของเรื่องได้',
    level3Desc: 'จับใจความสำคัญและแยกข้อเท็จจริง-ข้อคิดเห็นได้อย่างชัดเจน เป็นระบบ และครอบคลุม',
    level2Desc: 'สรุปใจความสำคัญและแยกประเด็นหลักของเนื้อหาได้ถูกต้องเป็นส่วนใหญ่',
    level1Desc: 'สรุปประเด็นสำคัญบางส่วนได้เมื่อมีคำถามนำหรือแนวทางช่วยคิด',
    level0Desc: 'สับสนประเด็นหลักและไม่สามารถสรุปสาระสำคัญจากข้อความที่อ่านได้',
  },
  {
    index: 3,
    titleTh: '๓. ความสามารถในการคิดวิเคราะห์และเชื่อมโยงความสัมพันธ์',
    shortTh: 'คิดวิเคราะห์เชื่อมโยง',
    description: 'เปรียบเทียบ เชื่อมโยงเหตุ-ผล วิเคราะห์ความน่าเชื่อถือ และประเมินคุณค่าของเรื่อง',
    level3Desc: 'เชื่อมโยงเหตุและผล เปรียบเทียบข้อมูลเชิงลึก และประเมินความสมเหตุสมผลได้อย่างคมชัด',
    level2Desc: 'อธิบายความสัมพันธ์เชิงเหตุ-ผล และเปรียบเทียบประเด็นสำคัญของเรื่องได้ถูกต้อง',
    level1Desc: 'บอกความเชื่อมโยงอย่างง่ายของเนื้อหาที่ศึกษาได้ตามเกณฑ์',
    level0Desc: 'ไม่สามารถเชื่อมโยงเหตุและผลหรือวิเคราะห์ความสัมพันธ์ของข้อมูลได้',
  },
  {
    index: 4,
    titleTh: '๔. ความสามารถในการแสดงความคิดเห็นอย่างมีเหตุผล',
    shortTh: 'แสดงความเห็นมีเหตุผล',
    description: 'วิพากษ์ วิจารณ์ และเสนอความคิดเห็นหรือแนวทางแก้ปัญหาโดยมีหลักฐานอ้างอิง',
    level3Desc: 'แสดงทัศนะเชิงวิจารณญาณ พร้อมหลักฐานสนับสนุนและเสนอทางเลือกสร้างสรรค์ได้อย่างยอดเยี่ยม',
    level2Desc: 'แสดงความคิดเห็นสอดคล้องกับเนื้อหาและให้เหตุผลประกอบได้อย่างเหมาะสม',
    level1Desc: 'แสดงความคิดเห็นเบื้องต้นได้ตรงประเด็นตามคำถามที่กำหนด',
    level0Desc: 'แสดงความเห็นไม่ตรงประเด็นหรือปราศจากเหตุผลและหลักฐานรองรับ',
  },
  {
    index: 5,
    titleTh: '๕. ความสามารถในการเขียนสื่อความหมายอย่างสร้างสรรค์',
    shortTh: 'เขียนสื่อความหมาย',
    description: 'เรียบเรียง ถ่ายทอดความรู้ ความคิด ความเข้าใจ ด้วยภาษาถูกต้อง ชัดเจน และสร้างสรรค์',
    level3Desc: 'เขียนเรียบเรียงเป็นระบบ สละสลวย อักขรวิธีถูกต้อง มีเอกลักษณ์และสื่อความหมายชัดเจนมาก',
    level2Desc: 'เขียนถ่ายทอดความคิดและลำดับเรื่องได้ชัดเจน ใช้ภาษาและตัวสะกดถูกต้องเป็นส่วนใหญ่',
    level1Desc: 'เขียนสื่อสารได้ใจความพอเข้าใจแม้ยังมีข้อบกพร่องด้านการเรียบเรียงหรือสะกดคำบ้าง',
    level0Desc: 'เขียนสื่อความหมายไม่ชัดเจน ไม่จบความ หรือไม่ส่งชิ้นงานเขียนตามเกณฑ์',
  },
];

export const MOE_READING_DECISION_RULES = [
  { level: 3, label: 'ดีเยี่ยม (๓)', scoreRange: 'ร้อยละ ๘๐ – ๑๐๐ (เฉลี่ย ๒.๕๐–๓.๐๐)', rule: 'ได้ระดับ ๓ อย่างน้อย ๓–๕ ด้าน และไม่มีด้านใดต่ำกว่าระดับ ๒' },
  { level: 2, label: 'ดี (๒)', scoreRange: 'ร้อยละ ๖๕ – ๗๙ (เฉลี่ย ๑.๗๕–๒.๔๙)', rule: 'ได้ระดับ ๒ ขึ้นไปทุกด้าน หรือคะแนนรวม ๖๕–๗๙%' },
  { level: 1, label: 'ผ่าน (๑)', scoreRange: 'ร้อยละ ๕๐ – ๖๔ (เฉลี่ย ๑.๐๐–๑.๗๔)', rule: 'ได้ระดับ ๑ ขึ้นไปทุกด้าน ไม่มีด้านใดได้ ๐ หรือคะแนนรวม ๕๐–๖๔%' },
  { level: 0, label: 'ไม่ผ่าน (๐)', scoreRange: 'ต่ำกว่าร้อยละ ๕๐ (เฉลี่ยต่ำกว่า ๑.๐๐)', rule: 'มีด้านใดด้านหนึ่งได้ระดับ ๐ หรือคะแนนรวมต่ำกว่า ๕๐% (ต้องซ่อมเสริม)' },
];

export function evaluateObecReadingSummary(scores: number[]): { level: 3 | 2 | 1 | 0; label: string; percent: number } {
  const normalized = scores.slice(0, 5).map((v) => (Number.isFinite(v) ? Math.max(0, Math.min(3, Math.round(v))) : 3));
  while (normalized.length < 5) normalized.push(3);
  const sum = normalized.reduce((acc, n) => acc + n, 0);
  const percent = Math.round((sum / 15) * 100);
  if (normalized.some((v) => v === 0) || percent < 50) return { level: 0, label: 'ไม่ผ่าน (๐)', percent };
  if (normalized.some((v) => v === 1) || percent < 65) return { level: 1, label: 'ผ่าน (๑)', percent };
  const count3 = normalized.filter((v) => v === 3).length;
  if (count3 >= 3 && percent >= 80) return { level: 3, label: 'ดีเยี่ยม (๓)', percent };
  return { level: 2, label: 'ดี (๒)', percent };
}

export const MOE_KEY_COMPETENCIES = [
  '๑. ความสามารถในการสื่อสาร',
  '๒. ความสามารถในการคิด',
  '๓. ความสามารถในการแก้ปัญหา',
  '๔. ความสามารถในการใช้ทักษะชีวิต',
  '๕. ความสามารถในการใช้เทคโนโลยี',
];

export const MOE_STUDENT_ACTIVITIES = [
  { name: '๑. กิจกรรมแนะแนว', hours: '๒๐ ชม.', defaultResult: 'ผ (ผ่าน)' },
  { name: '๒. กิจกรรมนักเรียน (ลูกเสือ / เนตรนารี / ยุวกาชาด / บำเพ็ญประโยชน์)', hours: '๒๐ ชม.', defaultResult: 'ผ (ผ่าน)' },
  { name: '๓. กิจกรรมชมรม / ชุมนุม', hours: '๒๐ ชม.', defaultResult: 'ผ (ผ่าน)' },
  { name: '๔. กิจกรรมเพื่อสังคมและสาธารณประโยชน์', hours: '๑๕ ชม.', defaultResult: 'ผ (ผ่าน)' },
];
