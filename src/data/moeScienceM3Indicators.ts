import type { LearningIndicator, LearningIndicatorSet } from '../types';

export interface MoeIndicatorSeedItem {
  code: string;
  title: string;
  maxScore: number;
}

export interface MoeIndicatorSeedSet {
  title: string;
  standardCode: string;
  unitTitle: string;
  indicators: MoeIndicatorSeedItem[];
}

export const MOE_SCIENCE_M3_INDICATOR_SEEDS: MoeIndicatorSeedSet[] = [
  {
    title: 'พันธุศาสตร์',
    standardCode: 'ว 1.3',
    unitTitle: 'หน่วยที่ 2 พันธุศาสตร์',
    indicators: [
      { code: 'ม.3/1', title: 'อธิบายความสัมพันธ์ระหว่างยีน ดีเอ็นเอ และโครโมโซม โดยใช้แบบจำลอง', maxScore: 3 },
      { code: 'ม.3/2', title: 'อธิบายการถ่ายทอดลักษณะทางพันธุกรรมจากการผสมลักษณะเดียวที่แอลลีลเด่นข่มแอลลีลด้อยอย่างสมบูรณ์', maxScore: 3 },
      { code: 'ม.3/3', title: 'อธิบายการเกิดจีโนไทป์และฟีโนไทป์ของลูก และคำนวณอัตราส่วนจีโนไทป์และฟีโนไทป์', maxScore: 3 },
      { code: 'ม.3/4', title: 'อธิบายความแตกต่างของการแบ่งเซลล์แบบไมโทซิสและไมโอซิส', maxScore: 3 },
      { code: 'ม.3/5', title: 'อธิบายการเปลี่ยนแปลงของยีนหรือโครโมโซมที่อาจทำให้เกิดโรคทางพันธุกรรม พร้อมยกตัวอย่าง', maxScore: 3 },
      { code: 'ม.3/6', title: 'ตระหนักถึงประโยชน์ของความรู้เรื่องโรคทางพันธุกรรมและการปรึกษาแพทย์ก่อนแต่งงาน', maxScore: 2 },
      { code: 'ม.3/7', title: 'อธิบายการใช้สิ่งมีชีวิตดัดแปรพันธุกรรมและผลกระทบต่อมนุษย์และสิ่งแวดล้อม', maxScore: 3 },
      { code: 'ม.3/8', title: 'เผยแพร่ความรู้และอภิปรายประโยชน์ ผลกระทบ และข้อมูลสนับสนุนของสิ่งมีชีวิตดัดแปรพันธุกรรม', maxScore: 3 },
      { code: 'ม.3/9', title: 'อธิบายความสำคัญของความหลากหลายทางชีวภาพต่อสมดุลนิเวศและมนุษย์', maxScore: 2 },
      { code: 'ม.3/10', title: 'ตระหนักในคุณค่าและความสำคัญของความหลากหลายทางชีวภาพและมีส่วนร่วมดูแลรักษา', maxScore: 3 },
      { code: 'ม.3/11', title: 'แสดงพฤติกรรมดูแลและอนุรักษ์ความหลากหลายทางชีวภาพ', maxScore: 2 },
    ],
  },
  {
    title: 'คลื่นและแสง',
    standardCode: 'ว 2.3',
    unitTitle: 'หน่วยที่ 3 คลื่นและแสง',
    indicators: [
      { code: 'ม.3/10', title: 'สร้างแบบจำลองการเกิดคลื่นและบรรยายส่วนประกอบของคลื่น', maxScore: 3 },
      { code: 'ม.3/11', title: 'อธิบายคลื่นแม่เหล็กไฟฟ้าและสเปกตรัมคลื่นแม่เหล็กไฟฟ้า', maxScore: 2 },
      { code: 'ม.3/12', title: 'อธิบายประโยชน์และอันตรายของคลื่นแม่เหล็กไฟฟ้าในชีวิตประจำวัน', maxScore: 2 },
      { code: 'ม.3/13', title: 'ออกแบบและดำเนินการทดลองเพื่ออธิบายกฎการสะท้อนของแสง', maxScore: 3 },
      { code: 'ม.3/14', title: 'เขียนแผนภาพการเคลื่อนที่ของแสงเพื่อแสดงการเกิดภาพจากกระจกเงา', maxScore: 3 },
      { code: 'ม.3/15', title: 'อธิบายการหักเหและการกระจายแสงผ่านตัวกลางและปริซึม', maxScore: 2 },
      { code: 'ม.3/16', title: 'เขียนแผนภาพการเคลื่อนที่ของแสงเพื่อแสดงการเกิดภาพจากเลนส์บาง', maxScore: 3 },
      { code: 'ม.3/17', title: 'อธิบายปรากฏการณ์เกี่ยวกับแสงและการทำงานของทัศนอุปกรณ์', maxScore: 2 },
      { code: 'ม.3/18', title: 'เขียนแผนภาพการเกิดภาพของทัศนอุปกรณ์และเลนส์ตา', maxScore: 3 },
      { code: 'ม.3/19', title: 'อธิบายผลของความสว่างต่อดวงตาจากข้อมูลที่ค้นหาได้', maxScore: 3 },
      { code: 'ม.3/20', title: 'วัดความสว่างของแสงโดยใช้อุปกรณ์วัดความสว่าง', maxScore: 2 },
      { code: 'ม.3/21', title: 'วิเคราะห์และเสนอแนะการจัดความสว่างให้เหมาะสมในการทำกิจกรรม', maxScore: 2 },
    ],
  },
  {
    title: 'เอกภพและระบบสุริยะ',
    standardCode: 'ว 3.1',
    unitTitle: 'หน่วยเอกภพและระบบสุริยะ',
    indicators: [
      { code: 'ม.3/1', title: 'อธิบายการโคจรของดาวเคราะห์รอบดวงอาทิตย์ด้วยแรงโน้มถ่วงจากสมการ F = (Gm1m2)/r²', maxScore: 3 },
      { code: 'ม.3/2', title: 'สร้างแบบจำลองที่อธิบายการเกิดฤดูและการเคลื่อนที่ปรากฏของดวงอาทิตย์', maxScore: 3 },
      { code: 'ม.3/3', title: 'สร้างแบบจำลองที่อธิบายข้างขึ้น ข้างแรม การขึ้นตกของดวงจันทร์ และน้ำขึ้นน้ำลง', maxScore: 3 },
      { code: 'ม.3/4', title: 'อธิบายการใช้เทคโนโลยีอวกาศและความก้าวหน้าของโครงการสำรวจอวกาศ', maxScore: 3 },
    ],
  },
];

export function createMoeScienceM3IndicatorSets(params: {
  schoolId: string;
  courseId: string;
  academicYear: string;
  semester: string;
}): LearningIndicatorSet[] {
  const now = new Date().toISOString();

  return MOE_SCIENCE_M3_INDICATOR_SEEDS.map((seed, seedIndex) => {
    const setId = `moe-m3-science-${seed.standardCode.replace(/[^a-zA-Z0-9ก-๙]+/g, '-').toLowerCase()}-${params.academicYear}-${params.semester}`;
    const indicators: LearningIndicator[] = seed.indicators.map((item, index) => ({
      id: `${setId}-${item.code.replace(/[^a-zA-Z0-9]+/g, '-')}-${index + 1}`,
      schoolId: params.schoolId,
      courseId: params.courseId,
      setId,
      code: item.code,
      title: item.title,
      description: `${seed.unitTitle} · ${seed.standardCode}`,
      maxScore: item.maxScore,
      sortOrder: index + 1,
      academicYear: params.academicYear,
      semester: params.semester,
    }));

    return {
      id: setId,
      schoolId: params.schoolId,
      courseId: params.courseId,
      title: `${seed.title} (${seed.standardCode})`,
      standardCode: seed.standardCode,
      academicYear: params.academicYear,
      semester: params.semester,
      indicators,
      createdAt: now,
      updatedAt: now,
    };
  });
}
