import { getSupabaseClient } from './supabase';
import type { MoeStandardCatalogItem } from '../types';
import {
  MOE_LEARNING_AREAS,
  OBEC_UNITS_1_TO_3_BY_AREA,
} from '../data/moeCurriculumStandards';

const CACHE_PREFIX = 'eduverse_moe_standard_catalog_v1';
const SCHOOL_CATALOG_PREFIX = 'baanpakkru_school_std_catalog_v1_';

export interface SchoolStandardIndicatorItem extends MoeStandardCatalogItem {
  nature: 'formative' | 'summative';
  passingPercent: number;
  isCustom?: boolean;
}

function cacheKey(subjectArea: string, gradeLevel: string): string {
  return `${CACHE_PREFIX}_${subjectArea}_${gradeLevel}`;
}

function schoolCatalogKey(schoolId: string): string {
  return `${SCHOOL_CATALOG_PREFIX}${schoolId || 'default'}`;
}

export function readCachedMoeStandardCatalog(subjectArea: string, gradeLevel: string): MoeStandardCatalogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(cacheKey(subjectArea, gradeLevel));
    return raw ? (JSON.parse(raw) as MoeStandardCatalogItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCachedMoeStandardCatalog(
  subjectArea: string,
  gradeLevel: string,
  items: MoeStandardCatalogItem[]
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(cacheKey(subjectArea, gradeLevel), JSON.stringify(items));
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function buildDefaultObecCatalogSeedItems(): SchoolStandardIndicatorItem[] {
  const items: SchoolStandardIndicatorItem[] = [];
  Object.entries(OBEC_UNITS_1_TO_3_BY_AREA).forEach(([areaId, units]) => {
    const areaMeta = MOE_LEARNING_AREAS.find((a) => a.id === areaId);
    const subjectArea = areaMeta?.nameTh || areaId;
    units.forEach((unit) => {
      unit.indicators.forEach((ind, idx) => {
        items.push({
          id: `obec-seed-${areaId}-u${unit.unitNumber}-${idx + 1}`,
          curriculumVersion: 'พ.ศ. 2551 (ปรับปรุง 2560)',
          subjectArea,
          gradeLevel: 'ทุกระดับชั้น (ป.1–ม.6)',
          standardCode: unit.standardCode,
          standardTitle: unit.standardTitle,
          unitTitle: unit.unitTitle,
          indicatorCode: ind.code,
          indicatorTitle: ind.title,
          maxScore: ind.maxScore,
          sourceName: 'สพฐ. กระทรวงศึกษาธิการ',
          active: true,
          nature: ind.nature,
          passingPercent: 50,
          isCustom: false,
        });
      });
    });
  });
  return items;
}

export function loadSchoolEditableStandardCatalog(schoolId: string): SchoolStandardIndicatorItem[] {
  const seed = buildDefaultObecCatalogSeedItems();
  if (typeof window === 'undefined') return seed;
  try {
    const raw = window.localStorage.getItem(schoolCatalogKey(schoolId));
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as SchoolStandardIndicatorItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seed;
  } catch {
    return seed;
  }
}

export function saveSchoolEditableStandardCatalog(
  schoolId: string,
  items: SchoolStandardIndicatorItem[]
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(schoolCatalogKey(schoolId), JSON.stringify(items));
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function upsertSchoolEditableStandardItem(
  schoolId: string,
  item: SchoolStandardIndicatorItem
): SchoolStandardIndicatorItem[] {
  const current = loadSchoolEditableStandardCatalog(schoolId);
  const exists = current.some((existing) => existing.id === item.id);
  const next = exists
    ? current.map((existing) => (existing.id === item.id ? item : existing))
    : [item, ...current];
  saveSchoolEditableStandardCatalog(schoolId, next);
  return next;
}

export function deleteSchoolEditableStandardItem(
  schoolId: string,
  itemId: string
): SchoolStandardIndicatorItem[] {
  const current = loadSchoolEditableStandardCatalog(schoolId);
  const next = current.filter((item) => item.id !== itemId);
  saveSchoolEditableStandardCatalog(schoolId, next);
  return next;
}

export function resetSchoolEditableStandardCatalog(schoolId: string): SchoolStandardIndicatorItem[] {
  const seed = buildDefaultObecCatalogSeedItems();
  saveSchoolEditableStandardCatalog(schoolId, seed);
  return seed;
}

export async function loadMoeStandardCatalog(params: {
  subjectArea?: string;
  gradeLevel?: string;
  standardCode?: string;
}): Promise<MoeStandardCatalogItem[]> {
  const cache =
    params.subjectArea && params.gradeLevel
      ? readCachedMoeStandardCatalog(params.subjectArea, params.gradeLevel)
      : [];

  const client = getSupabaseClient();
  if (!client) return cache;

  let query = client
    .from('moe_standard_catalog')
    .select('*')
    .eq('active', true)
    .order('subject_area', { ascending: true })
    .order('grade_level', { ascending: true })
    .order('standard_code', { ascending: true })
    .order('indicator_code', { ascending: true });

  if (params.subjectArea) query = query.eq('subject_area', params.subjectArea);
  if (params.gradeLevel) query = query.eq('grade_level', params.gradeLevel);
  if (params.standardCode) query = query.eq('standard_code', params.standardCode);

  const { data, error } = await query;
  if (error) {
    console.warn('[MOE Catalog] Load failed:', error.message);
    return cache;
  }

  const items: MoeStandardCatalogItem[] = (data || []).map((row) => ({
    id: row.id,
    curriculumVersion: row.curriculum_version,
    subjectArea: row.subject_area,
    gradeLevel: row.grade_level,
    standardCode: row.standard_code,
    standardTitle: row.standard_title || '',
    unitTitle: row.unit_title || undefined,
    indicatorCode: row.indicator_code,
    indicatorTitle: row.indicator_title,
    maxScore: Number(row.max_score),
    sourceName: row.source_name,
    sourceUrl: row.source_url || undefined,
    sourceDocument: row.source_document || undefined,
    sourcePage: row.source_page ? Number(row.source_page) : undefined,
    active: row.active,
  }));

  if (params.subjectArea && params.gradeLevel) {
    writeCachedMoeStandardCatalog(params.subjectArea, params.gradeLevel, items);
  }
  return items;
}
