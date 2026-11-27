import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, Trash2, Database } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getOfflineQueueForUser, flushOfflineQueue, clearOfflineQueue, OfflineQueueItem } from '../../lib/offlineSync';
import { AppLanguage } from '../../types';
import { BaseModal } from '../common/BaseModal';

interface OfflineIndicatorProps {
  lang?: AppLanguage;
  onSyncItem?: (item: OfflineQueueItem) => Promise<boolean>;
  isUsingCachedData?: boolean;
  currentUserId?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  lang = 'th',
  onSyncItem,
  isUsingCachedData = false,
  currentUserId,
}) => {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    setQueue(getOfflineQueueForUser(currentUserId));

    const handler = () => {
      setQueue(getOfflineQueueForUser(currentUserId));
    };
    window.addEventListener('eduverse:offline-queue-changed', handler);
    return () => window.removeEventListener('eduverse:offline-queue-changed', handler);
  }, [currentUserId]);

  // When coming back online, auto-sync if items are pending
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      handleSyncNow();
    }
  }, [isOnline]);

  // Retry queued writes periodically even when the browser stayed online but
  // the Supabase service itself was temporarily unavailable.
  useEffect(() => {
    if (!isOnline || !queue.some((item) => item.status === 'pending' || item.status === 'failed')) return;
    const intervalId = window.setInterval(() => {
      void handleSyncNow();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [isOnline, queue, isSyncing]);

  const handleSyncNow = async () => {
    if (queue.length === 0 || isSyncing) return;
    setIsSyncing(true);

    try {
      const { syncedCount } = await flushOfflineQueue(async (item) => {
        if (onSyncItem) {
          return await onSyncItem(item);
        }
        // Simulated standard save
        await new Promise(r => setTimeout(r, 400));
        return true;
      }, currentUserId);

      if (syncedCount > 0) {
        setSyncToast(lang === 'th' ? `ซิงค์ข้อมูลออฟไลน์ ${syncedCount} รายการขึ้นระบบเรียบร้อยแล้ว` : `Successfully synced ${syncedCount} offline records.`);
        setTimeout(() => setSyncToast(null), 4000);
      }
    } finally {
      setIsSyncing(false);
      setQueue(getOfflineQueueForUser(currentUserId));
    }
  };

  const pendingCount = queue.filter(q => q.status === 'pending' || q.status === 'failed').length;

  return (
    <>
      {/* Toast Notification when Sync completes */}
      {syncToast && (
        <div className="no-print fixed bottom-16 left-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold shadow-2xl border border-emerald-500 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Floating Indicator Banner: Offline or Pending Queue */}
      {(!isOnline || pendingCount > 0 || isUsingCachedData) && (
        <div className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 p-2 sm:px-3 sm:py-2 text-xs font-semibold shadow-2xl">
          {isUsingCachedData ? (
            <div className="flex items-center gap-2 text-amber-300">
              <Database className="w-4 h-4 shrink-0" />
              <span>{lang === 'th' ? 'กำลังใช้ข้อมูลสำรองในเครื่อง · ข้อมูลอาจไม่ล่าสุด' : 'Using local backup · data may be stale'}</span>
            </div>
          ) : !isOnline ? (
            <div className="flex items-center gap-2 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>{lang === 'th' ? 'โหมดออฟไลน์ (ไม่มีเน็ต)' : 'Offline Mode'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400">
              <Wifi className="w-4 h-4 shrink-0" />
              <span>{lang === 'th' ? 'ออนไลน์แล้ว' : 'Online'}</span>
            </div>
          )}

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setShowQueueModal(true)}
              className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold hover:bg-amber-500/30 transition cursor-pointer"
            >
              {pendingCount} {lang === 'th' ? 'รายการรอซิงค์' : 'pending'}
            </button>
          )}

          {isOnline && pendingCount > 0 && (
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? (lang === 'th' ? 'กำลังส่ง...' : 'Syncing...') : (lang === 'th' ? 'ซิงค์ทันที' : 'Sync Now')}</span>
            </button>
          )}
        </div>
      )}

      {/* Queue Inspector Modal */}
      <BaseModal
        isOpen={showQueueModal}
        onClose={() => setShowQueueModal(false)}
        title={lang === 'th' ? 'คิวข้อมูลออฟไลน์ที่รอซิงค์' : 'Offline Pending Queue'}
        icon={<Database className="w-5 h-5 text-amber-500" />}
        maxWidthClass="max-w-md"
        heightClass="max-h-[80dvh]"
        showMobileHandle
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-2"
        footerClassName="!justify-between text-xs"
        footer={
          <>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearOfflineQueue(currentUserId);
                  setQueue([]);
                }}
                className="text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ล้างคิวทั้งหมด' : 'Clear Queue'}</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {isOnline && queue.length > 0 && (
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold transition cursor-pointer"
                >
                  {isSyncing ? (lang === 'th' ? 'กำลังซิงค์...' : 'Syncing...') : (lang === 'th' ? 'ซิงค์ทันที' : 'Sync All')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowQueueModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] font-semibold hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                {lang === 'th' ? 'ปิด' : 'Close'}
              </button>
            </div>
          </>
        }
      >
              {queue.length === 0 ? (
                <p className="text-center py-8 text-xs text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'ไม่มีข้อมูลค้างซิงค์ ข้อมูลทั้งหมดเป็นปัจจุบันแล้ว' : 'Queue is empty. Everything is up to date.'}
                </p>
              ) : (
                queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        {item.actionType}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                        {new Date(item.createdAt).toLocaleTimeString('th-TH')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-title)] font-medium">
                      {item.description}
                    </p>
                    {item.lastError && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400">
                        {item.lastError}
                      </p>
                    )}
                  </div>
                ))
              )}
      </BaseModal>
    </>
  );
};
