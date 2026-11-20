import type { SchoolData } from './supabase';

const DATABASE_NAME = 'baanpakkru-offline-cache';
const DATABASE_VERSION = 1;
const STORE_NAME = 'school-snapshots';

interface SchoolSnapshot {
  key: string;
  schoolId: string;
  userId: string;
  savedAt: string;
  data: SchoolData;
}

function openCacheDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('เบราว์เซอร์นี้ไม่รองรับ IndexedDB'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('เปิดคลังข้อมูลออฟไลน์ไม่สำเร็จ'));
  });
}

function snapshotKey(userId: string, schoolId: string): string {
  return `${userId}:${schoolId}`;
}

export async function saveSchoolSnapshot(
  userId: string,
  schoolId: string,
  data: SchoolData,
): Promise<void> {
  const db = await openCacheDatabase();
  try {
    const snapshot: SchoolSnapshot = {
      key: snapshotKey(userId, schoolId),
      schoolId,
      userId,
      savedAt: new Date().toISOString(),
      // Signed photo URLs expire, so keep the storage paths and request fresh
      // links only after Supabase is reachable again.
      data: {
        ...data,
        attendance: data.attendance.map((record) => ({ ...record, photoUrl: undefined })),
      },
    };
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(snapshot);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('บันทึกสำเนาข้อมูลไม่สำเร็จ'));
      transaction.onabort = () => reject(transaction.error || new Error('ยกเลิกการบันทึกสำเนาข้อมูล'));
    });
  } finally {
    db.close();
  }
}

export async function loadSchoolSnapshot(
  userId: string,
  schoolId: string,
): Promise<(SchoolSnapshot & { data: SchoolData }) | null> {
  const db = await openCacheDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(snapshotKey(userId, schoolId));
      request.onsuccess = () => resolve((request.result as SchoolSnapshot | undefined) || null);
      request.onerror = () => reject(request.error || new Error('อ่านสำเนาข้อมูลไม่สำเร็จ'));
    });
  } finally {
    db.close();
  }
}
