// Offline-First Local Storage Queue & Cloud Synchronization Manager
// Automatically captures actions when internet is disconnected (field trips, remote clinics, etc.)

export type OfflineActionType = 
  | 'attendance'
  | 'period_attendance'
  | 'leave_request'
  | 'behavior'
  | 'grade'
  | 'health_visit'
  | 'homework_submission';

export interface OfflineQueueItem {
  id: string;
  actionType: OfflineActionType;
  schoolId: string;
  description: string;
  payload: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  lastError?: string;
}

const STORAGE_KEY_OFFLINE_QUEUE = 'eduverse_offline_sync_queue';

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(items: OfflineQueueItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('eduverse:offline-queue-changed', { detail: items }));
  } catch (err) {
    console.warn('Failed to save offline queue:', err);
  }
}

export function enqueueOfflineAction(params: {
  actionType: OfflineActionType;
  schoolId: string;
  description: string;
  payload: any;
}): OfflineQueueItem {
  const payload = params.payload;
  const existing = getOfflineQueue().find((item) => {
    if (item.actionType !== params.actionType || item.schoolId !== params.schoolId) return false;
    if (params.actionType === 'attendance') {
      const queuedDate = item.payload?.extra?.date || new Date(item.createdAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
      return Date.now() - new Date(item.createdAt).getTime() < 10_000 &&
        item.payload?.studentId === payload?.studentId &&
        item.payload?.status === payload?.status &&
        item.payload?.extra?.recordType === payload?.extra?.recordType &&
        queuedDate === (payload?.extra?.date || queuedDate) &&
        item.payload?.remarks === payload?.remarks;
    }
    return params.actionType === 'health_visit' && item.payload?.id === payload?.id;
  });
  if (existing) return existing;

  const item: OfflineQueueItem = {
    id: `off-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actionType: params.actionType,
    schoolId: params.schoolId,
    description: params.description,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };

  const queue = getOfflineQueue();
  saveOfflineQueue([item, ...queue]);
  return item;
}

export function removeOfflineItem(id: string): void {
  const queue = getOfflineQueue();
  saveOfflineQueue(queue.filter(q => q.id !== id));
}

export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}

export function isOnlineNow(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

// Process and sync pending queue when online
export async function flushOfflineQueue(
  handler: (item: OfflineQueueItem) => Promise<boolean>
): Promise<{ syncedCount: number; failedCount: number }> {
  const queue = getOfflineQueue().filter(item => item.status === 'pending' || item.status === 'failed');
  if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

  let syncedCount = 0;
  let failedCount = 0;
  for (const item of queue) {
    const currentQueue = getOfflineQueue();
    const idx = currentQueue.findIndex(q => q.id === item.id);
    if (idx < 0) continue;

    try {
      currentQueue[idx] = { ...currentQueue[idx], status: 'syncing' };
      saveOfflineQueue(currentQueue);

      const success = await handler(item);
      if (success) {
        syncedCount++;
        // Read the latest queue before changing it so concurrent updates and
        // previous successful removals are not accidentally overwritten.
        saveOfflineQueue(getOfflineQueue().filter(q => q.id !== item.id));
      } else {
        failedCount++;
        saveOfflineQueue(getOfflineQueue().map((queued) => queued.id === item.id
          ? { ...queued, status: 'failed', retryCount: queued.retryCount + 1 }
          : queued));
      }
    } catch (err) {
      failedCount++;
      const message = err instanceof Error ? err.message : String(err);
      saveOfflineQueue(getOfflineQueue().map((queued) => queued.id === item.id
        ? { ...queued, status: 'failed', retryCount: queued.retryCount + 1, lastError: message }
        : queued));
    }
  }

  return { syncedCount, failedCount };
}
