import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { AppLanguage } from '../types';

interface OfflineIndicatorProps {
  lang?: AppLanguage;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang = 'th' }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 text-white px-3.5 py-2 text-xs font-semibold shadow-lg shadow-amber-900/20 animate-pulse">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        {lang === 'th'
          ? 'โหมดออฟไลน์ — สามารถเช็กชื่อและดูข้อมูลแคชในเครื่องได้'
          : 'Offline Mode — Operating on cached local data'}
      </span>
    </div>
  );
};
