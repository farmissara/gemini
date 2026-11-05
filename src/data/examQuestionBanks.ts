import { QuizQuestion } from '../types';

export type ExamCategoryFilter = 
  | 'all' 
  | 'onet' 
  | 'midterm_final' 
  | 'stem' 
  | 'math' 
  | 'english' 
  | 'thai_social' 
  | 'general';

export type ExamGradeFilter = 
  | 'all' 
  | 'primary' 
  | 'm13' 
  | 'm46';

export interface ExamCategoryMeta {
  id: ExamCategoryFilter;
  labelTh: string;
  labelEn: string;
  icon: string;
  descriptionTh: string;
}

export const EXAM_CATEGORIES: ExamCategoryMeta[] = [
  {
    id: 'all',
    labelTh: 'ทั้งหมดทุกคลังข้อสอบ',
    labelEn: 'All Question Banks',
    icon: '🌟',
    descriptionTh: 'รวมโจทย์ทุกวิชา ทุกระดับชั้น และคลังข้อสอบทั่วประเทศ',
  },
  {
    id: 'onet',
    labelTh: 'ข้อสอบระดับชาติ O-NET',
    labelEn: 'O-NET National Exam',
    icon: '📘',
    descriptionTh: 'คลังข้อสอบมาตรฐาน สทศ. ม.3 และ ม.6 ย้อนหลัง',
  },
  {
    id: 'midterm_final',
    labelTh: 'ข้อสอบกลางภาค & ปลายภาค',
    labelEn: 'Midterm & Final Exams',
    icon: '📝',
    descriptionTh: 'แนวข้อสอบวัดผลสัมฤทธิ์ประจำภาคเรียนของโรงเรียน',
  },
  {
    id: 'stem',
    labelTh: 'วิทยาศาสตร์ & STEM & AI',
    labelEn: 'Science, STEM & Tech',
    icon: '🧪',
    descriptionTh: 'ฟิสิกส์ เคมี ชีววิทยา วิทยาการคำนวณ หุ่นยนต์ และ AI',
  },
  {
    id: 'math',
    labelTh: 'คณิตศาสตร์ & ตรรกะประยุกต์',
    labelEn: 'Mathematics & Logic',
    icon: '📐',
    descriptionTh: 'พีชคณิต แคลคูลัส เรขาคณิต สถิติ และตรรกศาสตร์',
  },
  {
    id: 'english',
    labelTh: 'ภาษาอังกฤษ & สากล',
    labelEn: 'English & Communication',
    icon: '🌍',
    descriptionTh: 'ไวยากรณ์ สำนวน คำศัพท์ และการอ่านจับใจความ',
  },
  {
    id: 'thai_social',
    labelTh: 'ภาษาไทย & สังคมศึกษา',
    labelEn: 'Thai & Social Studies',
    icon: '📚',
    descriptionTh: 'หลักภาษา วรรณคดี ประวัติศาสตร์ และหน้าที่พลเมือง',
  },
  {
    id: 'general',
    labelTh: 'ความรู้รอบตัว & ทักษะชีวิต',
    labelEn: 'General & Life Skills',
    icon: '💡',
    descriptionTh: 'การปฐมพยาบาล การเงินส่วนบุคคล และวิทยาศาสตร์ในชีวิตประจำวัน',
  },
];

export const EXAM_GRADE_LEVELS = [
  { id: 'all' as ExamGradeFilter, labelTh: 'ทุกระดับชั้น (All Grades)' },
  { id: 'primary' as ExamGradeFilter, labelTh: 'ประถมศึกษา (ป.1 - ป.6)' },
  { id: 'm13' as ExamGradeFilter, labelTh: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)' },
  { id: 'm46' as ExamGradeFilter, labelTh: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)' },
];

export const COMPREHENSIVE_QUESTION_BANK: QuizQuestion[] = [
  // ==========================================
  // 1. O-NET EXAMS
  // ==========================================
  {
    id: 'onet-m6-math-1',
    subject: 'คณิตศาสตร์ (O-NET)',
    gradeLevel: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    category: 'onet',
    questionTh: 'กล่องใบหนึ่งมีลูกบอลสีแดง 4 ลูก และสีขาว 6 ลูก หากสุ่มหยิบลูกบอล 2 ลูกพร้อมกัน ความน่าจะเป็นที่จะได้ลูกบอลสีแดงทั้งสองลูกมีค่าเท่ากับข้อใด?',
    questionEn: 'A box contains 4 red balls and 6 white balls. If 2 balls are drawn at random simultaneously, what is the probability that both are red?',
    options: ['2/15', '4/15', '1/5', '1/3'],
    correctIndex: 0,
    explanationTh: 'จำนวนวิธีหยิบทั้งหมด = C(10,2) = 45 วิธี, จำนวนวิธีได้สีแดงทั้งสอง = C(4,2) = 6 วิธี, ความน่าจะเป็น = 6/45 = 2/15',
    points: 120,
  },
  {
    id: 'onet-m6-sci-1',
    subject: 'วิทยาศาสตร์กายภาพ (O-NET)',
    gradeLevel: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    category: 'onet',
    questionTh: 'คลื่นแม่เหล็กไฟฟ้าชนิดใดมีความถี่สูงสุดและมีพลังงานต่อโฟตอนมากที่สุด?',
    questionEn: 'Which electromagnetic wave has the highest frequency and photon energy?',
    options: ['รังสีแกมมา (Gamma ray)', 'รังสีเอกซ์ (X-ray)', 'รังสีอัลตราไวโอเลต (UV)', 'คลื่นไมโครเวฟ (Microwave)'],
    correctIndex: 0,
    explanationTh: 'รังสีแกมมามีความยาวคลื่นสั้นที่สุด จึงมีความถี่และพลังงานสูงสุดตามสมการ E = hf',
    points: 120,
  },
  {
    id: 'onet-m3-eng-1',
    subject: 'ภาษาอังกฤษ (English O-NET)',
    gradeLevel: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    category: 'onet',
    questionTh: 'Choose the correct answer: "Neither the teacher nor the students _____ in the science lab right now."',
    questionEn: 'Choose the correct verb form for the subject-verb agreement.',
    options: ['is', 'are', 'was', 'were'],
    correctIndex: 1,
    explanationTh: 'กฎของ Neither...nor ประธานตัวหลัง (the students ซึ่งเป็นพหูพจน์) เป็นตัวกำหนดกริยา และคำว่า right now บอกเวลาปัจจุบัน จึงใช้ are',
    points: 100,
  },
  {
    id: 'onet-m3-thai-1',
    subject: 'ภาษาไทย (O-NET)',
    gradeLevel: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    category: 'onet',
    questionTh: 'สำนวนไทยข้อใดมีความหมายตรงกับ "ทำเป็นไม่รู้ไม่ชี้ หรือทำเป็นไม่เห็นเหตุการณ์ที่เกิดขึ้น"?',
    questionEn: 'Which Thai idiom means pretending not to see or ignoring an event?',
    options: ['เอาหูไปนา เอาตาไปไร่', 'ชักน้ำเข้าลึก ชักศึกเข้าบ้าน', 'ตีปลาหน้าไซ', 'จับปลาสองมือ'],
    correctIndex: 0,
    explanationTh: '"เอาหูไปนา เอาตาไปไร่" หมายถึง แกล้งทำเป็นไม่ได้ยินหรือไม่เห็น เพื่อไม่ให้มีเรื่องยุ่งยาก',
    points: 100,
  },

  // ==========================================
  // 2. MIDTERM & FINAL EXAMS
  // ==========================================
  {
    id: 'mid-phy-m4',
    subject: 'ฟิสิกส์ ม.4 (ข้อสอบกลางภาค)',
    gradeLevel: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    category: 'exam',
    questionTh: 'วัตถุหนึ่งเคลื่อนที่จากจุดหยุดนิ่งด้วยความเร่งสม่ำเสมอ 4 m/s² เมื่อเวลาผ่านไป 5 วินาที วัตถุจะเคลื่อนที่ได้ระยะทางกี่เมตร?',
    questionEn: 'An object accelerates from rest with a uniform acceleration of 4 m/s². What distance does it travel in 5 seconds?',
    options: ['50 เมตร', '40 เมตร', '20 เมตร', '100 เมตร'],
    correctIndex: 0,
    explanationTh: 'จากสูตร s = ut + 0.5at² เนื่องจาก u = 0 จะได้ s = 0.5 × 4 × (5²) = 2 × 25 = 50 เมตร',
    points: 140,
  },
  {
    id: 'final-chem-m5',
    subject: 'เคมี ม.5 (ข้อสอบปลายภาค)',
    gradeLevel: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    category: 'exam',
    questionTh: 'สำหรับปฏิกิริยาคายความร้อนที่อยู่ในภาวะสมดุล การเพิ่มอุณหภูมิจะส่งผลต่อระบบอย่างไรตามหลักของเลอชาเตอลิเย?',
    questionEn: 'For an exothermic reaction at equilibrium, how does increasing temperature shift the equilibrium?',
    options: [
      'สมดุลจะเลื่อนไปทางซ้าย (ย้อนกลับ)',
      'สมดุลจะเลื่อนไปทางขวา (เกิดผลิตภัณฑ์เพิ่มขึ้น)',
      'ไม่มีผลต่อทิศทางของสมดุล',
      'ค่าคงที่สมดุลจะเพิ่มขึ้นสองเท่า'
    ],
    correctIndex: 0,
    explanationTh: 'ปฏิกิริยาคายความร้อน ความร้อนเปรียบเสมือนผลิตภัณฑ์ เมื่อเพิ่มความร้อน ระบบจะปรับตัวเพื่อลดความร้อนโดยดำเนินไปในทิศทางย้อนกลับ (ทางซ้าย)',
    points: 150,
  },
  {
    id: 'mid-math-m2',
    subject: 'คณิตศาสตร์ ม.2 (ข้อสอบกลางภาค)',
    gradeLevel: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    category: 'exam',
    questionTh: 'รูปสามเหลี่ยมมุมฉากมีด้านประกอบมุมฉากยาว 6 เซนติเมตร และ 8 เซนติเมตร ด้านตรงข้ามมุมฉากจะยาวกี่เซนติเมตร?',
    questionEn: 'A right-angled triangle has sides of 6 cm and 8 cm. What is the length of the hypotenuse?',
    options: ['10 เซนติเมตร', '12 เซนติเมตร', '14 เซนติเมตร', '10.5 เซนติเมตร'],
    correctIndex: 0,
    explanationTh: 'ตามทฤษฎีบทพีทาโกรัส c² = a² + b² = 6² + 8² = 36 + 64 = 100 ดังนั้น c = 10 เซนติเมตร',
    points: 110,
  },

  // ==========================================
  // 3. STEM & TECHNOLOGY & AI
  // ==========================================
  {
    id: 'stem-ai-1',
    subject: 'วิทยาการคำนวณ & AI (STEM)',
    gradeLevel: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    category: 'review',
    questionTh: 'การเรียนรู้ของเครื่อง (Machine Learning) แบบใดที่โมเดลต้องอาศัยชุดข้อมูลที่มีการเฉลยคำตอบล่วงหน้า (Labeled Data)?',
    questionEn: 'Which type of Machine Learning relies on pre-labeled dataset with ground truth?',
    options: [
      'Supervised Learning (การเรียนรู้แบบมีผู้สอน)',
      'Unsupervised Learning (การเรียนรู้แบบไม่มีผู้สอน)',
      'Reinforcement Learning (การเรียนรู้แบบเสริมกำลัง)',
      'Zero-Shot Clustering'
    ],
    correctIndex: 0,
    explanationTh: 'Supervised Learning ใช้ข้อมูลฝึกสอนที่มี Label ระบุคำตอบ เพื่อให้โมเดลสร้างฟังก์ชันทำนายผลลัพธ์ได้อย่างแม่นยำ',
    points: 130,
  },
  {
    id: 'stem-iot-1',
    subject: 'เทคโนโลยีและหุ่นยนต์ (STEM)',
    gradeLevel: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    category: 'review',
    questionTh: 'เซ็นเซอร์อัลตราโซนิก (Ultrasonic Sensor) ที่ใช้ในโครงงานหุ่นยนต์ ทำงานโดยใช้หลักการใดในการตรวจจับระยะห่างของสิ่งกีดขวาง?',
    questionEn: 'What principle does an ultrasonic sensor use to calculate the distance of obstacles?',
    options: [
      'ปล่อยคลื่นเสียงความถี่สูงและจับเวลาการสะท้อนกลับ',
      'ปล่อยแสงเลเซอร์อินฟราเรด',
      'วัดการเปลี่ยนแปลงของสนามแม่เหล็กโลก',
      'วัดอุณหภูมิความร้อนที่แผ่ออกมา'
    ],
    correctIndex: 0,
    explanationTh: 'เซ็นเซอร์อัลตราโซนิกส่งคลื่นเสียงความถี่สูง (ประมาณ 40 kHz) ออกไป และคำนวณระยะทางจากเวลาที่คลื่นสะท้อนกลับมา (Time-of-Flight)',
    points: 120,
  },

  // ==========================================
  // 4. MATHEMATICS & LOGIC
  // ==========================================
  {
    id: 'math-logic-1',
    subject: 'คณิตศาสตร์ & ตรรกศาสตร์',
    gradeLevel: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    category: 'exam',
    questionTh: 'นิเสธของข้อความ "สำหรับ x ทุกตัว ถ้า x > 0 แล้ว x² > 0" คือข้อความในข้อใด?',
    questionEn: 'What is the negation of the proposition: "For all x, if x > 0 then x² > 0"?',
    options: [
      'มี x บางตัวที่ x > 0 และ x² ≤ 0',
      'สำหรับ x ทุกตัว ถ้า x ≤ 0 แล้ว x² ≤ 0',
      'มี x บางตัวที่ x ≤ 0 แล้ว x² > 0',
      'ไม่มี x ตัวใดเลยที่ x > 0'
    ],
    correctIndex: 0,
    explanationTh: 'นิเสธของ ∀x[P(x) → Q(x)] คือ ∃x[P(x) ∧ ~Q(x)] จึงได้ "มี x บางตัวที่ x > 0 และ x² ≤ 0"',
    points: 140,
  },
  {
    id: 'math-pri-1',
    subject: 'คณิตศาสตร์ ป.6',
    gradeLevel: 'ประถมศึกษา (ป.1 - ป.6)',
    category: 'exam',
    questionTh: 'ตัวหารร่วมมาก (ห.ร.ม.) ของ 24, 36 และ 60 มีค่าเท่ากับข้อใด?',
    questionEn: 'What is the Greatest Common Divisor (GCD) of 24, 36, and 60?',
    options: ['12', '6', '18', '24'],
    correctIndex: 0,
    explanationTh: '24 = 12×2, 36 = 12×3, 60 = 12×5 ตัวหารร่วมที่มากที่สุดของทั้ง 3 จำนวนคือ 12',
    points: 100,
  },

  // ==========================================
  // 5. ENGLISH & INTERNATIONAL
  // ==========================================
  {
    id: 'eng-idiom-1',
    subject: 'ภาษาอังกฤษ (English Idioms)',
    gradeLevel: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    category: 'review',
    questionTh: 'What is the meaning of the English idiom "to bite the bullet"?',
    questionEn: 'Identify the correct definition of the idiom "to bite the bullet".',
    options: [
      'เผชิญหน้ากับสถานการณ์ที่ยากลำบากอย่างกล้าหาญ',
      'ทะเลาะวิวาทด้วยความรุนแรง',
      'รับประทานอาหารอย่างรวดเร็ว',
      'ซื้อสินค้าที่มีราคาแพงเกินไป'
    ],
    correctIndex: 0,
    explanationTh: '"Bite the bullet" means to face a difficult situation with courage and resolve, accepting inevitable hardship.',
    points: 110,
  },
  {
    id: 'eng-pri-1',
    subject: 'English for Kids (ป.4 - ป.6)',
    gradeLevel: 'ประถมศึกษา (ป.1 - ป.6)',
    category: 'exam',
    questionTh: 'Complete the sentence: "My sister usually _____ to school by bicycle every morning."',
    questionEn: 'Choose the correct form of the verb for Present Simple tense.',
    options: ['goes', 'go', 'went', 'going'],
    correctIndex: 0,
    explanationTh: 'ประธานเอกพจน์บุรุษที่ 3 (My sister) กับคำบอกความถี่ (usually) ใน Present Simple Tense กริยาต้องเติม -es (goes)',
    points: 90,
  },

  // ==========================================
  // 6. THAI & SOCIAL STUDIES
  // ==========================================
  {
    id: 'soc-geo-1',
    subject: 'ภูมิศาสตร์และประวัติศาสตร์ไทย',
    gradeLevel: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    category: 'exam',
    questionTh: 'แม่น้ำสายหลักในภาคกลางของประเทศไทยที่เกิดจากการรวมตัวของแม่น้ำปิง วัง ยม น่าน ที่ตำบลปากน้ำโพ จังหวัดนครสวรรค์ คือแม่น้ำสายใด?',
    questionEn: 'Which major river in central Thailand is formed by the confluence of the Ping, Wang, Yom, and Nan rivers?',
    options: ['แม่น้ำเจ้าพระยา', 'แม่น้ำท่าจีน', 'แม่น้ำแม่กลอง', 'แม่น้ำบางปะกง'],
    correctIndex: 0,
    explanationTh: 'แม่น้ำปิง วัง ยม น่าน ไหลมารวมกันที่ปากน้ำโพ จ.นครสวรรค์ ก่อกำเนิดเป็นแม่น้ำเจ้าพระยา',
    points: 100,
  },
  {
    id: 'thai-lit-1',
    subject: 'ภาษาไทยและวรรณคดี',
    gradeLevel: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    category: 'review',
    questionTh: 'คำประพันธ์ประเภท "โคลงสี่สุภาพ" มีกฎบังคับการใช้เสียงวรรณยุกต์เอกและโทจำนวนกี่ตำแหน่งในหนึ่งบท?',
    questionEn: 'How many Mai Ek and Mai Tho tones are required in a standard Khlong Si Suphap poem?',
    options: ['เอก ๗ โท ๔', 'เอก ๔ โท ๗', 'เอก ๕ โท ๕', 'เอก ๖ โท ๔'],
    correctIndex: 0,
    explanationTh: 'โคลงสี่สุภาพ 1 บท บังคับวรรณยุกต์เอก 7 แห่ง และวรรณยุกต์โท 4 แห่ง (เอก ๗ โท ๔)',
    points: 120,
  },

  // ==========================================
  // 7. GENERAL KNOWLEDGE & LIFE SKILLS
  // ==========================================
  {
    id: 'gen-cpr-1',
    subject: 'การปฐมพยาบาล & ทักษะชีวิต',
    gradeLevel: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    category: 'review',
    questionTh: 'ตามมาตรฐานการช่วยฟื้นคืนชีพขั้นพื้นฐาน (CPR) อัตราส่วนของการกดหน้าอกต่อการช่วยหายใจที่แนะนำคือข้อใด?',
    questionEn: 'What is the recommended compression-to-ventilation ratio for adult CPR?',
    options: ['กดหน้าอก 30 ครั้ง : ผายปอด 2 ครั้ง (30:2)', 'กดหน้าอก 15 ครั้ง : ผายปอด 2 ครั้ง (15:2)', 'กดหน้าอก 50 ครั้ง : ผายปอด 1 ครั้ง', 'กดหน้าอกอย่างเดียวไม่ต้องนับ'],
    correctIndex: 0,
    explanationTh: 'มาตรฐานสากล AHA แนะนำอัตราส่วนกดหน้าอก 30 ครั้ง ต่อการช่วยหายใจ 2 ครั้ง ที่ความเร็ว 100-120 ครั้งต่อนาที',
    points: 100,
  },
  {
    id: 'gen-finance-1',
    subject: 'การเงินส่วนบุคคล & ทักษะชีวิต',
    gradeLevel: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    category: 'review',
    questionTh: 'ตาม "กฎ 72" (Rule of 72) หากคุณนำเงินไปลงทุนที่ได้รับผลตอบแทนเฉลี่ยร้อยละ 6 ต่อปี เงินก้อนนี้จะเพิ่มเป็น 2 เท่าในเวลากี่ปี?',
    questionEn: 'Using the Rule of 72, if you invest at a 6% annual return, how many years will it take for your money to double?',
    options: ['12 ปี (72 ÷ 6)', '6 ปี', '10 ปี', '18 ปี'],
    correctIndex: 0,
    explanationTh: 'กฎ 72 ใช้ประมาณเวลาที่เงินจะเพิ่มเป็นสองเท่า: 72 ÷ อัตราดอกเบี้ย (%) = 72 ÷ 6 = 12 ปี',
    points: 110,
  },
];
