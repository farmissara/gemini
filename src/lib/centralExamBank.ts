import { DEFAULT_CENTRAL_EXAM_PACKS, LEARNING_STRANDS } from '../data/examQuestionBanks';
import {
  CentralExamPack,
  LearningStrandId,
  QuizQuestion,
  SchoolExamEntitlement,
} from '../types';
import { getSupabaseClient } from './supabase';

export const CENTRAL_EXAMS_UPDATED_EVENT = 'eduverse:central-exams-updated';

const PACKS_STORAGE_KEY = 'eduverse_central_exam_packs_v1';
const entitlementsStorageKey = (schoolId: string) => `eduverse_school_exam_entitlements_v1_${schoolId}`;
const schoolQuestionsStorageKey = (schoolId: string) => `eduverse_school_questions_v1_${schoolId}`;
const popupSeenStorageKey = (schoolId: string) => `eduverse_central_exam_popup_seen_v1_${schoolId}`;

function isMissingTableOrSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /schema cache|could not find the table|does not exist/i.test(error.message || '')
  );
}

export function dispatchCentralExamsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CENTRAL_EXAMS_UPDATED_EVENT));
  }
}

export function inferStrandFromSubject(subject: string): LearningStrandId {
  const s = (subject || '').toLowerCase();
  if (/ไทย|วรรณคดี|หลักภาษา/.test(s)) return 'thai';
  if (/คณิต|math|ตรรก|แคลคูลัส|เรขา/.test(s)) return 'math';
  if (/วิทย์|ฟิสิกส์|เคมี|ชีว|คำนวณ|stem|science|ai|หุ่นยนต์|ดาราศาสตร์/.test(s)) return 'science_tech';
  if (/สังคม|ประวัติ|ภูมิศาสตร์|ศาสนา|พลเมือง|เศรษฐ/.test(s)) return 'social';
  if (/สุข|พลศึกษา|สุขภาพ|ปฐมพยาบาล|โภชนา|กีฬา|health/.test(s)) return 'health_pe';
  if (/ศิลป|ดนตรี|นาฏศิลป|ทัศนศิลป|art|music/.test(s)) return 'arts';
  if (/การงาน|อาชีพ|เกษตร|ช่าง|คหกรรม|ธุรกิจ|career/.test(s)) return 'career_tech';
  if (/อังกฤษ|english|idiom|ภาษาต่างประเทศ|จีน|ญี่ปุ่น/.test(s)) return 'foreign_lang';
  return 'science_tech';
}

export function getStrandMeta(strand: LearningStrandId) {
  return LEARNING_STRANDS.find((item) => item.id === strand) || LEARNING_STRANDS[0];
}

function readLocalPacks(): CentralExamPack[] {
  if (typeof window === 'undefined') return DEFAULT_CENTRAL_EXAM_PACKS;
  try {
    const raw = localStorage.getItem(PACKS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify(DEFAULT_CENTRAL_EXAM_PACKS));
      return DEFAULT_CENTRAL_EXAM_PACKS;
    }
    const parsed = JSON.parse(raw) as CentralExamPack[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_CENTRAL_EXAM_PACKS;
    }
    // Ensure any newly shipped built-in packs exist if not explicitly overwritten
    const existingIds = new Set(parsed.map((p) => p.id));
    const merged = [...parsed];
    for (const defPack of DEFAULT_CENTRAL_EXAM_PACKS) {
      if (!existingIds.has(defPack.id)) {
        merged.push(defPack);
      }
    }
    return merged;
  } catch {
    return DEFAULT_CENTRAL_EXAM_PACKS;
  }
}

function writeLocalPacks(packs: CentralExamPack[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify(packs));
  } catch {
    // ignore storage quota errors
  }
}

function readLocalEntitlements(schoolId: string): SchoolExamEntitlement[] {
  if (typeof window === 'undefined' || !schoolId) return [];
  try {
    const raw = localStorage.getItem(entitlementsStorageKey(schoolId));
    const parsed = raw ? (JSON.parse(raw) as SchoolExamEntitlement[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalEntitlements(schoolId: string, items: SchoolExamEntitlement[]) {
  if (typeof window === 'undefined' || !schoolId) return;
  try {
    localStorage.setItem(entitlementsStorageKey(schoolId), JSON.stringify(items));
  } catch {
    // ignore
  }
}

function readLocalSchoolQuestions(schoolId: string): QuizQuestion[] {
  if (typeof window === 'undefined' || !schoolId) return [];
  try {
    const raw = localStorage.getItem(schoolQuestionsStorageKey(schoolId));
    const parsed = raw ? (JSON.parse(raw) as QuizQuestion[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalSchoolQuestions(schoolId: string, items: QuizQuestion[]) {
  if (typeof window === 'undefined' || !schoolId) return;
  try {
    localStorage.setItem(schoolQuestionsStorageKey(schoolId), JSON.stringify(items));
  } catch {
    // ignore
  }
}

interface DbCentralExamPackRow {
  id: string;
  title_th: string;
  title_en: string;
  strand: LearningStrandId;
  grade_level: string;
  description_th: string;
  pricing_type: 'free' | 'paid';
  price_thb: number;
  status: 'draft' | 'published';
  questions: QuizQuestion[];
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapPackFromDb(row: DbCentralExamPackRow): CentralExamPack {
  return {
    id: row.id,
    titleTh: row.title_th,
    titleEn: row.title_en,
    strand: row.strand,
    gradeLevel: row.grade_level,
    descriptionTh: row.description_th,
    pricingType: row.pricing_type,
    priceThb: Number(row.price_thb) || 0,
    status: row.status,
    questions: Array.isArray(row.questions) ? row.questions : [],
    createdBy: row.created_by || 'Super Admin',
    publishedAt: row.published_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPackToDb(pack: CentralExamPack): DbCentralExamPackRow {
  return {
    id: pack.id,
    title_th: pack.titleTh,
    title_en: pack.titleEn || pack.titleTh,
    strand: pack.strand,
    grade_level: pack.gradeLevel,
    description_th: pack.descriptionTh,
    pricing_type: pack.pricingType,
    price_thb: pack.pricingType === 'free' ? 0 : Math.max(0, Number(pack.priceThb) || 0),
    status: pack.status,
    questions: pack.questions,
    created_by: pack.createdBy || 'Super Admin',
    published_at: pack.status === 'published' ? pack.publishedAt || new Date().toISOString() : null,
    created_at: pack.createdAt,
    updated_at: pack.updatedAt,
  };
}

export async function fetchCentralExamPacks(isDemoMode: boolean): Promise<CentralExamPack[]> {
  const localPacks = readLocalPacks();
  if (isDemoMode) return localPacks;

  const client = getSupabaseClient();
  if (!client) return localPacks;

  try {
    const { data, error } = await client
      .from('central_exam_packs')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      if (isMissingTableOrSchemaError(error)) {
        return localPacks;
      }
      return localPacks;
    }

    if (!data || data.length === 0) {
      // Seed defaults cleanly into local cache; Super Admin actions will persist DB rows
      return localPacks;
    }

    const dbPacks = (data as DbCentralExamPackRow[]).map(mapPackFromDb);
    const dbIds = new Set(dbPacks.map((p) => p.id));
    const merged = [...dbPacks];
    for (const defPack of DEFAULT_CENTRAL_EXAM_PACKS) {
      if (!dbIds.has(defPack.id)) {
        merged.push(defPack);
      }
    }
    writeLocalPacks(merged);
    return merged;
  } catch {
    return localPacks;
  }
}

export async function upsertCentralExamPack(
  pack: CentralExamPack,
  isDemoMode: boolean
): Promise<{ ok: boolean; packs: CentralExamPack[]; persistedToDb: boolean }> {
  const normalizedPack: CentralExamPack = {
    ...pack,
    priceThb: pack.pricingType === 'free' ? 0 : Math.max(0, Number(pack.priceThb) || 0),
    publishedAt: pack.status === 'published' ? pack.publishedAt || new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
  };

  const currentLocal = readLocalPacks();
  const exists = currentLocal.some((p) => p.id === normalizedPack.id);
  const nextLocal = exists
    ? currentLocal.map((p) => (p.id === normalizedPack.id ? normalizedPack : p))
    : [normalizedPack, ...currentLocal];
  writeLocalPacks(nextLocal);

  if (isDemoMode) {
    dispatchCentralExamsUpdated();
    return { ok: true, packs: nextLocal, persistedToDb: false };
  }

  const client = getSupabaseClient();
  if (!client) {
    dispatchCentralExamsUpdated();
    return { ok: true, packs: nextLocal, persistedToDb: false };
  }

  try {
    const { error } = await client
      .from('central_exam_packs')
      .upsert(mapPackToDb(normalizedPack), { onConflict: 'id' });
    dispatchCentralExamsUpdated();
    return { ok: true, packs: nextLocal, persistedToDb: !error };
  } catch {
    dispatchCentralExamsUpdated();
    return { ok: true, packs: nextLocal, persistedToDb: false };
  }
}

export async function deleteCentralExamPack(
  packId: string,
  isDemoMode: boolean
): Promise<{ ok: boolean; packs: CentralExamPack[] }> {
  const nextLocal = readLocalPacks().filter((p) => p.id !== packId);
  writeLocalPacks(nextLocal);

  if (!isDemoMode) {
    const client = getSupabaseClient();
    if (client) {
      await client.from('central_exam_packs').delete().eq('id', packId).then(() => undefined, () => undefined);
    }
  }

  dispatchCentralExamsUpdated();
  return { ok: true, packs: nextLocal };
}

interface DbEntitlementRow {
  id: string;
  school_id: string;
  pack_id: string;
  claim_type: 'free' | 'purchased';
  amount_paid_thb: number;
  payment_method: 'free' | 'promptpay' | 'invoice';
  claimed_by: string;
  claimed_at: string;
}

export async function fetchSchoolExamEntitlements(
  schoolId: string,
  isDemoMode: boolean
): Promise<SchoolExamEntitlement[]> {
  if (!schoolId) return [];
  const local = readLocalEntitlements(schoolId);
  if (isDemoMode) return local;

  const client = getSupabaseClient();
  if (!client) return local;

  try {
    const { data, error } = await client
      .from('school_exam_entitlements')
      .select('*')
      .eq('school_id', schoolId)
      .order('claimed_at', { ascending: false });

    if (error) {
      if (isMissingTableOrSchemaError(error)) return local;
      return local;
    }

    const mapped: SchoolExamEntitlement[] = ((data || []) as DbEntitlementRow[]).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      packId: row.pack_id,
      claimType: row.claim_type,
      amountPaidThb: Number(row.amount_paid_thb) || 0,
      paymentMethod: row.payment_method,
      claimedBy: row.claimed_by,
      claimedAt: row.claimed_at,
    }));

    // Merge local fallback items that may not be synced yet
    const mappedPackIds = new Set(mapped.map((e) => e.packId));
    const merged = [...mapped];
    for (const item of local) {
      if (!mappedPackIds.has(item.packId)) {
        merged.push(item);
      }
    }
    writeLocalEntitlements(schoolId, merged);
    return merged;
  } catch {
    return local;
  }
}

interface DbSchoolQuestionRow {
  id: string;
  school_id: string;
  pack_id: string | null;
  strand: LearningStrandId | null;
  subject: string;
  grade_level: string;
  category: QuizQuestion['category'];
  question_th: string;
  question_en: string;
  options: string[];
  correct_index: number;
  explanation_th: string;
  points: number;
}

export async function fetchSchoolPersistedQuestions(
  schoolId: string,
  isDemoMode: boolean
): Promise<QuizQuestion[]> {
  if (!schoolId) return [];
  const local = readLocalSchoolQuestions(schoolId);
  if (isDemoMode) return local;

  const client = getSupabaseClient();
  if (!client) return local;

  try {
    const { data, error } = await client
      .from('school_questions')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableOrSchemaError(error)) return local;
      return local;
    }

    const dbRows: QuizQuestion[] = ((data || []) as DbSchoolQuestionRow[]).map((r) => ({
      id: r.id,
      schoolId: r.school_id,
      packId: r.pack_id || undefined,
      strand: r.strand || inferStrandFromSubject(r.subject),
      subject: r.subject,
      gradeLevel: r.grade_level,
      category: r.category,
      questionTh: r.question_th,
      questionEn: r.question_en || '',
      options: Array.isArray(r.options) ? r.options : [],
      correctIndex: Number(r.correct_index) || 0,
      explanationTh: r.explanation_th || '',
      points: Number(r.points) || 100,
    }));

    const dbIds = new Set(dbRows.map((q) => q.id));
    const merged = [...dbRows];
    for (const q of local) {
      if (!dbIds.has(q.id)) {
        merged.push(q);
      }
    }
    writeLocalSchoolQuestions(schoolId, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveSchoolQuestionsBatch(
  schoolId: string,
  newQuestions: QuizQuestion[],
  isDemoMode: boolean
): Promise<QuizQuestion[]> {
  if (!schoolId || newQuestions.length === 0) return readLocalSchoolQuestions(schoolId);
  const tagged = newQuestions.map((q) => ({
    ...q,
    schoolId,
    strand: q.strand || inferStrandFromSubject(q.subject),
  }));

  const current = readLocalSchoolQuestions(schoolId);
  const byId = new Map<string, QuizQuestion>();
  for (const q of [...tagged, ...current]) {
    byId.set(q.id, q);
  }
  const merged = Array.from(byId.values());
  writeLocalSchoolQuestions(schoolId, merged);

  if (!isDemoMode) {
    const client = getSupabaseClient();
    if (client) {
      const payload = tagged.map((q) => ({
        id: q.id,
        school_id: schoolId,
        pack_id: q.packId || null,
        strand: q.strand || inferStrandFromSubject(q.subject),
        subject: q.subject,
        grade_level: q.gradeLevel || 'ป.1 - ม.6',
        category: q.category || 'standard_exam',
        question_th: q.questionTh,
        question_en: q.questionEn || '',
        options: q.options,
        correct_index: q.correctIndex,
        explanation_th: q.explanationTh || '',
        points: q.points || 100,
      }));
      await client
        .from('school_questions')
        .upsert(payload, { onConflict: 'id' })
        .then(() => undefined, () => undefined);
    }
  }

  return merged;
}

export async function claimCentralExamPack(params: {
  schoolId: string;
  pack: CentralExamPack;
  paymentMethod: 'free' | 'promptpay' | 'invoice';
  claimedBy: string;
  isDemoMode: boolean;
}): Promise<{
  entitlement: SchoolExamEntitlement;
  addedQuestions: QuizQuestion[];
  allEntitlements: SchoolExamEntitlement[];
}> {
  const { schoolId, pack, paymentMethod, claimedBy, isDemoMode } = params;
  const now = new Date().toISOString();
  const isPaid = pack.pricingType === 'paid' && pack.priceThb > 0;

  const entitlement: SchoolExamEntitlement = {
    id: `ent-${schoolId}-${pack.id}`,
    schoolId,
    packId: pack.id,
    claimType: isPaid ? 'purchased' : 'free',
    amountPaidThb: isPaid ? pack.priceThb : 0,
    paymentMethod: isPaid ? (paymentMethod === 'free' ? 'promptpay' : paymentMethod) : 'free',
    claimedBy,
    claimedAt: now,
  };

  const currentEntitlements = readLocalEntitlements(schoolId).filter((e) => e.packId !== pack.id);
  const nextEntitlements = [entitlement, ...currentEntitlements];
  writeLocalEntitlements(schoolId, nextEntitlements);

  const taggedQuestions: QuizQuestion[] = pack.questions.map((q, index) => ({
    ...q,
    id: `${schoolId}-${pack.id}-${q.id || index}`,
    schoolId,
    packId: pack.id,
    strand: q.strand || pack.strand,
  }));

  await saveSchoolQuestionsBatch(schoolId, taggedQuestions, isDemoMode);

  if (!isDemoMode) {
    const client = getSupabaseClient();
    if (client) {
      await client
        .from('school_exam_entitlements')
        .upsert(
          {
            id: entitlement.id,
            school_id: schoolId,
            pack_id: pack.id,
            claim_type: entitlement.claimType,
            amount_paid_thb: entitlement.amountPaidThb,
            payment_method: entitlement.paymentMethod,
            claimed_by: claimedBy,
            claimed_at: now,
          },
          { onConflict: 'school_id,pack_id' }
        )
        .then(() => undefined, () => undefined);
    }
  }

  dispatchCentralExamsUpdated();
  return {
    entitlement,
    addedQuestions: taggedQuestions,
    allEntitlements: nextEntitlements,
  };
}

export function getUnclaimedPublishedPacks(
  packs: CentralExamPack[],
  entitlements: SchoolExamEntitlement[]
): CentralExamPack[] {
  const claimedIds = new Set(entitlements.map((e) => e.packId));
  return packs.filter((p) => p.status === 'published' && !claimedIds.has(p.id));
}

export function buildCentralExamSignature(unclaimedPacks: CentralExamPack[]): string {
  return unclaimedPacks
    .map((p) => `${p.id}:${p.updatedAt || p.publishedAt || ''}:${p.pricingType}:${p.priceThb}`)
    .sort()
    .join('|');
}

export function hasSeenCentralExamPopup(schoolId: string, signature: string): boolean {
  if (typeof window === 'undefined' || !schoolId || !signature) return true;
  try {
    return localStorage.getItem(popupSeenStorageKey(schoolId)) === signature;
  } catch {
    return false;
  }
}

export function markCentralExamPopupSeen(schoolId: string, signature: string) {
  if (typeof window === 'undefined' || !schoolId) return;
  try {
    localStorage.setItem(popupSeenStorageKey(schoolId), signature);
  } catch {
    // ignore
  }
}

export function clearCentralExamPopupSeen(schoolId: string) {
  if (typeof window === 'undefined' || !schoolId) return;
  try {
    localStorage.removeItem(popupSeenStorageKey(schoolId));
  } catch {
    // ignore
  }
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCorrectIndex(val: string | number | undefined): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    if (val >= 1 && val <= 4) return val - 1;
    return Math.min(3, Math.max(0, val));
  }
  const normalized = String(val || '0').trim().toUpperCase();
  if (normalized === 'A' || normalized === 'ก') return 0;
  if (normalized === 'B' || normalized === 'ข') return 1;
  if (normalized === 'C' || normalized === 'ค') return 2;
  if (normalized === 'D' || normalized === 'ง') return 3;
  const num = Number(normalized);
  if (!Number.isNaN(num)) {
    if (num >= 1 && num <= 4) return num - 1;
    return Math.min(3, Math.max(0, num));
  }
  return 0;
}

export function parseExamQuestionsCsvOrJson(
  rawText: string,
  defaultStrand: LearningStrandId,
  defaultGradeLevel = 'ป.1 - ม.6'
): QuizQuestion[] {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  const strandMeta = getStrandMeta(defaultStrand);

  if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
    const parsed = JSON.parse(cleaned) as Record<string, unknown> | Record<string, unknown>[];
    const items: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.questions)
      ? (parsed.questions as Record<string, unknown>[])
      : [parsed];
    return items
      .filter((item) => Boolean(item && (item.questionTh || item.question_th || item.question)))
      .map((item, idx) => {
        const subject = String(item.subject || strandMeta.nameTh);
        const strand = (item.strand as LearningStrandId) || defaultStrand || inferStrandFromSubject(subject);
        const options = Array.isArray(item.options)
          ? item.options.map((o: unknown) => String(o || '')).slice(0, 4)
          : [
              String(item.optionA || item.a || 'ตัวเลือก ก'),
              String(item.optionB || item.b || 'ตัวเลือก ข'),
              String(item.optionC || item.c || 'ตัวเลือก ค'),
              String(item.optionD || item.d || 'ตัวเลือก ง'),
            ];
        while (options.length < 4) options.push(`ตัวเลือก ${options.length + 1}`);
        return {
          id: String(item.id || `cen-imp-${Date.now()}-${idx}`),
          strand,
          subject,
          gradeLevel: String(item.gradeLevel || item.grade_level || defaultGradeLevel),
          category: (item.category as QuizQuestion['category']) || 'standard_exam',
          questionTh: String(item.questionTh || item.question_th || item.question),
          questionEn: String(item.questionEn || item.question_en || ''),
          options,
          correctIndex: parseCorrectIndex(
            (item.correctIndex ?? item.correct_index ?? item.answer) as string | number | undefined
          ),
          explanationTh: String(
            item.explanationTh || item.explanation_th || item.explanation || 'เฉลยตามหลักสูตรแกนกลาง 8 กลุ่มสาระการเรียนรู้'
          ),
          points: Number(item.points) || 100,
        };
      });
  }

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const firstCols = splitCsvLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = firstCols.some((c) =>
    ['subject', 'questionth', 'question', 'optiona', 'วิชา', 'โจทย์'].includes(c)
  );
  const startRow = hasHeader ? 1 : 0;

  const result: QuizQuestion[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 6) continue;
    // Supports either:
    // 1) subject,gradeLevel,questionTh,optionA,optionB,optionC,optionD,correctIndex,explanationTh,points,strand
    // or concise: subject,questionTh,optionA,optionB,optionC,optionD,correctIndex,explanationTh
    const isConcise = cols.length <= 8;
    const subject = cols[0] || strandMeta.nameTh;
    const gradeLevel = isConcise ? defaultGradeLevel : cols[1] || defaultGradeLevel;
    const questionTh = isConcise ? cols[1] : cols[2];
    if (!questionTh) continue;

    const options = isConcise
      ? [cols[2] || 'ก', cols[3] || 'ข', cols[4] || 'ค', cols[5] || 'ง']
      : [cols[3] || 'ก', cols[4] || 'ข', cols[5] || 'ค', cols[6] || 'ง'];

    const correctRaw = isConcise ? cols[6] : cols[7];
    const explanationTh = (isConcise ? cols[7] : cols[8]) || 'เฉลยตามหลักสูตรแกนกลาง 8 กลุ่มสาระการเรียนรู้';
    const points = Number(cols[9]) || 100;
    const strand = (cols[10] as LearningStrandId) || defaultStrand || inferStrandFromSubject(subject);

    result.push({
      id: `cen-csv-${Date.now()}-${i}`,
      strand,
      subject,
      gradeLevel,
      category: 'standard_exam',
      questionTh,
      questionEn: '',
      options,
      correctIndex: parseCorrectIndex(correctRaw),
      explanationTh,
      points,
    });
  }

  return result;
}

export function buildCentralExamCsvTemplate(): string {
  const header = 'subject,gradeLevel,questionTh,optionA,optionB,optionC,optionD,correctIndex,explanationTh,points,strand';
  const rows = [
    '"ศิลปะ (ทัศนศิลป์)","ป.5","แม่สีขั้นที่ 1 (Primary Colors) ในงานจิตรกรรมประกอบด้วยสีใดบ้าง","แดง เหลือง น้ำเงิน","ส้ม เขียว ม่วง","ขาว ดำ เทา","ชมพู ฟ้า เขียวอ่อน","0","แม่สีหลักทางศิลปะคือ แดง เหลือง น้ำเงิน เมื่อนำมาผสมกันจะได้สีขั้นที่ 2",100,"arts"',
    '"การงานอาชีพ","ม.2","หลักการจัดการขยะ 3R เพื่อความยั่งยืน ข้อใดหมายถึงการลดการใช้ทรัพยากร","Reduce","Reuse","Recycle","Repair","0","Reduce คือการลดการใช้ตั้งแต่ต้นทาง เช่น ใช้ถุงผ้าแทนถุงพลาสติก",100,"career_tech"',
  ];
  return '\uFEFF' + [header, ...rows].join('\n');
}
