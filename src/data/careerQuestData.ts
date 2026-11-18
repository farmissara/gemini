import {
  CareerProfile,
  CareerRoleplayTurn,
  CareerVibeQuizQuestion,
} from '../types';

export const POPULAR_CAREERS: CareerProfile[] = [
  {
    id: 'career-doctor',
    titleTh: 'แพทย์',
    titleEn: 'Medical Doctor',
    category: 'medical',
    taglineTh: 'วินิจฉัย ดูแล และรักษาชีวิตผู้คนด้วยความรู้วิทยาศาสตร์และหัวใจที่เข้าใจเพื่อนมนุษย์',
    taglineEn: 'Diagnose, heal, and care for patients using science and deep empathy.',
    targetGpax: 3.5,
    unlockableTitleTh: 'ว่าที่คุณหมอ',
    unlockableTitleEn: 'Future Doctor',
    examFocusHighTh: 'กสพท (TPAT1 วิชาเฉพาะแพทย์), TGAT, และ A-Level (ชีววิทยา เคมี ฟิสิกส์ คณิต1 อังกฤษ ไทย สังคม)',
    keySubjects: [
      { subjectKey: 'science', labelTh: 'วิทยาศาสตร์ / ชีววิทยา-เคมี', labelEn: 'Science / Bio & Chem', targetScore: 80, importance: 'core', reasonTh: 'หัวใจของการเรียนพรีคลินิกและสอบ A-Level สายแพทย์' },
      { subjectKey: 'math', labelTh: 'คณิตศาสตร์', labelEn: 'Mathematics', targetScore: 75, importance: 'core', reasonTh: 'ใช้คำนวณโดสยา วิเคราะห์ข้อมูลวิจัย และสอบ A-Level คณิต 1' },
      { subjectKey: 'english', labelTh: 'ภาษาอังกฤษ', labelEn: 'English', targetScore: 78, importance: 'core', reasonTh: 'ตำราแพทย์ งานวิจัย และศัพท์ทางการแพทย์ส่วนใหญ่เป็นภาษาอังกฤษ' },
    ],
    roadmaps: {
      primary: 'สำรวจว่าคุณหมอตรวจคนไข้อย่างไร รู้จักอวัยวะสำคัญและการปฐมพยาบาลเบื้องต้น ฝึกสังเกตและรักการทดลองวิทยาศาสตร์',
      middle: 'เตรียมความพร้อมเข้าสายการเรียน วิทย์-คณิต ม.ปลาย ฝึกทำโจทย์ชีววิทยา-เคมีพื้นฐาน และเริ่มทำกิจกรรมจิตอาสาเพื่อสังคม',
      high: 'ปั้น GPAX ให้ถึง 3.50+ เก็บ Portfolio สายสุขภาพ/จิตอาสาโรงพยาบาล และวางแผนติว TPAT1 + A-Level 7 วิชาหลัก',
    },
    quests: [
      { id: 'doc-q1', tier: 'daily_weekly', titleTh: 'พิชิตเกมตอบคำถามวิทยาศาสตร์ให้ได้ 80% ขึ้นไป', titleEn: 'Score 80%+ in Science Quiz', descriptionTh: 'ฝึกความแม่นยำวิชาวิทยาศาสตร์/ชีววิทยาในศูนย์รวมเกมการเรียนรู้', targetAppTab: 'games', expReward: 80, gemsReward: 20, skillTag: 'วิทยาศาสตร์' },
      { id: 'doc-q2', tier: 'daily_weekly', titleTh: 'เข้าห้องแล็บจำลองวิทยาศาสตร์ 1 การทดลอง', titleEn: 'Complete 1 Virtual Science Lab', descriptionTh: 'ทดลองผสมสารและวิเคราะห์ผลในห้องปฏิบัติการเสมือนจริง', targetAppTab: 'subject_labs', expReward: 90, gemsReward: 25, skillTag: 'การทดลอง' },
      { id: 'doc-q3', tier: 'daily_weekly', titleTh: 'มาเรียนตรงเวลาต่อเนื่องเพื่อฝึกวินัยแพทย์', titleEn: 'Maintain On-Time Attendance Discipline', descriptionTh: 'เช็คชื่อเข้าเรียนตรงเวลาอย่างน้อย 5 ครั้งในภาคเรียนนี้', targetAppTab: 'mobile_checkin', expReward: 70, gemsReward: 15, skillTag: 'ความรับผิดชอบ' },
      { id: 'doc-p1', tier: 'portfolio', titleTh: 'ทำอินโฟกราฟิกความรู้การปฐมพยาบาลเบื้องต้น', titleEn: 'Create a First-Aid Infographic', descriptionTh: 'สรุปวิธีปฐมพยาบาล (เช่น สำลัก แผลไฟไหม้ หรือ CPR เบื้องต้น) แล้วอัปโหลดเข้าแฟ้มผลงาน', targetAppTab: 'portfolio', expReward: 140, gemsReward: 40, skillTag: 'Portfolio สายแพทย์' },
      { id: 'doc-p2', tier: 'portfolio', titleTh: 'บันทึกกิจกรรมจิตอาสาหรือค่ายวิทยาศาสตร์สุขภาพ', titleEn: 'Log Health Volunteering / Science Camp', descriptionTh: 'อัปโหลดภาพถ่าย/เกียรติบัตรกิจกรรมจิตอาสาลง Digital Portfolio เพื่อสะสมประวัติ TCAS รอบ 1', targetAppTab: 'portfolio', expReward: 150, gemsReward: 45, skillTag: 'จิตอาสา' },
    ],
  },
  {
    id: 'career-programmer',
    titleTh: 'โปรแกรมเมอร์ / วิศวกรซอฟต์แวร์',
    titleEn: 'Software Engineer & AI Builder',
    category: 'tech',
    taglineTh: 'สร้างแอป เกม และระบบ AI ที่เปลี่ยนไอเดียให้เป็นผลิตภัณฑ์ที่คนนับล้านใช้งานได้จริง',
    taglineEn: 'Build apps, games, and AI products used by millions.',
    targetGpax: 3.0,
    unlockableTitleTh: 'Tech Builder',
    unlockableTitleEn: 'Tech Builder',
    examFocusHighTh: 'TGAT, TPAT3 (ความถนัดวิทยาศาสตร์ เทคโนโลยี และวิศวกรรมศาสตร์), A-Level คณิตศาสตร์ประยุกต์ 1 และฟิสิกส์',
    keySubjects: [
      { subjectKey: 'computer', labelTh: 'วิทยาการคำนวณ / เทคโนโลยี', labelEn: 'Computer Science', targetScore: 80, importance: 'core', reasonTh: 'ฝึกตรรกะ Algorithm และการแก้ปัญหาเชิงระบบ' },
      { subjectKey: 'math', labelTh: 'คณิตศาสตร์', labelEn: 'Mathematics', targetScore: 76, importance: 'core', reasonTh: 'พื้นฐานของตรรกะ โครงสร้างข้อมูล และโมเดล AI' },
      { subjectKey: 'english', labelTh: 'ภาษาอังกฤษ', labelEn: 'English', targetScore: 74, importance: 'supporting', reasonTh: 'ใช้อ่านเอกสารภาษาโปรแกรมและทำงานร่วมกับทีมทั่วโลก' },
    ],
    roadmaps: {
      primary: 'ฝึกคิดเป็นลำดับขั้นตอน (Algorithm) ผ่านเกมต่อบล็อกโค้ดดิ้งและปริศนาตรรกะสนุกๆ',
      middle: 'เริ่มฝึกเขียนโค้ดจริง (Python / HTML / JavaScript) และเลือกสาย วิทย์-คณิต หรือแผนคอมพิวเตอร์ในระดับ ม.ปลาย',
      high: 'ปั้นโปรเจกต์แอปหรือเว็บจริงเก็บเข้า GitHub/Portfolio ติว TPAT3 + A-Level คณิต 1 เตรียมยื่น TCAS คณะวิศวะคอม/วิทย์คอม',
    },
    quests: [
      { id: 'dev-q1', tier: 'daily_weekly', titleTh: 'ฝึกคำนวณไวกับ Meteor Math Blaster หรือเกมตรรกะ', titleEn: 'Train Logic in Math & ChronoSort Arcade', descriptionTh: 'ลับสมองด้านการคิดเร็วและการจัดลำดับขั้นตอนในศูนย์รวมเกม', targetAppTab: 'games', expReward: 75, gemsReward: 20, skillTag: 'ตรรกะ' },
      { id: 'dev-q2', tier: 'daily_weekly', titleTh: 'ถาม AI ติวเตอร์เจาะลึกแนวคิด Coding / คณิต 1 หัวข้อ', titleEn: 'Explore 1 Concept with AI Tutor', descriptionTh: 'ฝึกถาม-ตอบเชิงวิเคราะห์กับ AI Socratic Tutor เพื่อสร้างทักษะการตั้งคำถามแบบวิศวกร', targetAppTab: 'socratic_tutor', expReward: 80, gemsReward: 20, skillTag: 'การวิเคราะห์' },
      { id: 'dev-q3', tier: 'daily_weekly', titleTh: 'ส่งการบ้านตรงเวลาครบทุกชิ้นประจำสัปดาห์', titleEn: 'Submit Homework On Time', descriptionTh: 'ฝึกการบริหาร Deadline เหมือนทำงานในทีมพัฒนาซอฟต์แวร์จริง', targetAppTab: 'homework', expReward: 70, gemsReward: 15, skillTag: 'วินัย' },
      { id: 'dev-p1', tier: 'portfolio', titleTh: 'สร้างมินิโปรเจกต์แก้ปัญหาในโรงเรียน (Flowchart / Prototype)', titleEn: 'Design a School Mini-App Prototype', descriptionTh: 'ออกแบบแนวคิดแอปช่วยเพื่อนในโรงเรียนหรือเว็บสั้นๆ แล้วอัปโหลดลงแฟ้มผลงาน', targetAppTab: 'portfolio', expReward: 140, gemsReward: 40, skillTag: 'Portfolio Tech' },
      { id: 'dev-p2', tier: 'portfolio', titleTh: 'สะสมเกียรติบัตรแข่งเขียนโปรแกรม / Hackathon / STEM', titleEn: 'Add Coding or STEM Certificate', descriptionTh: 'อัปโหลดผลงานการเข้าร่วมแข่งขันหรืออบรมเทคโนโลยีเข้า Digital Portfolio', targetAppTab: 'portfolio', expReward: 150, gemsReward: 45, skillTag: 'ผลงานจริง' },
    ],
  },
  {
    id: 'career-teacher',
    titleTh: 'ครู / นักการศึกษา',
    titleEn: 'Educator & Learning Designer',
    category: 'education',
    taglineTh: 'จุดประกายความฝัน สร้างแรงบันดาลใจ และออกแบบการเรียนรู้ยุคใหม่ให้เด็กเติบโตอย่างมีความสุข',
    taglineEn: 'Inspire learners and design joyful, modern learning experiences.',
    targetGpax: 3.0,
    unlockableTitleTh: 'Future Teacher',
    unlockableTitleEn: 'Future Teacher',
    examFocusHighTh: 'TGAT และ TPAT5 (ความถนัดครุศาสตร์-ศึกษาศาสตร์) พร้อม A-Level ในวิชาเอกที่อยากสอน',
    keySubjects: [
      { subjectKey: 'thai', labelTh: 'ภาษาไทยและการสื่อสาร', labelEn: 'Thai & Communication', targetScore: 76, importance: 'core', reasonTh: 'สื่อสาร อธิบายเรื่องยากให้เข้าใจง่าย และถ่ายทอดความรู้ได้ชัดเจน' },
      { subjectKey: 'social', labelTh: 'สังคมศึกษา / จิตวิทยา', labelEn: 'Social Studies', targetScore: 74, importance: 'supporting', reasonTh: 'เข้าใจผู้เรียน สภาพสังคม และจรรยาบรรณวิชาชีพครู' },
      { subjectKey: 'english', labelTh: 'ภาษาอังกฤษ / วิชาเอกที่ถนัด', labelEn: 'English / Major Subject', targetScore: 74, importance: 'core', reasonTh: 'เตรียมความพร้อมด้านวิชาเอกและการพัฒนาสื่อการสอนสมัยใหม่' },
    ],
    roadmaps: {
      primary: 'ลองเป็น "คุณครูตัวน้อย" ช่วยอธิบายการบ้านให้เพื่อนหรือน้อง ฝึกพูดหน้าชั้นเรียนอย่างมั่นใจ',
      middle: 'สังเกตว่าตนเองชอบสอนวิชาไหนเป็นพิเศษ ฝึกทำสรุปบทเรียนสวยๆ และร่วมกิจกรรมจิตอาสาพัฒนาชุมชน',
      high: 'เตรียมตัวสอบ TPAT5 (ความถนัดทางวิชาชีพครู) ปั้น GPAX 3.00+ และสะสมพอร์ตกิจกรรมติวเพื่อนหรือค่ายอาสา',
    },
    quests: [
      { id: 'tch-q1', tier: 'daily_weekly', titleTh: 'ทำสรุปบทเรียนสั้นๆ 1 เรื่องให้เพื่อนเข้าใจง่าย', titleEn: 'Summarize 1 Lesson Clearly', descriptionTh: 'ฝึกเรียบเรียงความรู้กับ AI Socratic Tutor หรือบันทึกสรุปบทเรียนของตัวเอง', targetAppTab: 'socratic_tutor', expReward: 75, gemsReward: 20, skillTag: 'การถ่ายทอด' },
      { id: 'tch-q2', tier: 'daily_weekly', titleTh: 'ร่วมทีมภารกิจช่วยเพื่อนแก้โจทย์ (Co-op Boss Raid)', titleEn: 'Team Up in Co-op Boss Raid', descriptionTh: 'ฝึกการทำงานร่วมกับเพื่อนและช่วยกันแก้ปัญหาในโหมดทีม', targetAppTab: 'boss_raid', expReward: 85, gemsReward: 25, skillTag: 'การทำงานเป็นทีม' },
      { id: 'tch-q3', tier: 'daily_weekly', titleTh: 'ตอบคำถาม Quiz วิชาหลักที่ถนัดให้ผ่าน 80%', titleEn: 'Master Core Subject Quiz (80%+)', descriptionTh: 'เสริมความแม่นยำในวิชาเอกที่คุณอยากนำไปสอนในอนาคต', targetAppTab: 'games', expReward: 70, gemsReward: 15, skillTag: 'ความแม่นยำวิชาเอก' },
      { id: 'tch-p1', tier: 'portfolio', titleTh: 'สร้างสื่อการสอนหรือ Mind Map 1 ชิ้นลง Portfolio', titleEn: 'Upload a Teaching Aid or Mind Map', descriptionTh: 'ทำสื่อสรุปความรู้ Flashcards หรือวิดีโอสั้นอธิบายบทเรียนแล้วเก็บลงแฟ้มผลงาน', targetAppTab: 'portfolio', expReward: 140, gemsReward: 40, skillTag: 'สื่อการสอน' },
      { id: 'tch-p2', tier: 'portfolio', titleTh: 'บันทึกกิจกรรมติวเพื่อน / พี่สอนน้อง / จิตอาสา', titleEn: 'Log Peer-Tutoring Activity', descriptionTh: 'อัปโหลดภาพถ่ายกิจกรรมช่วยเพื่อนเรียนหรือค่ายอาสาเข้า Portfolio สำหรับยื่นครุศาสตร์', targetAppTab: 'portfolio', expReward: 150, gemsReward: 45, skillTag: 'จิตวิญญาณครู' },
    ],
  },
  {
    id: 'career-designer',
    titleTh: 'นักออกแบบ UX / ครีเอเตอร์ดิจิทัล',
    titleEn: 'UX Designer & Digital Creator',
    category: 'creative',
    taglineTh: 'ผสานศิลปะ จิตวิทยา และเทคโนโลยี เพื่อสร้างงานดีไซน์และคอนเทนต์ที่ผู้ใช้หลงรัก',
    taglineEn: 'Blend art, psychology, and tech to craft experiences people love.',
    targetGpax: 2.8,
    unlockableTitleTh: 'Creative Architect',
    unlockableTitleEn: 'Creative Architect',
    examFocusHighTh: 'TGAT, TPAT2 (ความถนัดศิลปกรรมศาสตร์) หรือสายออกแบบอินเตอร์/นิเทศฯ พร้อมพอร์ตผลงานออกแบบตัวจริง',
    keySubjects: [
      { subjectKey: 'arts', labelTh: 'ศิลปะและการออกแบบ', labelEn: 'Arts & Design', targetScore: 80, importance: 'core', reasonTh: 'รสนิยมด้านองค์ประกอบศิลป์ สี ตัวอักษร และการเล่าเรื่องด้วยภาพ' },
      { subjectKey: 'computer', labelTh: 'เทคโนโลยี / ดิจิทัลมีเดีย', labelEn: 'Digital Tech', targetScore: 75, importance: 'core', reasonTh: 'ใช้เครื่องมือออกแบบ Figma, UX Wireframe และงานมัลติมีเดีย' },
      { subjectKey: 'english', labelTh: 'ภาษาอังกฤษ', labelEn: 'English', targetScore: 72, importance: 'supporting', reasonTh: 'เข้าถึงเทรนด์ดีไซน์ระดับโลกและสื่อสารกับลูกค้าสากล' },
    ],
    roadmaps: {
      primary: 'ฝึกวาดภาพ เล่าเรื่องผ่านการ์ตูน/โปสเตอร์ และสังเกตว่าทำไมแอปหรือของเล่นบางอย่างถึงใช้ง่ายและสนุก',
      middle: 'ลองออกแบบโปสเตอร์ งานนำเสนอ หรือหน้าจอแอปง่ายๆ ด้วย Canva/Figma และสะสมผลงานไว้เรื่อยๆ',
      high: 'จัดทำ Portfolio รวม Case Study การออกแบบ 5-10 ชิ้น พร้อมเตรียมติว TGAT + TPAT2 สำหรับคณะสถาปัตย์/ศิลปกรรม/ดิจิทัลอาร์ต',
    },
    quests: [
      { id: 'ux-q1', tier: 'daily_weekly', titleTh: 'ทำภารกิจถ่ายภาพสังเกตองค์ประกอบรอบตัว (Snap Quest)', titleEn: 'Complete a Real-World Visual Snap Quest', descriptionTh: 'ฝึกสายตานักออกแบบในการมองหาสมมาตร แสง สี และรูปทรงรอบตัว', targetAppTab: 'realworld_quests', expReward: 80, gemsReward: 20, skillTag: 'การสังเกตภาพ' },
      { id: 'ux-q2', tier: 'daily_weekly', titleTh: 'ฝึกคำศัพท์ภาษาอังกฤษสายครีเอทีฟใน Word Builder', titleEn: 'Play Word Builder Puzzle', descriptionTh: 'เพิ่มคลังคำศัพท์สองภาษาเพื่อใช้สื่อสารแนวคิดงานดีไซน์', targetAppTab: 'games', expReward: 70, gemsReward: 18, skillTag: 'ภาษาสื่อสาร' },
      { id: 'ux-p1', tier: 'portfolio', titleTh: 'ออกแบบ Redesign หน้าแอปหรือโปสเตอร์กิจกรรมโรงเรียน', titleEn: 'Upload a Design Case Study to Portfolio', descriptionTh: 'อัปโหลดผลงานกราฟิก/UI พร้อมคำอธิบายแนวคิดลง Digital Portfolio', targetAppTab: 'portfolio', expReward: 145, gemsReward: 42, skillTag: 'Design Portfolio' },
    ],
  },
  {
    id: 'career-engineer',
    titleTh: 'วิศวกร / นักนวัตกรรม',
    titleEn: 'Engineer & Innovator',
    category: 'tech',
    taglineTh: 'ออกแบบโครงสร้าง พลังงาน หุ่นยนต์ และระบบอัจฉริยะที่แก้ปัญหาโลกจริงได้อย่างยั่งยืน',
    taglineEn: 'Design structures, robotics, and sustainable solutions for the real world.',
    targetGpax: 3.2,
    unlockableTitleTh: 'Iron Innovator',
    unlockableTitleEn: 'Iron Innovator',
    examFocusHighTh: 'TGAT, TPAT3 (ความถนัดทางวิทยาศาสตร์ เทคโนโลยี และวิศวกรรมศาสตร์), A-Level คณิต1 และฟิสิกส์',
    keySubjects: [
      { subjectKey: 'math', labelTh: 'คณิตศาสตร์', labelEn: 'Mathematics', targetScore: 80, importance: 'core', reasonTh: 'เครื่องมือคำนวณหลักของงานวิศวกรรมทุกสาขา' },
      { subjectKey: 'science', labelTh: 'วิทยาศาสตร์ / ฟิสิกส์-เคมี', labelEn: 'Physics & Science', targetScore: 78, importance: 'core', reasonTh: 'เข้าใจกฎธรรมชาติ กลศาสตร์ ไฟฟ้า และวัสดุศาสตร์' },
      { subjectKey: 'english', labelTh: 'ภาษาอังกฤษ', labelEn: 'English', targetScore: 72, importance: 'supporting', reasonTh: 'มาตรฐานวิศวกรรมและคู่มือเทคโนโลยีระดับสากล' },
    ],
    roadmaps: {
      primary: 'สนุกกับการต่อเลโก้ โครงสร้างกระดาษ และตั้งคำถามว่าสะพาน รถยนต์ หรือเครื่องใช้ไฟฟ้าทำงานอย่างไร',
      middle: 'เน้นคณิต-วิทย์ให้แน่น ลองเข้าชมรมหุ่นยนต์/STEM และฝึกต่อวงจรหรือทดลองวิทยาศาสตร์ในห้องแล็บ',
      high: 'เตรียมสอบ TPAT3 + A-Level คณิต1-ฟิสิกส์ ปั้น GPAX 3.20+ และทำโครงงานสิ่งประดิษฐ์ลง Portfolio',
    },
    quests: [
      { id: 'eng-q1', tier: 'daily_weekly', titleTh: 'ทดลองห้องแล็บจำลองวิทยาศาสตร์และฟิสิกส์ 1 ด่าน', titleEn: 'Complete 1 Virtual Lab Simulation', descriptionTh: 'ทดสอบสมมติฐานและการคำนวณในห้องปฏิบัติการเสมือนจริง', targetAppTab: 'subject_labs', expReward: 85, gemsReward: 22, skillTag: 'ทดลองวิศวกรรม' },
      { id: 'eng-q2', tier: 'daily_weekly', titleTh: 'วิเคราะห์จุดอ่อนวิชาคณิต-วิทย์ใน AI Diagnostic', titleEn: 'Run AI Skill Diagnostics', descriptionTh: 'เช็กจุดที่ต้องเสริมแล้วทำ Micro-Quest ปิดจุดอ่อนให้ครบ', targetAppTab: 'ai_diagnostic', expReward: 80, gemsReward: 20, skillTag: 'แก้จุดอ่อน' },
      { id: 'eng-p1', tier: 'portfolio', titleTh: 'ส่งโครงงานสิ่งประดิษฐ์ / STEM Project ลง Portfolio', titleEn: 'Upload STEM Invention Project', descriptionTh: 'บันทึกภาพและคำอธิบายสิ่งประดิษฐ์หรือโครงงานวิทย์ลงแฟ้มผลงาน', targetAppTab: 'portfolio', expReward: 150, gemsReward: 45, skillTag: 'STEM Portfolio' },
    ],
  },
  {
    id: 'career-vet',
    titleTh: 'สัตวแพทย์',
    titleEn: 'Veterinarian',
    category: 'medical',
    taglineTh: 'ดูแลรักษาชีวิตสัตว์เลี้ยงและสัตว์ป่าด้วยความเมตตาและวิทยาศาสตร์การแพทย์',
    taglineEn: 'Heal and protect animals through veterinary medicine and compassion.',
    targetGpax: 3.35,
    unlockableTitleTh: 'Animal Guardian',
    unlockableTitleEn: 'Animal Guardian',
    examFocusHighTh: 'กสพท / TGAT / TPAT1 และ A-Level ชีววิทยา เคมี คณิต1 อังกฤษ',
    keySubjects: [
      { subjectKey: 'science', labelTh: 'ชีววิทยาและเคมี', labelEn: 'Biology & Chemistry', targetScore: 78, importance: 'core', reasonTh: 'เข้าใจสรีรวิทยาของสัตว์หลายชนิดและการใช้ยาอย่างปลอดภัย' },
      { subjectKey: 'english', labelTh: 'ภาษาอังกฤษ', labelEn: 'English', targetScore: 74, importance: 'core', reasonTh: 'ใช้ศึกษาตำราสัตวแพทย์และงานวิจัยระดับนานาชาติ' },
      { subjectKey: 'math', labelTh: 'คณิตศาสตร์', labelEn: 'Mathematics', targetScore: 72, importance: 'supporting', reasonTh: 'คำนวณน้ำหนักตัวสัตว์และปริมาณยาอย่างแม่นยำ' },
    ],
    roadmaps: {
      primary: 'เรียนรู้การดูแลสัตว์เลี้ยงอย่างถูกวิธี สังเกตพฤติกรรมสัตว์และระบบนิเวศรอบตัว',
      middle: 'สร้างพื้นฐานชีววิทยา-เคมีให้แข็งแรง และร่วมกิจกรรมอนุรักษ์สัตว์หรืออาสาช่วยเหลือสัตว์',
      high: 'วางแผนสอบ กสพท/A-Level ชีวะ-เคมี พร้อมเก็บพอร์ตจิตอาสาคลินิกสัตว์หรือค่ายสัตวแพทย์',
    },
    quests: [
      { id: 'vet-q1', tier: 'daily_weekly', titleTh: 'ทำภารกิจถ่ายภาพธรรมชาติหรือสิ่งมีชีวิต (Snap Quest)', titleEn: 'Complete Biology Snap Quest', descriptionTh: 'สังเกตและถ่ายภาพสิ่งมีชีวิตหรือระบบนิเวศรอบตัวพร้อมวิเคราะห์', targetAppTab: 'realworld_quests', expReward: 80, gemsReward: 20, skillTag: 'ชีววิทยา' },
      { id: 'vet-q2', tier: 'daily_weekly', titleTh: 'เข้าห้องแล็บเคมี-ชีวะจำลอง 1 การทดลอง', titleEn: 'Run Virtual Chemistry Lab', descriptionTh: 'ฝึกทักษะการวิเคราะห์สารและปฏิกิริยาในห้องแล็บ', targetAppTab: 'subject_labs', expReward: 85, gemsReward: 22, skillTag: 'ห้องแล็บ' },
      { id: 'vet-p1', tier: 'portfolio', titleTh: 'บันทึกคู่มือดูแลสัตว์เลี้ยงหรือกิจกรรมจิตอาสาช่วยสัตว์', titleEn: 'Upload Animal Care Guide or Volunteering', descriptionTh: 'จัดทำบทความ/อินโฟกราฟิกดูแลสัตว์แล้วอัปโหลดลงแฟ้มผลงาน', targetAppTab: 'portfolio', expReward: 145, gemsReward: 40, skillTag: 'พอร์ตสัตวแพทย์' },
    ],
  },
  {
    id: 'career-chef',
    titleTh: 'เชฟ & นักนวัตกรรมอาหาร',
    titleEn: 'Chef & Food Innovator',
    category: 'culinary',
    taglineTh: 'สร้างสรรค์รสชาติ ศิลปะจานอาหาร และธุรกิจอาหารที่มอบความสุขให้ผู้คนทั่วโลก',
    taglineEn: 'Craft memorable flavors, culinary art, and modern food experiences.',
    targetGpax: 2.75,
    unlockableTitleTh: 'Master Chef',
    unlockableTitleEn: 'Master Chef',
    examFocusHighTh: 'TGAT, คณะคหกรรมศาสตร์ / เทคโนโลยีการอาหาร / การจัดการครัวและศิลปะการประกอบอาหาร (ใช้พอร์ตผลงานจริงได้โดดเด่นมาก)',
    keySubjects: [
      { subjectKey: 'science', labelTh: 'วิทยาศาสตร์การอาหาร / เคมี', labelEn: 'Food Science', targetScore: 70, importance: 'supporting', reasonTh: 'เข้าใจปฏิกิริยาความร้อน โภชนาการ และความปลอดภัยอาหาร' },
      { subjectKey: 'arts', labelTh: 'ศิลปะและการจัดจาน', labelEn: 'Culinary Arts', targetScore: 76, importance: 'core', reasonTh: 'การจับคู่สี พื้นผิว และสุนทรียศาสตร์บนจานอาหาร' },
      { subjectKey: 'english', labelTh: 'ภาษาอังกฤษ', labelEn: 'English', targetScore: 72, importance: 'core', reasonTh: 'ศัพท์ครัวสากลและการทำงานในโรงแรมหรือร้านอาหารระดับโลก' },
    ],
    roadmaps: {
      primary: 'ช่วยผู้ปกครองเข้าครัวอย่างปลอดภัย รู้จักวัตถุดิบ ผัก ผลไม้ และโภชนาการ 5 หมู่',
      middle: 'ทดลองสร้างสรรค์เมนูง่ายๆ ด้วยตนเอง ฝึกคิดสูตร คำนวณต้นทุนวัตถุดิบ และถ่ายภาพอาหาร',
      high: 'ปั้นแฟ้มผลงานสูตรอาหารที่พัฒนาเอง แข่งขันทำอาหารระดับโรงเรียน/จังหวัด และเตรียมภาษาอังกฤษสายบริการ',
    },
    quests: [
      { id: 'chef-q1', tier: 'daily_weekly', titleTh: 'ฝึกปฏิกิริยาเคมีอาหารในห้องแล็บจำลอง', titleEn: 'Explore Food Chemistry in Virtual Lab', descriptionTh: 'เรียนรู้เรื่องกรด-เบสและความร้อนที่เป็นพื้นฐานของการปรุงอาหาร', targetAppTab: 'subject_labs', expReward: 80, gemsReward: 20, skillTag: 'Food Science' },
      { id: 'chef-q2', tier: 'daily_weekly', titleTh: 'ฝึกคำศัพท์ภาษาอังกฤษใน Word Builder', titleEn: 'Practice English Vocabulary', descriptionTh: 'สะสมคำศัพท์ภาษาอังกฤษเพื่อสื่อสารในครัวสากล', targetAppTab: 'games', expReward: 70, gemsReward: 15, skillTag: 'ภาษาอังกฤษ' },
      { id: 'chef-p1', tier: 'portfolio', titleTh: 'อัปโหลดสูตรอาหารสร้างสรรค์พร้อมภาพจัดจานลง Portfolio', titleEn: 'Upload Original Recipe Portfolio', descriptionTh: 'ถ่ายภาพจานอาหารที่ทำเองพร้อมวิธีทำและแนวคิดโภชนาการเก็บในแฟ้มผลงาน', targetAppTab: 'portfolio', expReward: 140, gemsReward: 40, skillTag: 'Culinary Portfolio' },
    ],
  },
  {
    id: 'career-business',
    titleTh: 'นักธุรกิจ / ผู้ประกอบการ Gen Z',
    titleEn: 'Entrepreneur & Startup Founder',
    category: 'business',
    taglineTh: 'มองเห็นโอกาส สร้างแบรนด์ บริหารทีม และเปลี่ยนไอเดียธุรกิจให้เติบโตอย่างยั่งยืน',
    taglineEn: 'Spot opportunities, build brands, and lead innovative ventures.',
    targetGpax: 3.0,
    unlockableTitleTh: 'Startup Founder',
    unlockableTitleEn: 'Startup Founder',
    examFocusHighTh: 'TGAT, A-Level คณิตศาสตร์ประยุกต์ 1-2 และภาษาอังกฤษ สำหรับคณะบริหารธุรกิจ / พาณิชยศาสตร์และการบัญชี / เศรษฐศาสตร์',
    keySubjects: [
      { subjectKey: 'math', labelTh: 'คณิตศาสตร์ / การเงิน', labelEn: 'Business Math', targetScore: 75, importance: 'core', reasonTh: 'วิเคราะห์กำไร-ขาดทุน สถิติตลาด และการตัดสินใจเชิงตัวเลข' },
      { subjectKey: 'english', labelTh: 'ภาษาอังกฤษ', labelEn: 'English', targetScore: 76, importance: 'core', reasonTh: 'เจรจาธุรกิจ การตลาดดิจิทัล และขยายตลาดต่างประเทศ' },
      { subjectKey: 'social', labelTh: 'สังคมศึกษา / เศรษฐศาสตร์', labelEn: 'Economics & Social', targetScore: 74, importance: 'supporting', reasonTh: 'เข้าใจพฤติกรรมผู้บริโภค กฎหมายธุรกิจ และกลไกเศรษฐกิจ' },
    ],
    roadmaps: {
      primary: 'ฝึกออมเงิน รู้จักรายรับ-รายจ่าย และลองขายของในกิจกรรมตลาดนัดโรงเรียน',
      middle: 'หัดวางแผนโปรเจกต์สั้นๆ ตั้งราคาขาย คำนวณกำไร และฝึกทักษะการนำเสนอ (Pitching)',
      high: 'ปั้นโปรเจกต์ธุรกิจจำลองหรือร้านค้าออนไลน์จริง เตรียมสอบ TGAT + A-Level คณิต-อังกฤษ เข้าคณะบริหาร/บัญชี',
    },
    quests: [
      { id: 'biz-q1', tier: 'daily_weekly', titleTh: 'ฝึกความไวตัวเลขและการตัดสินใจใน Meteor Blaster', titleEn: 'Sharpen Numeracy in Arcade', descriptionTh: 'ลับคมการคิดคำนวณไวสำหรับงานการเงินและวางแผนธุรกิจ', targetAppTab: 'games', expReward: 75, gemsReward: 20, skillTag: 'การคำนวณธุรกิจ' },
      { id: 'biz-q2', tier: 'daily_weekly', titleTh: 'ร่วม Co-op Boss Raid ฝึกภาวะผู้นำทีม', titleEn: 'Lead Team in Co-op Boss Raid', descriptionTh: 'ฝึกสื่อสารและวางกลยุทธ์ร่วมกับเพื่อนในทีม', targetAppTab: 'boss_raid', expReward: 85, gemsReward: 22, skillTag: 'ภาวะผู้นำ' },
      { id: 'biz-p1', tier: 'portfolio', titleTh: 'ทำแผนธุรกิจ Mini Business Model Canvas ลง Portfolio', titleEn: 'Upload Mini Business Plan', descriptionTh: 'สรุปไอเดียสินค้า กลุ่มเป้าหมาย และงบประมาณ 1 หน้าลงแฟ้มผลงาน', targetAppTab: 'portfolio', expReward: 145, gemsReward: 40, skillTag: 'Business Portfolio' },
    ],
  },
  {
    id: 'career-pilot',
    titleTh: 'นักบินพาณิชย์',
    titleEn: 'Commercial Airline Pilot',
    category: 'aviation',
    taglineTh: 'ควบคุมอากาศยานพาผู้โดยสารสู่จุดหมายอย่างปลอดภัยด้วยสติ ความแม่นยำ และวินัยระดับสากล',
    taglineEn: 'Command aircraft safely across the skies with precision and discipline.',
    targetGpax: 3.1,
    unlockableTitleTh: 'Sky Captain',
    unlockableTitleEn: 'Sky Captain',
    examFocusHighTh: 'TGAT, TPAT3, A-Level ฟิสิกส์-คณิต-อังกฤษ และมาตรฐานภาษาอังกฤษการบิน (ICAO Level 4+) รวมถึงความแข็งแรงของสายตาและร่างกาย',
    keySubjects: [
      { subjectKey: 'english', labelTh: 'ภาษาอังกฤษ', labelEn: 'Aviation English', targetScore: 82, importance: 'core', reasonTh: 'การสื่อสารกับหอบังคับการบินทั่วโลกใช้ภาษาอังกฤษ 100%' },
      { subjectKey: 'math', labelTh: 'คณิตศาสตร์', labelEn: 'Mathematics', targetScore: 76, importance: 'core', reasonTh: 'คำนวณเส้นทางบิน ความเร็วลม เชื้อเพลิง และเวลา' },
      { subjectKey: 'science', labelTh: 'ฟิสิกส์ / วิทยาศาสตร์', labelEn: 'Physics', targetScore: 76, importance: 'core', reasonTh: 'เข้าใจอากาศพลศาสตร์ แรงยก และสภาพอากาศ' },
    ],
    roadmaps: {
      primary: 'ฝึกสังเกตท้องฟ้า สภาพอากาศ การอ่านแผนที่ทิศทาง และดูแลสุขภาพสายตา-ร่างกายให้แข็งแรง',
      middle: 'พัฒนาภาษาอังกฤษการฟัง-พูดให้คล่อง เน้นคณิตศาสตร์และวิทยาศาสตร์เรื่องแรงและการเคลื่อนที่',
      high: 'รักษาวินัยและ GPAX 3.10+ เตรียมสอบวิศวกรรมการบิน/วิทยาศาสตร์การบิน และฝึกทดสอบปฏิกิริยา-การคิดวิเคราะห์',
    },
    quests: [
      { id: 'plt-q1', tier: 'daily_weekly', titleTh: 'ฝึกความไวและการตัดสินใจภายใต้เวลาใน ChronoSort', titleEn: 'Train Rapid Decision Making', descriptionTh: 'ฝึกสมาธิและจัดลำดับเหตุการณ์อย่างแม่นยำภายใต้เวลาจำกัด', targetAppTab: 'games', expReward: 80, gemsReward: 20, skillTag: 'สมาธิและสติ' },
      { id: 'plt-q2', tier: 'daily_weekly', titleTh: 'เช็กชื่อตรงเวลาสม่ำเสมอฝึกวินัยนักบิน', titleEn: 'Keep Punctual Check-in Streak', descriptionTh: 'ความตรงต่อเวลาคือหัวใจของอุตสาหกรรมการบิน', targetAppTab: 'mobile_checkin', expReward: 75, gemsReward: 18, skillTag: 'วินัยตรงเวลา' },
      { id: 'plt-p1', tier: 'portfolio', titleTh: 'สรุปความรู้เรื่องหลักอากาศพลศาสตร์หรือค่ายการบินลง Portfolio', titleEn: 'Upload Aviation Learning Log', descriptionTh: 'สร้างงานสรุปเรื่องแรงยกของปีกเครื่องบินหรือเกียรติบัตรค่ายวิทยาศาสตร์การบิน', targetAppTab: 'portfolio', expReward: 145, gemsReward: 40, skillTag: 'Aviation Portfolio' },
    ],
  },
];

export const CAREER_VIBE_QUIZ_QUESTIONS: CareerVibeQuizQuestion[] = [
  {
    id: 'vq-1',
    questionTh: 'เวลาว่างหรือทำโปรเจกต์กับเพื่อน คุณมักจะสนุกกับบทบาทไหนที่สุด?',
    questionEn: 'In a group project, which role energizes you the most?',
    options: [
      { id: 'vq-1-a', labelTh: 'คิดค้นสร้างของใหม่ เขียนโค้ด หรือต่อระบบให้ใช้งานได้จริง', labelEn: 'Building apps, tech prototypes, or systems', traitTag: 'Builder & Logic', recommendedCategories: ['tech', 'science'] },
      { id: 'vq-1-b', labelTh: 'ดูแลช่วยเหลือคนอื่น ฟังปัญหา หรือหาทางรักษาให้ดีขึ้น', labelEn: 'Caring, healing, and helping others directly', traitTag: 'Healer & Empathy', recommendedCategories: ['medical', 'education'] },
      { id: 'vq-1-c', labelTh: 'ออกแบบหน้าตา ทำภาพสวยๆ ตัดต่อ หรือเล่าเรื่องให้น่าสนใจ', labelEn: 'Designing visuals, UX, and storytelling', traitTag: 'Creator & Visual', recommendedCategories: ['creative', 'culinary'] },
      { id: 'vq-1-d', labelTh: 'วางแผนภาพรวม บริหารทีม นำเสนอไอเดียและต่อยอดโอกาส', labelEn: 'Planning strategy, leading teams, and pitching', traitTag: 'Leader & Strategist', recommendedCategories: ['business', 'aviation'] },
    ],
  },
  {
    id: 'vq-2',
    questionTh: 'ถ้าให้เลือกห้องปฏิบัติการพิเศษ 1 ห้อง คุณจะเดินเข้าห้องไหนก่อน?',
    questionEn: 'Which special lab would you walk into first?',
    options: [
      { id: 'vq-2-a', labelTh: 'ห้องแล็บชีวะ-การแพทย์ ส่องกล้องจุลทรรศน์และเรียนรู้ร่างกาย', labelEn: 'Bio & Medical Simulation Lab', traitTag: 'Life Science', recommendedCategories: ['medical'] },
      { id: 'vq-2-b', labelTh: 'ห้องคอมพิวเตอร์และ AI ทดลองสร้างเกมและแอปพลิเคชัน', labelEn: 'AI, Robotics & Coding Lab', traitTag: 'Tech & Systems', recommendedCategories: ['tech'] },
      { id: 'vq-2-c', labelTh: 'สตูดิโอสร้างสรรค์ งานดีไซน์ ครัวทดลองสูตร หรือห้องสื่อ', labelEn: 'Design Studio & Culinary Lab', traitTag: 'Art & Craft', recommendedCategories: ['creative', 'culinary'] },
      { id: 'vq-2-d', labelTh: 'ห้องจำลองการสอน การบิน หรือห้องวางแผนธุรกิจสตาร์ทอัพ', labelEn: 'Teaching, Flight & Startup Arena', traitTag: 'People & Operations', recommendedCategories: ['education', 'business', 'aviation'] },
    ],
  },
  {
    id: 'vq-3',
    questionTh: 'เมื่อเจอปัญหาที่ยากและซับซ้อน วิธีแก้ปัญหาสไตล์คุณคือ?',
    questionEn: 'How do you usually tackle a tough problem?',
    options: [
      { id: 'vq-3-a', labelTh: 'แยกเป็นขั้นตอนย่อยๆ แล้วเช็กทีละจุดแบบเป็นระบบ', labelEn: 'Break it into logical steps and debug systematically', traitTag: 'Systematic Solver', recommendedCategories: ['tech', 'aviation'] },
      { id: 'vq-3-b', labelTh: 'ค้นหาสาเหตุเชิงลึกจากหลักฐานและข้อมูลทางวิทยาศาสตร์', labelEn: 'Investigate root causes with scientific evidence', traitTag: 'Diagnostic Thinker', recommendedCategories: ['medical', 'science'] },
      { id: 'vq-3-c', labelTh: 'ชวนคนรอบข้างคุย แลกเปลี่ยนมุมมอง แล้วหาวิธีที่ทุกคนแฮปปี้', labelEn: 'Communicate and collaborate with people', traitTag: 'Empathetic Communicator', recommendedCategories: ['education', 'business'] },
      { id: 'vq-3-d', labelTh: 'ลองพลิกมุมมองใหม่ๆ คิดนอกกรอบจนได้วิธีที่สร้างสรรค์', labelEn: 'Think outside the box with creative experiments', traitTag: 'Creative Experimenter', recommendedCategories: ['creative', 'culinary'] },
    ],
  },
  {
    id: 'vq-4',
    questionTh: 'ความภูมิใจแบบไหนที่ทำให้คุณยิ้มกว้างที่สุด?',
    questionEn: 'What kind of achievement makes you proudest?',
    options: [
      { id: 'vq-4-a', labelTh: 'เห็นคนที่เราดูแลหรือสอน หายดีหรือเข้าใจเรื่องยากๆ ได้', labelEn: 'Seeing someone recover or finally understand a concept', traitTag: 'Impact on Lives', recommendedCategories: ['medical', 'education'] },
      { id: 'vq-4-b', labelTh: 'เห็นโค้ด สิ่งประดิษฐ์ หรือระบบที่เราสร้างรันผ่านฉลุย', labelEn: 'Watching a system or invention I built work seamlessly', traitTag: 'Build & Ship', recommendedCategories: ['tech', 'aviation'] },
      { id: 'vq-4-c', labelTh: 'เห็นคนชอบผลงานดีไซน์ เมนูอาหาร หรือคอนเทนต์ที่เราทำ', labelEn: 'People loving my design, dish, or creative work', traitTag: 'Craft & Aesthetic', recommendedCategories: ['creative', 'culinary'] },
      { id: 'vq-4-d', labelTh: 'โปรเจกต์ที่วางแผนไว้ประสบความสำเร็จและเติบโตตามเป้า', labelEn: 'Hitting goals with a smart business strategy', traitTag: 'Growth & Strategy', recommendedCategories: ['business'] },
    ],
  },
  {
    id: 'vq-5',
    questionTh: 'บรรยากาศการทำงานในฝันของคุณเป็นแบบไหน?',
    questionEn: 'What dream work environment suits you best?',
    options: [
      { id: 'vq-5-a', labelTh: 'คลินิก โรงพยาบาล หรือพื้นที่ช่วยเหลือผู้คน/สัตว์โดยตรง', labelEn: 'Hospital, clinic, or hands-on care setting', traitTag: 'Care Environment', recommendedCategories: ['medical'] },
      { id: 'vq-5-b', labelTh: 'Tech Startup / ห้องปฏิบัติการนวัตกรรมที่ทันสมัยและคล่องตัว', labelEn: 'Modern tech lab or agile product team', traitTag: 'Tech Environment', recommendedCategories: ['tech', 'business'] },
      { id: 'vq-5-c', labelTh: 'โรงเรียน มหาวิทยาลัย หรือชุมชนแห่งการเรียนรู้ที่อบอุ่น', labelEn: 'Classroom, campus, or community learning space', traitTag: 'Learning Community', recommendedCategories: ['education'] },
      { id: 'vq-5-d', labelTh: 'สตูดิโอสร้างสรรค์ ครัวเชฟ หรือการเดินทางสู่สถานที่ใหม่ๆ', labelEn: 'Creative studio, kitchen, or global travel', traitTag: 'Dynamic Studio', recommendedCategories: ['creative', 'culinary', 'aviation'] },
    ],
  },
];

export function getOfflineStarterRoleplayTurn(
  career: CareerProfile,
  turnNumber: number,
  chosenLabel?: string
): CareerRoleplayTurn {
  const cat = career.category;
  if (turnNumber === 1) {
    if (cat === 'medical') {
      return {
        turnNumber: 1,
        sceneTitleTh: `ด่านที่ 1: ห้องตรวจฉุกเฉิน (${career.titleTh})`,
        situationTh: 'น้องนักเรียนชั้น ม.2 เดินเข้ามาที่ห้องพยาบาลพร้อมอาการปวดท้องด้านขวา มีไข้ต่ำ 38.0°C และคลื่นไส้ตั้งแต่เมื่อเช้า',
        npcDialogueTh: '"พี่หมอครับ ผมปวดท้องตั้งแต่เช้าเลย กินข้าวไม่ลงแล้วครับ..."',
        choices: [
          { id: 'c1', labelTh: 'ซักประวัติละเอียด: เริ่มปวดตรงไหน ย้ายจุดปวดไหม และมีไข้/อาเจียนกี่ครั้ง', skillHint: 'การคิดวิเคราะห์' },
          { id: 'c2', labelTh: 'ให้ยาแก้ปวดท้องทันทีแล้วให้นอนพักโดยยังไม่ถามอาการเพิ่ม', skillHint: 'ความเร่งด่วน' },
          { id: 'c3', labelTh: 'ปลอบใจให้น้องคลายกังวล วัดไข้-ชีพจรเบื้องต้น และติดต่อผู้ปกครอง/พยาบาล', skillHint: 'ความเห็นอกเห็นใจ' },
        ],
        isCompleted: false,
      };
    }
    if (cat === 'education') {
      return {
        turnNumber: 1,
        sceneTitleTh: `ด่านที่ 1: ห้องเรียนจำลอง (${career.titleTh})`,
        situationTh: 'ระหว่างสอนคาบคณิตศาสตร์/วิทย์ มีนักเรียน 2 คนเริ่มเถียงกันเสียงดังเรื่องวิธีทำโจทย์กลุ่ม และเพื่อนอีกกลุ่มดูมึนงงกับเนื้อหา',
        npcDialogueTh: '"ครูครับ โจทย์ข้อนี้มันงงมากเลย เพื่อนก็ไม่ยอมฟังวิธีของผมด้วย!"',
        choices: [
          { id: 'c1', labelTh: 'หยุดฟังทั้งสองฝ่ายอย่างใจเย็น ชวนเปรียบเทียบข้อดีของทั้ง 2 วิธีบนกระดาน', skillHint: 'การสื่อสาร & Empathy' },
          { id: 'c2', labelTh: 'สั่งให้เงียบทันทีและเปิดเฉลยบนจอให้ทุกคนลอกตาม', skillHint: 'ควบคุมชั้นเรียน' },
          { id: 'c3', labelTh: 'สรุปแนวคิดหลักให้เห็นภาพง่ายขึ้น 1 นาที แล้วจับคู่บัดดี้ช่วยกันลองทำ', skillHint: 'การออกแบบการเรียนรู้' },
        ],
        isCompleted: false,
      };
    }
    if (cat === 'tech') {
      return {
        turnNumber: 1,
        sceneTitleTh: `ด่านที่ 1: วิกฤตก่อนส่งงาน 30 นาที (${career.titleTh})`,
        situationTh: 'แอปโปรเจกต์ของทีมเพิ่งค้างและขึ้นหน้าจอขาวตอนกดปุ่มส่งข้อมูล ทั้งที่กำลังจะนำเสนอต่อกรรมการในอีก 30 นาที!',
        npcDialogueTh: '"เฮ้ย! เมื่อกี้ยังรันได้อยู่เลย ทำไมพอกดปุ่ม Submit แล้วหน้าจอดับไปหมดเลยอะ!"',
        choices: [
          { id: 'c1', labelTh: 'เปิด Console/Logs ดู Error บรรทัดแรก ตรวจสอบ Network Request และล่าสุดที่แก้โค้ด', skillHint: 'การคิดวิเคราะห์ระบบ' },
          { id: 'c2', labelTh: 'ลบไฟล์ทั้งหมดแล้วเริ่มเขียนหน้า Submit ใหม่ตั้งแต่ต้น', skillHint: 'ความเร่งรีบ' },
          { id: 'c3', labelTh: 'ตั้งสติ แบ่งงานเพื่อน: คนหนึ่งเช็ก Error Log อีกคนเตรียมสไลด์สำรองพร้อม Demo', skillHint: 'การแก้ปัญหาเป็นทีม' },
        ],
        isCompleted: false,
      };
    }
    return {
      turnNumber: 1,
      sceneTitleTh: `ด่านที่ 1: สถานการณ์ภาคสนาม (${career.titleTh})`,
      situationTh: `คุณได้รับมอบหมายภารกิจสำคัญแรกในฐานะ ${career.titleTh} เพื่อแก้โจทย์เฉพาะหน้าให้ทีมและผู้ใช้ประทับใจ`,
      npcDialogueTh: '"ตอนนี้เรามีเวลาจำกัดและทุกคนกำลังรอการตัดสินใจของคุณอยู่ เริ่มจากจุดไหนดีครับ?"',
      choices: [
        { id: 'c1', labelTh: 'เก็บข้อมูลความต้องการจริงและวิเคราะห์ปัญหาหลักให้ชัดก่อนลงมือ', skillHint: 'การคิดวิเคราะห์' },
        { id: 'c2', labelTh: 'สื่อสารกับทีมและผู้เกี่ยวข้องเพื่อรับฟังมุมมองและแบ่งหน้าที่ให้ชัดเจน', skillHint: 'การสื่อสาร & Empathy' },
        { id: 'c3', labelTh: 'ทำต้นแบบเร็วๆ เพื่อทดสอบสมมติฐานแล้วปรับปรุงจากผลลัพธ์จริง', skillHint: 'การแก้ปัญหาเชิงรุก' },
      ],
      isCompleted: false,
    };
  }

  if (turnNumber === 2) {
    return {
      turnNumber: 2,
      sceneTitleTh: `ด่านที่ 2: จุดเปลี่ยนสำคัญของภารกิจ (${career.titleTh})`,
      situationTh: 'หลังจากคุณตัดสินใจในตาแรก สถานการณ์เริ่มคลี่คลายขึ้น แต่พบข้อมูลใหม่ที่ต้องใช้การสื่อสารและความรอบคอบมากขึ้นกว่าเดิม',
      npcDialogueTh: '"ข้อมูลใหม่ที่เพิ่งเข้ามาดูซับซ้อนขึ้นนิดหน่อย เราควรสื่อสารหรือจัดการขั้นต่อไปยังไงดี?"',
      turnFeedbackTh: chosenLabel
        ? `เยี่ยมมาก! การเลือก "${chosenLabel}" ช่วยวางพื้นฐานที่ดี ทำให้คุณเห็นข้อมูลสำคัญก่อนตัดสินใจขั้นถัดไป`
        : undefined,
      choices: [
        { id: 'c1', labelTh: 'อธิบายเหตุผลและขั้นตอนอย่างชัดเจนด้วยภาษาที่ทุกคนเข้าใจง่าย', skillHint: 'การสื่อสาร' },
        { id: 'c2', labelTh: 'ตรวจสอบหลักฐาน/ตัวเลขซ้ำอีกครั้งเพื่อลดความผิดพลาดให้เหลือศูนย์', skillHint: 'ความแม่นยำ' },
        { id: 'c3', labelTh: 'เช็กความรู้สึกและความพร้อมของคนรอบข้างก่อนเดินหน้าต่อ', skillHint: 'ความเห็นอกเห็นใจ' },
      ],
      isCompleted: false,
    };
  }

  return {
    turnNumber: 3,
    sceneTitleTh: `สรุปภารกิจจำลองอาชีพ ${career.titleTh}`,
    situationTh: 'ภารกิจจำลองเสร็จสมบูรณ์! คุณพาทีมและผู้เกี่ยวข้องผ่านสถานการณ์ท้าทายได้อย่างมืออาชีพ',
    npcDialogueTh: '"ขอบคุณมากครับ! วิธีคิดและการสื่อสารของคุณในวันนี้ช่วยให้ทุกอย่างผ่านไปได้ด้วยดีเลย"',
    turnFeedbackTh: chosenLabel
      ? `ปิดเกมอย่างสวยงามด้วยการเลือก "${chosenLabel}" แสดงถึงวุฒิภาวะและความพร้อมในสายอาชีพ ${career.titleTh}`
      : undefined,
    choices: [],
    isCompleted: true,
    skillScores: {
      analytical: 86,
      communication: 88,
      empathy: 90,
      problemSolving: 85,
    },
    summaryFeedbackTh: `ยอดเยี่ยมมาก! คุณแสดงให้เห็นทั้งทักษะการวิเคราะห์ ความเห็นอกเห็นใจ และการแก้ปัญหาเฉพาะหน้าได้อย่างสมดุล เหมาะกับเส้นทางสู่ ${career.titleTh} มาก ลองเล่นโหมด Gemini AI เพื่อเจอด่านสถานการณ์ใหม่ๆ ที่ไม่ซ้ำกันได้เลย!`,
  };
}
