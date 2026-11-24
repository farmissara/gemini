import React from 'react';
import { Fingerprint, Lock, LogOut } from 'lucide-react';
import type { AppLanguage, AuthUser, School } from '../../types';
import { getPasskeyForUser } from '../../lib/webAuthn';

interface BiometricLockScreenProps {
  currentUser: AuthUser;
  activeSchool: School;
  lang: AppLanguage;
  isUnlockingBiometrics: boolean;
  biometricLockError: string | null;
  onUnlock: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({
  currentUser,
  activeSchool,
  lang,
  isUnlockingBiometrics,
  biometricLockError,
  onUnlock,
  onLogout,
}) => {
  const enrolledPk = getPasskeyForUser(currentUser.id);

  return (
    <main className="h-dvh overflow-hidden flex items-center justify-center bg-[var(--color-canvas)] p-5 text-[var(--color-text-body)]">
      <div className="max-w-sm w-full rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mx-auto flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-[var(--color-text-title)]">
            {lang === 'th' ? 'ล็อกหน้าจอด้วย FaceID / TouchID' : 'Biometric Lock Screen'}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {currentUser.fullNameTh || currentUser.fullNameEn} · {activeSchool.nameTh}
          </p>
        </div>

        {biometricLockError && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs text-left">
            {biometricLockError}
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={isUnlockingBiometrics || !enrolledPk}
            onClick={onUnlock}
            className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Fingerprint className="w-4.5 h-4.5" />
            <span>
              {isUnlockingBiometrics
                ? (lang === 'th' ? 'กำลังสแกนไบโอเมตริกซ์...' : 'Verifying Biometrics...')
                : (lang === 'th' ? `ปลดล็อกด้วย ${enrolledPk?.deviceLabel || 'FaceID / TouchID'}` : 'Unlock with FaceID / TouchID')}
            </span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-rose-50 dark:hover:bg-rose-950/50 text-[var(--color-text-body)] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ออกจากระบบ / สลับบัญชี' : 'Sign Out / Switch Account'}</span>
          </button>
        </div>
      </div>
    </main>
  );
};
