import { useEffect, useRef, useState } from 'react';
import type { AppLanguage, AuthUser } from '../../types';
import {
  clearBiometricSessionUnlock,
  enrollBiometricPasskey,
  getBiometricUnlockRemainingMinutes,
  getPasskeyForUser,
  getWebAuthnSupportInfo,
  isBiometricSessionUnlocked,
  type EnrolledBiometricPasskey,
  type WebAuthnSupportInfo,
  verifyBiometricPasskey,
} from '../../lib/webAuthn';

interface UseBiometricQuickGuardParams {
  currentUser: AuthUser | null;
  activeSchoolId: string;
  isStaffUser: boolean;
  lang: AppLanguage;
}

export function useBiometricQuickGuard({
  currentUser,
  activeSchoolId,
  isStaffUser,
  lang,
}: UseBiometricQuickGuardParams) {
  const [userPasskey, setUserPasskey] = useState<EnrolledBiometricPasskey | null>(() =>
    getPasskeyForUser(currentUser?.id)
  );
  const [webAuthnSupport, setWebAuthnSupport] = useState<WebAuthnSupportInfo | null>(null);
  const [biometricUnlocked, setBiometricUnlocked] = useState<boolean>(() => {
    const pk = getPasskeyForUser(currentUser?.id);
    if (!pk || !pk.protectQuickAttendance) return true;
    return isBiometricSessionUnlocked(currentUser?.id);
  });
  const [biometricUnlockMinutes, setBiometricUnlockMinutes] = useState<number>(() =>
    getBiometricUnlockRemainingMinutes(currentUser?.id)
  );
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [biometricNotice, setBiometricNotice] = useState<string | null>(null);
  const [showBiometricUnlockModal, setShowBiometricUnlockModal] = useState(false);
  const pendingBiometricActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getWebAuthnSupportInfo().then(setWebAuthnSupport).catch(() => {});
  }, []);

  useEffect(() => {
    const pk = getPasskeyForUser(currentUser?.id);
    setUserPasskey(pk);
    const unlocked =
      !isStaffUser || !pk || !pk.protectQuickAttendance || isBiometricSessionUnlocked(currentUser?.id);
    setBiometricUnlocked(unlocked);
    setBiometricUnlockMinutes(getBiometricUnlockRemainingMinutes(currentUser?.id));
  }, [currentUser?.id, isStaffUser]);

  useEffect(() => {
    if (!userPasskey?.protectQuickAttendance || !isStaffUser) return;
    const timer = window.setInterval(() => {
      const mins = getBiometricUnlockRemainingMinutes(currentUser?.id);
      setBiometricUnlockMinutes(mins);
      if (mins <= 0) {
        setBiometricUnlocked(false);
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [currentUser?.id, userPasskey?.protectQuickAttendance, isStaffUser]);

  const isQuickAttendanceLocked =
    isStaffUser && Boolean(userPasskey?.protectQuickAttendance) && !biometricUnlocked;

  const runWithBiometricGuard = (action: () => void) => {
    if (!isQuickAttendanceLocked) {
      action();
      return;
    }
    setBiometricError(null);
    pendingBiometricActionRef.current = action;
    setShowBiometricUnlockModal(true);
  };

  const handleBiometricVerify = async () => {
    if (!currentUser) return;
    setBiometricBusy(true);
    setBiometricError(null);
    try {
      const res = await verifyBiometricPasskey({ userId: currentUser.id });
      setUserPasskey(res.passkey);
      setBiometricUnlocked(true);
      setBiometricUnlockMinutes(getBiometricUnlockRemainingMinutes(currentUser.id) || 15);
      setShowBiometricUnlockModal(false);
      setBiometricNotice(
        lang === 'th'
          ? 'ยืนยันตัวตน FaceID / TouchID สำเร็จ (ปลดล็อก 15 นาที)'
          : 'Biometric verification succeeded (unlocked for 15 min)'
      );
      window.setTimeout(() => setBiometricNotice(null), 4000);
      const pending = pendingBiometricActionRef.current;
      pendingBiometricActionRef.current = null;
      if (pending) pending();
    } catch (err) {
      setBiometricError(err instanceof Error ? err.message : String(err));
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleEnrollQuickBiometric = async () => {
    if (!currentUser) return;
    setBiometricBusy(true);
    setBiometricError(null);
    try {
      const enrolled = await enrollBiometricPasskey({
        userId: currentUser.id,
        email: currentUser.email,
        fullNameTh: currentUser.fullNameTh,
        fullNameEn: currentUser.fullNameEn,
        role: currentUser.role,
        schoolId: activeSchoolId,
        protectQuickAttendance: isStaffUser,
      });
      setUserPasskey(enrolled);
      setBiometricUnlocked(true);
      setBiometricUnlockMinutes(15);
      setBiometricNotice(
        lang === 'th'
          ? `เปิดใช้งาน ${enrolled.deviceLabel} สำหรับเช็คชื่อด่วนแล้ว`
          : `Enrolled ${enrolled.deviceLabel} for quick attendance`
      );
      window.setTimeout(() => setBiometricNotice(null), 4500);
    } catch (err) {
      setBiometricError(err instanceof Error ? err.message : String(err));
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleLockQuickAttendanceNow = () => {
    if (!currentUser) return;
    clearBiometricSessionUnlock(currentUser.id);
    setBiometricUnlocked(false);
    setBiometricUnlockMinutes(0);
    setBiometricNotice(
      lang === 'th' ? 'ล็อกโมดูลเช็คชื่อด่วนด้วยไบโอเมตริกซ์แล้ว' : 'Quick attendance locked'
    );
    window.setTimeout(() => setBiometricNotice(null), 3000);
  };

  const handleCancelBiometricModal = () => {
    pendingBiometricActionRef.current = null;
    setShowBiometricUnlockModal(false);
  };

  return {
    userPasskey,
    webAuthnSupport,
    biometricUnlocked,
    biometricUnlockMinutes,
    biometricBusy,
    biometricError,
    biometricNotice,
    showBiometricUnlockModal,
    isQuickAttendanceLocked,
    runWithBiometricGuard,
    handleBiometricVerify,
    handleEnrollQuickBiometric,
    handleLockQuickAttendanceNow,
    handleCancelBiometricModal,
  };
}
