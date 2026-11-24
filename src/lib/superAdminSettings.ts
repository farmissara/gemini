import type { UserRole } from '../types';
import { getSupabaseClient } from './supabase';
import type { OperationalRole } from './operationalRoles';

export type SuperAdminSettingKey =
  | 'role_permissions'
  | 'promotions'
  | 'subscription_plans'
  | 'central_exam_payment_settings';

export async function fetchSuperAdminSettings(): Promise<Partial<Record<SuperAdminSettingKey, unknown>>> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.rpc('get_super_admin_settings');
  if (error) throw new Error(`Could not load Super Admin settings: ${error.message}`);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The Super Admin settings response is invalid.');
  }
  return data as Partial<Record<SuperAdminSettingKey, unknown>>;
}

export async function fetchMyRolePermissionConfig(role?: UserRole): Promise<unknown> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.rpc('get_my_role_permissions', {
    requested_role: role || null,
  });
  if (error) throw new Error(`Could not load role permissions: ${error.message}`);
  return data;
}

export async function fetchMyOperationalRole(): Promise<OperationalRole> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.rpc('get_my_operational_role');
  if (error) throw new Error(`Could not load this session's role: ${error.message}`);
  if (data !== 'admin' && data !== 'teacher') {
    throw new Error('The active operational role returned by the database is invalid.');
  }
  return data;
}

export async function setMyOperationalRole(role: OperationalRole): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.rpc('set_my_operational_role', {
    requested_role: role,
  });
  if (error) throw new Error(`Could not switch role: ${error.message}`);
  if (data !== role) {
    throw new Error('The database did not confirm the requested operational role.');
  }
}

export async function saveSuperAdminSetting(
  key: SuperAdminSettingKey,
  value: unknown
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client.rpc('save_super_admin_setting', {
    target_key: key,
    target_value: value,
  });
  if (error) throw new Error(`Could not save ${key}: ${error.message}`);
}

export async function saveSuperAdminSettings(
  settings: Partial<Record<SuperAdminSettingKey, unknown>>
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { error } = await client.rpc('save_super_admin_settings', {
    target_settings: settings,
  });
  if (error) throw new Error(`Could not save Super Admin settings: ${error.message}`);
}
