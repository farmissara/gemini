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
  const item: OfflineQueueItem = {
    id: `off-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actionType: params.actionType,
    schoolId: params.schoolId,
    description: params.description,
    payload: params.payload,
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
  const updatedQueue = [...getOfflineQueue()];

  for (const item of queue) {
    const idx = updatedQueue.findIndex(q => q.id === item.id);
    if (idx < 0) continue;

    try {
      updatedQueue[idx].status = 'syncing';
      saveOfflineQueue(updatedQueue);

      const success = await handler(item);
      if (success) {
        syncedCount++;
        // Remove successfully synced item from queue
        const fresh = getOfflineQueue().filter(q => q.id !== item.id);
        saveOfflineQueue(fresh);
      } else {
        failedCount++;
        updatedQueue[idx].status = 'failed';
        updatedQueue[idx].retryCount += 1;
        saveOfflineQueue(updatedQueue);
      }
    } catch (err) {
      failedCount++;
      updatedQueue[idx].status = 'failed';
      updatedQueue[idx].retryCount += 1;
      updatedQueue[idx].lastError = err instanceof Error ? err.message : String(err);
      saveOfflineQueue(updatedQueue);
    }
  }

  return { syncedCount, failedCount };
}
