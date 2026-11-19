import { getSupabaseClient } from './supabase';
import type { MoeStandardCatalogItem } from '../types';

const CACHE_PREFIX = 'eduverse_moe_standard_catalog_v1';

function cacheKey(subjectArea: string, gradeLevel: string): string {
  return `${CACHE_PREFIX}_${subjectArea}_${gradeLevel}`;
}

export function readCachedMoeStandardCatalog(subjectArea: string, gradeLevel: string): MoeStandardCatalogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(cacheKey(subjectArea, gradeLevel));
    return raw ? JSON.parse(raw) as MoeStandardCatalogItem[] : [];
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

export async function loadMoeStandardCatalog(params: {
  subjectArea?: string;
  gradeLevel?: string;
  standardCode?: string;
}): Promise<MoeStandardCatalogItem[]> {
  const cache = params.subjectArea && params.gradeLevel
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
