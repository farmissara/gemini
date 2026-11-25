import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
] as const;

export const GOOGLE_CALENDAR_SCOPES = GOOGLE_WORKSPACE_SCOPES;

export const FIREBASE_AUTHORIZED_DOMAINS_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
export const GCP_OAUTH_CREDENTIALS_URL = `https://console.cloud.google.com/apis/credentials?project=${firebaseConfig.projectId}`;

export interface GoogleCalendarAuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface GisTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GisError {
  type?: string;
  message?: string;
}

interface GisWindow extends Window {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          prompt?: string;
          callback: (response: GisTokenResponse) => void;
          error_callback?: (error: GisError) => void;
        }) => {
          requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
        };
        revoke?: (token: string, done?: () => void) => void;
      };
    };
  };
}

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();
GOOGLE_WORKSPACE_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
// Always let each teacher, admin, or student pick or switch to their own Google Account.
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
// Store the Workspace OAuth access token strictly in memory (never localStorage/sessionStorage).
let cachedAccessToken: string | null = null;
let cachedUser: GoogleCalendarAuthUser | null = null;
let authSource: 'firebase' | 'gis' | null = null;
let gisScriptLoadPromise: Promise<void> | null = null;

function mapFirebaseUser(user: User): GoogleCalendarAuthUser {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email || 'บัญชี Google',
    photoURL: user.photoURL || '',
  };
}

function getFirebaseAuthErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code?: unknown }).code || '');
  }
  return '';
}

function loadGoogleIdentityServicesScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity Services requires a browser environment'));
  }
  const gisWin = window as GisWindow;
  if (gisWin.google?.accounts?.oauth2?.initTokenClient) {
    return Promise.resolve();
  }
  if (gisScriptLoadPromise) return gisScriptLoadPromise;

  gisScriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      if ((window as GisWindow).google?.accounts?.oauth2?.initTokenClient) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => {
          gisScriptLoadPromise = null;
          reject(new Error('โหลดสคริปต์ Google Identity Services ไม่สำเร็จ'));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    const timeoutId = window.setTimeout(() => {
      gisScriptLoadPromise = null;
      reject(new Error('หมดเวลาเชื่อมต่อ Google Identity Services'));
    }, 8000);
    script.onload = () => {
      window.clearTimeout(timeoutId);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      gisScriptLoadPromise = null;
      reject(new Error('โหลดสคริปต์ Google Identity Services ไม่สำเร็จ'));
    };
    document.head.appendChild(script);
  });

  return gisScriptLoadPromise;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleCalendarAuthUser> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const profile = (await res.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      };
      return {
        uid: profile.sub || `gis:${profile.email || 'google'}`,
        email: profile.email || '',
        displayName: profile.name || profile.email || 'บัญชี Google',
        photoURL: profile.picture || '',
      };
    }
  } catch {
    // Fallback below if userinfo scope wasn't returned explicitly
  }
  return {
    uid: 'gis:google-user',
    email: '',
    displayName: 'บัญชี Google ที่เชื่อมต่อแล้ว',
    photoURL: '',
  };
}

async function signInWithGisFallback(): Promise<{
  user: GoogleCalendarAuthUser;
  accessToken: string;
}> {
  const clientId = (firebaseConfig as { oAuthClientId?: string }).oAuthClientId;
  if (!clientId) {
    throw new Error('ไม่พบค่า oAuthClientId ในการตั้งค่าโปรเจ็กต์');
  }
  await loadGoogleIdentityServicesScript();
  const oauth2 = (window as GisWindow).google?.accounts?.oauth2;
  if (!oauth2?.initTokenClient) {
    throw new Error('เบราว์เซอร์ยังไม่พร้อมสำหรับ Google Identity Services');
  }

  const accessToken = await new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: `${GOOGLE_WORKSPACE_SCOPES.join(' ')} openid email profile`,
      prompt: 'select_account',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'ไม่ได้รับสิทธิ์เข้าถึง Google'));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (err) => {
        reject(new Error(err.message || err.type || 'popup_closed'));
      },
    });
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });

  const user = await fetchGoogleUserInfo(accessToken);
  cachedAccessToken = accessToken;
  cachedUser = user;
  authSource = 'gis';
  return { user, accessToken };
}

export class GoogleUnauthorizedDomainError extends Error {
  readonly code = 'auth/unauthorized-domain';
  readonly hostname: string;
  readonly origin: string;
  readonly projectId: string;

  constructor(hostname: string, origin: string, projectId: string) {
    super(
      `โดเมนปัจจุบัน (${hostname}) ยังไม่ได้รับอนุญาตให้เชื่อมต่อ Google OAuth (auth/unauthorized-domain) — กรุณาเพิ่ม "${hostname}" ใน Firebase Console → Authentication → Settings → Authorized domains (โปรเจ็กต์ ${projectId}) และ Google Cloud OAuth Authorized JavaScript origins`
    );
    this.name = 'GoogleUnauthorizedDomainError';
    this.hostname = hostname;
    this.origin = origin;
    this.projectId = projectId;
  }
}

export function initGoogleCalendarAuth(
  onAuthSuccess?: (user: GoogleCalendarAuthUser, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (authSource === 'gis' && cachedUser && cachedAccessToken) {
      onAuthSuccess?.(cachedUser, cachedAccessToken);
      return;
    }
    if (user && cachedAccessToken) {
      const mapped = mapFirebaseUser(user);
      cachedUser = mapped;
      authSource = 'firebase';
      onAuthSuccess?.(mapped, cachedAccessToken);
      return;
    }
    if (!user && !isSigningIn) {
      cachedAccessToken = null;
      cachedUser = null;
      authSource = null;
      onAuthFailure?.();
      return;
    }
    if (!isSigningIn && authSource !== 'gis') {
      cachedAccessToken = null;
      cachedUser = null;
      authSource = null;
      onAuthFailure?.();
    }
  });
}

export async function signInGoogleCalendarUser(): Promise<{
  user: GoogleCalendarAuthUser;
  accessToken: string;
}> {
  isSigningIn = true;
  try {
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('ไม่ได้รับสิทธิ์เข้าถึง Google กรุณาลองเชื่อมต่อใหม่อีกครั้ง');
      }
      const mapped = mapFirebaseUser(result.user);
      cachedAccessToken = credential.accessToken;
      cachedUser = mapped;
      authSource = 'firebase';
      return {
        user: mapped,
        accessToken: cachedAccessToken,
      };
    } catch (firebaseErr) {
      const code = getFirebaseAuthErrorCode(firebaseErr);
      if (code === 'auth/unauthorized-domain') {
        try {
          return await signInWithGisFallback();
        } catch {
          const hostname =
            typeof window !== 'undefined' ? window.location.hostname : 'unknown-domain';
          const origin =
            typeof window !== 'undefined' ? window.location.origin : '';
          throw new GoogleUnauthorizedDomainError(
            hostname,
            origin,
            firebaseConfig.projectId
          );
        }
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตป๊อปอัปสำหรับเว็บนี้แล้วลองใหม่อีกครั้ง');
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('ยกเลิกการเลือกบัญชี Google กรุณากดปุ่มเชื่อมต่อใหม่อีกครั้งเมื่อพร้อม');
      }
      throw firebaseErr;
    }
  } finally {
    isSigningIn = false;
  }
}

export function getGoogleCalendarAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearGoogleCalendarAccessToken(): void {
  cachedAccessToken = null;
  cachedUser = null;
  authSource = null;
}

export function getCurrentGoogleCalendarUser(): GoogleCalendarAuthUser | null {
  if (!cachedAccessToken) return null;
  if (authSource === 'gis') return cachedUser;
  if (auth.currentUser) return mapFirebaseUser(auth.currentUser);
  return cachedUser;
}

export async function disconnectGoogleCalendarUser(): Promise<void> {
  const tokenToRevoke = cachedAccessToken;
  const previousSource = authSource;
  cachedAccessToken = null;
  cachedUser = null;
  authSource = null;

  if (previousSource === 'gis' && tokenToRevoke && typeof window !== 'undefined') {
    try {
      (window as GisWindow).google?.accounts?.oauth2?.revoke?.(tokenToRevoke);
    } catch {
      // Ignore revoke error on disconnect
    }
  }
  await signOut(auth).catch(() => undefined);
}
