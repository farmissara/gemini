import { useMemo } from 'react';

export interface DeepLinkParams {
  subTab: 'selfie_mobile' | 'nfc_tap' | 'leave_request' | 'teacher_proxy' | 'period_checkin';
  courseId?: string;
  periodNumber?: number;
  date?: string;
  code?: string;
  expiresAt?: number;
  token?: string;
  checkType?: 'check_in' | 'check_out';
}

export function parseDeepLinkParamsFromWindow(): DeepLinkParams | null {
  if (typeof window === 'undefined') return null;
  try {
    const sp = new URLSearchParams(window.location.search);
    const tab = sp.get('tab');
    const subTab = sp.get('subTab');
    const courseId = sp.get('courseId') || undefined;
    const periodStr = sp.get('period');
    const date = sp.get('date') || undefined;
    const code = sp.get('code') || undefined;
    const expStr = sp.get('exp');
    const token = sp.get('token') || undefined;
    const checkTypeParam = sp.get('checkType');
    const checkType: 'check_in' | 'check_out' | undefined =
      checkTypeParam === 'check_out' ? 'check_out' : checkTypeParam === 'check_in' ? 'check_in' : undefined;
    const expiresAt = expStr && !Number.isNaN(Number(expStr)) ? Number(expStr) : undefined;
    const periodNumber = periodStr && !Number.isNaN(Number(periodStr)) ? Number(periodStr) : undefined;
    const isPeriodDeepLink = tab === 'mobile_checkin' || subTab === 'period_checkin' || Boolean(courseId);
    if (!isPeriodDeepLink) return null;
    return {
      subTab: (subTab === 'leave_request' || subTab === 'period_checkin' || subTab === 'teacher_proxy' || subTab === 'nfc_tap'
        ? subTab
        : 'period_checkin') as DeepLinkParams['subTab'],
      courseId,
      periodNumber,
      date,
      code,
      expiresAt,
      token,
      checkType,
    };
  } catch {
    return null;
  }
}

export function useDeepLinkParams(): DeepLinkParams | null {
  return useMemo(() => parseDeepLinkParamsFromWindow(), []);
}
