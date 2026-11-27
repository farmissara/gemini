import type { CropId, ProductId, SchoolFarmState } from './schoolFarmEngine';
import { CROP_CATALOG, PRODUCT_CATALOG } from './schoolFarmEngine';

export type LifeSubjectId =
  | 'science_tech'
  | 'math'
  | 'thai'
  | 'foreign_lang'
  | 'social'
  | 'health_pe'
  | 'arts'
  | 'career_tech';

export interface LifeSubjectMeta {
  id: LifeSubjectId;
  nameTh: string;
  shortTh: string;
  nameEn: string;
  farmRoleTh: string;
  accentHex: string;
}

export const LIFE_SUBJECT_CATALOG: LifeSubjectMeta[] = [
  {
    id: 'science_tech',
    nameTh: 'วิทยาศาสตร์และเทคโนโลยี',
    shortTh: 'วิทยาศาสตร์ฯ',
    nameEn: 'Science & Tech',
    farmRoleTh: 'องค์ประกอบของน้ำ สังเคราะห์แสง ดิน-ปุ๋ย และสมุนไพรเปลี่ยนสี',
    accentHex: '#0284c7',
  },
  {
    id: 'math',
    nameTh: 'คณิตศาสตร์',
    shortTh: 'คณิตศาสตร์',
    nameEn: 'Mathematics',
    farmRoleTh: 'คิดเงินขายผลผลิต ทอนเงินลูกค้าคาเฟ่ และสัดส่วนวัตถุดิบ',
    accentHex: '#d97706',
  },
  {
    id: 'thai',
    nameTh: 'ภาษาไทย',
    shortTh: 'ภาษาไทย',
    nameEn: 'Thai Language',
    farmRoleTh: 'สื่อสารรับแขกสุภาพ สำนวนเกษตรไทย และป้ายชื่อเมนูคาเฟ่',
    accentHex: '#dc2626',
  },
  {
    id: 'foreign_lang',
    nameTh: 'ภาษาต่างประเทศ',
    shortTh: 'ภาษาอังกฤษ',
    nameEn: 'Foreign Languages',
    farmRoleTh: 'รับออเดอร์นักท่องเที่ยวต่างชาติ และคำศัพท์วัตถุดิบสวน',
    accentHex: '#4f46e5',
  },
  {
    id: 'social',
    nameTh: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
    shortTh: 'สังคมศึกษาฯ',
    nameEn: 'Social Studies',
    farmRoleTh: 'เกษตรทฤษฎีใหม่ เศรษฐกิจพอเพียง และกลไกราคาตลาดชุมชน',
    accentHex: '#b45309',
  },
  {
    id: 'health_pe',
    nameTh: 'สุขศึกษาและพลศึกษา',
    shortTh: 'สุขศึกษาฯ',
    nameEn: 'Health & PE',
    farmRoleTh: 'โภชนาการสมุนไพร ลดหวานเพื่อสุขภาพ และสุขอนามัยอาหาร',
    accentHex: '#16a34a',
  },
  {
    id: 'arts',
    nameTh: 'ศิลปะ',
    shortTh: 'ศิลปะ',
    nameEn: 'Arts & Design',
    farmRoleTh: 'จัดจานสีคู่ตรงข้าม จัดมุมสวนธรรมชาติ และหัตถกรรมไม้ไผ่',
    accentHex: '#db2777',
  },
  {
    id: 'career_tech',
    nameTh: 'การงานอาชีพ',
    shortTh: 'การงานอาชีพ',
    nameEn: 'Occupations',
    farmRoleTh: 'ลำดับขั้นตอนแปรรูป การถนอมอาหาร และบริหารเวลาในครัว',
    accentHex: '#0d9488',
  },
];

export const LIFE_SUBJECT_MAP: Record<LifeSubjectId, LifeSubjectMeta> = LIFE_SUBJECT_CATALOG.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<LifeSubjectId, LifeSubjectMeta>
);

export interface LifeChallengeScenario {
  id: string;
  subjectId: LifeSubjectId;
  subjectNameTh: string;
  contextActionTh: string;
  questionTh: string;
  options: string[];
  correctIndex: number;
  realLifeTipTh: string;
  rewardCoins: number;
  rewardWater: number;
  rewardXp: number;
  rewardStars: number;
}

const CROP_SCIENCE_BANK: Record<
  CropId,
  Array<{
    contextActionTh: string;
    questionTh: string;
    options: string[];
    correctIndex: number;
    realLifeTipTh: string;
  }>
> = {
  jasmine_rice: [
    {
      contextActionTh: 'รดน้ำแปลงข้าวหอมมะลิ',
      questionTh: 'การปลูกข้าวต้องใช้น้ำหล่อเลี้ยงต้นข้าว น้ำ (H₂O) 1 โมเลกุล ประกอบไปด้วยธาตุใดบ้าง?',
      options: [
        'ไฮโดรเจน 2 อะตอม และออกซิเจน 1 อะตอม',
        'คาร์บอน 2 อะตอม และไนโตรเจน 1 อะตอม',
        'ออกซิเจน 2 อะตอม และฮีเลียม 1 อะตอม',
        'โซเดียม 1 อะตอม และคลอรีน 1 อะตอม',
      ],
      correctIndex: 0,
      realLifeTipTh: 'น้ำ (H₂O) ช่วยลำเลียงแร่ธาตุจากดินผ่านท่อไซเล็มขึ้นไปเลี้ยงเมล็ดข้าวและช่วยคายน้ำคลายร้อนให้พืช',
    },
    {
      contextActionTh: 'ดูแลต้นข้าวกลางแสงแดด',
      questionTh: 'ต้นข้าวหอมมะลิใช้สิ่งใดเป็นวัตถุดิบหลักร่วมกับน้ำในการสังเคราะห์ด้วยแสงสร้างแป้งในเมล็ดข้าว?',
      options: [
        'แก๊สคาร์บอนไดออกไซด์และแสงแดด',
        'แก๊สมีเทนและแสงจันทร์',
        'ไอน้ำมันและแร่เหล็ก',
        'แก๊สไนโตรเจนบริสุทธิ์เท่านั้น',
      ],
      correctIndex: 0,
      realLifeTipTh: 'คลอโรฟิลล์ในใบข้าวรับพลังงานแสงเปลี่ยนน้ำกับ CO₂ ให้เป็นน้ำตาลและสะสมเป็นแป้งในเมล็ดข้าว',
    },
  ],
  butterfly_pea: [
    {
      contextActionTh: 'เก็บดอกอัญชันเข้าคาเฟ่',
      questionTh: 'เมื่อบีบน้ำมะนาวที่มีฤทธิ์เป็นกรดลงในน้ำดอกอัญชันสีน้ำเงิน น้ำอัญชันจะเปลี่ยนเป็นสีใดเพราะเหตุใด?',
      options: [
        'สีม่วงอมแดง เพราะสารแอนโทไซยานินไวต่อค่าความเป็นกรด-เบส (pH)',
        'สีเขียวเข้ม เพราะคลอโรฟิลล์ละลายออกมา',
        'ใสไร้สี เพราะน้ำมะนาวฟอกสีดอกไม้',
        'สีดำสนิท เพราะเกิดปฏิกิริยาเผาไหม้',
      ],
      correctIndex: 0,
      realLifeTipTh: 'สารแอนโทไซยานินในดอกอัญชันเป็นอินดิเคเตอร์ธรรมชาติ: เป็นน้ำเงินในภาวะกลาง และเปลี่ยนเป็นม่วงชมพูเมื่อเจอกรดมะนาว',
    },
  ],
  pandan: [
    {
      contextActionTh: 'ดูแลแปลงใบเตยหอม',
      questionTh: 'สารสีเขียวในใบเตยที่ช่วยให้ต้นเตยสังเคราะห์ด้วยแสงและให้น้ำสีเขียวธรรมชาติในขนมไทยคือสารใด?',
      options: ['คลอโรฟิลล์ (Chlorophyll)', 'แคโรทีนอยด์', 'เมลานิน', 'คอลลาเจน'],
      correctIndex: 0,
      realLifeTipTh: 'นอกจากคลอโรฟิลล์ที่ให้สีเขียวแล้ว ใบเตยยังมีสาร 2-AP ที่ให้กลิ่นหอมเอกลักษณ์เวลาต้มหรือนึ่ง',
    },
  ],
  coconut: [
    {
      contextActionTh: 'รดน้ำต้นมะพร้าวน้ำหอม',
      questionTh: 'ผลมะพร้าวมีเปลือกใยหนานุ่มและช่องอากาศภายใน โครงสร้างนี้ช่วยให้ต้นมะพร้าวขยายพันธุ์ในธรรมชาติอย่างไร?',
      options: [
        'ลอยน้ำไปตามคลองและทะเลได้ไกลโดยไม่จมน้ำ',
        'ปลิวไปตามลมได้สูงเหมือนปุยนุ่น',
        'เกาะติดขนสัตว์ป่าได้ดี',
        'แตกกระเด็นเมื่อโดนความร้อนสูง',
      ],
      correctIndex: 0,
      realLifeTipTh: 'กาบมะพร้าวมีความหนาแน่นน้อยกว่าน้ำ ทำให้ผลมะพร้าวลอยข้ามฝั่งไปงอกริมน้ำและยังนำไปทำขุยมะพร้าวปลูกต้นไม้ได้',
    },
  ],
  mango: [
    {
      contextActionTh: 'บำรุงผลมะม่วงน้ำดอกไม้',
      questionTh: 'แก๊สธรรมชาติชนิดใดที่พืชสร้างขึ้นเพื่อกระตุ้นให้ผลมะม่วงดิบสุกเหลืองและมีกลิ่นหอมหวาน?',
      options: ['แก๊สเอทิลีน (Ethylene)', 'แก๊สฮีเลียม', 'แก๊สออกซิเจน', 'แก๊สอาร์กอน'],
      correctIndex: 0,
      realLifeTipTh: 'ในชีวิตจริง ชาวสวนมักบ่มมะม่วงรวมในลังปิดเพื่อให้แก๊สเอทิลีนจากผลที่เริ่มสุกช่วยเร่งผลอื่นให้สุกพร้อมกันอย่างปลอดภัย',
    },
  ],
  corn: [
    {
      contextActionTh: 'ดูแลไร่ข้าวโพดหวาน',
      questionTh: 'เส้นไหมสีทองบริเวณยอดฝักข้าวโพดแท้จริงแล้วทำหน้าที่ใดทางพฤกษศาสตร์?',
      options: [
        'เป็นยอดเกสรเพศเมียรับละอองเรณู เพื่อพัฒนาเป็นเมล็ดข้าวโพด',
        'เป็นรากอากาศสำหรับดูดน้ำฝน',
        'เป็นหนามป้องกันแมลง',
        'เป็นใบอ่อนสำหรับสังเคราะห์แสง',
      ],
      correctIndex: 0,
      realLifeTipTh: 'ไหมข้าวโพด 1 เส้นเชื่อมตรงถึง 1 เมล็ดบนฝัก หากผสมเกสรไม่ทั่วถึง ฝักข้าวโพดจะมีเมล็ดแหว่งไม่เต็มฝัก',
    },
  ],
  carrot: [
    {
      contextActionTh: 'พรวนดินแปลงแครอท',
      questionTh: 'ส่วนหัวสีส้มของแครอทที่เราเก็บมารับประทานคือส่วนใดของพืช และมีสารอาหารเด่นใด?',
      options: [
        'รากแก้วสะสมอาหาร อุดมด้วยเบตาแคโรทีน',
        'กลีบดอกสะสมแป้ง มีวิตามินดีสูง',
        'ลำต้นเหนือดิน มีแคลเซียมสูงสุด',
        'ผลสุกจากรังไข่ มีไขมันสูง',
      ],
      correctIndex: 0,
      realLifeTipTh: 'ดินร่วนซุยช่วยให้รากแก้วแครอทแทงตรงไม่แตกแขนง และเบตาแคโรทีนเปลี่ยนเป็นวิตามินเอช่วยบำรุงสายตา',
    },
  ],
  tomato: [
    {
      contextActionTh: 'เก็บมะเขือเทศเชอร์รี',
      questionTh: 'สารต้านอนุมูลอิสระสีแดงเด่นในมะเขือเทศที่ดูดซึมเข้าสู่ร่างกายได้ดีขึ้นเมื่อปรุงสุกพร้อมน้ำมันเล็กน้อยคือสารใด?',
      options: ['ไลโคปีน (Lycopene)', 'คาเฟอีน', 'แทนนิน', 'กลูโคส'],
      correctIndex: 0,
      realLifeTipTh: 'ไลโคปีนเป็นสารละลายในไขมัน การกินซอสมะเขือเทศปรุงสุกหรือสลัดราดน้ำมันมะกอกจะช่วยให้ร่างกายดูดซึมได้ดีกว่ากินสด',
    },
  ],
  strawberry: [
    {
      contextActionTh: 'ดูแลแปลงสตรอว์เบอร์รี',
      questionTh: 'เหตุใดชาวสวนนิยมคลุมฟางแห้งบนดินรอบต้นสตรอว์เบอร์รี?',
      options: [
        'รักษาความชื้นในดิน ลดวัชพืช และป้องกันผลช้ำจากดินเปียก',
        'ทำให้ดินร้อนจัดเพื่อให้รากแห้ง',
        'ดึงดูดเชื้อรามาคลุมผลไม้',
        'ลดปริมาณออกซิเจนในดิน',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การคลุมดิน (Mulching) ด้วยฟางหรือใบไม้แห้งเป็นภูมิปัญญาเกษตรที่ลดการระเหยของน้ำและกลายเป็นปุ๋ยอินทรีย์ต่อได้',
    },
  ],
  sunflower: [
    {
      contextActionTh: 'ชมแปลงดอกทานตะวัน',
      questionTh: 'ต้นทานตะวันอ่อนหันช่อตามดวงอาทิตย์จากทิศตะวันออกสู่ตะวันตกอาศัยฮอร์โมนพืชชนิดใดช่วยยืดเซลล์ด้านตรงข้ามแสง?',
      options: ['ออกซิน (Auxin)', 'อินซูลิน', 'อะดรีนาลีน', 'ไทโรซีน'],
      correctIndex: 0,
      realLifeTipTh: 'ปรากฏการณ์ Phototropism เกิดจากฮอร์โมนออกซินสะสมด้านที่ได้รับแสงน้อย ทำให้เซลล์ด้านนั้นยืดตัวและโค้งเข้าหาแสง',
    },
  ],
  pumpkin: [
    {
      contextActionTh: 'ดูแลแปลงฟักทองยักษ์',
      questionTh: 'ฟักทอง 1 ต้นมีทั้งดอกเพศผู้และดอกเพศเมียแยกกัน การติดผลที่ดีที่สุดในสวนต้องอาศัยสิ่งใด?',
      options: [
        'แมลงช่วยผสมเกสร เช่น ผึ้ง และชันโรง',
        'การตัดรากแก้วออกครึ่งหนึ่ง',
        'การแช่น้ำขังตลอด 24 ชั่วโมง',
        'การปลูกในที่มืดสนิท',
      ],
      correctIndex: 0,
      realLifeTipTh: 'สวนเกษตรผสมผสานที่ไม่ฉีดยาฆ่าแมลงจะมีผึ้งมาช่วยผสมเกสร ทำให้ฟักทอง มะม่วง และแตงติดผลดกตามธรรมชาติ',
    },
  ],
  golden_melon: [
    {
      contextActionTh: 'บำรุงเมล่อนทองคำ',
      questionTh: 'ก่อนเก็บเกี่ยวเมล่อน 5-7 วัน ชาวสวนมักลดปริมาณน้ำลงเล็กน้อยเพื่อผลลัพธ์ทางวิทยาศาสตร์ข้อใด?',
      options: [
        'เพิ่มความเข้มข้นของน้ำตาล (ค่า Brix) ให้เนื้อหวานฉ่ำและไม่แตก',
        'ทำให้เปลือกเปลี่ยนเป็นสีดำ',
        'ลดน้ำหนักผลให้เบาที่สุด',
        'หยุดการหายใจของรากพืช',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การงดน้ำช่วงใกล้เก็บช่วยลดน้ำส่วนเกินที่เจือจางความหวาน ทำให้ได้ผลไม้หวานหอมและป้องกันผลปริแตก',
    },
  ],
  morning_glory: [
    {
      contextActionTh: 'ดูแลแปลงผักบุ้งจีนริมบ่อปลา',
      questionTh: 'เหตุใดลำต้นของผักบุ้งจีนจึงสามารถชูยอดและลอยตัวได้ดีแม้ปลูกใกล้แหล่งน้ำหรือดินแฉะ?',
      options: [
        'ลำต้นมีโพรงอากาศกลวงภายใน (Aerenchyma) ช่วยลำเลียงแก๊สและพยุงตัว',
        'ลำต้นมีแกนเหล็กแข็งอยู่ตรงกลาง',
        'ไม่มีรากและไม่มีท่อลำเลียงน้ำ',
        'ใบสร้างแก๊สฮีเลียมให้ลอยในอากาศ',
      ],
      correctIndex: 0,
      realLifeTipTh: 'โพรงอากาศในก้านผักบุ้งช่วยให้รากได้รับออกซิเจนแม้ดินชุ่มน้ำ และผักบุ้งยังเป็นแหล่งวิตามินเอและธาตุเหล็กชั้นดี',
    },
  ],
  chili: [
    {
      contextActionTh: 'เก็บเกี่ยวพริกขี้หนูสวน',
      questionTh: 'สารประกอบใดในพริกที่ทำให้เกิดความรู้สึกร้อนเผ็ด และเมื่อกินเผ็ดควรดื่มสิ่งใดเพื่อช่วยลดความเผ็ดได้ดีที่สุด?',
      options: [
        'สารแคปไซซิน (Capsaicin) ควรดื่มนมที่มีไขมันและโปรตีนเคซีนช่วยละลายออก',
        'สารกลูโคส ควรดื่มน้ำอัดลมซ่าจัด',
        'สารคลอโรฟิลล์ ควรเคี้ยวเกลือบริสุทธิ์',
        'สารแคลเซียม ควรดื่มน้ำร้อนจัด',
      ],
      correctIndex: 0,
      realLifeTipTh: 'แคปไซซินละลายได้ดีในไขมัน ไม่ละลายในน้ำ การดื่มนมสดหรือกินกะทิ (เช่นในต้มยำน้ำข้น) จึงช่วยบรรเทาเผ็ดได้จริง',
    },
  ],
  holy_basil: [
    {
      contextActionTh: 'ตัดยอดใบกะเพราหอม',
      questionTh: 'น้ำมันหอมระเหย (Essential Oil) ในใบกะเพรามีบทบาทสำคัญอย่างไรทั้งต่อต้นกะเพราเองและต่ออาหารไทย?',
      options: [
        'ช่วยไล่แมลงศัตรูพืชตามธรรมชาติ และให้กลิ่นหอมเฉพาะตัวช่วยขับลม',
        'ทำให้ใบเปลี่ยนเป็นสีฟ้าเมื่อโดนแดด',
        'ใช้แทนปุ๋ยเคมีไนโตรเจน 100%',
        'ทำให้ผลไม้รสหวานขึ้นทันทีเมื่อวางใกล้กัน',
      ],
      correctIndex: 0,
      realLifeTipTh: 'กลิ่นหอมฉุนของยูจีนอลในกะเพราช่วยป้องกันแมลงในสวนเกษตรอินทรีย์ และยังช่วยย่อยอาหารในเมนูผัดกะเพราด้วย',
    },
  ],
  banana: [
    {
      contextActionTh: 'ดูแลสวนกล้วยหอมทอง',
      questionTh: 'ผลกล้วยอุดมด้วยแร่ธาตุชนิดใดที่ช่วยการทำงานของกล้ามเนื้อและป้องกันตะคริวสำหรับนักกีฬาและคนทำงาน?',
      options: ['โพแทสเซียม (Potassium)', 'ตะกั่ว (Lead)', 'ปรอท (Mercury)', 'ซิลิคอน (Silicon)'],
      correctIndex: 0,
      realLifeTipTh: 'กล้วย 1 ลูกมีโพแทสเซียมและคาร์โบไฮเดรตดูดซึมไว จึงนิยมกินก่อนออกกำลังกายและแปรรูปเป็นกล้วยบวชชีหรือกล้วยตาก',
    },
  ],
  watermelon: [
    {
      contextActionTh: 'รดน้ำแปลงแตงโมหวานฉ่ำ',
      questionTh: 'เนื้อสีแดงสดของแตงโมมีน้ำเป็นองค์ประกอบประมาณร้อยละเท่าใด และมีกรดอะมิโนเด่นชนิดใดช่วยฟื้นฟูกล้ามเนื้อ?',
      options: [
        'น้ำประมาณ 90-92% และมีสารซิทรูลีน (Citrulline) กับไลโคปีน',
        'น้ำ 10% และไขมันอิ่มตัว 80%',
        'โปรตีนแข็ง 95% ไร้ความชื้น',
        'แป้งดิบ 100% ไม่มีน้ำตาล',
      ],
      correctIndex: 0,
      realLifeTipTh: 'แตงโมช่วยเติมน้ำและเกลือแร่ให้ร่างกายในหน้าร้อนได้ดีมาก และเป็นพืชเถาที่ต้องการดินร่วนปนทรายระบายน้ำดี',
    },
  ],
  pineapple: [
    {
      contextActionTh: 'เก็บเกี่ยวสับปะรดสีทอง',
      questionTh: 'เอนไซม์ธรรมชาติในสับปะรดที่นิยมนำมาหมักเนื้อสัตว์ให้นุ่มเร็วขึ้นก่อนปรุงอาหารคือเอนไซม์ใด?',
      options: ['โบรมีเลน (Bromelain)', 'อะไมเลสจากข้าว', 'อินซูลิน', 'ฮีโมโกลบิน'],
      correctIndex: 0,
      realLifeTipTh: 'โบรมีเลนช่วยย่อยโปรตีน จึงใช้หมักเนื้อให้นุ่มและช่วยย่อยหลังมื้ออาหาร ส่วนเปลือกสับปะรดยังหมักทำน้ำหมักชีวภาพได้ด้วย',
    },
  ],
};

export const generateCropScienceChallenge = (
  cropId: CropId,
  seedIdx = 0
): LifeChallengeScenario => {
  const pool = CROP_SCIENCE_BANK[cropId] || CROP_SCIENCE_BANK.jasmine_rice;
  const pick = pool[Math.abs(seedIdx) % pool.length];
  return {
    id: `sci-${cropId}-${Date.now()}-${Math.abs(seedIdx) % 99}`,
    subjectId: 'science_tech',
    subjectNameTh: LIFE_SUBJECT_MAP.science_tech.shortTh,
    contextActionTh: pick.contextActionTh,
    questionTh: pick.questionTh,
    options: pick.options,
    correctIndex: pick.correctIndex,
    realLifeTipTh: pick.realLifeTipTh,
    rewardCoins: 28,
    rewardWater: 2,
    rewardXp: 20,
    rewardStars: 0,
  };
};

const makeUniqueMathDistractors = (correct: number, deltas: number[]): number[] => {
  const seen = new Set<number>([correct]);
  const out: number[] = [];
  for (const d of deltas) {
    const candidate = Math.max(1, correct + d);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      out.push(candidate);
    }
    if (out.length === 3) break;
  }
  let bump = 5;
  while (out.length < 3) {
    const candidate = correct + bump;
    if (!seen.has(candidate)) {
      seen.add(candidate);
      out.push(candidate);
    }
    bump += 4;
  }
  return out;
};

export const generateTradeMathChallenge = (
  itemNameTh: string,
  qty: number,
  unitPrice: number,
  seedIdx = 0
): LifeChallengeScenario => {
  const safeQty = Math.max(1, qty);
  const safePrice = Math.max(10, unitPrice);
  const total = safeQty * safePrice;
  const mode = Math.abs(seedIdx) % 3;

  let questionTh = '';
  let correctValue = total;
  let tip = '';
  let contextActionTh = `คิดเงินหน้าแผงขาย ${itemNameTh}`;

  if (mode === 0) {
    // Multiplication total price
    const effectiveQty = safeQty === 1 ? 3 : safeQty;
    correctValue = effectiveQty * safePrice;
    questionTh = `ลูกค้าซื้อ "${itemNameTh}" จำนวน ${effectiveQty} ชิ้น ราคาชิ้นละ ${safePrice} เหรียญ ต้องเก็บเงินลูกค้าทั้งหมดกี่เหรียญ?`;
    tip = `การคูณใช้คิดยอดขายทันใจ: ${effectiveQty} × ${safePrice} = ${correctValue} เหรียญ`;
  } else if (mode === 1) {
    // Making change from a banknote
    const billCandidates = [100, 200, 500, 1000];
    const bill = billCandidates.find((b) => b > total) || Math.ceil((total + 50) / 100) * 100;
    correctValue = bill - total;
    contextActionTh = `ทอนเงินลูกค้าคาเฟ่ (${itemNameTh})`;
    questionTh = `ยอดซื้อ "${itemNameTh}" รวม ${total} เหรียญ ลูกค้าจ่ายด้วยธนบัตร ${bill} เหรียญ เราต้องทอนเงินให้ลูกค้ากี่เหรียญ?`;
    tip = `การลบตรวจเงินทอน: ${bill} - ${total} = ${correctValue} เหรียญ เช็กซ้ำทุกครั้งช่วยไม่ให้ทอนขาดหรือเกิน`;
  } else {
    // Promotion bundle profit
    const packQty = 4;
    const rawTotal = packQty * safePrice;
    const discount = Math.max(5, Math.round((rawTotal * 0.1) / 5) * 5);
    correctValue = rawTotal - discount;
    contextActionTh = `จัดโปรโมชันแพ็กสุดคุ้ม ${itemNameTh}`;
    questionTh = `ขาย "${itemNameTh}" ชิ้นละ ${safePrice} เหรียญ หากจัดชุด 4 ชิ้นแล้วลดราคาให้ ${discount} เหรียญ ลูกค้าจ่ายสุทธิกี่เหรียญ?`;
    tip = `คิดราคาโปรโมชัน: (4 × ${safePrice}) - ${discount} = ${correctValue} เหรียญ ช่วยคำนวณกำไรก่อนจัดโปรได้ดี`;
  }

  const distractors = makeUniqueMathDistractors(correctValue, [-10, +10, +20, -5, +15]);
  const insertPos = Math.abs(seedIdx + total) % 4;
  const numericOptions = [...distractors];
  numericOptions.splice(insertPos, 0, correctValue);

  return {
    id: `math-${Date.now()}-${Math.abs(seedIdx) % 99}`,
    subjectId: 'math',
    subjectNameTh: LIFE_SUBJECT_MAP.math.shortTh,
    contextActionTh,
    questionTh,
    options: numericOptions.map((n) => `${n.toLocaleString()} เหรียญ`),
    correctIndex: insertPos,
    realLifeTipTh: tip,
    rewardCoins: 35,
    rewardWater: 1,
    rewardXp: 20,
    rewardStars: 0,
  };
};

interface CuratedScenarioSeed {
  subjectId: LifeSubjectId;
  contextActionTh: string;
  questionTh: string;
  options: string[];
  correctIndex: number;
  realLifeTipTh: string;
  rewardCoins: number;
  rewardWater: number;
  rewardXp: number;
  rewardStars: number;
}

const CRAFT_SCENARIO_BANK: Record<'career_tech' | 'health_pe' | 'arts', CuratedScenarioSeed[]> = {
  career_tech: [
    {
      subjectId: 'career_tech',
      contextActionTh: 'จัดลำดับงานในครัวคาเฟ่และศาลาสมุนไพร',
      questionTh: 'หากมีลูกค้าสั่ง "อัญชันลาเต้" ที่ต้องต้มหัวเชื้อชา 15 วินาที และรีดนม 10 วินาที การทำงานแบบใดประหยัดเวลาที่สุด?',
      options: [
        'ต้มหัวเชื้อชาทิ้งไว้ก่อนแล้วสลับไปเตรียมนมสดพร้อมกัน',
        'รอต้มชาเสร็จแล้วค่อยเดินไปหาวัตถุดิบชิ้นต่อไปทีละอย่าง',
        'ล้างแก้วซ้ำหลายรอบหลังเสิร์ฟเสร็จ',
        'ปิดเตาแล้วเริ่มทำใหม่ทั้งหมด',
      ],
      correctIndex: 0,
      realLifeTipTh: 'หลักการงานอาชีพ (Parallel Workflow): ทำงานที่ต้องรอเวลาควบคู่กับงานเตรียมวัตถุดิบ ช่วยให้เสิร์ฟลูกค้าได้ไวขึ้นเท่าตัว',
      rewardCoins: 30,
      rewardWater: 1,
      rewardXp: 22,
      rewardStars: 0,
    },
    {
      subjectId: 'career_tech',
      contextActionTh: 'ถนอมผลผลิตมะม่วงและสมุนไพรล้นสวน',
      questionTh: 'เมื่อเก็บมะม่วงและใบเตยได้จำนวนมากเกินกว่าขายสดในวันเดียว แนวทางแปรรูปเพิ่มมูลค่าแบบใดเหมาะสมที่สุด?',
      options: [
        'ทำหัวเชื้อชาสมุนไพร มะม่วงกวน หรือข้าวเหนียวมะม่วงบรรจุกล่องสะอาด',
        'กองตากฝนไว้หน้าบ้านเพื่อรอให้สุกงอม',
        'ทิ้งผลผลิตทั้งหมดแล้วซื้อใหม่วันถัดไป',
        'เก็บใส่ถุงพลาสติกปิดสนิทกลางแดดจัด',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การแปรรูปและถนอมอาหารช่วยยืดอายุสินค้า ลดการเน่าเสีย และเพิ่มราคาขายได้มากกว่าการขายวัตถุดิบดิบ',
      rewardCoins: 32,
      rewardWater: 1,
      rewardXp: 22,
      rewardStars: 0,
    },
    {
      subjectId: 'career_tech',
      contextActionTh: 'บริหารกิจการประมงบ่อปลานิล & ท่าเรือกุ้งแม่น้ำ',
      questionTh: 'ผู้ประกอบการประมงมือใหม่มี "บัตรทุนสร้างกิจการ" จำกัด ควรจัดลำดับการลงทุนอย่างไรให้ธุรกิจหมุนเงินคล่องตัวที่สุด?',
      options: [
        'แบ่งทุนส่วนหนึ่งสร้างบ่อปลาที่ทำรอบไว อีกส่วนสำรองไว้ซื้ออาหารสัตว์น้ำและพัฒนาสินค้าแปรรูป',
        'ใช้เงินทั้งหมดซื้อของตกแต่งที่ไม่สร้างรายได้ตั้งแต่แรก',
        'เลี้ยงสัตว์น้ำหนาแน่นเกินขนาดบ่อโดยไม่วางแผนขาย',
        'ไม่จดบันทึกรายรับ-รายจ่ายของกิจการเลย',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การกันเงินทุนหมุนเวียน (Working Capital) แยกจากเงินลงทุนสร้างโรงเรือน ช่วยให้ธุรกิจใหม่ไม่สะดุดระหว่างรอรอบเก็บเกี่ยว',
      rewardCoins: 36,
      rewardWater: 2,
      rewardXp: 25,
      rewardStars: 1,
    },
    {
      subjectId: 'career_tech',
      contextActionTh: 'ต่อยอดอาชีพช่างฝีมือและร้านค้าออนไลน์ชุมชน',
      questionTh: 'สินค้าชุมชนอย่าง "ผ้าพันคอขนแกะย้อมอัญชัน" และ "กระเช้าของขวัญ" ควรเพิ่มจุดขายออนไลน์อย่างไรให้น่าเชื่อถือ?',
      options: [
        'เล่าที่มาวัตถุดิบธรรมชาติ ระบุราคา-ขนาดชัดเจน และแพ็กกล่องกันกระแทกเรียบร้อย',
        'ไม่ใส่รูปสินค้าจริงและไม่ตอบแชทลูกค้า',
        'ส่งสินค้าช้ากว่ากำหนดโดยไม่แจ้งล่วงหน้า',
        'ตั้งชื่อสินค้าคลุมเครือไม่บอกส่วนประกอบ',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การสร้างเรื่องราวสินค้า (Storytelling) คู่กับมาตรฐานการจัดส่งคือหัวใจของอาชีพค้าขายออนไลน์ยุคใหม่',
      rewardCoins: 34,
      rewardWater: 1,
      rewardXp: 24,
      rewardStars: 1,
    },
  ],
  health_pe: [
    {
      subjectId: 'health_pe',
      contextActionTh: 'ชงเครื่องดื่มสมุนไพรคาเฟ่ในสวน',
      questionTh: 'ลูกค้าต้องการเครื่องดื่มสดชื่นแต่ควบคุมน้ำตาล ข้อใดคือสูตรชง "อัญชันใบเตย" ที่ดีต่อสุขภาพที่สุด?',
      options: [
        'ชงกลิ่นหอมจากใบเตยแท้ ลดน้ำเชื่อม และเพิ่มความสดชื่นด้วยมะนาวสด',
        'ใส่น้ำเชื่อมเข้มข้น 2 เท่าเพื่อกลบกลิ่นสมุนไพร',
        'เติมสีผสมอาหารสังเคราะห์แทนดอกอัญชัน',
        'ใส่นมข้นหวานครึ่งแก้วทุกครั้ง',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การใช้กลิ่นหอมธรรมชาติของใบเตยช่วยลดการพึ่งพาน้ำตาล ทำให้ได้สารต้านอนุมูลอิสระจากอัญชันโดยไม่เพิ่มแคลอรีเกินความจำเป็น',
      rewardCoins: 28,
      rewardWater: 2,
      rewardXp: 20,
      rewardStars: 0,
    },
    {
      subjectId: 'health_pe',
      contextActionTh: 'สุขอนามัยการเตรียมข้าวเหนียวมะม่วงและสลัดผัก',
      questionTh: 'ก่อนนำผักสดและใบเตยจากแปลงมาแปรรูปอาหารในครัว ขั้นตอนสุขศึกษาที่สำคัญที่สุดคือข้อใด?',
      options: [
        'ล้างน้ำสะอาดไหลผ่านหลายครั้งและล้างมือก่อนหยิบจับอาหาร',
        'เช็ดด้วยผ้าขี้ริ้วแห้งอย่างเดียวก็พอ',
        'นำไปวางตากลมริมถนนก่อนเสิร์ฟ',
        'ใช้มือเปล่าคลุกอาหารทันทีหลังพรวนดินเสร็จ',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การล้างผักผ่านน้ำไหลและรักษาความสะอาดมือก่อนปรุงอาหารช่วยลดสารตกค้างและเชื้อโรคในระบบทางเดินอาหาร',
      rewardCoins: 28,
      rewardWater: 2,
      rewardXp: 20,
      rewardStars: 0,
    },
    {
      subjectId: 'health_pe',
      contextActionTh: 'เลือกเมนูอาหารเพื่อสุขภาพในครัวไทย & ประมง',
      questionTh: 'การบริโภคปลานิลสดจากบ่อประมงมีประโยชน์เด่นด้านโภชนาการอย่างไรเทียบกับอาหารทอดน้ำมันท่วม?',
      options: [
        'ให้โปรตีนย่อยง่าย ไขมันดี และไม่เพิ่มภาระคอเลสเตอรอลส่วนเกิน',
        'ไม่มีโปรตีนและวิตามินเลย',
        'ทำให้ร่างกายขาดน้ำอย่างรุนแรง',
        'มีแต่คาร์โบไฮเดรตล้วนเหมือนน้ำตาลทราย',
      ],
      correctIndex: 0,
      realLifeTipTh: 'เนื้อปลาเป็นแหล่งโปรตีนคุณภาพสูงที่เหมาะกับทุกวัย ยิ่งนำไปย่างสมุนไพรหรือนึ่งกับผักสวนครัวยิ่งดีต่อหัวใจ',
      rewardCoins: 30,
      rewardWater: 2,
      rewardXp: 22,
      rewardStars: 0,
    },
  ],
  arts: [
    {
      subjectId: 'arts',
      contextActionTh: 'ตกแต่งแก้วอัญชันลาเต้และมุมสวนคาเฟ่',
      questionTh: 'การใช้สีน้ำเงินอมม่วงของดอกอัญชันคู่กับสีเหลืองทองของมะม่วงน้ำดอกไม้และฟองนมขาว สะท้อนหลักศิลปะข้อใด?',
      options: [
        'สีคู่ตรงข้าม (Complementary Colors) ที่ช่วยให้เมนูโดดเด่นน่ารับประทาน',
        'การใช้สีโทนมืดทึบทั้งหมด',
        'การวาดภาพขาวดำไร้สีสัน',
        'การบดบังองค์ประกอบหลักให้กลืนหายไป',
      ],
      correctIndex: 0,
      realLifeTipTh: 'ทฤษฎีสีคู่ตรงข้าม (น้ำเงิน-ม่วง คู่กับ เหลือง-ส้ม) ถูกใช้ทั้งในการจัดจานอาหาร จัดสวนดอกไม้ และออกแบบบรรจุภัณฑ์',
      rewardCoins: 30,
      rewardWater: 1,
      rewardXp: 22,
      rewardStars: 1,
    },
    {
      subjectId: 'arts',
      contextActionTh: 'จัดวางเรือนไทย ศาลาชา และทางเดินศิลาแลงในสวน',
      questionTh: 'ในการออกแบบภูมิทัศน์คาเฟ่ในสวน ความสมดุลแบบธรรมชาติ (Asymmetrical Balance) ให้ความรู้สึกอย่างไร?',
      options: [
        'โปร่งสบาย ผ่อนคลาย กลมกลืนกับต้นไม้และบ่อน้ำเสมือนธรรมชาติจริง',
        'ดูแข็งทื่อเหมือนโกดังโรงงาน',
        'วางอาคารซ้อนทับทางเดินจนเดินไม่ได้',
        'เน้นป้ายโฆษณาสีสะท้อนแสงเต็มพื้นที่',
      ],
      correctIndex: 0,
      realLifeTipTh: 'ศิลปะจัดสวนไทยนิยมผสมวัสดุธรรมชาติอย่างไม้ไผ่ ศิลาแลง และบ่อบัวแบบสมดุลอิสระเพื่อให้สายตาพักผ่อน',
      rewardCoins: 30,
      rewardWater: 1,
      rewardXp: 22,
      rewardStars: 1,
    },
    {
      subjectId: 'arts',
      contextActionTh: 'ย้อมผ้าขนแกะสีธรรมชาติในสตูดิโอหัตถกรรม',
      questionTh: 'งานหัตถกรรมย้อมสีธรรมชาติจากดอกอัญชันและใบเตยมีคุณค่าทางศิลปะและสิ่งแวดล้อมอย่างไร?',
      options: [
        'ให้โทนสีละมุนเป็นเอกลักษณ์ ปลอดภัยต่อผิว และลดมลพิษจากสีย้อมเคมี',
        'ทำให้ผ้าขาดเปื่อยทันทีเมื่อโดนแสง',
        'ปล่อยน้ำเสียเคมีเข้มข้นลงบ่อปลา',
        'ทำให้ผ้าไม่สามารถซักทำความสะอาดได้',
      ],
      correctIndex: 0,
      realLifeTipTh: 'สีย้อมธรรมชาติจากพืชไทยช่วยสร้างอัตลักษณ์ท้องถิ่นและเพิ่มมูลค่าให้งานคราฟต์ในตลาดโลก',
      rewardCoins: 32,
      rewardWater: 1,
      rewardXp: 24,
      rewardStars: 1,
    },
  ],
};

const COMM_SOCIAL_BANK: Record<'thai' | 'foreign_lang' | 'social', CuratedScenarioSeed[]> = {
  thai: [
    {
      subjectId: 'thai',
      contextActionTh: 'เขียนป้ายต้อนรับและสื่อสารกับลูกค้าไทยในสวน',
      questionTh: 'สำนวนไทยข้อใดสอดคล้องกับการดูแลต้นข้าวและเก็บเกี่ยวผลผลิตในสวนให้ทันเวลาเมื่อโอกาสมาถึง?',
      options: ['น้ำขึ้นให้รีบตัก', 'ตำน้ำพริกละลายแม่น้ำ', 'เข็นครกขึ้นภูเขา', 'กบในกะลาครอบ'],
      correctIndex: 0,
      realLifeTipTh: 'สุภาษิต "น้ำขึ้นให้รีบตัก" สอนให้รู้จักคว้าโอกาสและลงมือทำเมื่อช่วงเวลาเหมาะสม เช่น รีบเก็บเกี่ยวผลไม้เมื่อสุกพอดี',
      rewardCoins: 28,
      rewardWater: 1,
      rewardXp: 20,
      rewardStars: 1,
    },
    {
      subjectId: 'thai',
      contextActionTh: 'ตรวจตัวสะกดป้ายเมนูคาเฟ่ในสวน',
      questionTh: 'ป้ายเมนูภาษาไทยคู่ใดเขียนสะกดถูกต้องครบถ้วนทั้งหมดเพื่อขึ้นโชว์หน้าซุ้มคาเฟ่?',
      options: [
        'อัญชันลาเต้ · ข้าวเหนียวมะม่วงน้ำดอกไม้',
        'อันชันลาเต้ · ข้าวเหนียวมะม่วงน้ำดอกใม้',
        'อัญชัญลาเต้ · ข้าวเหนียวมะม้วงน้ำดอกไม้',
        'อันชัญลาเต้ · ข้าวเหนียวมะม่วงนำ้ดอกไม้',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การสะกดคำชื่อเมนูและฉลากสินค้าให้ถูกต้อง ("อัญชัน" ใช้ ช/น, "น้ำ" ไม้โทเหนือ น) สร้างความน่าเชื่อถือให้ร้านค้า',
      rewardCoins: 28,
      rewardWater: 1,
      rewardXp: 20,
      rewardStars: 1,
    },
    {
      subjectId: 'thai',
      contextActionTh: 'สื่อสารงานประมงและเมนูอาหารไทยหน้าร้าน',
      questionTh: 'คำขวัญหรือป้ายประชาสัมพันธ์อาชีพใดใช้คำสุภาพ ถูกต้อง และสื่อความหมายชวนอุดหนุนสินค้าชุมชนได้ดีที่สุด?',
      options: [
        '“ปลาสดจากบ่อธรรมชาติ ปรุงสะอาด ใส่ใจทุกจาน เชิญแวะชิมครับ”',
        '“ซื้อรีบๆ อย่าถามเยอะ ของหมดแล้ว”',
        '“ปาสดมาก กินใด้เลย”',
        '“อาหารแพงมาก แต่อาจจะไม่อร่อย”',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การใช้ถ้อยคำสุภาพ สะกดถูกต้อง และสื่อถึงจุดเด่นความสะอาดปลอดภัย ช่วยสร้างความประทับใจแรกให้ลูกค้า',
      rewardCoins: 30,
      rewardWater: 1,
      rewardXp: 22,
      rewardStars: 1,
    },
  ],
  foreign_lang: [
    {
      subjectId: 'foreign_lang',
      contextActionTh: 'ต้อนรับนักท่องเที่ยวต่างชาติที่คาเฟ่ในสวน',
      questionTh: 'นักท่องเที่ยวพูดว่า "Could I have one Iced Butterfly-Pea Latte and Mango Sticky Rice, please?" เธอควรตอบรับอย่างสุภาพว่าอย่างไร?',
      options: [
        'Certainly! That will be ready in a moment.',
        'Go away, we only sell rice seeds.',
        'I am sleeping under the coconut tree.',
        'No water in the river today.',
      ],
      correctIndex: 0,
      realLifeTipTh: '"Certainly!" หรือ "Sure, right away!" ใช้ตอบรับออเดอร์อย่างสุภาพเป็นสากลในร้านอาหารและงานบริการท่องเที่ยว',
      rewardCoins: 32,
      rewardWater: 1,
      rewardXp: 24,
      rewardStars: 1,
    },
    {
      subjectId: 'foreign_lang',
      contextActionTh: 'ติดป้ายวัตถุดิบภาษาอังกฤษให้เพื่อนชาวต่างชาติ',
      questionTh: 'คำศัพท์ภาษาอังกฤษของวัตถุดิบไทย "ใบเตยหอม · มะพร้าวน้ำหอม · ข้าวหอมมะลิ" เรียงตามลำดับได้ถูกต้องในข้อใด?',
      options: [
        'Pandan leaf · Aromatic coconut · Jasmine rice',
        'Butterfly pea · Sweet corn · Pumpkin',
        'Carrot · Milk · Strawberry jam',
        'Mango · Wool · Bread loaf',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การรู้จักชื่อวัตถุดิบไทยเป็นภาษาอังกฤษ เช่น Pandan และ Jasmine rice ช่วยอธิบายจุดเด่นอาหารไทยให้นักท่องเที่ยวเข้าใจได้ทันที',
      rewardCoins: 32,
      rewardWater: 1,
      rewardXp: 24,
      rewardStars: 1,
    },
    {
      subjectId: 'foreign_lang',
      contextActionTh: 'แนะนำอาชีพประมงและเมนูซีฟู้ดเป็นภาษาอังกฤษ',
      questionTh: 'หากลูกค้าชาวต่างชาติถามหาเมนู "ต้มยำกุ้งแม่น้ำ" และ "ปลาย่างสมุนไพร" คำศัพท์ใดตรงกับ "กุ้งแม่น้ำ · ปลานิล · กะเพรา"?',
      options: [
        'Giant river prawn · Tilapia fish · Holy basil',
        'Watermelon · Pineapple · Banana',
        'Sheep wool · Bamboo fence · Fountain',
        'Morning glory · Corn · Pumpkin pie',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การสื่อสารคำศัพท์อาหารทะเลและสมุนไพรไทยเป็นภาษาอังกฤษ ช่วยเปิดโอกาสทางอาชีพด้านท่องเที่ยวและส่งออกอาหาร',
      rewardCoins: 34,
      rewardWater: 1,
      rewardXp: 24,
      rewardStars: 1,
    },
  ],
  social: [
    {
      subjectId: 'social',
      contextActionTh: 'วางแผนแบ่งพื้นที่สวนเกษตรผสมผสานตามศาสตร์พระราชา',
      questionTh: 'หลัก "เกษตรทฤษฎีใหม่" แบ่งสัดส่วนพื้นที่ 30 : 30 : 30 : 10 เพื่อประโยชน์สำคัญข้อใด?',
      options: [
        'มีสระน้ำ เลี้ยงปลา ปลูกข้าว ปลูกพืชผสมผสาน และที่อยู่อาศัย พึ่งพาตนเองได้',
        'เทคอนกรีตทับดินทั้ง 100% เพื่อสร้างลานจอดรถ',
        'ปลูกพืชชนิดเดียวเต็มพื้นที่แม้ราคาลดลง',
        'ขายที่ดินทั้งหมดตั้งแต่ปีแรก',
      ],
      correctIndex: 0,
      realLifeTipTh: 'สัดส่วน 30% แหล่งน้ำ, 30% นาข้าว, 30% พืชผักผลไม้, 10% ที่อยู่อาศัย ช่วยให้เกษตรกรมีกินมีใช้ตลอดปีและลดความเสี่ยงราคาตลาด',
      rewardCoins: 30,
      rewardWater: 2,
      rewardXp: 22,
      rewardStars: 1,
    },
    {
      subjectId: 'social',
      contextActionTh: 'ตั้งราคาขายสินค้าหน้าซุ้มชุมชน',
      questionTh: 'เมื่อผลผลิตมะม่วงออกสู่ตลาดพร้อมกันจำนวนมากจนล้นตลาด (อุปทานมากกว่าอุปสงค์) แนวโน้มราคาจะเป็นอย่างไรและผู้ขายควรทำอย่างไร?',
      options: [
        'ราคามักลดลง ควรแปรรูปเป็นสินค้าใหม่หรือควบคุมคุณภาพสร้างจุดต่าง',
        'ราคาจะพุ่งขึ้นทันทีโดยไม่ต้องทำอะไร',
        'ควรตั้งราคาแพงขึ้นอีก 10 เท่า',
        'เงินตราจะหายไปจากระบบ',
      ],
      correctIndex: 0,
      realLifeTipTh: 'เข้าใจกฎอุปสงค์-อุปทาน (Supply & Demand) ช่วยให้ผู้ผลิตไม่ขายตัดราคา แต่หันมาแปรรูปหรือสร้างแบรนด์คาเฟ่ในสวนแทน',
      rewardCoins: 30,
      rewardWater: 1,
      rewardXp: 22,
      rewardStars: 1,
    },
    {
      subjectId: 'social',
      contextActionTh: 'เรียนรู้การกระจายรายได้และเลือกทำอาชีพเสริมในชุมชน',
      questionTh: 'การที่คนหนึ่งคนมีทั้งแปลงผัก บ่อปลาประมง งานหัตถกรรม และเปิดขายออนไลน์ ช่วยสร้างความมั่นคงทางเศรษฐกิจอย่างไร?',
      options: [
        'กระจายความเสี่ยงรายได้ มีอาชีพสำรองหมุนเวียนตลอดทั้งปี และสร้างงานในชุมชน',
        'ทำให้เสียเวลาโดยไม่ได้ผลผลิตใดๆ',
        'บังคับให้ต้องทิ้งอาชีพหลักทั้งหมด',
        'ลดโอกาสการแลกเปลี่ยนสินค้ากับเพื่อนบ้าน',
      ],
      correctIndex: 0,
      realLifeTipTh: 'การมีทักษะหลายอาชีพและมีเงินทุนสำรองเพื่อลองสร้างกิจการใหม่ ช่วยให้ปรับตัวเข้ากับตลาดที่เปลี่ยนแปลงได้เสมอ',
      rewardCoins: 34,
      rewardWater: 2,
      rewardXp: 25,
      rewardStars: 1,
    },
  ],
};

export const generateCraftLifeChallenge = (
  productId: ProductId,
  seedIdx = 0
): LifeChallengeScenario => {
  const branches: Array<'career_tech' | 'health_pe' | 'arts'> = ['career_tech', 'health_pe', 'arts'];
  const pickedBranch = branches[Math.abs(seedIdx) % branches.length];
  const pool = CRAFT_SCENARIO_BANK[pickedBranch];
  const item = pool[Math.abs(seedIdx) % pool.length];
  const prod = PRODUCT_CATALOG.find((p) => p.id === productId);
  return {
    id: `craft-${pickedBranch}-${productId}-${Date.now()}`,
    subjectNameTh: LIFE_SUBJECT_MAP[pickedBranch].shortTh,
    ...item,
    contextActionTh: prod ? `${item.contextActionTh} (${prod.nameTh})` : item.contextActionTh,
  };
};

export const generateSocialCommChallenge = (
  preferredSubject?: 'thai' | 'foreign_lang' | 'social',
  seedIdx = 0
): LifeChallengeScenario => {
  const branches: Array<'thai' | 'foreign_lang' | 'social'> = ['foreign_lang', 'thai', 'social'];
  const subject = preferredSubject || branches[Math.abs(seedIdx) % branches.length];
  const pool = COMM_SOCIAL_BANK[subject];
  const item = pool[Math.abs(seedIdx) % pool.length];
  return {
    id: `comm-${subject}-${Date.now()}`,
    subjectNameTh: LIFE_SUBJECT_MAP[subject].shortTh,
    ...item,
  };
};

export const generateScenarioForSubject = (
  subjectId: LifeSubjectId,
  farmState: SchoolFarmState,
  seedIdx = 0
): LifeChallengeScenario => {
  if (subjectId === 'science_tech') {
    const activeCropTiles = farmState.tiles.filter((t) => t.kind === 'crop' && t.cropId);
    const pickedCrop: CropId =
      activeCropTiles.length > 0
        ? (activeCropTiles[Math.abs(seedIdx) % activeCropTiles.length].cropId as CropId)
        : CROP_CATALOG[Math.abs(seedIdx) % CROP_CATALOG.length].id;
    return generateCropScienceChallenge(pickedCrop, seedIdx);
  }
  if (subjectId === 'math') {
    const prod = PRODUCT_CATALOG[Math.abs(seedIdx) % PRODUCT_CATALOG.length];
    const qty = 2 + (Math.abs(seedIdx) % 4);
    return generateTradeMathChallenge(prod.nameTh, qty, prod.sellPrice, seedIdx);
  }
  if (subjectId === 'career_tech' || subjectId === 'health_pe' || subjectId === 'arts') {
    const pool = CRAFT_SCENARIO_BANK[subjectId];
    const item = pool[Math.abs(seedIdx) % pool.length];
    return {
      id: `practice-${subjectId}-${Date.now()}`,
      subjectNameTh: LIFE_SUBJECT_MAP[subjectId].shortTh,
      ...item,
    };
  }
  const pool = COMM_SOCIAL_BANK[subjectId];
  const item = pool[Math.abs(seedIdx) % pool.length];
  return {
    id: `practice-${subjectId}-${Date.now()}`,
    subjectNameTh: LIFE_SUBJECT_MAP[subjectId].shortTh,
    ...item,
  };
};

export const resolveLifeSubjectChallenge = (
  state: SchoolFarmState,
  challenge: Pick<
    LifeChallengeScenario,
    'subjectId' | 'rewardCoins' | 'rewardWater' | 'rewardXp' | 'rewardStars'
  >,
  isCorrect: boolean,
  todayDate: string
): {
  state: SchoolFarmState;
  coinsEarned: number;
  waterEarned: number;
  xpEarned: number;
  starsEarned: number;
} => {
  const prevMastery = state.lifeSubjectMastery || {};
  const currentEntry = prevMastery[challenge.subjectId] || {
    solved: 0,
    streak: 0,
    lastDate: '',
  };

  if (!isCorrect) {
    return {
      coinsEarned: 0,
      waterEarned: 0,
      xpEarned: 5,
      starsEarned: 0,
      state: {
        ...state,
        farmXp: state.farmXp + 5,
        lifeSubjectMastery: {
          ...prevMastery,
          [challenge.subjectId]: {
            ...currentEntry,
            streak: 0,
            lastDate: todayDate,
          },
        },
        updatedAt: new Date().toISOString(),
      },
    };
  }

  return {
    coinsEarned: challenge.rewardCoins,
    waterEarned: challenge.rewardWater,
    xpEarned: challenge.rewardXp,
    starsEarned: challenge.rewardStars,
    state: {
      ...state,
      coins: state.coins + challenge.rewardCoins,
      water: state.water + challenge.rewardWater,
      farmXp: state.farmXp + challenge.rewardXp,
      townStars: state.townStars + challenge.rewardStars,
      lifeSubjectMastery: {
        ...prevMastery,
        [challenge.subjectId]: {
          solved: currentEntry.solved + 1,
          streak: currentEntry.streak + 1,
          lastDate: todayDate,
        },
      },
      updatedAt: new Date().toISOString(),
    },
  };
};
