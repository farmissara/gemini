import { useEffect, useRef } from 'react';
import type { AuthUser, School, UserRole } from '../../types';
import { emitAppToast } from '../../components/common/ToastProvider';
import {
  AUTO_BACKUP_UPDATED_EVENT,
  executeGoogleDriveBackupRun,
  getBangkokClockInfo,
  parseScheduleMinutes,
  readAutoBackupScheduleConfig,
  updateAutoBackupScheduleConfig,
} from '../../lib/autoBackupScheduler';
import {
  clearGoogleCalendarAccessToken,
  getGoogleCalendarAccessToken,
} from '../../lib/googleCalendarAuth';
import { GoogleDriveAuthExpiredError } from '../../lib/googleDriveBackup';

interface UseAutoDriveBackupWatcherOptions {
  currentUser: AuthUser | null;
  currentRole: UserRole;
  activeSchoolId: string;
  schools: School[];
  isDataReady: boolean;
}

export function useAutoDriveBackupWatcher({
  currentUser,
  currentRole,
  activeSchoolId,
  schools,
  isDataReady,
}: UseAutoDriveBackupWatcherOptions) {
  const isRunningRef = useRef(false);
  const promptedDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser || !isDataReady || !['admin', 'super_admin'].includes(currentRole)) {
      return;
    }

    const isSuperAdmin = currentRole === 'super_admin';

    const evaluateSchedule = async () => {
      if (isRunningRef.current) return;
      const cfg = readAutoBackupScheduleConfig(isSuperAdmin);
      if (!cfg.enabled) return;

      const { dateStr, minutesOfDay } = getBangkokClockInfo();
      const targetMinutes = parseScheduleMinutes(cfg.scheduleTime || '00:00');
      // Only fire once per Bangkok date once current time >= scheduled time (default 00:00)
      if (minutesOfDay < targetMinutes || cfg.lastRunDate === dateStr) {
        return;
      }

      const accessToken = getGoogleCalendarAccessToken();
      if (!accessToken) {
        if (cfg.lastRunStatus !== 'needs_google_auth' || promptedDateRef.current !== dateStr) {
          promptedDateRef.current = dateStr;
          updateAutoBackupScheduleConfig(
            {
              lastRunStatus: 'needs_google_auth',
              lastRunAt: new Date().toISOString(),
              lastRunMessage: `ถึงเวลาสำรองข้อมูลอัตโนมัติ (${cfg.scheduleTime} น.) แล้ว กรุณาเชื่อมต่อ Google Drive ในศูนย์สำรองข้อมูลเพื่ออัปโหลดไฟล์`,
            },
            isSuperAdmin
          );
          emitAppToast({
            tone: 'warning',
            title: 'ถึงเวลาสำรองข้อมูลลง Google Drive',
            message: 'กรุณาเชื่อมต่อ Google Drive ในศูนย์สำรองข้อมูลเพื่ออัปโหลดไฟล์สำรองประจำวัน',
          });
        }
        return;
      }

      isRunningRef.current = true;
      try {
        const result = await executeGoogleDriveBackupRun({
          googleAccessToken: accessToken,
          isSuperAdmin,
          activeSchoolId,
          schools,
          mode: isSuperAdmin ? cfg.scopeMode : 'per_school',
          scheduleKind: 'auto_midnight',
        });

        const uploadedCount = result.uploadedFiles.length;
        const failCount = result.failures.length;

        updateAutoBackupScheduleConfig(
          {
            lastRunDate: dateStr,
            lastRunAt: new Date().toISOString(),
            lastRunStatus: failCount > 0 && uploadedCount === 0 ? 'error' : 'success',
            lastRunFilesCount: uploadedCount,
            lastRunMessage:
              failCount > 0
                ? `อัปโหลดสำเร็จ ${uploadedCount} ไฟล์, ไม่สำเร็จ ${failCount} รายการ`
                : `สำรองข้อมูลอัตโนมัติลง Google Drive สำเร็จ (${uploadedCount} ไฟล์)`,
          },
          isSuperAdmin
        );

        if (uploadedCount > 0) {
          emitAppToast({
            tone: 'success',
            title: 'สำรองข้อมูลลง Google Drive อัตโนมัติสำเร็จ',
            message: `บันทึกไฟล์สำรอง ${uploadedCount} ไฟล์ลงโฟลเดอร์ BaanPakKru-Backups แล้ว`,
          });
        }
      } catch (err) {
        if (err instanceof GoogleDriveAuthExpiredError) {
          clearGoogleCalendarAccessToken();
          updateAutoBackupScheduleConfig(
            {
              lastRunStatus: 'needs_google_auth',
              lastRunAt: new Date().toISOString(),
              lastRunMessage: err.message,
            },
            isSuperAdmin
          );
        } else {
          updateAutoBackupScheduleConfig(
            {
              lastRunStatus: 'error',
              lastRunAt: new Date().toISOString(),
              lastRunMessage: err instanceof Error ? err.message : String(err),
            },
            isSuperAdmin
          );
        }
      } finally {
        isRunningRef.current = false;
      }
    };

    void evaluateSchedule();
    const timer = window.setInterval(() => {
      void evaluateSchedule();
    }, 30_000);

    const handleConfigChange = () => {
      void evaluateSchedule();
    };
    window.addEventListener(AUTO_BACKUP_UPDATED_EVENT, handleConfigChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(AUTO_BACKUP_UPDATED_EVENT, handleConfigChange);
    };
  }, [currentUser?.id, currentRole, activeSchoolId, schools, isDataReady]);
}
