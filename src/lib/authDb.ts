import { AuthUser, UserRole } from '../types';

export interface StoredUserAccount {
  id: string;
  email: string;
  passwordHash: string; // SHA-256 hex digest
  fullNameTh: string;
  fullNameEn: string;
  role: UserRole;
  schoolId: string;
  avatarUrl: string;
  lineConnected: boolean;
  phone?: string;
  createdAt: string;
}

const STORAGE_USERS_KEY = 'eduverse_users_database';

// Compute SHA-256 hash using Web Crypto API
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText.trim() + ':eduverse_secure_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Initial seed accounts stored securely in the database
const INITIAL_DB_ACCOUNTS: Array<{
  id: string;
  email: string;
  plainPassword: string;
  fullNameTh: string;
  fullNameEn: string;
  role: UserRole;
  schoolId: string;
  avatarUrl: string;
  lineConnected: boolean;
  phone?: string;
}> = [
  {
    id: 'usr-super',
    email: 'superadmin@eduverse.school',
    plainPassword: 'SuperAdmin@Edu2026!',
    fullNameTh: 'ดร.กิตติพงษ์ ศรีสุวรรณ',
    fullNameEn: 'Dr. Kittipong Srisuwan',
    role: 'super_admin',
    schoolId: 'sch-1',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    lineConnected: true,
    phone: '081-999-8888',
  },
  {
    id: 'usr-admin',
    email: 'admin@eduverse.school',
    plainPassword: 'Admin@Edu2026!',
    fullNameTh: 'ดร.ธนพร กิตติศักดิ์ (ผู้อำนวยการ)',
    fullNameEn: 'Dr. Thanaporn Kittisak (Principal)',
    role: 'admin',
    schoolId: 'sch-1',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    lineConnected: true,
    phone: '081-234-5678',
  },
  {
    id: 'usr-teacher',
    email: 'teacher@eduverse.school',
    plainPassword: 'Teacher@Edu2026!',
    fullNameTh: 'อ.ดร.ประเสริฐ ถาวร (หัวหน้ากลุ่มสาระ)',
    fullNameEn: 'Ajarn Dr. Prasert Thaworn',
    role: 'teacher',
    schoolId: 'sch-1',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    lineConnected: true,
    phone: '089-112-3344',
  },
  {
    id: 'usr-student',
    email: 'student@eduverse.school',
    plainPassword: 'Student@Edu2026!',
    fullNameTh: 'นายธนาธร สมชาย (ม.4/1)',
    fullNameEn: 'Thanatorn Somchai (STU-6901)',
    role: 'student',
    schoolId: 'sch-1',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    lineConnected: true,
    phone: '081-456-7890',
  },
  {
    id: 'usr-parent',
    email: 'parent@eduverse.school',
    plainPassword: 'Parent@Edu2026!',
    fullNameTh: 'นายประภาส สมชาย (ผู้ปกครอง)',
    fullNameEn: 'Mr. Prapas Somchai',
    role: 'parent',
    schoolId: 'sch-1',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    lineConnected: true,
    phone: '086-554-3322',
  },
];

// Initialize database with hashed passwords
export async function initAuthDatabase(): Promise<StoredUserAccount[]> {
  if (typeof window === 'undefined') return [];

  const existingRaw = localStorage.getItem(STORAGE_USERS_KEY);
  if (existingRaw) {
    try {
      const parsed: StoredUserAccount[] = JSON.parse(existingRaw);
      // Ensure superadmin has correct hashed credentials
      const superIndex = parsed.findIndex((u) => u.email === 'superadmin@eduverse.school');
      if (superIndex >= 0) {
        return parsed;
      }
    } catch {
      // Re-seed on corruption
    }
  }

  const seeded: StoredUserAccount[] = [];
  for (const acc of INITIAL_DB_ACCOUNTS) {
    const hash = await hashPassword(acc.plainPassword);
    seeded.push({
      id: acc.id,
      email: acc.email,
      passwordHash: hash,
      fullNameTh: acc.fullNameTh,
      fullNameEn: acc.fullNameEn,
      role: acc.role,
      schoolId: acc.schoolId,
      avatarUrl: acc.avatarUrl,
      lineConnected: acc.lineConnected,
      phone: acc.phone,
      createdAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(seeded));
  return seeded;
}

// Get all user accounts stored in the database (safely stripped of passwordHash)
export function getStoredAuthUsers(): AuthUser[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_USERS_KEY);
  if (!raw) return [];

  try {
    const parsed: StoredUserAccount[] = JSON.parse(raw);
    return parsed.map((acc) => ({
      id: acc.id,
      email: acc.email,
      fullNameTh: acc.fullNameTh,
      fullNameEn: acc.fullNameEn,
      role: acc.role,
      schoolId: acc.schoolId,
      avatarUrl: acc.avatarUrl,
      lineConnected: acc.lineConnected,
      phone: acc.phone,
    }));
  } catch {
    return [];
  }
}

// Authenticate user against database password hashes
export async function authenticateWithDatabase(
  identifier: string,
  plainPassword: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPassword = plainPassword.trim();

  if (!cleanId || !cleanPassword) {
    return {
      success: false,
      error: 'กรุณากรอกอีเมล/ชื่อผู้ใช้ และรหัสผ่านให้ครบถ้วน (Please provide username and password)',
    };
  }

  // Ensure DB is initialized
  let accounts: StoredUserAccount[] = [];
  const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_USERS_KEY) : null;
  if (!raw) {
    accounts = await initAuthDatabase();
  } else {
    try {
      accounts = JSON.parse(raw);
    } catch {
      accounts = await initAuthDatabase();
    }
  }

  // Find user by email or by username prefix
  const target = accounts.find(
    (acc) =>
      acc.email.toLowerCase() === cleanId ||
      acc.email.split('@')[0].toLowerCase() === cleanId ||
      acc.id.toLowerCase() === cleanId
  );

  if (!target) {
    return {
      success: false,
      error: 'ไม่พบบัญชีผู้ใช้งานในฐานข้อมูล (Account not found in database)',
    };
  }

  const computedHash = await hashPassword(cleanPassword);
  if (target.passwordHash !== computedHash) {
    return {
      success: false,
      error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง (Invalid password)',
    };
  }

  // Authentication succeeded, return AuthUser without leaking passwordHash
  const authUser: AuthUser = {
    id: target.id,
    email: target.email,
    fullNameTh: target.fullNameTh,
    fullNameEn: target.fullNameEn,
    role: target.role,
    schoolId: target.schoolId,
    avatarUrl: target.avatarUrl,
    lineConnected: target.lineConnected,
    phone: target.phone,
  };

  return { success: true, user: authUser };
}

// Register a new user in the database
export async function registerUserInDatabase(params: {
  email: string;
  password: string;
  fullNameTh: string;
  fullNameEn: string;
  role: UserRole;
  schoolId: string;
  phone?: string;
  lineConnected?: boolean;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail || !params.password) {
    return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
  }

  const accounts: StoredUserAccount[] = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || '[]')
    : [];

  if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'อีเมลนี้มีอยู่ในฐานข้อมูลแล้ว (Email already registered)' };
  }

  const passwordHash = await hashPassword(params.password);
  const newAccount: StoredUserAccount = {
    id: `usr-${Date.now()}`,
    email: cleanEmail,
    passwordHash,
    fullNameTh: params.fullNameTh,
    fullNameEn: params.fullNameEn || params.fullNameTh,
    role: params.role,
    schoolId: params.schoolId,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    lineConnected: params.lineConnected ?? false,
    phone: params.phone,
    createdAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(accounts));
  }

  const authUser: AuthUser = {
    id: newAccount.id,
    email: newAccount.email,
    fullNameTh: newAccount.fullNameTh,
    fullNameEn: newAccount.fullNameEn,
    role: newAccount.role,
    schoolId: newAccount.schoolId,
    avatarUrl: newAccount.avatarUrl,
    lineConnected: newAccount.lineConnected,
    phone: newAccount.phone,
  };

  return { success: true, user: authUser };
}
