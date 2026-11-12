// Web Push Notification & In-App Alert System for EduVerse
// Supports Android (Chrome), iOS 16.4+ (Safari Web Push), and Desktop browsers

export interface EduVerseNotification {
  id: string;
  title: string;
  body: string;
  category: 'attendance' | 'homework' | 'announcement' | 'billing' | 'system';
  timestamp: string;
  icon?: string;
  url?: string;
  read: boolean;
  priority?: 'normal' | 'urgent';
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  categories: {
    attendance: boolean;
    homework: boolean;
    announcement: boolean;
    billing: boolean;
  };
}

const STORAGE_KEY_NOTIFICATIONS = 'eduverse_notifications_history';
const STORAGE_KEY_SETTINGS = 'eduverse_notification_settings';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  sound: true,
  vibrate: true,
  categories: {
    attendance: true,
    homework: true,
    announcement: true,
    billing: true,
  },
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) } : DEFAULT_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save notification settings:', err);
  }
}

export function getStoredNotifications(): EduVerseNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredNotifications(list: EduVerseNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep last 100 notifications
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list.slice(0, 100)));
  } catch (err) {
    console.warn('Failed to save notifications history:', err);
  }
}

// Check if browser supports Web Notifications
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Check current browser permission state ('default' | 'granted' | 'denied')
export function getPushPermissionState(): NotificationPermission {
  if (!isPushNotificationSupported()) return 'denied';
  return Notification.permission;
}

// Request permission from the user
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

// Audio synthesizer for notification chime
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Note 1: E5 (659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: B5 (987.77Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Ignore autoplay or audio context errors
  }
}

// Dispatch Web Push + In-App notification
export async function sendEduVerseNotification(params: {
  title: string;
  body: string;
  category: 'attendance' | 'homework' | 'announcement' | 'billing' | 'system';
  url?: string;
  priority?: 'normal' | 'urgent';
  tag?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<EduVerseNotification> {
  const settings = getNotificationSettings();
  const timeNow = new Date().toISOString();
  
  const notifItem: EduVerseNotification = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: params.title,
    body: params.body,
    category: params.category,
    timestamp: timeNow,
    icon: '/pwa-192x192.png',
    url: params.url || '/',
    read: false,
    priority: params.priority || 'normal',
    metadata: params.metadata,
  };

  // 1. Record in local notification history
  const currentHistory = getStoredNotifications();
  saveStoredNotifications([notifItem, ...currentHistory]);

  // Dispatch custom window event so UI badges update instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eduverse:notification', { detail: notifItem }));
  }

  // 2. Play sound if configured
  if (settings.sound) {
    playNotificationChime();
  }

  // 3. Trigger haptic vibration on mobile
  if (settings.vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([120, 80, 120]);
    } catch {
      // Ignore vibration errors
    }
  }

  // 4. Fire Web Push Notification (Desktop / Android / iOS Standalone)
  if (
    settings.enabled &&
    (params.category === 'system' || settings.categories[params.category]) &&
    isPushNotificationSupported() &&
    Notification.permission === 'granted'
  ) {
    try {
      // If service worker registration is available, prefer registration.showNotification
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          registration.showNotification(params.title, {
            body: params.body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: notifItem.id,
            data: { url: notifItem.url },
          } as any);
          return notifItem;
        }
      }

      // Fallback to standard Notification constructor
      new Notification(params.title, {
        body: params.body,
        icon: '/pwa-192x192.png',
      });
    } catch (err) {
      console.warn('Native notification failed, stored in in-app notification center:', err);
    }
  }

  return notifItem;
}
