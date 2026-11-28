import type { Student } from '../types';
import type { CropId, ProductId } from './schoolFarmEngine';

export type CityDistrictId =
  | 'overview'
  | 'gardens'
  | 'shops'
  | 'company'
  | 'market'
  | 'bank'
  | 'hospital'
  | 'police'
  | 'temple'
  | 'city_hall';

export type LifeCityCareerId =
  | 'smart_farmer'
  | 'fishery_captain'
  | 'chef_cafe'
  | 'artisan_craft'
  | 'business_ceo'
  | 'doctor_medic'
  | 'police_officer'
  | 'banker_finance'
  | 'software_dev'
  | 'civic_creator';

export type IllnessId = 'none' | 'common_cold' | 'food_poisoning' | 'exhaustion' | 'sprain';

export type CityInventoryItemId =
  | 'herbal_coffee'
  | 'bento_meal'
  | 'pain_relief_pack'
  | 'vitamins'
  | 'luxury_watch'
  | 'flower_bouquet';

export interface LifeCityCareerDef {
  id: LifeCityCareerId;
  nameTh: string;
  nameEn: string;
  categoryTh: string;
  baseSalary: number;
  energyCost: number;
  stressGain: number;
  specialtyDistrict: CityDistrictId;
  perkTh: string;
  perkEn: string;
  accentColor: string;
}

export interface CityDistrictMeta {
  id: Exclude<CityDistrictId, 'overview'>;
  nameTh: string;
  nameEn: string;
  subtitleTh: string;
  subtitleEn: string;
  accentHex: string;
  mapX: number; // percentage on interactive town map
  mapY: number;
}

export interface CityShopItemDef {
  id: CityInventoryItemId;
  nameTh: string;
  nameEn: string;
  priceCoins: number;
  category: 'food' | 'medicine' | 'gift';
  energyRestore: number;
  healthRestore: number;
  happinessRestore: number;
  stressReduce: number;
  curesIllness?: boolean;
  descTh: string;
}

export interface CityCommodityDef {
  id: string;
  nameTh: string;
  nameEn: string;
  unitTh: string;
  basePrice: number;
  categoryTh: string;
}

export interface CityLoanTier {
  id: 'micro' | 'business' | 'enterprise';
  titleTh: string;
  principal: number;
  interestRatePct: number;
  termDays: number;
  minCreditScore: number;
  descTh: string;
}

export interface CityLoan {
  id: string;
  tierId: CityLoanTier['id'];
  titleTh: string;
  principal: number;
  remainingDue: number;
  interestRatePct: number;
  daysLeft: number;
  overdueDays: number;
  createdDay: number;
}

export interface CityCompany {
  founded: boolean;
  name: string;
  industryTh: string;
  level: number; // 1..5
  staffCount: number;
  dailyBaseProfit: number;
  reputation: number; // 0..100
}

export interface CityCitizen {
  id: string;
  nameTh: string;
  roleTh: string;
  careerId: LifeCityCareerId;
  location: Exclude<CityDistrictId, 'overview'>;
  moodTh: string;
  dialogueTh: string;
  friendship: number; // 0..100
  gardenLevel: number;
  specialtyCrop: string;
  helpedToday: boolean;
  avatarColor: string;
}

export interface CityLogEntry {
  id: string;
  day: number;
  district: CityDistrictId;
  tone: 'info' | 'success' | 'warning' | 'danger';
  textTh: string;
}

export interface LifeCityState {
  version: 1;
  schoolId: string;
  userId: string;
  day: number;
  careerId: LifeCityCareerId;
  careerXp: number;
  careerLevel: number;
  health: number; // 0..100
  energy: number; // 0..100
  happiness: number; // 0..100
  stress: number; // 0..100
  illness: IllnessId;
  hasHealthInsurance: boolean;
  bankSavings: number;
  creditScore: number; // 300..850
  loans: CityLoan[];
  wantedLevel: number; // 0..5
  criminalRecord: number;
  jailDaysRemaining: number;
  karmaPoints: number;
  company: CityCompany;
  marketMultipliers: Record<string, number>;
  marketPrevMultipliers: Record<string, number>;
  commodityHoldings: Record<string, number>;
  bag: Record<CityInventoryItemId, number>;
  citizens: CityCitizen[];
  cityLog: CityLogEntry[];
  updatedAt: string;
}

export interface CityActionResult {
  ok: boolean;
  messageTh: string;
  errorTh?: string;
  state: LifeCityState;
  coinDelta: number;
  xpGain?: number;
  gemGain?: number;
  barnDelta?: Partial<Record<CropId, number>>;
  goodsDelta?: Partial<Record<ProductId, number>>;
}

export const LIFE_CITY_CAREERS: LifeCityCareerDef[] = [
  {
    id: 'smart_farmer',
    nameTh: 'เกษตรกรอัจฉริยะ',
    nameEn: 'Smart Farmer',
    categoryTh: 'เกษตร & สิ่งแวดล้อม',
    baseSalary: 140,
    energyCost: 22,
    stressGain: 8,
    specialtyDistrict: 'gardens',
    perkTh: 'ขายพืชผลในตลาดกลางเมืองได้ราคาเพิ่ม +15% และช่วยสวนเพื่อนได้โบนัส',
    perkEn: '+15% market crop prices and garden neighbor bonus',
    accentColor: '#16a34a',
  },
  {
    id: 'fishery_captain',
    nameTh: 'กัปตันประมง & โลจิสติกส์',
    nameEn: 'Fishery Captain',
    categoryTh: 'ประมง & การค้า',
    baseSalary: 165,
    energyCost: 25,
    stressGain: 10,
    specialtyDistrict: 'market',
    perkTh: 'ขายสินค้าประมงในตลาด +18% และลดค่าธรรมเนียมค้าขายตลาดกลาง',
    perkEn: '+18% fishery goods sell value',
    accentColor: '#0284c7',
  },
  {
    id: 'chef_cafe',
    nameTh: 'เชฟ & เจ้าของคาเฟ่',
    nameEn: 'Chef & Cafe Owner',
    categoryTh: 'อาหาร & บริการ',
    baseSalary: 160,
    energyCost: 24,
    stressGain: 11,
    specialtyDistrict: 'shops',
    perkTh: 'ขายเมนูแปรรูปและอาหารในตลาด +15% และซื้อเสบียงในร้านลด 15%',
    perkEn: '+15% crafted food value and 15% shop discount',
    accentColor: '#ea580c',
  },
  {
    id: 'artisan_craft',
    nameTh: 'นักออกแบบงานคราฟต์',
    nameEn: 'Artisan Designer',
    categoryTh: 'ศิลปะ & หัตถกรรม',
    baseSalary: 155,
    energyCost: 22,
    stressGain: 7,
    specialtyDistrict: 'shops',
    perkTh: 'ความเครียดขึ้นช้าลง และงานฝีมือ/สินค้าแปรรูปขายดีขึ้น +12%',
    perkEn: 'Lower work stress and +12% craft sales',
    accentColor: '#9333ea',
  },
  {
    id: 'business_ceo',
    nameTh: 'ผู้บริหารบริษัท (CEO)',
    nameEn: 'Business Executive',
    categoryTh: 'ธุรกิจ & การลงทุน',
    baseSalary: 230,
    energyCost: 28,
    stressGain: 16,
    specialtyDistrict: 'company',
    perkTh: 'กำไรบริษัทประจำวัน +25% และค่าสร้าง/อัปเกรดบริษัทถูกลง 15%',
    perkEn: '+25% daily company profit and 15% lower company upgrade cost',
    accentColor: '#1d4ed8',
  },
  {
    id: 'doctor_medic',
    nameTh: 'แพทย์ & เภสัชกรชุมชน',
    nameEn: 'Doctor & Pharmacist',
    categoryTh: 'การแพทย์ & สาธารณสุข',
    baseSalary: 245,
    energyCost: 30,
    stressGain: 18,
    specialtyDistrict: 'hospital',
    perkTh: 'ค่ารักษาตัวที่โรงพยาบาลลด 60% และรับเวรแพทย์สร้างรายได้พิเศษได้',
    perkEn: '60% hospital discount and special medical shift income',
    accentColor: '#e11d48',
  },
  {
    id: 'police_officer',
    nameTh: 'สารวัตร & นักสืบชุมชน',
    nameEn: 'Police Detective',
    categoryTh: 'กฎหมาย & ความปลอดภัย',
    baseSalary: 195,
    energyCost: 26,
    stressGain: 15,
    specialtyDistrict: 'police',
    perkTh: 'เข้าเวรสายตรวจสถานีตำรวจได้โบนัส +45% และช่วยลดค่าปรับทางกฎหมาย',
    perkEn: '+45% patrol shift income and reduced fines',
    accentColor: '#1e3a8a',
  },
  {
    id: 'banker_finance',
    nameTh: 'นักวิเคราะห์การเงิน & นายธนาคาร',
    nameEn: 'Banker & Analyst',
    categoryTh: 'การเงิน & ธนาคาร',
    baseSalary: 215,
    energyCost: 25,
    stressGain: 13,
    specialtyDistrict: 'bank',
    perkTh: 'ดอกเบี้ยเงินฝากเพิ่มเป็น 3.5%/วัน และดอกเบี้ยเงินกู้ลดลง 25%',
    perkEn: '3.5% daily bank interest and 25% lower loan rates',
    accentColor: '#0f766e',
  },
  {
    id: 'software_dev',
    nameTh: 'วิศวกรซอฟต์แวร์ & AI',
    nameEn: 'Software & AI Engineer',
    categoryTh: 'เทคโนโลยี & นวัตกรรม',
    baseSalary: 240,
    energyCost: 27,
    stressGain: 16,
    specialtyDistrict: 'company',
    perkTh: 'รายได้งานประจำสูงและได้โบนัสกำไรจากบริษัทเทคโนโลยี',
    perkEn: 'High base salary and tech company profit bonus',
    accentColor: '#4f46e5',
  },
  {
    id: 'civic_creator',
    nameTh: 'นักพัฒนาชุมชน & จิตอาสา',
    nameEn: 'Civic Community Creator',
    categoryTh: 'สังคม & จิตอาสา',
    baseSalary: 150,
    energyCost: 20,
    stressGain: 6,
    specialtyDistrict: 'temple',
    perkTh: 'เข้าวัดทำบุญหรือเยี่ยมเพื่อนได้แต้มบุญ +50% และความสุขฟื้นไว',
    perkEn: '+50% karma & friendship from civic and temple visits',
    accentColor: '#d97706',
  },
];

export const CAREER_DEF_MAP: Record<LifeCityCareerId, LifeCityCareerDef> = Object.fromEntries(
  LIFE_CITY_CAREERS.map((c) => [c.id, c])
) as Record<LifeCityCareerId, LifeCityCareerDef>;

export const CITY_DISTRICTS_META: CityDistrictMeta[] = [
  {
    id: 'gardens',
    nameTh: 'สวนชุมชน & เพื่อนบ้าน',
    nameEn: 'Community Gardens',
    subtitleTh: 'เยี่ยมสวนเพื่อนบ้าน รดน้ำแลกของขวัญ',
    subtitleEn: 'Visit neighbor gardens & help crops grow',
    accentHex: '#16a34a',
    mapX: 16,
    mapY: 22,
  },
  {
    id: 'shops',
    nameTh: 'ร้านค้า & คาเฟ่',
    nameEn: 'Shops & Cafe',
    subtitleTh: 'ซื้ออาหาร เครื่องดื่ม ยาสามัญ ของขวัญ',
    subtitleEn: 'Buy meals, coffee, medicine & gifts',
    accentHex: '#ea580c',
    mapX: 48,
    mapY: 20,
  },
  {
    id: 'company',
    nameTh: 'ย่านบริษัท & สำนักงาน',
    nameEn: 'Business District',
    subtitleTh: 'ทำงานประจำ ก่อตั้งบริษัท จ้างพนักงาน',
    subtitleEn: 'Work shifts, found a company & hire staff',
    accentHex: '#2563eb',
    mapX: 82,
    mapY: 22,
  },
  {
    id: 'market',
    nameTh: 'ตลาดกลางเมือง',
    nameEn: 'Central Market',
    subtitleTh: 'ซื้อขายสินค้าเกษตรและหุ้นโภคภัณฑ์รายวัน',
    subtitleEn: 'Trade crops, goods & fluctuating market items',
    accentHex: '#ca8a04',
    mapX: 20,
    mapY: 54,
  },
  {
    id: 'city_hall',
    nameTh: 'ศาลากลาง (เลือกอาชีพ)',
    nameEn: 'City Hall & Careers',
    subtitleTh: 'เลือกเปลี่ยนอาชีพที่ชอบและดูข้อมูลพลเมือง',
    subtitleEn: 'Choose any dream career & civic profile',
    accentHex: '#4f46e5',
    mapX: 50,
    mapY: 50,
  },
  {
    id: 'bank',
    nameTh: 'ธนาคารกลางเมือง',
    nameEn: 'Central Bank',
    subtitleTh: 'ฝากออมทรัพย์ กู้ยืมเงิน ผ่อนชำระ แลกเพชร',
    subtitleEn: 'Savings interest, loans, credit score & gems',
    accentHex: '#0d9488',
    mapX: 82,
    mapY: 54,
  },
  {
    id: 'hospital',
    nameTh: 'โรงพยาบาลชุมชน',
    nameEn: 'Community Hospital',
    subtitleTh: 'ตรวจรักษาอาการเจ็บป่วย ซื้อประกันสุขภาพ',
    subtitleEn: 'Treat illnesses, rest ward & health insurance',
    accentHex: '#e11d48',
    mapX: 18,
    mapY: 82,
  },
  {
    id: 'police',
    nameTh: 'สถานีตำรวจ',
    nameEn: 'Police Station',
    subtitleTh: 'สายตรวจกฎหมาย ประกันตัว งานเสี่ยงผิดกฎหมาย',
    subtitleEn: 'Law patrol, bail, wanted level & black market risk',
    accentHex: '#1e40af',
    mapX: 50,
    mapY: 84,
  },
  {
    id: 'temple',
    nameTh: 'วัดประจำชุมชน',
    nameEn: 'Community Temple',
    subtitleTh: 'ทำบุญ สมาธิบำบัดเครียด จิตอาสากลับตัว',
    subtitleEn: 'Make merit, meditate free & community service',
    accentHex: '#d97706',
    mapX: 82,
    mapY: 82,
  },
];

export const ILLNESS_META: Record<
  IllnessId,
  { nameTh: string; nameEn: string; treatCost: number; dailyHpLoss: number; workPenaltyPct: number; descTh: string }
> = {
  none: {
    nameTh: 'สุขภาพแข็งแรงดี',
    nameEn: 'Healthy',
    treatCost: 0,
    dailyHpLoss: 0,
    workPenaltyPct: 0,
    descTh: 'ร่างกายพร้อมทำงานและทำกิจกรรมทุกอย่างในเมือง',
  },
  common_cold: {
    nameTh: 'ไข้หวัดแดด',
    nameEn: 'Common Cold',
    treatCost: 90,
    dailyHpLoss: 6,
    workPenaltyPct: 20,
    descTh: 'ทำงานหนักหรือพักผ่อนน้อย ลดรายได้การทำงาน 20%',
  },
  food_poisoning: {
    nameTh: 'อาหารเป็นพิษ',
    nameEn: 'Food Poisoning',
    treatCost: 130,
    dailyHpLoss: 10,
    workPenaltyPct: 35,
    descTh: 'ปวดท้องอ่อนแรง เสียพลังชีวิตทุกวัน ลดรายได้ 35%',
  },
  exhaustion: {
    nameTh: 'ภาวะเหนื่อยล้าเรื้อรัง',
    nameEn: 'Burnout Exhaustion',
    treatCost: 150,
    dailyHpLoss: 8,
    workPenaltyPct: 40,
    descTh: 'ความเครียดสะสมสูง ควรเข้าวัดทำสมาธิหรือพักโรงพยาบาล',
  },
  sprain: {
    nameTh: 'ข้อเท้าแพลงจากการทำงาน',
    nameEn: 'Ankle Sprain',
    treatCost: 110,
    dailyHpLoss: 5,
    workPenaltyPct: 25,
    descTh: 'บาดเจ็บระหว่างทำงาน ต้องเข้าเฝือกอ่อนและพักฟื้น',
  },
};

export const CITY_SHOP_ITEMS: CityShopItemDef[] = [
  {
    id: 'herbal_coffee',
    nameTh: 'กาแฟสมุนไพรเย็น',
    nameEn: 'Herbal Iced Coffee',
    priceCoins: 35,
    category: 'food',
    energyRestore: 28,
    healthRestore: 2,
    happinessRestore: 8,
    stressReduce: 6,
    descTh: 'เติมพลังงาน +28 และลดความเครียดระหว่างวัน',
  },
  {
    id: 'bento_meal',
    nameTh: 'ข้าวกล่องเพื่อสุขภาพ',
    nameEn: 'Healthy Bento Meal',
    priceCoins: 65,
    category: 'food',
    energyRestore: 45,
    healthRestore: 10,
    happinessRestore: 12,
    stressReduce: 10,
    descTh: 'อาหารอิ่มท้อง ฟื้นฟูทั้งพลังงานและพลังชีวิต',
  },
  {
    id: 'pain_relief_pack',
    nameTh: 'ชุดยาสามัญประจำบ้าน',
    nameEn: 'Home First-Aid Pack',
    priceCoins: 85,
    category: 'medicine',
    energyRestore: 10,
    healthRestore: 25,
    happinessRestore: 4,
    stressReduce: 8,
    curesIllness: true,
    descTh: 'บรรเทาอาการไข้หวัดหรือบาดเจ็บเบื้องต้น (+25 HP และรักษาโรคเบา)',
  },
  {
    id: 'vitamins',
    nameTh: 'วิตามินรวมบูสต์ภูมิคุ้มกัน',
    nameEn: 'Immunity Multivitamins',
    priceCoins: 75,
    category: 'medicine',
    energyRestore: 20,
    healthRestore: 18,
    happinessRestore: 6,
    stressReduce: 14,
    descTh: 'เพิ่มภูมิคุ้มกัน ลดความเครียดสะสม ป้องกันอาการล้า',
  },
  {
    id: 'flower_bouquet',
    nameTh: 'ช่อดอกไม้ชุมชน',
    nameEn: 'Community Flower Bouquet',
    priceCoins: 55,
    category: 'gift',
    energyRestore: 0,
    healthRestore: 0,
    happinessRestore: 18,
    stressReduce: 12,
    descTh: 'นำไปมอบให้เพื่อนบ้านที่สวนชุมชนเพื่อเพิ่มมิตรภาพ +15',
  },
  {
    id: 'luxury_watch',
    nameTh: 'นาฬิกาสมาร์ทวอทช์',
    nameEn: 'Executive Smart Watch',
    priceCoins: 240,
    category: 'gift',
    energyRestore: 10,
    healthRestore: 5,
    happinessRestore: 28,
    stressReduce: 18,
    descTh: 'ของขวัญหรูหรือไอเทมเพิ่มความสุขและความภูมิใจส่วนตัว',
  },
];

export const CITY_MARKET_COMMODITIES: CityCommodityDef[] = [
  { id: 'jasmine_rice_sack', nameTh: 'ข้าวหอมมะลิคัดเกรด (กระสอบ)', nameEn: 'Premium Jasmine Rice Sack', unitTh: 'กระสอบ', basePrice: 120, categoryTh: 'เกษตร' },
  { id: 'arabica_beans', nameTh: 'เมล็ดกาแฟดอยคั่วกลาง', nameEn: 'Highland Arabica Beans', unitTh: 'ถุง', basePrice: 180, categoryTh: 'คาเฟ่' },
  { id: 'solar_microchip', nameTh: 'ชิปเซ็ตพลังงานสะอาด', nameEn: 'Clean Energy Microchip', unitTh: 'ชุด', basePrice: 340, categoryTh: 'เทคโนโลยี' },
  { id: 'medicinal_extract', nameTh: 'สารสกัดสมุนไพรบริสุทธิ์', nameEn: 'Herbal Extract Vial', unitTh: 'ขวด', basePrice: 230, categoryTh: 'การแพทย์' },
  { id: 'city_gold_bar', nameTh: 'ทองคำแท่งจำลอง (1 สลึง)', nameEn: 'City Gold Bullion', unitTh: 'แท่ง', basePrice: 650, categoryTh: 'สินทรัพย์' },
];

export const CITY_LOAN_TIERS: CityLoanTier[] = [
  {
    id: 'micro',
    titleTh: 'สินเชื่อตั้งตัวฉุกเฉิน',
    principal: 400,
    interestRatePct: 10,
    termDays: 5,
    minCreditScore: 300,
    descTh: 'กู้ง่าย ใช้หมุนเวียนซื้ออาหารหรือประกันตัว กำหนดคืนภายใน 5 วัน',
  },
  {
    id: 'business',
    titleTh: 'สินเชื่อขยายร้าน & บริษัท',
    principal: 1200,
    interestRatePct: 14,
    termDays: 7,
    minCreditScore: 520,
    descTh: 'เหมาะสำหรับก่อตั้งบริษัทหรือเก็งกำไรตลาดกลาง กำหนดคืน 7 วัน',
  },
  {
    id: 'enterprise',
    titleTh: 'สินเชื่อนักลงทุนเมือง',
    principal: 3000,
    interestRatePct: 18,
    termDays: 10,
    minCreditScore: 650,
    descTh: 'วงเงินใหญ่สำหรับขยายกิจการระดับสูง (ต้องไม่มีหมายจับและเครดิต ≥ 650)',
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getStorageKey = (schoolId: string, userId: string) =>
  `baanpakkru_life_city_v1_${schoolId}_${userId}`;

const CITIZEN_LOCATIONS: Array<Exclude<CityDistrictId, 'overview'>> = [
  'gardens',
  'shops',
  'company',
  'market',
  'bank',
  'hospital',
  'police',
  'temple',
  'city_hall',
];

const CITIZEN_DIALOGUES: Record<Exclude<CityDistrictId, 'overview'>, string[]> = {
  gardens: ['วันนี้แดดดี ผักบุ้งกับอัญชันโตไวมากเลย!', 'แวะมาชมสวนและช่วยรดน้ำได้เสมอนะ'],
  shops: ['กาแฟสมุนไพรร้านนี้หอมมาก ช่วยหายง่วงได้เยอะเลย', 'ซื้อข้าวกล่องตุนไว้ก่อนไปทำงานดีกว่า'],
  company: ['กำลังเร่งโปรเจกต์ใหม่ของบริษัท ใครว่างมาจอยได้นะ', 'ช่วงนี้ลูกค้าออฟฟิศเยอะ รายได้ดีขึ้นมาก'],
  market: ['ราคาตลาดวันนี้ผันผวน ลองเช็กกราฟราคาก่อนขายของนะ', 'ทองคำกับข้าวหอมมะลิกำลังขึ้นราคาเลย!'],
  bank: ['อย่าลืมชำระหนี้ธนาคารตรงเวลานะ เดี๋ยวเครดิตสกอร์ตก', 'ฝากเงินไว้กินดอกเบี้ยรายวันสบายใจกว่า'],
  hospital: ['พักผ่อนเยอะๆ นะ ถ้าป่วยรีบมารักษาจะได้ไม่เสียรายได้', 'มีประกันสุขภาพไว้ช่วยลดค่ารักษาได้ตั้งครึ่งแน่ะ'],
  police: ['ช่วงนี้ตำรวจเข้มงวดเรื่องตลาดมืด ระวังอย่าทำผิดกฎหมายล่ะ', 'สายตรวจลงพื้นที่ประจำวัน เมืองสงบปลอดภัย'],
  temple: ['มาทำสมาธิที่วัด 5 นาที ความเครียดหายเป็นปลิดทิ้งเลย', 'ทำบุญสร้างจิตอาสาช่วยเสริมดวงและแก้ประวัติได้ด้วยนะ'],
  city_hall: ['อยากลองเปลี่ยนสายอาชีพเมื่อไหร่ก็มาแจ้งที่ศาลากลางได้', 'ทุกอาชีพมีโบนัสพิเศษเฉพาะย่านของตัวเองเลยนะ'],
};

const buildInitialCitizens = (students: Student[] = []): CityCitizen[] => {
  const presets: Array<{
    id: string;
    nameTh: string;
    roleTh: string;
    careerId: LifeCityCareerId;
    location: Exclude<CityDistrictId, 'overview'>;
    gardenLevel: number;
    specialtyCrop: string;
    avatarColor: string;
  }> = [
    {
      id: 'npc-somchai',
      nameTh: 'ลุงสมชาย ใจดี',
      roleTh: 'ปราชญ์เกษตรชุมชน',
      careerId: 'smart_farmer',
      location: 'gardens',
      gardenLevel: 6,
      specialtyCrop: 'ข้าวหอมมะลิ',
      avatarColor: '#16a34a',
    },
    {
      id: 'npc-malee',
      nameTh: 'ป้ามาลี คาเฟ่',
      roleTh: 'เจ้าของร้านอาหาร & คาเฟ่',
      careerId: 'chef_cafe',
      location: 'shops',
      gardenLevel: 5,
      specialtyCrop: 'ดอกอัญชัน & ใบเตย',
      avatarColor: '#ea580c',
    },
    {
      id: 'npc-drnat',
      nameTh: 'หมอณัฐ อาสา',
      roleTh: 'แพทย์ประจำโรงพยาบาลชุมชน',
      careerId: 'doctor_medic',
      location: 'hospital',
      gardenLevel: 4,
      specialtyCrop: 'สมุนไพรฟ้าทะลายโจร',
      avatarColor: '#e11d48',
    },
    {
      id: 'npc-ton',
      nameTh: 'ผู้กองต้น ยุติธรรม',
      roleTh: 'สารวัตรสถานีตำรวจเมือง',
      careerId: 'police_officer',
      location: 'police',
      gardenLevel: 4,
      specialtyCrop: 'มะม่วงน้ำดอกไม้',
      avatarColor: '#1d4ed8',
    },
  ];

  const classmateCitizens: CityCitizen[] = students.slice(0, 4).map((st, idx) => {
    const career = LIFE_CITY_CAREERS[(idx + 2) % LIFE_CITY_CAREERS.length];
    const loc = CITIZEN_LOCATIONS[(idx + 2) % CITIZEN_LOCATIONS.length];
    return {
      id: `citizen-st-${st.id}`,
      nameTh: `${st.firstNameTh} ${st.lastNameTh}`,
      roleTh: `${st.gradeLevel} ${st.room} · ${career.nameTh}`,
      careerId: career.id,
      location: loc,
      moodTh: 'อารมณ์ดี',
      dialogueTh: CITIZEN_DIALOGUES[loc][0],
      friendship: 30 + idx * 10,
      gardenLevel: 2 + idx,
      specialtyCrop: idx % 2 === 0 ? 'สตรอว์เบอร์รี' : 'มะพร้าวน้ำหอม',
      helpedToday: false,
      avatarColor: career.accentColor,
    };
  });

  const presetCitizens: CityCitizen[] = presets.map((p) => ({
    ...p,
    moodTh: 'กระตือรือร้น',
    dialogueTh: CITIZEN_DIALOGUES[p.location][0],
    friendship: 45,
    helpedToday: false,
  }));

  return [...classmateCitizens, ...presetCitizens];
};

const createInitialMultipliers = (): Record<string, number> => {
  const result: Record<string, number> = {};
  CITY_MARKET_COMMODITIES.forEach((c, idx) => {
    result[c.id] = Number((0.92 + (idx % 3) * 0.08).toFixed(2));
  });
  return result;
};

export const createInitialLifeCityState = (
  schoolId: string,
  userId: string,
  students: Student[] = []
): LifeCityState => ({
  version: 1,
  schoolId,
  userId,
  day: 1,
  careerId: 'smart_farmer',
  careerXp: 0,
  careerLevel: 1,
  health: 100,
  energy: 100,
  happiness: 85,
  stress: 12,
  illness: 'none',
  hasHealthInsurance: false,
  bankSavings: 200,
  creditScore: 620,
  loans: [],
  wantedLevel: 0,
  criminalRecord: 0,
  jailDaysRemaining: 0,
  karmaPoints: 25,
  company: {
    founded: false,
    name: 'สตาร์ทอัพชุมชน',
    industryTh: 'เกษตรและบริการดิจิทัล',
    level: 1,
    staffCount: 0,
    dailyBaseProfit: 120,
    reputation: 40,
  },
  marketMultipliers: createInitialMultipliers(),
  marketPrevMultipliers: createInitialMultipliers(),
  commodityHoldings: {},
  bag: {
    herbal_coffee: 1,
    bento_meal: 1,
    pain_relief_pack: 0,
    vitamins: 0,
    luxury_watch: 0,
    flower_bouquet: 1,
  },
  citizens: buildInitialCitizens(students),
  cityLog: [
    {
      id: 'log-init-1',
      day: 1,
      district: 'overview',
      tone: 'info',
      textTh: 'ยินดีต้อนรับสู่เมืองจำลองชุมชน! เลือกอาชีพที่ชอบ เยี่ยมสวนเพื่อน และสร้างชีวิตในเมืองได้เลย',
    },
  ],
  updatedAt: new Date().toISOString(),
});

export const normalizeLifeCityState = (
  raw: Partial<LifeCityState> | null | undefined,
  schoolId: string,
  userId: string,
  students: Student[] = []
): LifeCityState => {
  const base = createInitialLifeCityState(schoolId, userId, students);
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    schoolId,
    userId,
    health: clamp(Number(raw.health ?? base.health), 0, 100),
    energy: clamp(Number(raw.energy ?? base.energy), 0, 100),
    happiness: clamp(Number(raw.happiness ?? base.happiness), 0, 100),
    stress: clamp(Number(raw.stress ?? base.stress), 0, 100),
    creditScore: clamp(Number(raw.creditScore ?? base.creditScore), 300, 850),
    wantedLevel: clamp(Number(raw.wantedLevel ?? base.wantedLevel), 0, 5),
    loans: Array.isArray(raw.loans) ? raw.loans : [],
    company: raw.company ? { ...base.company, ...raw.company } : base.company,
    marketMultipliers: { ...base.marketMultipliers, ...(raw.marketMultipliers || {}) },
    marketPrevMultipliers: { ...base.marketPrevMultipliers, ...(raw.marketPrevMultipliers || {}) },
    commodityHoldings: { ...(raw.commodityHoldings || {}) },
    bag: { ...base.bag, ...(raw.bag || {}) },
    citizens: Array.isArray(raw.citizens) && raw.citizens.length > 0 ? raw.citizens : base.citizens,
    cityLog: Array.isArray(raw.cityLog) && raw.cityLog.length > 0 ? raw.cityLog.slice(0, 40) : base.cityLog,
  };
};

export const loadLifeCityState = (
  schoolId: string,
  userId: string,
  students: Student[] = []
): LifeCityState => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialLifeCityState(schoolId, userId, students);
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey(schoolId, userId));
    if (!raw) return createInitialLifeCityState(schoolId, userId, students);
    return normalizeLifeCityState(JSON.parse(raw) as Partial<LifeCityState>, schoolId, userId, students);
  } catch {
    return createInitialLifeCityState(schoolId, userId, students);
  }
};

export const saveLifeCityState = (schoolId: string, userId: string, state: LifeCityState): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(getStorageKey(schoolId, userId), JSON.stringify(state));
  } catch {
    // ignore storage quota failures
  }
};

const appendLog = (
  state: LifeCityState,
  district: CityDistrictId,
  tone: CityLogEntry['tone'],
  textTh: string
): CityLogEntry[] => {
  const entry: CityLogEntry = {
    id: `city-${state.day}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    day: state.day,
    district,
    tone,
    textTh,
  };
  return [entry, ...state.cityLog].slice(0, 35);
};

export const getCommodityCurrentPrice = (state: LifeCityState, commodityId: string): number => {
  const def = CITY_MARKET_COMMODITIES.find((c) => c.id === commodityId);
  if (!def) return 0;
  const mult = state.marketMultipliers[commodityId] ?? 1;
  return Math.max(20, Math.round(def.basePrice * mult));
};

export const getCityMarketDemandMultiplier = (state: LifeCityState, itemId: string): number => {
  // Deterministic daily oscillation between 0.85x and 1.35x keyed by itemId + day
  let hash = state.day * 31;
  for (let i = 0; i < itemId.length; i += 1) {
    hash = (hash * 17 + itemId.charCodeAt(i)) % 1000;
  }
  return Number((0.85 + (hash % 51) / 100).toFixed(2));
};

export const selectCityCareer = (state: LifeCityState, careerId: LifeCityCareerId): CityActionResult => {
  const career = CAREER_DEF_MAP[careerId];
  if (!career) {
    return { ok: false, messageTh: '', errorTh: 'ไม่พบอาชีพที่เลือก', state, coinDelta: 0 };
  }
  if (state.careerId === careerId) {
    return { ok: true, messageTh: `คุณกำลังประกอบอาชีพ ${career.nameTh} อยู่แล้ว`, state, coinDelta: 0 };
  }
  const nextState: LifeCityState = {
    ...state,
    careerId,
    happiness: clamp(state.happiness + 4, 0, 100),
    cityLog: appendLog(state, 'city_hall', 'info', `เปลี่ยนสายอาชีพเป็น "${career.nameTh}" เรียบร้อยแล้ว`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `เปลี่ยนอาชีพเป็น ${career.nameTh} สำเร็จ!`,
    state: nextState,
    coinDelta: 0,
  };
};

export const workCareerShift = (state: LifeCityState, _currentCoins: number): CityActionResult => {
  if (state.jailDaysRemaining > 0) {
    return {
      ok: false,
      messageTh: '',
      errorTh: `คุณกำลังถูกคุมขังเหลือ ${state.jailDaysRemaining} วัน ไม่สามารถออกไปทำงานได้ (จ่ายค่าประกันตัวหรือกดขึ้นวันใหม่)`,
      state,
      coinDelta: 0,
    };
  }
  const career = CAREER_DEF_MAP[state.careerId];
  if (state.energy < career.energyCost) {
    return {
      ok: false,
      messageTh: '',
      errorTh: `พลังงานไม่พอทำงาน (ต้องการ ${career.energyCost} พลังงาน — ไปร้านค้าซื้ออาหารหรือขึ้นวันใหม่)`,
      state,
      coinDelta: 0,
    };
  }
  const levelBonus = 1 + (state.careerLevel - 1) * 0.12;
  const illnessPenalty = 1 - ILLNESS_META[state.illness].workPenaltyPct / 100;
  const companyBonus = state.company.founded ? state.company.level * 18 : 0;
  const earned = Math.max(40, Math.round(career.baseSalary * levelBonus * illnessPenalty + companyBonus));

  const nextXp = state.careerXp + 25;
  const nextLevel = 1 + Math.floor(nextXp / 100);
  const nextStress = clamp(state.stress + career.stressGain, 0, 100);
  const nextEnergy = clamp(state.energy - career.energyCost, 0, 100);

  let nextIllness = state.illness;
  if (nextIllness === 'none' && nextStress >= 88) {
    nextIllness = 'exhaustion';
  }

  const leveledUp = nextLevel > state.careerLevel;
  const msg = leveledUp
    ? `ทำงาน ${career.nameTh} รับเงิน +${earned} เหรียญ และเลื่อนขั้นอาชีพเป็น Lv.${nextLevel}!`
    : `ทำงานกะ ${career.nameTh} สำเร็จ! รับค่าตอบแทน +${earned} เหรียญ`;

  const nextState: LifeCityState = {
    ...state,
    careerXp: nextXp,
    careerLevel: nextLevel,
    energy: nextEnergy,
    stress: nextStress,
    illness: nextIllness,
    cityLog: appendLog(state, 'company', leveledUp ? 'success' : 'info', msg),
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    messageTh: msg,
    state: nextState,
    coinDelta: earned,
    xpGain: 15,
  };
};

export const foundOrUpgradeCompany = (
  state: LifeCityState,
  currentCoins: number,
  customName?: string
): CityActionResult => {
  if (state.jailDaysRemaining > 0) {
    return { ok: false, messageTh: '', errorTh: 'ไม่สามารถจดทะเบียนหรือขยายบริษัทระหว่างถูกคุมขัง', state, coinDelta: 0 };
  }
  const isCeo = state.careerId === 'business_ceo';
  const discount = isCeo ? 0.85 : 1;

  if (!state.company.founded) {
    const cost = Math.round(500 * discount);
    if (currentCoins < cost) {
      return {
        ok: false,
        messageTh: '',
        errorTh: `เงินสดไม่พอจดทะเบียนบริษัท (ต้องการ ${cost} เหรียญ)`,
        state,
        coinDelta: 0,
      };
    }
    const cleanName = (customName || '').trim() || state.company.name;
    const nextState: LifeCityState = {
      ...state,
      company: {
        ...state.company,
        founded: true,
        name: cleanName,
        level: 1,
        staffCount: 1,
        dailyBaseProfit: 130,
        reputation: 55,
      },
      cityLog: appendLog(state, 'company', 'success', `ก่อตั้งบริษัท "${cleanName}" สำเร็จ! รับกำไรปันผลทุกวัน`),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: `ก่อตั้งบริษัท "${cleanName}" สำเร็จ (-${cost} เหรียญ)`,
      state: nextState,
      coinDelta: -cost,
      xpGain: 35,
    };
  }

  if (state.company.level >= 5) {
    return { ok: false, messageTh: '', errorTh: 'บริษัทอัปเกรดถึงระดับสูงสุด (Lv.5) แล้ว', state, coinDelta: 0 };
  }

  const upgradeCost = Math.round((450 + state.company.level * 350) * discount);
  if (currentCoins < upgradeCost) {
    return {
      ok: false,
      messageTh: '',
      errorTh: `เงินสดไม่พออัปเกรดบริษัท (ต้องการ ${upgradeCost} เหรียญ)`,
      state,
      coinDelta: 0,
    };
  }

  const nextLevel = state.company.level + 1;
  const nextState: LifeCityState = {
    ...state,
    company: {
      ...state.company,
      level: nextLevel,
      dailyBaseProfit: state.company.dailyBaseProfit + 110,
      reputation: clamp(state.company.reputation + 10, 0, 100),
    },
    cityLog: appendLog(state, 'company', 'success', `อัปเกรดบริษัท "${state.company.name}" เป็นระดับ Lv.${nextLevel}`),
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    messageTh: `อัปเกรดบริษัทเป็น Lv.${nextLevel} สำเร็จ!`,
    state: nextState,
    coinDelta: -upgradeCost,
    xpGain: 30,
  };
};

export const hireCompanyStaff = (state: LifeCityState, currentCoins: number): CityActionResult => {
  if (!state.company.founded) {
    return { ok: false, messageTh: '', errorTh: 'กรุณาก่อตั้งบริษัทก่อนจ้างพนักงาน', state, coinDelta: 0 };
  }
  const maxStaff = state.company.level * 3;
  if (state.company.staffCount >= maxStaff) {
    return {
      ok: false,
      messageTh: '',
      errorTh: `จำนวนพนักงานเต็มโควต้า Lv.${state.company.level} (${maxStaff} คน) กรุณาอัปเกรดบริษัท`,
      state,
      coinDelta: 0,
    };
  }
  const hireCost = 220;
  if (currentCoins < hireCost) {
    return { ok: false, messageTh: '', errorTh: `เงินสดไม่พอจ้างพนักงาน (ต้องการ ${hireCost} เหรียญ)`, state, coinDelta: 0 };
  }
  const nextStaff = state.company.staffCount + 1;
  const nextState: LifeCityState = {
    ...state,
    company: {
      ...state.company,
      staffCount: nextStaff,
      dailyBaseProfit: state.company.dailyBaseProfit + 45,
    },
    cityLog: appendLog(state, 'company', 'info', `จ้างพนักงานเพิ่มเป็น ${nextStaff} คน (+45 เหรียญ/วัน)`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `จ้างพนักงานคนที่ ${nextStaff} สำเร็จ! กำไรรายวันเพิ่มขึ้น`,
    state: nextState,
    coinDelta: -hireCost,
  };
};

export const buyShopItem = (
  state: LifeCityState,
  itemId: CityInventoryItemId,
  qty: number,
  currentCoins: number
): CityActionResult => {
  const item = CITY_SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item || qty <= 0) {
    return { ok: false, messageTh: '', errorTh: 'ไม่พบสินค้าที่ต้องการซื้อ', state, coinDelta: 0 };
  }
  const discount = state.careerId === 'chef_cafe' && item.category === 'food' ? 0.85 : 1;
  const totalCost = Math.round(item.priceCoins * discount) * qty;
  if (currentCoins < totalCost) {
    return { ok: false, messageTh: '', errorTh: `เหรียญไม่พอ (ต้องการ ${totalCost} เหรียญ)`, state, coinDelta: 0 };
  }
  const nextState: LifeCityState = {
    ...state,
    bag: {
      ...state.bag,
      [itemId]: (state.bag[itemId] || 0) + qty,
    },
    cityLog: appendLog(state, 'shops', 'info', `ซื้อ ${item.nameTh} ×${qty} จากร้านค้าชุมชน (-${totalCost} เหรียญ)`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `ซื้อ ${item.nameTh} ×${qty} ใส่กระเป๋าแล้ว`,
    state: nextState,
    coinDelta: -totalCost,
  };
};

export const useInventoryItem = (state: LifeCityState, itemId: CityInventoryItemId): CityActionResult => {
  const owned = state.bag[itemId] || 0;
  const item = CITY_SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item || owned <= 0) {
    return { ok: false, messageTh: '', errorTh: 'ไม่มีไอเทมนี้ในกระเป๋า', state, coinDelta: 0 };
  }
  let nextIllness = state.illness;
  if (item.curesIllness && (state.illness === 'common_cold' || state.illness === 'sprain')) {
    nextIllness = 'none';
  }
  const curedMsg = nextIllness !== state.illness ? ' และอาการป่วยเบาบางหายดีแล้ว!' : '';
  const nextState: LifeCityState = {
    ...state,
    bag: {
      ...state.bag,
      [itemId]: owned - 1,
    },
    energy: clamp(state.energy + item.energyRestore, 0, 100),
    health: clamp(state.health + item.healthRestore, 0, 100),
    happiness: clamp(state.happiness + item.happinessRestore, 0, 100),
    stress: clamp(state.stress - item.stressReduce, 0, 100),
    illness: nextIllness,
    cityLog: appendLog(state, 'shops', 'success', `ใช้ ${item.nameTh}${curedMsg}`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `ใช้ ${item.nameTh} ฟื้นฟูร่างกายแล้ว${curedMsg}`,
    state: nextState,
    coinDelta: 0,
  };
};

export const tradeMarketCommodity = (
  state: LifeCityState,
  side: 'buy' | 'sell',
  commodityId: string,
  qty: number,
  currentCoins: number
): CityActionResult => {
  const def = CITY_MARKET_COMMODITIES.find((c) => c.id === commodityId);
  if (!def || qty <= 0) {
    return { ok: false, messageTh: '', errorTh: 'ไม่พบสินค้าตลาดที่เลือก', state, coinDelta: 0 };
  }
  const unitPrice = getCommodityCurrentPrice(state, commodityId);
  const owned = state.commodityHoldings[commodityId] || 0;

  if (side === 'buy') {
    const cost = unitPrice * qty;
    if (currentCoins < cost) {
      return { ok: false, messageTh: '', errorTh: `เงินสดไม่พอซื้อ ${def.nameTh} (ต้องการ ${cost} เหรียญ)`, state, coinDelta: 0 };
    }
    const nextState: LifeCityState = {
      ...state,
      commodityHoldings: {
        ...state.commodityHoldings,
        [commodityId]: owned + qty,
      },
      cityLog: appendLog(state, 'market', 'info', `ซื้อ ${def.nameTh} ×${qty} ที่ราคา ${unitPrice} เหรียญ/${def.unitTh}`),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: `ซื้อ ${def.nameTh} ×${qty} สำเร็จ`,
      state: nextState,
      coinDelta: -cost,
    };
  }

  if (owned < qty) {
    return { ok: false, messageTh: '', errorTh: `มี ${def.nameTh} ในพอร์ตไม่พอขาย`, state, coinDelta: 0 };
  }
  const feeDiscount = state.careerId === 'fishery_captain' ? 1 : 0.96;
  const proceeds = Math.round(unitPrice * qty * feeDiscount);
  const nextState: LifeCityState = {
    ...state,
    commodityHoldings: {
      ...state.commodityHoldings,
      [commodityId]: owned - qty,
    },
    cityLog: appendLog(state, 'market', 'success', `ขาย ${def.nameTh} ×${qty} ได้เงิน +${proceeds} เหรียญ`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `ขาย ${def.nameTh} ×${qty} รับเงิน +${proceeds} เหรียญ!`,
    state: nextState,
    coinDelta: proceeds,
    xpGain: 10,
  };
};

export const sellFarmItemToCityMarket = (
  state: LifeCityState,
  kind: 'crop' | 'product',
  itemId: CropId | ProductId,
  itemNameTh: string,
  baseSellPrice: number,
  ownedQty: number,
  sellQty: number
): CityActionResult => {
  if (sellQty <= 0 || ownedQty < sellQty) {
    return { ok: false, messageTh: '', errorTh: `จำนวน ${itemNameTh} ในคลังไม่พอขาย`, state, coinDelta: 0 };
  }
  const marketMult = getCityMarketDemandMultiplier(state, itemId);
  let careerBoost = 1;
  if (kind === 'crop' && state.careerId === 'smart_farmer') careerBoost = 1.15;
  if (kind === 'product' && state.careerId === 'chef_cafe') careerBoost = 1.15;
  if (kind === 'product' && state.careerId === 'artisan_craft') careerBoost = 1.12;
  if (kind === 'product' && (itemId === 'tilapia_fish' || itemId === 'giant_prawn') && state.careerId === 'fishery_captain') {
    careerBoost = 1.18;
  }

  const unitPrice = Math.max(10, Math.round(baseSellPrice * marketMult * careerBoost));
  const totalProceeds = unitPrice * sellQty;
  const nextState: LifeCityState = {
    ...state,
    cityLog: appendLog(state, 'market', 'success', `ขาย ${itemNameTh} ×${sellQty} ให้ตลาดกลางเมือง รับ +${totalProceeds} เหรียญ`),
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    messageTh: `ขาย ${itemNameTh} ×${sellQty} ในตลาดกลางได้ +${totalProceeds} เหรียญ`,
    state: nextState,
    coinDelta: totalProceeds,
    xpGain: 8 * sellQty,
    barnDelta: kind === 'crop' ? { [itemId as CropId]: -sellQty } : undefined,
    goodsDelta: kind === 'product' ? { [itemId as ProductId]: -sellQty } : undefined,
  };
};

export const bankDeposit = (state: LifeCityState, amount: number, currentCoins: number): CityActionResult => {
  const clean = Math.floor(amount);
  if (clean <= 0 || currentCoins < clean) {
    return { ok: false, messageTh: '', errorTh: 'จำนวนเงินฝากไม่ถูกต้องหรือเงินสดไม่พอ', state, coinDelta: 0 };
  }
  const nextState: LifeCityState = {
    ...state,
    bankSavings: state.bankSavings + clean,
    cityLog: appendLog(state, 'bank', 'info', `ฝากเงินเข้าธนาคาร +${clean} เหรียญ`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `ฝากเงินเข้าบัญชีออมทรัพย์ +${clean} เหรียญสำเร็จ`,
    state: nextState,
    coinDelta: -clean,
  };
};

export const bankWithdraw = (state: LifeCityState, amount: number): CityActionResult => {
  const clean = Math.floor(amount);
  if (clean <= 0 || state.bankSavings < clean) {
    return { ok: false, messageTh: '', errorTh: 'ยอดเงินออมในธนาคารไม่พอถอน', state, coinDelta: 0 };
  }
  const nextState: LifeCityState = {
    ...state,
    bankSavings: state.bankSavings - clean,
    cityLog: appendLog(state, 'bank', 'info', `ถอนเงินจากธนาคาร ${clean} เหรียญ`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `ถอนเงินสด ${clean} เหรียญเรียบร้อย`,
    state: nextState,
    coinDelta: clean,
  };
};

export const takeBankLoan = (state: LifeCityState, tierId: CityLoanTier['id']): CityActionResult => {
  if (state.jailDaysRemaining > 0 || state.wantedLevel >= 3) {
    return {
      ok: false,
      messageTh: '',
      errorTh: 'ธนาคารระงับสินเชื่อชั่วคราวเนื่องจากมีหมายจับหรือถูกคุมขัง',
      state,
      coinDelta: 0,
    };
  }
  const tier = CITY_LOAN_TIERS.find((t) => t.id === tierId);
  if (!tier) {
    return { ok: false, messageTh: '', errorTh: 'ไม่พบแพ็กเกจสินเชื่อ', state, coinDelta: 0 };
  }
  if (state.creditScore < tier.minCreditScore) {
    return {
      ok: false,
      messageTh: '',
      errorTh: `เครดิตสกอร์ยังไม่ถึงเกณฑ์ (${state.creditScore}/${tier.minCreditScore})`,
      state,
      coinDelta: 0,
    };
  }
  if (state.loans.length >= 2) {
    return {
      ok: false,
      messageTh: '',
      errorTh: 'มีสัญญากู้ยืมค้างอยู่สูงสุด 2 สัญญาแล้ว กรุณาชำระคืนก่อนกู้เพิ่ม',
      state,
      coinDelta: 0,
    };
  }
  const effectiveRate = state.careerId === 'banker_finance' ? Math.round(tier.interestRatePct * 0.75) : tier.interestRatePct;
  const totalDue = Math.round(tier.principal * (1 + effectiveRate / 100));
  const loan: CityLoan = {
    id: `loan-${state.day}-${Date.now()}`,
    tierId: tier.id,
    titleTh: tier.titleTh,
    principal: tier.principal,
    remainingDue: totalDue,
    interestRatePct: effectiveRate,
    daysLeft: tier.termDays,
    overdueDays: 0,
    createdDay: state.day,
  };
  const nextState: LifeCityState = {
    ...state,
    loans: [...state.loans, loan],
    cityLog: appendLog(state, 'bank', 'warning', `กู้เงิน "${tier.titleTh}" +${tier.principal} เหรียญ (ต้องคืนรวมดอกเบี้ย ${totalDue} เหรียญ)`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `อนุมัติเงินกู้ +${tier.principal} เหรียญ! ครบกำหนดคืนใน ${tier.termDays} วัน`,
    state: nextState,
    coinDelta: tier.principal,
  };
};

export const repayBankLoan = (
  state: LifeCityState,
  loanId: string,
  amount: number,
  currentCoins: number
): CityActionResult => {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) {
    return { ok: false, messageTh: '', errorTh: 'ไม่พบสัญญากู้เงินนี้', state, coinDelta: 0 };
  }
  const payAmount = Math.min(loan.remainingDue, Math.max(0, Math.floor(amount)));
  if (payAmount <= 0 || currentCoins < payAmount) {
    return { ok: false, messageTh: '', errorTh: 'เงินสดไม่พอชำระหนี้', state, coinDelta: 0 };
  }
  const remaining = loan.remainingDue - payAmount;
  const closed = remaining <= 0;
  const nextLoans = closed
    ? state.loans.filter((l) => l.id !== loanId)
    : state.loans.map((l) => (l.id === loanId ? { ...l, remainingDue: remaining } : l));

  const nextCredit = clamp(state.creditScore + (closed ? 25 : 8), 300, 850);
  const nextState: LifeCityState = {
    ...state,
    loans: nextLoans,
    creditScore: nextCredit,
    cityLog: appendLog(
      state,
      'bank',
      closed ? 'success' : 'info',
      closed
        ? `ปิดยอดหนี้ "${loan.titleTh}" ครบถ้วน! เครดิตสกอร์เพิ่มเป็น ${nextCredit}`
        : `ชำระหนี้ "${loan.titleTh}" จำนวน ${payAmount} เหรียญ (คงเหลือ ${remaining})`
    ),
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    messageTh: closed ? `ชำระหนี้ครบถ้วนแล้ว! เครดิต +25` : `ชำระหนี้แล้ว ${payAmount} เหรียญ`,
    state: nextState,
    coinDelta: -payAmount,
    xpGain: closed ? 20 : 5,
  };
};

export const exchangeBankCoinsToGems = (state: LifeCityState, currentCoins: number): CityActionResult => {
  const cost = 350;
  if (currentCoins < cost) {
    return { ok: false, messageTh: '', errorTh: `ต้องการ ${cost} เหรียญ เพื่อแลก 1 เพชร`, state, coinDelta: 0 };
  }
  const nextState: LifeCityState = {
    ...state,
    cityLog: appendLog(state, 'bank', 'info', `แลกเงิน ${cost} เหรียญ เป็นเพชร +1 เม็ด ที่ธนาคาร`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: 'แลกเพชร +1 เม็ดสำเร็จ!',
    state: nextState,
    coinDelta: -cost,
    gemGain: 1,
  };
};

export const visitHospitalAction = (
  state: LifeCityState,
  action: 'treat_illness' | 'rest_ward' | 'buy_insurance' | 'doctor_shift',
  currentCoins: number
): CityActionResult => {
  const discountMult = state.careerId === 'doctor_medic' ? 0.4 : state.hasHealthInsurance ? 0.5 : 1;

  if (action === 'treat_illness') {
    if (state.illness === 'none' && state.health >= 95) {
      return { ok: false, messageTh: '', errorTh: 'สุขภาพแข็งแรงดีอยู่แล้ว ไม่จำเป็นต้องรักษา', state, coinDelta: 0 };
    }
    const baseCost = state.illness === 'none' ? 70 : ILLNESS_META[state.illness].treatCost;
    const cost = Math.round(baseCost * discountMult);
    if (currentCoins < cost) {
      return { ok: false, messageTh: '', errorTh: `เงินสดไม่พอค่ารักษา (ต้องการ ${cost} เหรียญ)`, state, coinDelta: 0 };
    }
    const curedName = ILLNESS_META[state.illness].nameTh;
    const nextState: LifeCityState = {
      ...state,
      illness: 'none',
      health: 100,
      stress: clamp(state.stress - 15, 0, 100),
      cityLog: appendLog(state, 'hospital', 'success', `แพทย์รักษาอาการ "${curedName}" หายขาด (+100 HP)`),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: `รักษาอาการหายดีแล้ว! พลังชีวิตเต็ม 100 (-${cost} เหรียญ)`,
      state: nextState,
      coinDelta: -cost,
    };
  }

  if (action === 'rest_ward') {
    const cost = Math.round(80 * discountMult);
    if (currentCoins < cost) {
      return { ok: false, messageTh: '', errorTh: `เงินสดไม่พอค่าห้องพักฟื้น (ต้องการ ${cost} เหรียญ)`, state, coinDelta: 0 };
    }
    const nextState: LifeCityState = {
      ...state,
      health: clamp(state.health + 35, 0, 100),
      energy: clamp(state.energy + 45, 0, 100),
      stress: clamp(state.stress - 25, 0, 100),
      cityLog: appendLog(state, 'hospital', 'info', 'นอนพักฟื้นที่ห้องพยาบาล ฟื้นพลังชีวิตและพลังงาน'),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: `พักฟื้นเรียบร้อย! สุขภาพ +35, พลังงาน +45`,
      state: nextState,
      coinDelta: -cost,
    };
  }

  if (action === 'buy_insurance') {
    if (state.hasHealthInsurance) {
      return { ok: false, messageTh: '', errorTh: 'คุณมีประกันสุขภาพชุมชนอยู่แล้ว', state, coinDelta: 0 };
    }
    const cost = 300;
    if (currentCoins < cost) {
      return { ok: false, messageTh: '', errorTh: `เงินสดไม่พอทำประกัน (ต้องการ ${cost} เหรียญ)`, state, coinDelta: 0 };
    }
    const nextState: LifeCityState = {
      ...state,
      hasHealthInsurance: true,
      cityLog: appendLog(state, 'hospital', 'success', 'ทำประกันสุขภาพชุมชนสำเร็จ! ลดค่ารักษาพยาบาลทุกครั้ง 50%'),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: 'สมัครประกันสุขภาพชุมชนสำเร็จ! (ลดค่ารักษา 50%)',
      state: nextState,
      coinDelta: -cost,
    };
  }

  // doctor_shift
  if (state.jailDaysRemaining > 0) {
    return { ok: false, messageTh: '', errorTh: 'ไม่สามารถเข้าเวรพยาบาลระหว่างถูกคุมขัง', state, coinDelta: 0 };
  }
  if (state.energy < 24) {
    return { ok: false, messageTh: '', errorTh: 'พลังงานไม่พอเข้าเวรอาสาโรงพยาบาล (ต้องการ 24 พลังงาน)', state, coinDelta: 0 };
  }
  const reward = state.careerId === 'doctor_medic' ? 270 : 120;
  const nextState: LifeCityState = {
    ...state,
    energy: clamp(state.energy - 24, 0, 100),
    stress: clamp(state.stress + 12, 0, 100),
    karmaPoints: state.karmaPoints + 5,
    cityLog: appendLog(state, 'hospital', 'success', `ช่วยงานโรงพยาบาลชุมชน รับค่าตอบแทน +${reward} เหรียญ และแต้มดี +5`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `เข้าเวรโรงพยาบาลสำเร็จ! รับ +${reward} เหรียญ`,
    state: nextState,
    coinDelta: reward,
    xpGain: 15,
  };
};

export const performPoliceAction = (
  state: LifeCityState,
  action: 'pay_bail_or_fine' | 'patrol_shift' | 'illegal_smuggle' | 'illegal_blackmarket' | 'illegal_fraud',
  currentCoins: number,
  rng: () => number = Math.random
): CityActionResult => {
  if (action === 'pay_bail_or_fine') {
    if (state.wantedLevel === 0 && state.jailDaysRemaining === 0) {
      return { ok: false, messageTh: '', errorTh: 'ประวัติขาวสะอาด ไม่มีค่าปรับหรือหมายจับค้างอยู่', state, coinDelta: 0 };
    }
    const finePerStar = state.careerId === 'police_officer' ? 120 : 180;
    const totalFine = Math.max(180, state.wantedLevel * finePerStar + state.jailDaysRemaining * 160);
    if (currentCoins < totalFine) {
      return {
        ok: false,
        messageTh: '',
        errorTh: `เงินสดไม่พอจ่ายค่าปรับ/ประกันตัว (ต้องการ ${totalFine} เหรียญ)`,
        state,
        coinDelta: 0,
      };
    }
    const nextState: LifeCityState = {
      ...state,
      wantedLevel: 0,
      jailDaysRemaining: 0,
      cityLog: appendLog(state, 'police', 'info', `ชำระค่าปรับและประกันตัว ${totalFine} เหรียญ ปลดล็อกอิสรภาพแล้ว`),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: `ชำระค่าปรับ/ประกันตัว ${totalFine} เหรียญเรียบร้อย ล้างดาวหมายจับแล้ว`,
      state: nextState,
      coinDelta: -totalFine,
    };
  }

  if (action === 'patrol_shift') {
    if (state.jailDaysRemaining > 0) {
      return { ok: false, messageTh: '', errorTh: 'ไม่สามารถช่วยสายตรวจระหว่างถูกคุมขัง', state, coinDelta: 0 };
    }
    if (state.energy < 22) {
      return { ok: false, messageTh: '', errorTh: 'พลังงานไม่พอออกตรวจความสงบ (ต้องการ 22 พลังงาน)', state, coinDelta: 0 };
    }
    const pay = state.careerId === 'police_officer' ? 280 : 135;
    const nextState: LifeCityState = {
      ...state,
      energy: clamp(state.energy - 22, 0, 100),
      stress: clamp(state.stress + 10, 0, 100),
      wantedLevel: Math.max(0, state.wantedLevel - 1),
      karmaPoints: state.karmaPoints + 6,
      cityLog: appendLog(state, 'police', 'success', `ออกสายตรวจดูแลเมือง รับค่าตอบแทน +${pay} เหรียญ`),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: `ออกลาดตระเวนร่วมกับตำรวจสำเร็จ! รับ +${pay} เหรียญ`,
      state: nextState,
      coinDelta: pay,
      xpGain: 18,
    };
  }

  // Illegal operations (high reward vs arrest risk)
  if (state.jailDaysRemaining > 0) {
    return { ok: false, messageTh: '', errorTh: 'คุณอยู่ในห้องขัง ไม่สามารถทำกิจกรรมภายนอกได้', state, coinDelta: 0 };
  }
  if (state.energy < 20) {
    return { ok: false, messageTh: '', errorTh: 'พลังงานไม่พอลงมือ (ต้องการ 20 พลังงาน)', state, coinDelta: 0 };
  }

  const ops = {
    illegal_smuggle: { label: 'ลักลอบขนส่งของหนีภาษี', reward: 420, catchChance: 0.35, fine: 320 },
    illegal_blackmarket: { label: 'ค้าขายในตลาดมืดลับ', reward: 680, catchChance: 0.48, fine: 520 },
    illegal_fraud: { label: 'เจาะระบบปั่นตัวเลขการเงิน', reward: 1100, catchChance: 0.6, fine: 850 },
  }[action];

  const caught = rng() < ops.catchChance;
  if (!caught) {
    const nextWanted = clamp(state.wantedLevel + 1, 0, 5);
    const nextState: LifeCityState = {
      ...state,
      energy: clamp(state.energy - 20, 0, 100),
      stress: clamp(state.stress + 18, 0, 100),
      wantedLevel: nextWanted,
      karmaPoints: Math.max(0, state.karmaPoints - 10),
      cityLog: appendLog(
        state,
        'police',
        'warning',
        `ทำภารกิจเสี่ยง "${ops.label}" ได้เงิน +${ops.reward} เหรียญ (แต่ดาวหมายจับเพิ่มเป็น ${nextWanted} ★)`
      ),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: `รอดพ้นสายตาตำรวจ! ได้เงิน +${ops.reward} เหรียญ (หมายจับ ${nextWanted} ★)`,
      state: nextState,
      coinDelta: ops.reward,
    };
  }

  const paidFine = Math.min(currentCoins, ops.fine);
  const nextWanted = clamp(state.wantedLevel + 2, 1, 5);
  const nextState: LifeCityState = {
    ...state,
    energy: clamp(state.energy - 20, 0, 100),
    happiness: clamp(state.happiness - 18, 0, 100),
    stress: clamp(state.stress + 24, 0, 100),
    wantedLevel: nextWanted,
    criminalRecord: state.criminalRecord + 1,
    jailDaysRemaining: 2,
    creditScore: clamp(state.creditScore - 40, 300, 850),
    karmaPoints: Math.max(0, state.karmaPoints - 15),
    cityLog: appendLog(
      state,
      'police',
      'danger',
      `ถูกตำรวจจับกุมคดี "${ops.label}"! ปรับ -${paidFine} เหรียญ และถูกคุมขัง 2 วัน`
    ),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `ถูกตำรวจจับกุม! เสียค่าปรับ ${paidFine} เหรียญ คุมขัง 2 วัน และเครดิตลด -40`,
    state: nextState,
    coinDelta: -paidFine,
  };
};

export const performTempleAction = (
  state: LifeCityState,
  action: 'donate_merit' | 'meditate_free' | 'volunteer_service',
  currentCoins: number
): CityActionResult => {
  const civicBonus = state.careerId === 'civic_creator' ? 1.5 : 1;

  if (action === 'donate_merit') {
    const cost = 100;
    if (currentCoins < cost) {
      return { ok: false, messageTh: '', errorTh: `เหรียญไม่พอร่วมทำบุญ (ต้องการ ${cost} เหรียญ)`, state, coinDelta: 0 };
    }
    const karmaGain = Math.round(16 * civicBonus);
    const nextState: LifeCityState = {
      ...state,
      karmaPoints: state.karmaPoints + karmaGain,
      happiness: clamp(state.happiness + 18, 0, 100),
      stress: clamp(state.stress - 16, 0, 100),
      creditScore: clamp(state.creditScore + 5, 300, 850),
      cityLog: appendLog(state, 'temple', 'success', `ทำบุญถวายสังฆทานที่วัด (+${karmaGain} บุญบารมี, ความสุข +18)`),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: `อนุโมทนาบุญ! ได้รับแต้มบุญ +${karmaGain} และใจสงบขึ้นมาก`,
      state: nextState,
      coinDelta: -cost,
      xpGain: 12,
    };
  }

  if (action === 'meditate_free') {
    const nextState: LifeCityState = {
      ...state,
      energy: clamp(state.energy + 18, 0, 100),
      happiness: clamp(state.happiness + 14, 0, 100),
      stress: clamp(state.stress - 28, 0, 100),
      karmaPoints: state.karmaPoints + 4,
      cityLog: appendLog(state, 'temple', 'info', 'นั่งสมาธิฟังธรรมที่วัด ลดความเครียดและฟื้นพลังงานฟรี'),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: 'นั่งสมาธิจิตใจผ่องใส พลังงาน +18 และความเครียด -28!',
      state: nextState,
      coinDelta: 0,
    };
  }

  // volunteer_service
  if (state.energy < 15) {
    return { ok: false, messageTh: '', errorTh: 'พลังงานไม่พอช่วยงานจิตอาสา (ต้องการ 15 พลังงาน)', state, coinDelta: 0 };
  }
  const karmaGain = Math.round(14 * civicBonus);
  const nextWanted = Math.max(0, state.wantedLevel - 1);
  const nextRecord = state.criminalRecord > 0 ? state.criminalRecord - 1 : 0;
  const nextState: LifeCityState = {
    ...state,
    energy: clamp(state.energy - 15, 0, 100),
    karmaPoints: state.karmaPoints + karmaGain,
    happiness: clamp(state.happiness + 12, 0, 100),
    stress: clamp(state.stress - 12, 0, 100),
    wantedLevel: nextWanted,
    criminalRecord: nextRecord,
    cityLog: appendLog(
      state,
      'temple',
      'success',
      `บำเพ็ญประโยชน์จิตอาสาลานวัด (+${karmaGain} แต้มบุญ และช่วยล้างประวัติความผิดพลาด)`
    ),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `จิตอาสาพัฒนาวัดสำเร็จ! แต้มบุญ +${karmaGain} และช่วยลดมลทินประวัติ`,
    state: nextState,
    coinDelta: 0,
    xpGain: 15,
  };
};

export const visitCityGardenAction = (
  state: LifeCityState,
  citizenId: string,
  action: 'water_help' | 'gift_snack'
): CityActionResult => {
  const citizen = state.citizens.find((c) => c.id === citizenId);
  if (!citizen) {
    return { ok: false, messageTh: '', errorTh: 'ไม่พบพลเมืองในชุมชน', state, coinDelta: 0 };
  }

  if (action === 'water_help') {
    if (citizen.helpedToday) {
      return { ok: false, messageTh: '', errorTh: `วันนี้คุณช่วยสวนของ ${citizen.nameTh} ไปแล้ว`, state, coinDelta: 0 };
    }
    const rewardCoins = state.careerId === 'smart_farmer' ? 65 : 45;
    const friendshipGain = state.careerId === 'civic_creator' ? 15 : 10;
    const nextState: LifeCityState = {
      ...state,
      karmaPoints: state.karmaPoints + 6,
      happiness: clamp(state.happiness + 6, 0, 100),
      citizens: state.citizens.map((c) =>
        c.id === citizenId
          ? {
              ...c,
              helpedToday: true,
              friendship: clamp(c.friendship + friendshipGain, 0, 100),
              dialogueTh: 'ขอบใจมากนะที่มาช่วยรดน้ำสวนให้ วันนี้ผักงามมากเลย!',
            }
          : c
      ),
      cityLog: appendLog(
        state,
        'gardens',
        'success',
        `ไปเยี่ยมสวน ${citizen.nameTh} ช่วยดูแลแปลงปลูก รับน้ำใจ +${rewardCoins} เหรียญ`
      ),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: true,
      messageTh: `ช่วยสวน ${citizen.nameTh} สำเร็จ! รับ +${rewardCoins} เหรียญ และมิตรภาพ +${friendshipGain}`,
      state: nextState,
      coinDelta: rewardCoins,
      xpGain: 12,
    };
  }

  // gift_snack using flower_bouquet or herbal_coffee from bag
  const giftId: CityInventoryItemId | null =
    (state.bag.flower_bouquet || 0) > 0
      ? 'flower_bouquet'
      : (state.bag.herbal_coffee || 0) > 0
        ? 'herbal_coffee'
        : null;
  if (!giftId) {
    return {
      ok: false,
      messageTh: '',
      errorTh: 'ไม่มีช่อดอกไม้หรือกาแฟในกระเป๋า (แวะซื้อได้ที่ร้านค้า & คาเฟ่)',
      state,
      coinDelta: 0,
    };
  }
  const giftName = CITY_SHOP_ITEMS.find((i) => i.id === giftId)?.nameTh || 'ของขวัญ';
  const friendshipGain = 18;
  const nextState: LifeCityState = {
    ...state,
    bag: {
      ...state.bag,
      [giftId]: (state.bag[giftId] || 1) - 1,
    },
    karmaPoints: state.karmaPoints + 8,
    happiness: clamp(state.happiness + 10, 0, 100),
    citizens: state.citizens.map((c) =>
      c.id === citizenId
        ? {
            ...c,
            friendship: clamp(c.friendship + friendshipGain, 0, 100),
            dialogueTh: `ว้าว! ขอบคุณสำหรับ${giftName}มากนะ ประทับใจสุดๆ เลย`,
          }
        : c
    ),
    cityLog: appendLog(state, 'gardens', 'success', `มอบ${giftName}ให้ ${citizen.nameTh} (มิตรภาพ +${friendshipGain})`),
    updatedAt: new Date().toISOString(),
  };
  return {
    ok: true,
    messageTh: `มอบ${giftName}ให้ ${citizen.nameTh} แล้ว! มิตรภาพ +${friendshipGain}`,
    state: nextState,
    coinDelta: 0,
    xpGain: 10,
  };
};

export const advanceCityDay = (
  state: LifeCityState,
  _currentCoins: number,
  rng: () => number = Math.random
): CityActionResult => {
  const nextDay = state.day + 1;
  const prevMultipliers = { ...state.marketMultipliers };
  const nextMultipliers: Record<string, number> = {};
  CITY_MARKET_COMMODITIES.forEach((c) => {
    const oldVal = prevMultipliers[c.id] ?? 1;
    const step = (rng() - 0.48) * 0.36; // dynamic fluctuation
    nextMultipliers[c.id] = Number(clamp(oldVal + step, 0.72, 1.48).toFixed(2));
  });

  // Daily Bank Interest
  const interestRate = state.careerId === 'banker_finance' ? 0.035 : 0.02;
  const bankInterest = Math.floor(state.bankSavings * interestRate);
  let nextSavings = state.bankSavings + bankInterest;

  // Daily Company Profit
  let companyProfit = 0;
  if (state.company.founded && state.jailDaysRemaining === 0) {
    const ceoMult = state.careerId === 'business_ceo' ? 1.25 : state.careerId === 'software_dev' ? 1.15 : 1;
    companyProfit = Math.round(state.company.dailyBaseProfit * ceoMult);
  }

  // Loans countdown & overdue checks
  let nextCredit = state.creditScore;
  let nextWanted = state.wantedLevel;
  const loanMessages: string[] = [];
  const nextLoans = state.loans.map((loan) => {
    if (loan.daysLeft > 1) {
      return { ...loan, daysLeft: loan.daysLeft - 1 };
    }
    const nextOverdue = loan.overdueDays + 1;
    const penaltyInterest = Math.round(loan.remainingDue * 0.05);
    nextCredit = clamp(nextCredit - 18, 300, 850);
    if (nextOverdue >= 3) {
      nextWanted = clamp(nextWanted + 1, 0, 5);
      loanMessages.push(`ค้างชำระ "${loan.titleTh}" เกินกำหนด 3 วัน! ตำรวจออกหมายจับ`);
    } else {
      loanMessages.push(`สินเชื่อ "${loan.titleTh}" เกินกำหนดชำระ (+ดอกเบี้ยปรับ ${penaltyInterest})`);
    }
    return {
      ...loan,
      daysLeft: 0,
      overdueDays: nextOverdue,
      remainingDue: loan.remainingDue + penaltyInterest,
    };
  });

  // Health & random illness roll
  let nextHealth = state.health;
  let nextIllness = state.illness;
  const illnessInfo = ILLNESS_META[nextIllness];
  if (nextIllness !== 'none') {
    nextHealth = clamp(nextHealth - illnessInfo.dailyHpLoss, 10, 100);
  } else if (state.energy < 25 || state.stress > 80 || rng() < 0.14) {
    const pool: IllnessId[] = ['common_cold', 'food_poisoning', 'sprain', 'exhaustion'];
    nextIllness = pool[Math.floor(rng() * pool.length) % pool.length];
  }

  const nextJail = Math.max(0, state.jailDaysRemaining - 1);

  // Move citizens around districts
  const nextCitizens: CityCitizen[] = state.citizens.map((c, idx) => {
    const locIdx = Math.floor((rng() * CITIZEN_LOCATIONS.length + idx + nextDay) % CITIZEN_LOCATIONS.length);
    const nextLoc = CITIZEN_LOCATIONS[locIdx];
    const quotes = CITIZEN_DIALOGUES[nextLoc];
    return {
      ...c,
      location: nextLoc,
      helpedToday: false,
      dialogueTh: quotes[nextDay % quotes.length],
    };
  });

  const summaryParts: string[] = [`ขึ้นวันที่ ${nextDay} ในเมืองจำลอง`];
  if (bankInterest > 0) summaryParts.push(`ดอกเบี้ยธนาคาร +${bankInterest}`);
  if (companyProfit > 0) summaryParts.push(`กำไรบริษัท +${companyProfit}`);
  if (nextIllness !== state.illness && nextIllness !== 'none') {
    summaryParts.push(`เริ่มมีอาการ "${ILLNESS_META[nextIllness].nameTh}"`);
  }
  if (state.jailDaysRemaining > 0 && nextJail === 0) {
    summaryParts.push('พ้นโทษคุมขังแล้ว!');
  }
  if (loanMessages.length > 0) summaryParts.push(loanMessages[0]);

  let nextLog = appendLog(
    state,
    'overview',
    loanMessages.length > 0 || nextIllness !== state.illness ? 'warning' : 'success',
    summaryParts.join(' · ')
  );
  nextLog = nextLog.map((e, i) => (i === 0 ? { ...e, day: nextDay } : e));

  const nextState: LifeCityState = {
    ...state,
    day: nextDay,
    energy: 100,
    health: nextHealth,
    stress: clamp(state.stress - 18, 0, 100),
    illness: nextIllness,
    bankSavings: nextSavings,
    creditScore: nextCredit,
    loans: nextLoans,
    wantedLevel: nextWanted,
    jailDaysRemaining: nextJail,
    marketPrevMultipliers: prevMultipliers,
    marketMultipliers: nextMultipliers,
    citizens: nextCitizens,
    cityLog: nextLog,
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    messageTh: summaryParts.join(' · '),
    state: nextState,
    coinDelta: companyProfit,
    xpGain: 10,
  };
};
