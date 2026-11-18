import { getSupabaseClient } from './supabase';
import {
  DEFAULT_PACKAGE_CATALOG,
  buildFlagsFromLevel,
  cachePackageCatalog,
  getSchoolFeatureFlags,
  getStoredPackageCatalog,
  normalizeSchoolTier,
  saveSchoolFeatureFlags,
} from './schoolFeatureFlags';
import type {
  PackageLevelConfig,
  PackageLevelId,
  SchoolFeatureFlags,
  SchoolPackagePurchaseOrder,
  SchoolTier,
} from '../types';

const PACKAGE_ORDERS_STORAGE_KEY = 'eduverse_package_orders_v1';

function isSchemaMissingError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = String(err.message || '');
  return (
    err.code === '42P01' ||
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    err.code === 'PGRST205' ||
    err.code === 'PGRST202' ||
    /does not exist|schema cache|could not find|function .* does not exist/i.test(msg)
  );
}

export async function loadPackageCatalog(): Promise<{
  catalog: PackageLevelConfig[];
  source: 'supabase' | 'local';
}> {
  const localCatalog = getStoredPackageCatalog();
  const client = getSupabaseClient();
  if (!client) return { catalog: localCatalog, source: 'local' };

  try {
    const { data, error } = await client
      .from('package_catalog')
      .select('*')
      .order('level_number', { ascending: true });
    if (error) {
      if (isSchemaMissingError(error)) return { catalog: localCatalog, source: 'local' };
      console.warn('[Packages] Could not load package_catalog:', error.message);
      return { catalog: localCatalog, source: 'local' };
    }
    if (!Array.isArray(data) || data.length === 0) {
      return { catalog: localCatalog, source: 'local' };
    }

    const mapped: PackageLevelConfig[] = DEFAULT_PACKAGE_CATALOG.map((def) => {
      const row = data.find((r) => r.id === def.id) as Record<string, unknown> | undefined;
      if (!row) return def;
      const featuresObj =
        row.features && typeof row.features === 'object' && !Array.isArray(row.features)
          ? (row.features as Record<string, boolean>)
          : {};
      return {
        ...def,
        nameTh: typeof row.name_th === 'string' && row.name_th ? row.name_th : def.nameTh,
        nameEn: typeof row.name_en === 'string' && row.name_en ? row.name_en : def.nameEn,
        audienceTh: typeof row.audience_th === 'string' ? row.audience_th : def.audienceTh,
        audienceEn: typeof row.audience_en === 'string' ? row.audience_en : def.audienceEn,
        descriptionTh: typeof row.description_th === 'string' ? row.description_th : def.descriptionTh,
        yearlyPriceThb:
          typeof row.yearly_price_thb === 'number' ? row.yearly_price_thb : def.yearlyPriceThb,
        monthlyPriceThb:
          typeof row.monthly_price_thb === 'number' ? row.monthly_price_thb : def.monthlyPriceThb,
        maxStudents: typeof row.max_students === 'number' ? row.max_students : def.maxStudents,
        isAvailable: typeof row.is_available === 'boolean' ? row.is_available : def.isAvailable,
        highlightBadgeTh:
          typeof row.highlight_badge_th === 'string' ? row.highlight_badge_th : def.highlightBadgeTh,
        features: {
          ...def.features,
          ...featuresObj,
        },
      };
    });

    cachePackageCatalog(mapped);
    return { catalog: mapped, source: 'supabase' };
  } catch {
    return { catalog: localCatalog, source: 'local' };
  }
}

export async function savePackageCatalog(catalog: PackageLevelConfig[]): Promise<{
  savedToSupabase: boolean;
  error?: string;
}> {
  cachePackageCatalog(catalog);
  const client = getSupabaseClient();
  if (!client) return { savedToSupabase: false };

  try {
    const rows = catalog.map((pkg) => ({
      id: pkg.id,
      level_number: pkg.levelNumber,
      name_th: pkg.nameTh,
      name_en: pkg.nameEn,
      audience_th: pkg.audienceTh,
      audience_en: pkg.audienceEn,
      description_th: pkg.descriptionTh,
      yearly_price_thb: Number(pkg.yearlyPriceThb) || 0,
      monthly_price_thb: Number(pkg.monthlyPriceThb) || 0,
      max_students: Number(pkg.maxStudents) || 500,
      is_available: pkg.isAvailable,
      highlight_badge_th: pkg.highlightBadgeTh || null,
      features: pkg.features,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await client.from('package_catalog').upsert(rows, { onConflict: 'id' });
    if (error) {
      if (isSchemaMissingError(error)) {
        return {
          savedToSupabase: false,
          error: 'บันทึกไว้ในเครื่องแล้ว (หากต้องการซิงค์ข้ามเครื่อง กรุณารัน migration 20261123_school_packages_and_ai_access.sql บน Supabase)',
        };
      }
      return { savedToSupabase: false, error: error.message };
    }
    return { savedToSupabase: true };
  } catch (err) {
    return { savedToSupabase: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function loadSchoolFeatureFlagsFromDb(
  schoolId: string,
  fallbackTier: SchoolTier = 'enterprise'
): Promise<SchoolFeatureFlags> {
  const localFlags = getSchoolFeatureFlags(schoolId, fallbackTier);
  const client = getSupabaseClient();
  if (!client || !schoolId) return localFlags;

  try {
    const { data, error } = await client
      .from('schools')
      .select('package_tier, feature_flags, ai_student_enabled')
      .eq('id', schoolId)
      .maybeSingle();

    if (error || !data) {
      return localFlags;
    }

    const row = data as {
      package_tier?: string | null;
      feature_flags?: Partial<SchoolFeatureFlags> | null;
      ai_student_enabled?: boolean | null;
    };

    const rawFlags = row.feature_flags && typeof row.feature_flags === 'object' ? row.feature_flags : {};
    const hasCustomFlags = Object.keys(rawFlags).length > 0;
    const tier: PackageLevelId = normalizeSchoolTier(row.package_tier || rawFlags.tier || fallbackTier);
    const catalog = getStoredPackageCatalog();
    const basePreset = buildFlagsFromLevel(tier, catalog);

    if (!row.package_tier && !hasCustomFlags && row.ai_student_enabled == null) {
      return localFlags;
    }

    const merged: SchoolFeatureFlags = {
      ...basePreset,
      ...rawFlags,
      tier,
      allowStudentsAi:
        typeof row.ai_student_enabled === 'boolean'
          ? row.ai_student_enabled
          : typeof rawFlags.allowStudentsAi === 'boolean'
            ? rawFlags.allowStudentsAi
            : basePreset.allowStudentsAi,
    };

    saveSchoolFeatureFlags(schoolId, merged);
    return merged;
  } catch {
    return localFlags;
  }
}

export async function saveSchoolFeatureFlagsToDb(
  schoolId: string,
  flags: SchoolFeatureFlags
): Promise<{ savedToSupabase: boolean; warning?: string }> {
  const normalizedTier = normalizeSchoolTier(flags.tier);
  const normalized: SchoolFeatureFlags = {
    ...flags,
    tier: normalizedTier,
  };
  saveSchoolFeatureFlags(schoolId, normalized);

  const client = getSupabaseClient();
  if (!client || !schoolId) return { savedToSupabase: false };

  try {
    const { error } = await client
      .from('schools')
      .update({
        package_tier: normalizedTier,
        feature_flags: normalized,
        ai_student_enabled: normalized.allowStudentsAi,
      })
      .eq('id', schoolId);

    if (error) {
      if (isSchemaMissingError(error)) {
        return {
          savedToSupabase: false,
          warning: 'อัปเดตสิทธิ์โมดูลในเครื่องแล้ว (รัน migration 20261123 เพื่อซิงค์ Supabase)',
        };
      }
      return { savedToSupabase: false, warning: error.message };
    }
    return { savedToSupabase: true };
  } catch (err) {
    return { savedToSupabase: false, warning: err instanceof Error ? err.message : String(err) };
  }
}

function readLocalOrders(): SchoolPackagePurchaseOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PACKAGE_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalOrders(orders: SchoolPackagePurchaseOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PACKAGE_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // ignore storage failure
  }
}

function mapDbOrderRow(row: Record<string, unknown>): SchoolPackagePurchaseOrder {
  return {
    id: String(row.id || ''),
    schoolId: String(row.school_id || ''),
    schoolName: String(row.school_name || ''),
    targetLevel: normalizeSchoolTier(String(row.target_level || 'level_2')),
    targetLevelNameTh: String(row.target_level_name_th || ''),
    billingCycle: row.billing_cycle === 'monthly' ? 'monthly' : 'yearly',
    listPriceThb: Number(row.list_price_thb || 0),
    promoCode: typeof row.promo_code === 'string' && row.promo_code ? row.promo_code : undefined,
    discountThb: Number(row.discount_thb || 0),
    finalAmountThb: Number(row.final_amount_thb || 0),
    paymentMethod: row.payment_method === 'invoice' ? 'invoice' : 'promptpay',
    slipUrl: typeof row.slip_url === 'string' && row.slip_url ? row.slip_url : undefined,
    transferNote: typeof row.transfer_note === 'string' && row.transfer_note ? row.transfer_note : undefined,
    requestedByName: String(row.requested_by_name || ''),
    requestedByEmail: typeof row.requested_by_email === 'string' ? row.requested_by_email : undefined,
    status:
      row.status === 'approved' || row.status === 'rejected' ? row.status : 'pending',
    reviewNote: typeof row.review_note === 'string' && row.review_note ? row.review_note : undefined,
    reviewedBy: typeof row.reviewed_by === 'string' && row.reviewed_by ? row.reviewed_by : undefined,
    reviewedAt: typeof row.reviewed_at === 'string' && row.reviewed_at ? row.reviewed_at : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function loadSchoolPackageOrders(
  schoolId?: string
): Promise<SchoolPackagePurchaseOrder[]> {
  const localOrders = readLocalOrders();
  const filteredLocal = schoolId
    ? localOrders.filter((o) => o.schoolId === schoolId)
    : localOrders;

  const client = getSupabaseClient();
  if (!client) return filteredLocal;

  try {
    let query = client
      .from('school_package_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    const { data, error } = await query;
    if (error) {
      return filteredLocal;
    }
    const dbOrders = (data || []).map((row) => mapDbOrderRow(row as Record<string, unknown>));
    if (!schoolId) {
      writeLocalOrders(dbOrders);
    } else {
      const merged = [
        ...dbOrders,
        ...localOrders.filter((o) => o.schoolId !== schoolId),
      ];
      writeLocalOrders(merged);
    }
    return dbOrders;
  } catch {
    return filteredLocal;
  }
}

export async function submitSchoolPackageOrder(
  order: Omit<SchoolPackagePurchaseOrder, 'id' | 'status' | 'createdAt'>
): Promise<{ order: SchoolPackagePurchaseOrder; savedToSupabase: boolean; warning?: string }> {
  const newOrder: SchoolPackagePurchaseOrder = {
    ...order,
    id: `pkg-ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const existing = readLocalOrders();
  writeLocalOrders([newOrder, ...existing]);

  const client = getSupabaseClient();
  if (!client) return { order: newOrder, savedToSupabase: false };

  try {
    const { error } = await client.from('school_package_orders').insert({
      id: newOrder.id,
      school_id: newOrder.schoolId,
      school_name: newOrder.schoolName,
      target_level: newOrder.targetLevel,
      target_level_name_th: newOrder.targetLevelNameTh,
      billing_cycle: newOrder.billingCycle,
      list_price_thb: newOrder.listPriceThb,
      promo_code: newOrder.promoCode || null,
      discount_thb: newOrder.discountThb,
      final_amount_thb: newOrder.finalAmountThb,
      payment_method: newOrder.paymentMethod,
      slip_url: newOrder.slipUrl || null,
      transfer_note: newOrder.transferNote || null,
      requested_by_name: newOrder.requestedByName,
      requested_by_email: newOrder.requestedByEmail || null,
      status: 'pending',
      created_at: newOrder.createdAt,
    });
    if (error) {
      if (isSchemaMissingError(error)) {
        return {
          order: newOrder,
          savedToSupabase: false,
          warning: 'บันทึกคำขอซื้อแพ็กเกจไว้ในเครื่องแล้ว (รัน migration 20261123 เพื่อซิงค์คำขอไปยัง Super Admin ออนไลน์)',
        };
      }
      return { order: newOrder, savedToSupabase: false, warning: error.message };
    }
    return { order: newOrder, savedToSupabase: true };
  } catch (err) {
    return {
      order: newOrder,
      savedToSupabase: false,
      warning: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function reviewSchoolPackageOrder(
  order: SchoolPackagePurchaseOrder,
  decision: 'approved' | 'rejected',
  reviewerName: string,
  reviewNote?: string,
  catalog: PackageLevelConfig[] = getStoredPackageCatalog()
): Promise<{ activatedFlags?: SchoolFeatureFlags; savedToSupabase: boolean; warning?: string }> {
  const nowIso = new Date().toISOString();
  const updatedOrders = readLocalOrders().map((o) =>
    o.id === order.id
      ? {
          ...o,
          status: decision,
          reviewNote: reviewNote || o.reviewNote,
          reviewedBy: reviewerName,
          reviewedAt: nowIso,
        }
      : o
  );
  writeLocalOrders(updatedOrders);

  let activatedFlags: SchoolFeatureFlags | undefined;
  if (decision === 'approved') {
    const existingFlags = getSchoolFeatureFlags(order.schoolId, order.targetLevel);
    activatedFlags = buildFlagsFromLevel(
      order.targetLevel,
      catalog,
      existingFlags.allowStudentsAi
    );
    saveSchoolFeatureFlags(order.schoolId, activatedFlags);
  }

  const client = getSupabaseClient();
  if (!client) {
    return { activatedFlags, savedToSupabase: false };
  }

  try {
    const { error } = await client
      .from('school_package_orders')
      .update({
        status: decision,
        review_note: reviewNote || null,
        reviewed_by: reviewerName,
        reviewed_at: nowIso,
      })
      .eq('id', order.id);

    if (error && !isSchemaMissingError(error)) {
      return { activatedFlags, savedToSupabase: false, warning: error.message };
    }

    if (decision === 'approved' && activatedFlags) {
      await saveSchoolFeatureFlagsToDb(order.schoolId, activatedFlags);
    }

    return {
      activatedFlags,
      savedToSupabase: !error,
      warning: error ? 'อัปเดตสถานะในเครื่องแล้ว (รัน migration 20261123 เพื่อซิงค์ Supabase)' : undefined,
    };
  } catch (err) {
    return {
      activatedFlags,
      savedToSupabase: false,
      warning: err instanceof Error ? err.message : String(err),
    };
  }
}
