import { getSupabaseClient } from './supabase';
import { EduVerseNotification } from './pushNotifications';

export interface ParentNotificationPreferences {
  pushEnabled: boolean;
  attendanceEnabled: boolean;
  homeworkEnabled: boolean;
  announcementEnabled: boolean;
  billingEnabled: boolean;
}

interface ParentNotificationRow {
  id: string;
  category: EduVerseNotification['category'];
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export const DEFAULT_PARENT_NOTIFICATION_PREFERENCES: ParentNotificationPreferences = {
  pushEnabled: false,
  attendanceEnabled: true,
  homeworkEnabled: true,
  announcementEnabled: true,
  billingEnabled: true,
};

function getClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  return client;
}

function mapNotification(row: ParentNotificationRow): EduVerseNotification {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    timestamp: row.created_at,
    read: Boolean(row.read_at),
    priority: 'normal',
  };
}

export async function listParentNotifications(): Promise<EduVerseNotification[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('parent_notifications')
    .select('id, category, title, body, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.warn(`Could not load child notifications: ${error.message}`);
    return [];
  }
  return ((data || []) as ParentNotificationRow[]).map(mapNotification);
}

export async function getParentUnreadNotificationCount(): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;
  const { count, error } = await client
    .from('parent_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) {
    return 0;
  }
  return count || 0;
}

export async function loadParentNotificationPreferences(): Promise<ParentNotificationPreferences> {
  const client = getSupabaseClient();
  if (!client) return DEFAULT_PARENT_NOTIFICATION_PREFERENCES;
  const { data, error } = await client
    .from('parent_notification_preferences')
    .select('push_enabled, attendance_enabled, homework_enabled, announcement_enabled, billing_enabled')
    .maybeSingle();
  if (error || !data) return DEFAULT_PARENT_NOTIFICATION_PREFERENCES;
  return {
    pushEnabled: data.push_enabled,
    attendanceEnabled: data.attendance_enabled,
    homeworkEnabled: data.homework_enabled,
    announcementEnabled: data.announcement_enabled,
    billingEnabled: data.billing_enabled,
  };
}

export async function saveParentNotificationPreferences(
  preferences: ParentNotificationPreferences
): Promise<void> {
  const client = getClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw new Error('Sign in again to update notification preferences.');

  const { error } = await client
    .from('parent_notification_preferences')
    .upsert({
      profile_id: authData.user.id,
      push_enabled: preferences.pushEnabled,
      attendance_enabled: preferences.attendanceEnabled,
      homework_enabled: preferences.homeworkEnabled,
      announcement_enabled: preferences.announcementEnabled,
      billing_enabled: preferences.billingEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' });
  if (error) throw new Error(`Could not save notification preferences: ${error.message}`);
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const raw = atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function updateDeviceSubscription(action: 'subscribe' | 'unsubscribe', subscription: PushSubscription): Promise<void> {
  const client = getClient();
  const { data, error } = await client.functions.invoke('parent-private-push', {
    body: {
      action,
      subscription: subscription.toJSON(),
    },
  });
  if (error) throw new Error(`Could not ${action === 'subscribe' ? 'register' : 'remove'} this device: ${error.message}`);
  if (data?.error) throw new Error(data.error);
}

async function removeParentPushSubscriptions(): Promise<void> {
  const client = getClient();
  const { data, error } = await client.functions.invoke('parent-private-push', {
    body: { action: 'disable-all' },
  });
  if (error) throw new Error(`Could not remove registered devices: ${error.message}`);
  if (data?.error) throw new Error(data.error);
}

export async function enableParentPushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('This browser does not support installed-app notifications.');
  }
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!publicKey) throw new Error('App notifications are not configured. Set VITE_VAPID_PUBLIC_KEY and deploy again.');

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Allow notifications in this browser to receive child updates.');

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(publicKey) as BufferSource,
    });

  await updateDeviceSubscription('subscribe', subscription);
  try {
    const preferences = await loadParentNotificationPreferences();
    await saveParentNotificationPreferences({ ...preferences, pushEnabled: true });
  } catch (error) {
    await updateDeviceSubscription('unsubscribe', subscription);
    await subscription.unsubscribe();
    throw error;
  }
}

export async function disableParentPushNotifications(): Promise<void> {
  const preferences = await loadParentNotificationPreferences();
  await saveParentNotificationPreferences({ ...preferences, pushEnabled: false });

  await removeParentPushSubscriptions();
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const removed = await subscription.unsubscribe();
  if (!removed) throw new Error('The browser did not remove the push subscription.');
}

export async function markParentNotificationsRead(): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('parent_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw new Error(`Could not mark child notifications as read: ${error.message}`);
}

export async function clearParentNotifications(): Promise<void> {
  const client = getClient();
  const { error } = await client.from('parent_notifications').delete().not('id', 'is', null);
  if (error) throw new Error(`Could not clear child notifications: ${error.message}`);
}

export async function sendPrivateParentNotification(params: {
  schoolId: string;
  studentId: string;
  eventId: string;
  category: 'attendance' | 'homework' | 'announcement' | 'billing';
  title: string;
  body: string;
}): Promise<{ stored: number; delivered: number }> {
  const client = getClient();
  const { data, error } = await client.functions.invoke('parent-private-push', {
    body: { action: 'notify', ...params },
  });
  if (error) throw new Error(`Could not send child-specific notification: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  if (typeof data?.failures === 'number' && data.failures > 0) {
    console.warn(`${data.failures} parent device notification(s) could not be delivered.`);
  }
  return {
    stored: typeof data?.stored === 'number' ? data.stored : 0,
    delivered: typeof data?.delivered === 'number' ? data.delivered : 0,
  };
}
