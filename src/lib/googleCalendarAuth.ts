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

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
] as const;

export interface GoogleCalendarAuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();
GOOGLE_CALENDAR_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
// Always let each teacher or student pick or switch to their own personal Google Account.
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
// Store the Workspace OAuth access token strictly in memory (never localStorage/sessionStorage).
let cachedAccessToken: string | null = null;

function mapFirebaseUser(user: User): GoogleCalendarAuthUser {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email || 'บัญชี Google',
    photoURL: user.photoURL || '',
  };
}

export function initGoogleCalendarAuth(
  onAuthSuccess?: (user: GoogleCalendarAuthUser, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(mapFirebaseUser(user), cachedAccessToken);
      return;
    }
    if (!user) {
      cachedAccessToken = null;
      onAuthFailure?.();
      return;
    }
    if (!isSigningIn) {
      cachedAccessToken = null;
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
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่ได้รับสิทธิ์เข้าถึง Google Calendar กรุณาลองเชื่อมต่อใหม่อีกครั้ง');
    }
    cachedAccessToken = credential.accessToken;
    return {
      user: mapFirebaseUser(result.user),
      accessToken: cachedAccessToken,
    };
  } finally {
    isSigningIn = false;
  }
}

export function getGoogleCalendarAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearGoogleCalendarAccessToken(): void {
  cachedAccessToken = null;
}

export function getCurrentGoogleCalendarUser(): GoogleCalendarAuthUser | null {
  if (!auth.currentUser || !cachedAccessToken) return null;
  return mapFirebaseUser(auth.currentUser);
}

export async function disconnectGoogleCalendarUser(): Promise<void> {
  cachedAccessToken = null;
  await signOut(auth);
}
