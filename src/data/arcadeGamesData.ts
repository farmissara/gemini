import { LearningStrandId } from '../types';

export type MeteorDifficultyTier = 'primary_13' | 'primary_46' | 'middle_13' | 'high_46' | 'science_formula';

export interface MeteorChallenge {
  prompt: string;
  answer: number;
  choices: number[];
  explanationTh: string;
  topicTag: string;
}

function uniqueShuffleChoices(correct: number, candidates: number[]): number[] {
  const set = new Set<number>([correct]);
  for (const c of candidates) {
    if (set.size >= 4) break;
    if (Number.isFinite(c) && c !== correct) set.add(c);
  }
  let offset = 1;
  while (set.size < 4) {
    const candidate = correct + (offset % 2 === 0 ? offset : -offset);
    if (candidate >= 0 || correct < 0) set.add(candidate);
    offset++;
  }
  const arr = Array.from(set);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateMeteorChallenge(tier: MeteorDifficultyTier, wave = 1): MeteorChallenge {
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  if (tier === 'primary_13') {
    const mode = randInt(0, 2);
    if (mode === 0) {
      const a = randInt(4, 15 + wave * 3);
      const b = randInt(3, 12 + wave * 2);
      const ans = a + b;
      return {
        prompt: `${a} + ${b} = ?`,
        answer: ans,
        choices: uniqueShuffleChoices(ans, [ans + 2, ans - 2, ans + 10]),
        explanationTh: `${a} บวก ${b} เท่ากับ ${ans}`,
        topicTag: 'บวกเลขเร็ว',
      };
    }
    if (mode === 1) {
      const b = randInt(2, 12);
      const ans = randInt(3, 18);
      const a = ans + b;
      return {
        prompt: `${a} - ${b} = ?`,
        answer: ans,
        choices: uniqueShuffleChoices(ans, [ans + 1, ans - 1, ans + 3]),
        explanationTh: `${a} ลบ ${b} เท่ากับ ${ans}`,
        topicTag: 'ลบเลขแม่นยำ',
      };
    }
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const ans = a * b;
    return {
      prompt: `${a} × ${b} = ?`,
      answer: ans,
      choices: uniqueShuffleChoices(ans, [ans + a, ans - b, a + b]),
      explanationTh: `สูตรคูณแม่ ${a}: ${a} × ${b} = ${ans}`,
      topicTag: 'สูตรคูณ',
    };
  }

  if (tier === 'primary_46') {
    const mode = randInt(0, 3);
    if (mode === 0) {
      const a = randInt(6, 15);
      const b = randInt(4, 12);
      const ans = a * b;
      return {
        prompt: `${a} × ${b} = ?`,
        answer: ans,
        choices: uniqueShuffleChoices(ans, [ans + b, ans - a, ans + 10]),
        explanationTh: `${a} × ${b} = ${ans}`,
        topicTag: 'การคูณ',
      };
    }
    if (mode === 1) {
      const divisor = randInt(3, 12);
      const ans = randInt(4, 15);
      const dividend = divisor * ans;
      return {
        prompt: `${dividend} ÷ ${divisor} = ?`,
        answer: ans,
        choices: uniqueShuffleChoices(ans, [ans + 2, ans - 1, ans + 4]),
        explanationTh: `${dividend} หารด้วย ${divisor} เท่ากับ ${ans} (เพราะ ${divisor} × ${ans} = ${dividend})`,
        topicTag: 'การหารลงตัว',
      };
    }
    if (mode === 2) {
      const pct = [10, 20, 25, 50][randInt(0, 3)];
      const base = randInt(2, 12) * 20;
      const ans = (pct * base) / 100;
      return {
        prompt: `${pct}% ของ ${base} = ?`,
        answer: ans,
        choices: uniqueShuffleChoices(ans, [ans + 10, Math.max(2, ans - 10), ans * 2]),
        explanationTh: `${pct}% ของ ${base} = (${pct}/100) × ${base} = ${ans}`,
        topicTag: 'ร้อยละ',
      };
    }
    const w = randInt(4, 15);
    const h = randInt(3, 12);
    const ans = w * h;
    return {
      prompt: `พ.ท.สี่เหลี่ยม ${w}×${h}`,
      answer: ans,
      choices: uniqueShuffleChoices(ans, [2 * (w + h), ans + w, ans - h]),
      explanationTh: `พื้นที่สี่เหลี่ยมผืนผ้า = กว้าง × ยาว = ${w} × ${h} = ${ans}`,
      topicTag: 'เรขาคณิต',
    };
  }

  if (tier === 'middle_13') {
    const mode = randInt(0, 3);
    if (mode === 0) {
      const x = randInt(2, 15);
      const k = randInt(2, 6);
      const c = randInt(1, 12);
      const rhs = k * x + c;
      return {
        prompt: `${k}x + ${c} = ${rhs} | x=?`,
        answer: x,
        choices: uniqueShuffleChoices(x, [x + 1, Math.max(1, x - 2), x + 3]),
        explanationTh: `${k}x = ${rhs} - ${c} = ${rhs - c} → x = ${rhs - c} ÷ ${k} = ${x}`,
        topicTag: 'สมการเชิงเส้น',
      };
    }
    if (mode === 1) {
      const root = randInt(4, 15);
      return {
        prompt: `√${root * root} = ?`,
        answer: root,
        choices: uniqueShuffleChoices(root, [root + 2, root - 1, root + 4]),
        explanationTh: `${root} × ${root} = ${root * root} ดังนั้น √${root * root} = ${root}`,
        topicTag: 'รากที่สอง',
      };
    }
    if (mode === 2) {
      const base = randInt(2, 6);
      const exp = base <= 3 ? randInt(2, 4) : 2;
      const ans = Math.pow(base, exp);
      return {
        prompt: `${base}^${exp} = ?`,
        answer: ans,
        choices: uniqueShuffleChoices(ans, [base * exp, ans + base, Math.max(2, ans - 2)]),
        explanationTh: `${base} ยกกำลัง ${exp} = ${ans}`,
        topicTag: 'เลขยกกำลัง',
      };
    }
    const baseLen = randInt(4, 14) * 2;
    const height = randInt(3, 12);
    const ans = (baseLen * height) / 2;
    return {
      prompt: `พ.ท.สามเหลี่ยม ฐาน${baseLen} สูง${height}`,
      answer: ans,
      choices: uniqueShuffleChoices(ans, [baseLen * height, ans + 6, Math.max(4, ans - 4)]),
      explanationTh: `พื้นที่สามเหลี่ยม = ½ × ${baseLen} × ${height} = ${ans}`,
      topicTag: 'พื้นที่สามเหลี่ยม',
    };
  }

  if (tier === 'high_46') {
    const mode = randInt(0, 3);
    if (mode === 0) {
      const a = randInt(2, 6);
      const d = randInt(2, 5);
      const n = randInt(4, 8);
      const ans = a + (n - 1) * d;
      return {
        prompt: `ลำดับ ${a}, ${a + d}, ${a + 2 * d}.. พจน์ที่ ${n}`,
        answer: ans,
        choices: uniqueShuffleChoices(ans, [ans + d, ans - d, a + n * d]),
        explanationTh: `aₙ = ${a} + (${n}-1)(${d}) = ${ans}`,
        topicTag: 'ลำดับเลขคณิต',
      };
    }
    if (mode === 1) {
      const exp = randInt(2, 6);
      const val = Math.pow(2, exp);
      return {
        prompt: `log₂(${val}) = ?`,
        answer: exp,
        choices: uniqueShuffleChoices(exp, [exp + 1, Math.max(1, exp - 1), exp + 2]),
        explanationTh: `เนื่องจาก 2^${exp} = ${val} ดังนั้น log₂(${val}) = ${exp}`,
        topicTag: 'ลอการิทึม',
      };
    }
    if (mode === 2) {
      const k = randInt(2, 6);
      const x = randInt(1, 5);
      const ans = 2 * k * x;
      return {
        prompt: `d/dx(${k}x²) ที่ x=${x}`,
        answer: ans,
        choices: uniqueShuffleChoices(ans, [k * x * x, k * 2, ans + k]),
        explanationTh: `อนุพันธ์ของ ${k}x² คือ ${2 * k}x แทน x=${x} ได้ ${ans}`,
        topicTag: 'แคลคูลัส',
      };
    }
    const n = randInt(4, 6);
    const ans = n === 4 ? 24 : n === 5 ? 120 : 720;
    return {
      prompt: `${n}! (แฟกทอเรียล) = ?`,
      answer: ans,
      choices: uniqueShuffleChoices(ans, [n * (n - 1), ans / 2, ans + n]),
      explanationTh: `${n}! คือผลคูณ 1 ถึง ${n} = ${ans}`,
      topicTag: 'ความน่าจะเป็น',
    };
  }

  // science_formula tier
  const sciMode = randInt(0, 3);
  if (sciMode === 0) {
    const m = randInt(2, 12);
    const a = randInt(2, 10);
    const f = m * a;
    return {
      prompt: `F = m·a | m=${m}kg, a=${a}`,
      answer: f,
      choices: uniqueShuffleChoices(f, [m + a, f + m, Math.max(2, f - a)]),
      explanationTh: `กฎข้อที่ 2 ของนิวตัน: F = ${m} × ${a} = ${f} นิวตัน`,
      topicTag: 'กลศาสตร์ F=ma',
    };
  }
  if (sciMode === 1) {
    const i = randInt(2, 9);
    const r = randInt(3, 12);
    const v = i * r;
    return {
      prompt: `V = I·R | I=${i}A, R=${r}Ω`,
      answer: v,
      choices: uniqueShuffleChoices(v, [i + r, v + i, Math.max(2, v - r)]),
      explanationTh: `กฎของโอห์ม: V = ${i} × ${r} = ${v} โวลต์`,
      topicTag: 'ไฟฟ้า V=IR',
    };
  }
  if (sciMode === 2) {
    const m = randInt(2, 10);
    const v = randInt(2, 6);
    const ke = 0.5 * m * v * v;
    const evenM = m % 2 === 0 ? m : m + 1;
    const ans = 0.5 * evenM * v * v;
    return {
      prompt: `Ek=½mv² | m=${evenM}, v=${v}`,
      answer: ans,
      choices: uniqueShuffleChoices(ans, [evenM * v, evenM * v * v, Math.max(2, ans - 4)]),
      explanationTh: `พลังงานจลน์ Ek = ½ × ${evenM} × ${v}² = ${ans} จูล (คำนวณมาตรฐาน)`,
      topicTag: `พลังงานจลน์`,
    };
  }
  const f = randInt(5, 25);
  const lam = randInt(2, 8);
  const vWave = f * lam;
  return {
    prompt: `v = fλ | f=${f}Hz, λ=${lam}m`,
    answer: vWave,
    choices: uniqueShuffleChoices(vWave, [f + lam, vWave + f, Math.max(4, vWave - lam)]),
    explanationTh: `อัตราเร็วคลื่น v = ${f} × ${lam} = ${vWave} m/s`,
    topicTag: 'คลื่น v=fλ',
  };
}

// =========================================================================
// Game 2: 8-Strand Concept Match & Memory Blitz
// =========================================================================
export interface MatchPairItem {
  id: string;
  left: string;
  right: string;
  noteTh: string;
}

export interface MatchDeck {
  id: string;
  strand: LearningStrandId;
  titleTh: string;
  subtitleTh: string;
  pairs: MatchPairItem[];
}

export const MATCH_CONCEPT_DECKS: MatchDeck[] = [
  {
    id: 'match-thai',
    strand: 'thai',
    titleTh: 'ภาษาไทย: คำราชาศัพท์ สำนวน & ฉันทลักษณ์',
    subtitleTh: 'จับคู่คำสามัญกับคำราชาศัพท์และหลักภาษาไทยให้ถูกต้อง',
    pairs: [
      { id: 'mt-1', left: 'กิน / รับประทาน', right: 'เสวย', noteTh: 'คำราชาศัพท์สำหรับพระมหากษัตริย์และพระบรมวงศานุวงศ์' },
      { id: 'mt-2', left: 'นอนหลับ', right: 'บรรทม', noteTh: 'ใช้คำว่า "บรรทม" หรือ "เข้าที่พระบรรทม"' },
      { id: 'mt-3', left: 'เดิน', right: 'ทรงพระดำเนิน', noteTh: 'กริยาราชาศัพท์หมายถึงการเดิน' },
      { id: 'mt-4', left: 'หมอ / แพทย์', right: 'แพทย์หลวง / พระโอสถ', noteTh: 'คำว่า "พระโอสถ" หมายถึง ยา' },
      { id: 'mt-5', left: 'บ้าน / ที่ประทับ', right: 'พระตำหนัก / พระราชวัง', noteTh: 'คำนามราชาศัพท์บอกสถานที่ประทับ' },
      { id: 'mt-6', left: 'กลอนสุภาพ (กลอน 8)', right: 'สัมผัสระหว่างบทท้ายวรรค 4 → วรรค 2', noteTh: 'คำสุดท้ายของบทส่งสัมผัสไปคำสุดท้ายของวรรคที่สองบทถัดไป' },
      { id: 'mt-7', left: 'อุปมา (Simile)', right: 'เปรียบเหมือน ดุจ ดัง ราวกับ', noteTh: 'โวหารภาพพจน์เปรียบเทียบโดยมีคำเชื่อมความเหมือน' },
      { id: 'mt-8', left: 'คำเป็น', right: 'สระเสียงยาว / แม่ กง กน กม เกย เกอว', noteTh: 'หลักสังเกตคำเป็นเพื่อผันวรรณยุกต์ได้ถูกต้อง' },
    ],
  },
  {
    id: 'match-math',
    strand: 'math',
    titleTh: 'คณิตศาสตร์: สูตรพื้นที่ เรขาคณิต & พีชคณิต',
    subtitleTh: 'เชื่อมโยงรูปทรง/แนวคิดกับสูตรคำนวณที่ถูกต้อง',
    pairs: [
      { id: 'mm-1', left: 'พื้นที่วงกลม', right: 'πr²', noteTh: 'ใช้ค่า π ≈ 22/7 หรือ 3.14 คูณรัศมียกกำลังสอง' },
      { id: 'mm-2', left: 'ทฤษฎีบทพีทาโกรัส', right: 'c² = a² + b²', noteTh: 'สำหรับสามเหลี่ยมมุมฉาก ด้านตรงข้ามมุมฉากยาว c' },
      { id: 'mm-3', left: 'ความชันเส้นตรง (Slope)', right: 'm = (y₂ - y₁) / (x₂ - x₁)', noteTh: 'อัตราการเปลี่ยนแปลงของแกน y ต่อแกน x' },
      { id: 'mm-4', left: 'ผลต่างกำลังสอง', right: 'a² - b² = (a - b)(a + b)', noteTh: 'เอกลักษณ์พหุนามที่ใช้แยกตัวประกอบบ่อยมาก' },
      { id: 'mm-5', left: 'มุมภายในสามเหลี่ยมรวมกัน', right: '180 องศา', noteTh: 'ผลบวกมุมภายในรูปสามเหลี่ยมทุกรูปเท่ากับ 180°' },
      { id: 'mm-6', left: 'sin θ (สามเหลี่ยมมุมฉาก)', right: 'ข้าม / ฉาก', noteTh: 'ความยาวด้านตรงข้ามมุมหารด้วยด้านตรงข้ามมุมฉาก' },
      { id: 'mm-7', left: 'ปริมาตรทรงกระบอก', right: 'πr²h', noteTh: 'พื้นที่ฐานวงกลมคูณความสูง h' },
      { id: 'mm-8', left: 'ผลรวมมุมภายในสี่เหลี่ยม', right: '360 องศา', noteTh: 'สี่เหลี่ยมใดๆ มีผลบวกมุมภายใน 360°' },
    ],
  },
  {
    id: 'match-sci',
    strand: 'science_tech',
    titleTh: 'วิทยาศาสตร์และเทคโนโลยี: ธาตุ ชีววิทยา & ไอที',
    subtitleTh: 'จับคู่สัญลักษณ์ธาตุ ออร์แกเนลล์ และหลักวิทยาการคำนวณ',
    pairs: [
      { id: 'ms-1', left: 'Na (โซเดียม)', right: 'ทำปฏิกิริยาไวกับน้ำ (หมู่ IA)', noteTh: 'โลหะแอลคาไลในตารางธาตุหมู่ 1' },
      { id: 'ms-2', left: 'Mitochondria', right: 'แหล่งสร้างพลังงาน ATP ของเซลล์', noteTh: 'เปรียบเสมือนโรงไฟฟ้าของเซลล์' },
      { id: 'ms-3', left: 'Chloroplast', right: 'สังเคราะห์ด้วยแสงในเซลล์พืช', noteTh: 'มีสารสีเขียวคลอโรฟิลล์' },
      { id: 'ms-4', left: 'CO₂ (คาร์บอนไดออกไซด์)', right: 'ก๊าซเรือนกระจกและวัตถุดิบพืช', noteTh: 'พืชใช้ CO₂ + น้ำ + แสง สร้างน้ำตาลกลูโคส' },
      { id: 'ms-5', left: 'ค่า pH = 7', right: 'สารละลายเป็นกลาง (Neutral)', noteTh: 'ต่ำกว่า 7 เป็นกรด สูงกว่า 7 เป็นเบส' },
      { id: 'ms-6', left: 'HTTP / HTTPS', right: 'โพรโทคอลรับส่งข้อมูลเว็บ', noteTh: 'HTTPS มีการเข้ารหัส SSL/TLS เพื่อความปลอดภัย' },
      { id: 'ms-7', left: 'RAM', right: 'หน่วยความจำชั่วคราวขณะประมวลผล', noteTh: 'ข้อมูลจะหายไปเมื่อปิดเครื่องคอมพิวเตอร์' },
      { id: 'ms-8', left: 'แรงเสียดทาน (Friction)', right: 'แรงต้านการเคลื่อนที่ทิศตรงข้าม', noteTh: 'ช่วยให้ล้อรถยึดเกาะถนนและเดินไม่ลื่น' },
    ],
  },
  {
    id: 'match-soc',
    strand: 'social',
    titleTh: 'สังคมศึกษาฯ: ประวัติศาสตร์ ภูมิศาสตร์ & เศรษฐศาสตร์',
    subtitleTh: 'เชื่อมโยงความรู้พลเมือง อาเซียน และภูมิศาสตร์โลก',
    pairs: [
      { id: 'mso-1', left: 'พ่อขุนรามคำแหงมหาราช', right: 'ประดิษฐ์อักษรไทย พ.ศ. 1826', noteTh: 'ปรากฏหลักฐานในศิลาจารึกหลักที่ 1' },
      { id: 'mso-2', left: 'อุปสงค์ (Demand)', right: 'ความต้องการซื้อสินค้าและบริการ', noteTh: 'เมื่อราคาสูงขึ้น ปริมาณอุปสงค์มักลดลง' },
      { id: 'mso-3', left: 'อุปทาน (Supply)', right: 'ปริมาณสินค้าที่ผู้ผลิตพร้อมเสนอขาย', noteTh: 'ทำงานคู่กับอุปสงค์เพื่อหาจุดดุลยภาพราคา' },
      { id: 'mso-4', left: 'อริยสัจ 4 (มรรค)', right: 'หนทางปฏิบัติเพื่อดับทุกข์ (ทางสายกลาง)', noteTh: 'ประกอบด้วยมรรคมีองค์ 8' },
      { id: 'mso-5', left: 'เส้นศูนย์สูตร (Equator)', right: 'ละติจูด 0° แบ่งซีกโลกเหนือ-ใต้', noteTh: 'พื้นที่ใกล้เส้นศูนย์สูตรมีภูมิอากาศแบบร้อนชื้น' },
      { id: 'mso-6', left: 'ประชาธิปไตยทางตรง', right: 'การออกเสียงประชามติ (Referendum)', noteTh: 'ประชาชนมีส่วนร่วมตัดสินใจด้วยตนเองโดยตรง' },
      { id: 'mso-7', left: 'สำนักงานใหญ่ยูเนสโก (UNESCO)', right: 'กรุงปารีส ประเทศฝรั่งเศส', noteTh: 'ดูแลด้านการศึกษา วิทยาศาสตร์ และวัฒนธรรมโลก' },
      { id: 'mso-8', left: 'แม่น้ำโขง', right: 'ไหลผ่านจีน เมียนมา ไทย ลาว กัมพูชา เวียดนาม', noteTh: 'แม่น้ำนานาชาติสายสำคัญของภูมิภาคอาเซียน' },
    ],
  },
  {
    id: 'match-health',
    strand: 'health_pe',
    titleTh: 'สุขศึกษาและพลศึกษา: โภชนาการ กีฬา & ปฐมพยาบาล',
    subtitleTh: 'จับคู่ความรู้สุขภาพ การช่วยชีวิต และการเล่นกีฬา',
    pairs: [
      { id: 'mh-1', left: 'วิตามิน C', right: 'ป้องกันโรคลักปิดลักเปิด (เลือดออกตามไรฟัน)', noteTh: 'พบมากในส้ม ฝรั่ง มะขามป้อม' },
      { id: 'mh-2', left: 'วิตามิน A', right: 'บำรุงสายตาและการมองเห็นในที่มืด', noteTh: 'พบมากในฟักทอง แครอท ตับ ไข่แดง' },
      { id: 'mh-3', left: 'หลัก RICE ปฐมพยาบาลข้อแพลง', right: 'Rest - Ice - Compression - Elevation', noteTh: 'พัก ประคบเย็น รัดกระชับ ยกสูง ภายใน 24 ชม. แรก' },
      { id: 'mh-4', left: 'การกดหน้าอก CPR', right: '100 - 120 ครั้งต่อนาที', noteTh: 'กดลึกประมาณ 5 ซม. กลางหน้าอก' },
      { id: 'mh-5', left: 'การอบอุ่นร่างกาย (Warm-up)', right: 'ลดการบาดเจ็บกล้ามเนื้อและเพิ่มความยืดหยุ่น', noteTh: 'ควรทำ 5-10 นาทีก่อนออกกำลังกายหนัก' },
      { id: 'mh-6', left: 'บาสเกตบอล 1 ทีมในสนาม', right: 'ผู้เล่นฝั่งละ 5 คน', noteTh: 'แบ่งตำแหน่งการ์ด ฟอร์เวิร์ด และเซ็นเตอร์' },
      { id: 'mh-7', left: 'ดัชนีมวลกาย (BMI)', right: 'น้ำหนัก (กก.) ÷ ส่วนสูง (ม.)²', noteTh: 'เกณฑ์ปกติของคนเอเชียอยู่ที่ 18.5 - 22.9' },
      { id: 'mh-8', left: 'โปรตีน (หมู่ที่ 1)', right: 'ซ่อมแซมส่วนที่สึกหรอและสร้างกล้ามเนื้อ', noteTh: 'ได้จากเนื้อสัตว์ ไข่ นม และถั่วเมล็ดแห้ง' },
    ],
  },
  {
    id: 'match-arts',
    strand: 'arts',
    titleTh: 'ศิลปะ: ทฤษฎีสี ดนตรีไทย-สากล & นาฏศิลป์',
    subtitleTh: 'จับคู่แม่สี คู่สีตรงข้าม เครื่องดนตรี และนาฏยศัพท์',
    pairs: [
      { id: 'ma-1', left: 'แม่สีขั้นที่ 1 (ทัศนศิลป์)', right: 'แดง เหลือง น้ำเงิน', noteTh: 'สีหลักที่ไม่สามารถผสมจากสีอื่นได้ในงานจิตรกรรม' },
      { id: 'ma-2', left: 'สีคู่ตรงข้ามของสีแดง', right: 'สีเขียว', noteTh: 'อยู่ตรงข้ามกันในวงจรสี ใช้สร้างจุดเด่นตัดกันชัดเจน' },
      { id: 'ma-3', left: 'สีวรรณะร้อน (Warm Tone)', right: 'เหลือง ส้ม แดง ม่วงแดง', noteTh: 'ให้ความรู้สึกอบอุ่น ตื่นเต้น มีพลัง' },
      { id: 'ma-4', left: 'ระนาดเอก', right: 'เครื่องดนตรีไทยประเภทเครื่องตี', noteTh: 'มีบทบาทเป็นผู้นำท่วงทำนองในวงปี่พาทย์' },
      { id: 'ma-5', left: 'จังหวะ 4/4 ในดนตรีสากล', right: '1 ห้องเพลงมี 4 จังหวะ (ตัวดำ = 1)', noteTh: 'อัตราจังหวะมาตรฐานของเพลงป๊อปและคลาสสิก' },
      { id: 'ma-6', left: 'การจีบคว่ำ-จีบหงาย', right: 'นาฏยศัพท์พื้นฐานมือของนาฏศิลป์ไทย', noteTh: 'ใช้นิ้วหัวแม่มือจรดข้อแรกของนิ้วชี้ หักข้อมือ' },
      { id: 'ma-7', left: 'ภาพพิมพ์แกะไม้ (Woodcut)', right: 'งานทัศนศิลป์ประเภทภาพพิมพ์', noteTh: 'แกะสลักแม่พิมพ์ไม้แล้วกลิ้งหมึกกดทับลงกระดาษ' },
      { id: 'ma-8', left: 'ความสมดุลแบบซ้ายขวาเหมือนกัน', right: 'Symmetrical Balance (สมมาตร)', noteTh: 'ให้ความรู้สึกมั่นคง สง่างาม และเป็นทางการ' },
    ],
  },
  {
    id: 'match-career',
    strand: 'career_tech',
    titleTh: 'การงานอาชีพ: เกษตร งานช่าง คหกรรม & ธุรกิจ',
    subtitleTh: 'จับคู่ทักษะอาชีพ การจัดการทรัพยากร และความพอเพียง',
    pairs: [
      { id: 'mc-1', left: 'เกษตรทฤษฎีใหม่ (30:30:30:10)', right: 'น้ำ 30% : นา 30% : ไร่สวน 30% : ที่พัก 10%', noteTh: 'จัดสรรที่ดินการเกษตรเพื่อความยั่งยืนและพึ่งพาตนเอง' },
      { id: 'mc-2', left: 'หลัก 5ส ในที่ทำงาน', right: 'สะสาง สะดวก สะอาด สุขลักษณะ สร้างนิสัย', noteTh: 'ช่วยให้การทำงานปลอดภัย เป็นระเบียบ และลดความผิดพลาด' },
      { id: 'mc-3', left: '3R เพื่อสิ่งแวดล้อม', right: 'Reduce (ลด) · Reuse (ใช้ซ้ำ) · Recycle (แปรรูป)', noteTh: 'ช่วยลดปริมาณขยะและอนุรักษ์ทรัพยากร' },
      { id: 'mc-4', left: 'กำไรสุทธิ (Net Profit)', right: 'รายได้รวม ลบด้วย ต้นทุนและค่าใช้จ่ายทั้งหมด', noteTh: 'ตัวชี้วัดความคุ้มค่าในการประกอบธุรกิจ' },
      { id: 'mc-5', left: 'การใช้คัตเตอร์อย่างปลอดภัย', right: 'กรีดออกนอกลำตัวและเก็บใบมีดทุกครั้ง', noteTh: 'ลดอุบัติเหตุจากการทำงานประดิษฐ์และงานช่าง' },
      { id: 'mc-6', left: 'ปุ๋ยหมักชีวภาพ (Compost)', right: 'ย่อยสลายเศษอาหารและใบไม้เป็นธาตุอาหารพืช', noteTh: 'บำรุงดินโดยไม่ทิ้งสารเคมีตกค้าง' },
      { id: 'mc-7', left: 'บัญชีรายรับ-รายจ่าย', right: 'ติดตามกระแสเงินและวางแผนการออม', noteTh: 'เครื่องมือพื้นฐานของเศรษฐกิจพอเพียง' },
      { id: 'mc-8', left: 'จุดคุ้มทุน (Break-Even Point)', right: 'ยอดขายที่รายได้รวมเท่ากับต้นทุนรวมพอดี', noteTh: 'ขายเกินจุดนี้จึงเริ่มมีกำไร' },
    ],
  },
  {
    id: 'match-english',
    strand: 'foreign_lang',
    titleTh: 'ภาษาต่างประเทศ: English Vocabulary & Idioms',
    subtitleTh: 'จับคู่คำศัพท์วิชาการและสำนวนภาษาอังกฤษกับความหมายภาษาไทย',
    pairs: [
      { id: 'me-1', left: 'Hypothesis', right: 'สมมติฐาน (คำคาดคะเนเชิงวิทยาศาสตร์)', noteTh: 'Example: We test the hypothesis through an experiment.' },
      { id: 'me-2', left: 'Break a leg!', right: 'ขอให้โชคดีในการแสดง/แข่งขัน!', noteTh: 'สำนวนอวยพรก่อนขึ้นเวที ไม่ได้แปลตรงตัวว่าขาหัก' },
      { id: 'me-3', left: 'A piece of cake', right: 'เรื่องง่ายมาก (หมูๆ)', noteTh: 'Example: That math quiz was a piece of cake.' },
      { id: 'me-4', left: 'Sustainability', right: 'ความยั่งยืน (ใช้ทรัพยากรไม่ทำลายอนาคต)', noteTh: 'Sustainable Development = การพัฒนาที่ยั่งยืน' },
      { id: 'me-5', left: 'Collaborate', right: 'ร่วมมือทำงานเป็นทีม', noteTh: 'Synonym: Cooperate, work together' },
      { id: 'me-6', left: 'Perseverance', right: 'ความเพียรพยายาม ไม่ย่อท้อ', noteTh: 'Example: Success comes from perseverance.' },
      { id: 'me-7', left: 'Once in a blue moon', right: 'นานๆ ครั้ง (เกิดขึ้นได้ยากมาก)', noteTh: 'Example: It snows here once in a blue moon.' },
      { id: 'me-8', left: 'Curriculum', right: 'หลักสูตรการเรียนการสอน', noteTh: 'Thai Core Curriculum covers 8 learning strands.' },
    ],
  },
];

// =========================================================================
// Game 3: Bilingual Spelling & Word Builder Challenges (Across 8 Strands)
// =========================================================================
export interface WordBuilderPuzzle {
  id: string;
  strand: LearningStrandId;
  language: 'EN' | 'TH';
  answer: string; // Uppercase English letters (no spaces) OR Thai characters array-ready
  clueTh: string;
  hintTh: string;
  meaningTh: string;
  exampleSentence: string;
}

export const WORD_BUILDER_PUZZLES: WordBuilderPuzzle[] = [
  {
    id: 'wb-1',
    strand: 'science_tech',
    language: 'EN',
    answer: 'GRAVITY',
    clueTh: 'แรงที่ดึงดูดวัตถุที่มีมวลเข้าหากัน เช่น แรงที่ทำให้แอปเปิลตกสู่พื้นโลก',
    hintTh: 'ขึ้นต้นด้วยตัว G และเกี่ยวกับไอแซก นิวตัน (7 ตัวอักษร)',
    meaningTh: 'แรงโน้มถ่วง (Gravity)',
    exampleSentence: 'Earth’s gravity keeps the Moon in orbit.',
  },
  {
    id: 'wb-2',
    strand: 'science_tech',
    language: 'EN',
    answer: 'ATOM',
    clueTh: 'หน่วยพื้นฐานที่เล็กที่สุดของธาตุทางเคมี ประกอบด้วยโปรตอน นิวตรอน และอิเล็กตรอน',
    hintTh: 'สั้นมาก เพียง 4 ตัวอักษร (A _ _ M)',
    meaningTh: 'อะตอม (Atom)',
    exampleSentence: 'A water molecule consists of two hydrogen atoms and one oxygen atom.',
  },
  {
    id: 'wb-3',
    strand: 'math',
    language: 'EN',
    answer: 'TRIANGLE',
    clueTh: 'รูปเรขาคณิตที่มี 3 ด้าน และมีผลรวมมุมภายในเท่ากับ 180 องศา',
    hintTh: 'คำว่า Tri แปลว่า สาม + Angle แปลว่า มุม',
    meaningTh: 'รูปสามเหลี่ยม (Triangle)',
    exampleSentence: 'A right triangle has one 90-degree angle.',
  },
  {
    id: 'wb-4',
    strand: 'math',
    language: 'EN',
    answer: 'FRACTION',
    clueTh: 'จำนวนที่เขียนอยู่ในรูปเศษส่วน เช่น 3/4 หรือ 1/2',
    hintTh: 'ขึ้นต้นด้วย FR... มี 8 ตัวอักษร',
    meaningTh: 'เศษส่วน (Fraction)',
    exampleSentence: '0.5 is equal to the fraction 1/2.',
  },
  {
    id: 'wb-5',
    strand: 'foreign_lang',
    language: 'EN',
    answer: 'LIBRARY',
    clueTh: 'สถานที่รวบรวมหนังสือและแหล่งค้นคว้าความรู้ในโรงเรียน',
    hintTh: 'ขึ้นต้นด้วย L ลงท้ายด้วย Y (7 ตัวอักษร)',
    meaningTh: 'ห้องสมุด (Library)',
    exampleSentence: 'Students borrow science books from the school library.',
  },
  {
    id: 'wb-6',
    strand: 'foreign_lang',
    language: 'EN',
    answer: 'CREATIVITY',
    clueTh: 'ความคิดสร้างสรรค์ ซึ่งเป็นทักษะสำคัญในศตวรรษที่ 21',
    hintTh: 'มาจากคำว่า Create (10 ตัวอักษร)',
    meaningTh: 'ความคิดสร้างสรรค์ (Creativity)',
    exampleSentence: 'Art projects help students develop their creativity.',
  },
  {
    id: 'wb-7',
    strand: 'social',
    language: 'EN',
    answer: 'DEMOCRACY',
    clueTh: 'ระบอบการปกครองที่อำนาจสูงสุดเป็นของประชาชน',
    hintTh: 'ขึ้นต้นด้วย DEMO... (9 ตัวอักษร)',
    meaningTh: 'ประชาธิปไตย (Democracy)',
    exampleSentence: 'Voting in elections is a key part of democracy.',
  },
  {
    id: 'wb-8',
    strand: 'social',
    language: 'EN',
    answer: 'EQUATOR',
    clueTh: 'เส้นสมมติละติจูด 0 องศา ที่แบ่งโลกออกเป็นซีกโลกเหนือและซีกโลกใต้',
    hintTh: 'เสียงคล้ายคำว่า Equal (7 ตัวอักษร)',
    meaningTh: 'เส้นศูนย์สูตร (Equator)',
    exampleSentence: 'Countries near the Equator have a tropical climate.',
  },
  {
    id: 'wb-9',
    strand: 'health_pe',
    language: 'EN',
    answer: 'VITAMIN',
    clueTh: 'สารอาหารที่ไม่ให้พลังงานโดยตรง แต่ช่วยให้ร่างกายทำงานปกติและต้านทานโรค (หมู่ผักและผลไม้)',
    hintTh: 'เช่น A, B, C, D (7 ตัวอักษร)',
    meaningTh: 'วิตามิน (Vitamin)',
    exampleSentence: 'Oranges are rich in Vitamin C.',
  },
  {
    id: 'wb-10',
    strand: 'arts',
    language: 'EN',
    answer: 'HARMONY',
    clueTh: 'ความกลมกลืนของสีสันในภาพวาด หรือการประสานเสียงในดนตรี',
    hintTh: 'ขึ้นต้นด้วย H ลงท้ายด้วย Y (7 ตัวอักษร)',
    meaningTh: 'ความกลมกลืน / การประสานเสียง (Harmony)',
    exampleSentence: 'The choir sang in perfect harmony.',
  },
  {
    id: 'wb-11',
    strand: 'career_tech',
    language: 'EN',
    answer: 'RECYCLE',
    clueTh: 'การนำวัสดุที่ใช้แล้ว เช่น ขวดพลาสติก แก้ว กระดาษ กลับมาแปรรูปใช้ใหม่',
    hintTh: '1 ในหลัก 3R ขึ้นต้นด้วย RE... (7 ตัวอักษร)',
    meaningTh: 'รีไซเคิล / นำกลับมาแปรรูปใช้ใหม่',
    exampleSentence: 'We should recycle plastic bottles to protect the environment.',
  },
  {
    id: 'wb-12',
    strand: 'science_tech',
    language: 'EN',
    answer: 'ALGORITHM',
    clueTh: 'ขั้นตอนวิธีแก้ปัญหาอย่างเป็นลำดับขั้นชัดเจนในการเขียนโปรแกรมคอมพิวเตอร์',
    hintTh: 'คำหลักของวิชาวิทยาการคำนวณ (9 ตัวอักษร)',
    meaningTh: 'อัลกอริทึม / ขั้นตอนวิธี (Algorithm)',
    exampleSentence: 'Every search engine relies on a sorting algorithm.',
  },
  {
    id: 'wb-13',
    strand: 'thai',
    language: 'EN',
    answer: 'PROVERB',
    clueTh: 'คำพังเพยหรือสุภาษิตที่สอนใจ เช่น "น้ำขึ้นให้รีบตัก"',
    hintTh: '7 ตัวอักษร ขึ้นต้นด้วย P',
    meaningTh: 'สุภาษิต / คำพังเพย (Proverb)',
    exampleSentence: '"Practice makes perfect" is a famous English proverb.',
  },
  {
    id: 'wb-14',
    strand: 'arts',
    language: 'EN',
    answer: 'PALETTE',
    clueTh: 'จานผสมสีของจิตรกร หรือชุดโทนสีที่ใช้ในงานออกแบบ',
    hintTh: '7 ตัวอักษร ขึ้นต้นด้วย PA...',
    meaningTh: 'จานสี / ชุดโทนสี (Palette)',
    exampleSentence: 'The artist chose a warm color palette for the sunset painting.',
  },
  {
    id: 'wb-15',
    strand: 'health_pe',
    language: 'EN',
    answer: 'STAMINA',
    clueTh: 'ความอึดและความทนทานของร่างกายเมื่อต้องวิ่งหรือออกกำลังกายต่อเนื่อง',
    hintTh: '7 ตัวอักษร ขึ้นต้นด้วย ST...',
    meaningTh: 'ความแข็งแกร่งทนทาน (Stamina)',
    exampleSentence: 'Regular jogging builds cardiovascular stamina.',
  },
  {
    id: 'wb-16',
    strand: 'career_tech',
    language: 'EN',
    answer: 'BUDGET',
    clueTh: 'การวางแผนจัดสรรงบประมาณรายรับ-รายจ่ายให้สมดุล',
    hintTh: '6 ตัวอักษร ขึ้นต้นด้วย BU...',
    meaningTh: 'งบประมาณ (Budget)',
    exampleSentence: 'Keeping a monthly budget helps you save money.',
  },
];

// =========================================================================
// Game 4: ChronoSort & Conveyor Logic Challenges (Across 8 Strands)
// =========================================================================
export interface SequenceChallenge {
  id: string;
  strand: LearningStrandId;
  titleTh: string;
  instructionTh: string;
  items: string[]; // Correct order from index 0 -> last
  explanationTh: string;
}

export const CHRONO_SEQUENCE_CHALLENGES: SequenceChallenge[] = [
  {
    id: 'seq-soc-1',
    strand: 'social',
    titleTh: 'ลำดับราชธานีสำคัญในประวัติศาสตร์ไทย',
    instructionTh: 'เรียงจากยุคเก่าที่สุด → ยุคปัจจุบัน',
    items: ['อาณาจักรสุโขทัย', 'อาณาจักรอยุธยา', 'อาณาจักรธนบุรี', 'กรุงรัตนโกสินทร์'],
    explanationTh: 'ลำดับยุคประวัติศาสตร์ไทย: สุโขทัย → อยุธยา → ธนบุรี → รัตนโกสินทร์',
  },
  {
    id: 'seq-sci-1',
    strand: 'science_tech',
    titleTh: 'วัฏจักรการเปลี่ยนแปลงของน้ำ (Water Cycle)',
    instructionTh: 'เรียงลำดับจากแหล่งน้ำบนพื้นดิน → ฝนตกลงมา',
    items: [
      'น้ำระเหยกลายเป็นไอ (Evaporation)',
      'ไอน้ำควบแน่นเป็นก้อนเมฆ (Condensation)',
      'หยาดน้ำฟ้าตกลงเป็นฝน (Precipitation)',
      'น้ำไหลซึมและรวมตัวสู่แหล่งน้ำ (Collection)',
    ],
    explanationTh: 'แสงอาทิตย์ทำให้น้ำระเหย → ควบแน่นเป็นเมฆ → ตกเป็นฝน → ไหลกลับสู่แหล่งน้ำ',
  },
  {
    id: 'seq-sci-2',
    strand: 'science_tech',
    titleTh: 'ลำดับดาวเคราะห์จากใกล้ดวงอาทิตย์ที่สุด',
    instructionTh: 'เรียงจากใกล้ดวงอาทิตย์มากที่สุด → ไกลออก',
    items: ['ดาวพุธ (Mercury)', 'ดาวศุกร์ (Venus)', 'โลก (Earth)', 'ดาวอังคาร (Mars)'],
    explanationTh: 'ดาวเคราะห์หิน 4 ดวงชั้นใน: พุธ → ศุกร์ → โลก → อังคาร',
  },
  {
    id: 'seq-health-1',
    strand: 'health_pe',
    titleTh: 'ขั้นตอนช่วยชีวิตฉุกเฉินเมื่อพบผู้หมดสติ',
    instructionTh: 'เรียงลำดับที่ถูกต้องและปลอดภัยที่สุด',
    items: [
      'ประเมินความปลอดภัยบริเวณรอบข้าง',
      'ปลุกเรียกและตรวจสอบการหายใจ',
      'โทรแจ้งสายด่วน 1669 และขอเครื่อง AED',
      'เริ่มกดหน้าอกช่วยฟื้นคืนชีพ (CPR)',
    ],
    explanationTh: 'ต้องตรวจความปลอดภัยก่อนเสมอ จากนั้นประเมินผู้ป่วย โทร 1669 แล้วจึงทำ CPR',
  },
  {
    id: 'seq-math-1',
    strand: 'math',
    titleTh: 'เรียงค่าจำนวนจากน้อยที่สุดไปมากที่สุด',
    instructionTh: 'เปรียบเทียบเศษส่วน ทศนิยม ร้อยละ และรากที่สอง',
    items: ['0.25 (เศษ 1/4)', '40% (0.40)', '3/4 (0.75)', '√4 (เท่ากับ 2)'],
    explanationTh: 'เมื่อแปลงเป็นทศนิยม: 0.25 < 0.40 < 0.75 < 2.00',
  },
  {
    id: 'seq-career-1',
    strand: 'career_tech',
    titleTh: 'ขั้นตอนกระบวนการออกแบบเชิงวิศวกรรม / โครงงาน',
    instructionTh: 'เรียงตั้งแต่เริ่มต้นระบุปัญหาจนถึงนำเสนอ',
    items: [
      'ระบุปัญหาและความต้องการ',
      'รวบรวมข้อมูลและออกแบบแนวทางแก้ไข',
      'ลงมือสร้างชิ้นงานและทดสอบ',
      'ปรับปรุงแก้ไขและนำเสนอผลงาน',
    ],
    explanationTh: 'เริ่มจากเข้าใจปัญหา → ออกแบบ → ทดลองสร้าง → ประเมินและปรับปรุง',
  },
  {
    id: 'seq-thai-1',
    strand: 'thai',
    titleTh: 'เรียงลำดับพจนานุกรมตามพยัญชนะไทย',
    instructionTh: 'เรียงคำต่อไปนี้จากลำดับแรก → ท้ายตามพจนานุกรม',
    items: ['กระจก', 'ขจร', 'จระเข้', 'ตระการ'],
    explanationTh: 'เรียงตามพยัญชนะต้น: ก → ข → จ → ต',
  },
  {
    id: 'seq-arts-1',
    strand: 'arts',
    titleTh: 'ขั้นตอนการสร้างงานวาดภาพระบายสีน้ำ',
    instructionTh: 'เรียงลำดับการทำงานศิลปะให้สีใสสะอาดไม่ช้ำ',
    items: [
      'ร่างโครงสร้างภาพด้วยดินสอเบาๆ',
      'ลงสีน้ำหนักอ่อนเป็นพื้นบรรยากาศ',
      'ลงสีน้ำหนักกลางเพิ่มมิติและเงา',
      'เก็บรายละเอียดจุดเด่นด้วยน้ำหนักเข้มสุด',
    ],
    explanationTh: 'เทคนิคสีน้ำที่ถูกต้องคือลงจากน้ำหนักอ่อน → กลาง → เข้มสุดเป็นขั้นตอนสุดท้าย',
  },
];

export interface ConveyorSortCard {
  label: string;
  side: 'left' | 'right';
  noteTh: string;
}

export interface ConveyorSortDeck {
  id: string;
  strand: LearningStrandId;
  titleTh: string;
  leftGateLabel: string;
  rightGateLabel: string;
  cards: ConveyorSortCard[];
}

export const CONVEYOR_SORT_DECKS: ConveyorSortDeck[] = [
  {
    id: 'sort-thai',
    strand: 'thai',
    titleTh: 'แยกคำเป็น vs คำตาย (ภาษาไทย)',
    leftGateLabel: 'คำเป็น',
    rightGateLabel: 'คำตาย',
    cards: [
      { label: 'ม้า', side: 'left', noteTh: 'สระเสียงยาว (อา) ไม่มีตัวสะกด = คำเป็น' },
      { label: 'กบ', side: 'right', noteTh: 'สะกดด้วยแม่ กบ = คำตาย' },
      { label: 'นก', side: 'right', noteTh: 'สะกดด้วยแม่ กก = คำตาย' },
      { label: 'ใจ', side: 'left', noteTh: 'สระ ใอ (ไอ) ถือเป็นคำเป็น' },
      { label: 'วัด', side: 'right', noteTh: 'สะกดด้วยแม่ กด = คำตาย' },
      { label: 'งาน', side: 'left', noteTh: 'สะกดด้วยแม่ กน = คำเป็น' },
      { label: 'ดุ', side: 'right', noteTh: 'สระเสียงสั้น (อุ) ไม่มีตัวสะกด = คำตาย' },
      { label: 'ดาว', side: 'left', noteTh: 'สะกดด้วยแม่ เกอว = คำเป็น' },
      { label: 'น้ำ', side: 'left', noteTh: 'สระ อำ ถือเป็นคำเป็น' },
      { label: 'จอก', side: 'right', noteTh: 'สะกดด้วยแม่ กก = คำตาย' },
    ],
  },
  {
    id: 'sort-sci',
    strand: 'science_tech',
    titleTh: 'แยกสารละลาย กรด vs เบส (เคมีในชีวิตประจำวัน)',
    leftGateLabel: 'กรด (Acid, pH<7)',
    rightGateLabel: 'เบส (Base, pH>7)',
    cards: [
      { label: 'น้ำมะนาว', side: 'left', noteTh: 'มีกรดซิตริก รสเปรี้ยว pH ≈ 2-3' },
      { label: 'น้ำสบู่', side: 'right', noteTh: 'ลื่นมือ เปลี่ยนกระดาษลิตมัสแดงเป็นน้ำเงิน' },
      { label: 'น้ำส้มสายชู', side: 'left', noteTh: 'มีกรดแอซีติก pH ≈ 3' },
      { label: 'เบกกิ้งโซดาละลายน้ำ', side: 'right', noteTh: 'โซเดียมไบคาร์บอเนตมีฤทธิ์เป็นเบสอ่อน' },
      { label: 'น้ำอัดลม', side: 'left', noteTh: 'มีกรดคาร์บอนิก' },
      { label: 'น้ำยาล้างจาน', side: 'right', noteTh: 'สารชำระล้างทั่วไปมักมีสมบัติเป็นเบส' },
      { label: 'กรดในกระเพาะอาหาร', side: 'left', noteTh: 'กรดไฮโดรคลอริก (HCl) ช่วยย่อยโปรตีน' },
      { label: 'น้ำปูนใส', side: 'right', noteTh: 'แคลเซียมไฮดรอกไซด์ มีฤทธิ์เป็นเบส' },
    ],
  },
  {
    id: 'sort-arts',
    strand: 'arts',
    titleTh: 'แยกสีวรรณะร้อน vs สีวรรณะเย็น (ทัศนศิลป์)',
    leftGateLabel: 'วรรณะร้อน (Warm)',
    rightGateLabel: 'วรรณะเย็น (Cool)',
    cards: [
      { label: 'สีส้ม', side: 'left', noteTh: 'สีวรรณะร้อน ให้ความรู้สึกร่าเริง กระปรี้กระเปร่า' },
      { label: 'สีน้ำเงิน', side: 'right', noteTh: 'สีวรรณะเย็น ให้ความรู้สึกสงบ เยือกเย็น' },
      { label: 'สีแดง', side: 'left', noteTh: 'สีวรรณะร้อน ให้ความรู้สึกมีพลัง ร้อนแรง' },
      { label: 'สีเขียว', side: 'right', noteTh: 'สีวรรณะเย็น ให้ความรู้สึกสดชื่น สบายตา' },
      { label: 'สีส้มแดง', side: 'left', noteTh: 'อยู่ในกลุ่มสีวรรณะร้อนชัดเจน' },
      { label: 'สีเขียวน้ำเงิน', side: 'right', noteTh: 'อยู่ในกลุ่มสีวรรณะเย็น' },
      { label: 'สีเหลืองส้ม', side: 'left', noteTh: 'โทนเหลือง-ส้ม จัดเป็นวรรณะร้อน' },
      { label: 'สีม่วงน้ำเงิน', side: 'right', noteTh: 'โทนม่วงติดน้ำเงิน จัดเป็นวรรณะเย็น' },
    ],
  },
  {
    id: 'sort-math',
    strand: 'math',
    titleTh: 'แยกจำนวนเฉพาะ vs ไม่ใช่จำนวนเฉพาะ',
    leftGateLabel: 'จำนวนเฉพาะ (Prime)',
    rightGateLabel: 'ไม่ใช่จำนวนเฉพาะ',
    cards: [
      { label: '2', side: 'left', noteTh: 'จำนวนเฉพาะที่น้อยที่สุดและเป็นเลขคู่ตัวเดียว' },
      { label: '9', side: 'right', noteTh: '9 หารด้วย 3 ลงตัว (3 × 3)' },
      { label: '13', side: 'left', noteTh: 'มีตัวประกอบเพียง 1 และ 13' },
      { label: '15', side: 'right', noteTh: '15 = 3 × 5 ไม่ใช่จำนวนเฉพาะ' },
      { label: '17', side: 'left', noteTh: 'มีตัวประกอบเพียง 1 และ 17' },
      { label: '1', side: 'right', noteTh: '1 ไม่นับเป็นจำนวนเฉพาะตามนิยามคณิตศาสตร์' },
      { label: '23', side: 'left', noteTh: 'มีตัวประกอบเพียง 1 และ 23' },
      { label: '21', side: 'right', noteTh: '21 = 3 × 7 ไม่ใช่จำนวนเฉพาะ' },
    ],
  },
  {
    id: 'sort-english',
    strand: 'foreign_lang',
    titleTh: 'แยกคำนาม (Noun) vs คำกริยา (Verb)',
    leftGateLabel: 'Noun (คำนาม)',
    rightGateLabel: 'Verb (คำกริยา)',
    cards: [
      { label: 'Knowledge', side: 'left', noteTh: 'Noun แปลว่า ความรู้' },
      { label: 'Discover', side: 'right', noteTh: 'Verb แปลว่า ค้นพบ' },
      { label: 'Microscope', side: 'left', noteTh: 'Noun แปลว่า กล้องจุลทรรศน์' },
      { label: 'Calculate', side: 'right', noteTh: 'Verb แปลว่า คำนวณ' },
      { label: 'Analyze', side: 'right', noteTh: 'Verb แปลว่า วิเคราะห์' },
      { label: 'Experiment', side: 'left', noteTh: 'Noun (การทดลอง) ใช้เป็นชื่อกิจกรรมได้ชัดเจน' },
      { label: 'Encourage', side: 'right', noteTh: 'Verb แปลว่า ให้กำลังใจ / ส่งเสริม' },
      { label: 'Scholarship', side: 'left', noteTh: 'Noun แปลว่า ทุนการศึกษา' },
    ],
  },
  {
    id: 'sort-career',
    strand: 'career_tech',
    titleTh: 'แยกพลังงานหมุนเวียน vs เชื้อเพลิงฟอสซิล',
    leftGateLabel: 'พลังงานหมุนเวียน (Clean)',
    rightGateLabel: 'เชื้อเพลิงฟอสซิล (Finite)',
    cards: [
      { label: 'พลังงานแสงอาทิตย์', side: 'left', noteTh: 'พลังงานสะอาดใช้ได้ไม่หมด' },
      { label: 'ถ่านหิน (Coal)', side: 'right', noteTh: 'ใช้แล้วหมดไปและปล่อยคาร์บอนสูง' },
      { label: 'กังหันลม', side: 'left', noteTh: 'พลังงานลมเป็นพลังงานหมุนเวียน' },
      { label: 'น้ำมันดิบ', side: 'right', noteTh: 'เชื้อเพลิงฟอสซิลที่เกิดจากการทับถมหลายล้านปี' },
      { label: 'พลังงานน้ำจากเขื่อน', side: 'left', noteTh: 'อาศัยวัฏจักรน้ำตามธรรมชาติ' },
      { label: 'ก๊าซธรรมชาติ', side: 'right', noteTh: 'จัดเป็นเชื้อเพลิงฟอสซิล' },
      { label: 'พลังงานชีวมวล (Biomass)', side: 'left', noteTh: 'ผลิตจากวัสดุเหลือใช้ทางการเกษตร หมุนเวียนได้' },
      { label: 'พลังงานความร้อนใต้พิภพ', side: 'left', noteTh: 'แหล่งพลังงานสะอาดจากใต้เปลือกโลก' },
    ],
  },
];

// =========================================================================
// Daily Arcade Missions Tracker (Makes kids want to try ALL diverse games!)
// =========================================================================
export interface DailyArcadeMission {
  id: 'meteor' | 'match' | 'word' | 'sort' | 'duel';
  titleTh: string;
  target: number;
  rewardExp: number;
  rewardGems: number;
}

export const DAILY_ARCADE_MISSIONS: DailyArcadeMission[] = [
  { id: 'meteor', titleTh: 'ยิงอุกกาบาตสมการแม่นยำ 8 ลูก', target: 8, rewardExp: 120, rewardGems: 20 },
  { id: 'match', titleTh: 'จับคู่ความรู้ 8 สาระครบ 1 กระดาน', target: 1, rewardExp: 100, rewardGems: 15 },
  { id: 'word', titleTh: 'ต่อคำศัพท์สำเร็จ 3 คำ', target: 3, rewardExp: 110, rewardGems: 18 },
  { id: 'sort', titleTh: 'แยกหมวด/เรียงลำดับผ่าน 1 ด่าน', target: 1, rewardExp: 100, rewardGems: 15 },
];

export interface ArcadeMissionProgress {
  date: string;
  counts: Record<DailyArcadeMission['id'], number>;
  claimed: Record<DailyArcadeMission['id'], boolean>;
}

const getTodayKey = () => new Date().toISOString().split('T')[0];

export function loadDailyArcadeMissions(userId: string): ArcadeMissionProgress {
  const today = getTodayKey();
  const empty: ArcadeMissionProgress = {
    date: today,
    counts: { meteor: 0, match: 0, word: 0, sort: 0, duel: 0 },
    claimed: { meteor: false, match: false, word: false, sort: false, duel: false },
  };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(`eduverse_arcade_missions_v1_${userId}`);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as ArcadeMissionProgress;
    if (parsed.date !== today) return empty;
    return {
      date: today,
      counts: { ...empty.counts, ...parsed.counts },
      claimed: { ...empty.claimed, ...parsed.claimed },
    };
  } catch {
    return empty;
  }
}

export function incrementArcadeMissionProgress(
  userId: string,
  missionId: DailyArcadeMission['id'],
  delta = 1
): ArcadeMissionProgress {
  const current = loadDailyArcadeMissions(userId);
  const next: ArcadeMissionProgress = {
    ...current,
    counts: {
      ...current.counts,
      [missionId]: (current.counts[missionId] || 0) + delta,
    },
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`eduverse_arcade_missions_v1_${userId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}

export function claimArcadeMissionReward(
  userId: string,
  missionId: DailyArcadeMission['id']
): ArcadeMissionProgress {
  const current = loadDailyArcadeMissions(userId);
  const next: ArcadeMissionProgress = {
    ...current,
    claimed: {
      ...current.claimed,
      [missionId]: true,
    },
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`eduverse_arcade_missions_v1_${userId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}
