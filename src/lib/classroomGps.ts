import { ClassroomGpsConfig } from '../types';
import { calculateHaversineDistanceMeters, isValidCoordinatePair } from './schoolGps';

const CLASSROOM_GPS_STORAGE_PREFIX = 'eduverse_classroom_gps_v1_';

export function normalizeClassroomKey(room?: string | null): string {
  return (room || '')
    .trim()
    .toLowerCase()
    .replace(/^ห้อง\s*/i, '')
    .replace(/^room\s*/i, '')
    .replace(/\s+/g, ' ');
}

export function loadClassroomGpsConfigs(schoolId: string): ClassroomGpsConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${CLASSROOM_GPS_STORAGE_PREFIX}${schoolId || 'default'}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ClassroomGpsConfig =>
        Boolean(item && typeof item.roomKey === 'string' && isValidCoordinatePair(item.lat, item.lng))
    );
  } catch {
    return [];
  }
}

export function saveClassroomGpsConfig(
  schoolId: string,
  config: Omit<ClassroomGpsConfig, 'roomKey' | 'updatedAt'> & { roomKey?: string }
): ClassroomGpsConfig[] {
  if (!isValidCoordinatePair(config.lat, config.lng)) {
    return loadClassroomGpsConfigs(schoolId);
  }
  const normalizedKey =
    normalizeClassroomKey(config.roomKey || config.roomLabel) ||
    (config.courseId ? `course:${config.courseId}` : 'default-room');
  const nextItem: ClassroomGpsConfig = {
    roomKey: normalizedKey,
    roomLabel: (config.roomLabel || config.roomKey || 'ห้องเรียน').trim(),
    courseId: config.courseId,
    lat: Number(Number(config.lat).toFixed(6)),
    lng: Number(Number(config.lng).toFixed(6)),
    radiusMeters: Math.max(15, Math.min(500, Math.round(Number(config.radiusMeters) || 50))),
    updatedBy: config.updatedBy,
    updatedAt: new Date().toISOString(),
  };

  const existing = loadClassroomGpsConfigs(schoolId);
  const filtered = existing.filter((item) => {
    if (item.roomKey === nextItem.roomKey) return false;
    if (nextItem.courseId && item.courseId && item.courseId === nextItem.courseId) return false;
    return true;
  });
  const updated = [nextItem, ...filtered].slice(0, 120);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        `${CLASSROOM_GPS_STORAGE_PREFIX}${schoolId || 'default'}`,
        JSON.stringify(updated)
      );
    } catch {
      // ignore quota errors
    }
  }
  return updated;
}

export function removeClassroomGpsConfig(schoolId: string, roomKey: string): ClassroomGpsConfig[] {
  const existing = loadClassroomGpsConfigs(schoolId);
  const updated = existing.filter((item) => item.roomKey !== roomKey);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        `${CLASSROOM_GPS_STORAGE_PREFIX}${schoolId || 'default'}`,
        JSON.stringify(updated)
      );
    } catch {
      // ignore quota errors
    }
  }
  return updated;
}

export function findClassroomGpsConfig(
  schoolId: string,
  candidates: { room?: string | null; classRoom?: string | null; courseId?: string | null }
): ClassroomGpsConfig | null {
  const configs = loadClassroomGpsConfigs(schoolId);
  if (configs.length === 0) return null;

  if (candidates.courseId) {
    const byCourse = configs.find((c) => c.courseId === candidates.courseId);
    if (byCourse) return byCourse;
  }

  const roomKeys = [candidates.room, candidates.classRoom]
    .map((val) => normalizeClassroomKey(val))
    .filter(Boolean);

  for (const key of roomKeys) {
    const exact = configs.find((c) => c.roomKey === key || normalizeClassroomKey(c.roomLabel) === key);
    if (exact) return exact;
  }

  for (const key of roomKeys) {
    const fuzzy = configs.find(
      (c) =>
        (c.roomKey && key.includes(c.roomKey)) ||
        (c.roomKey && c.roomKey.includes(key))
    );
    if (fuzzy) return fuzzy;
  }

  return null;
}

export function checkDistanceToClassroomGps(
  deviceCoords: { lat: number; lng: number } | null,
  classroomGps: { lat: number; lng: number; radiusMeters: number } | null
): {
  configured: boolean;
  hasDeviceCoords: boolean;
  inRange: boolean;
  distanceMeters: number | null;
  radiusMeters: number;
} {
  if (!classroomGps || !isValidCoordinatePair(classroomGps.lat, classroomGps.lng)) {
    return {
      configured: false,
      hasDeviceCoords: Boolean(deviceCoords),
      inRange: false,
      distanceMeters: null,
      radiusMeters: 50,
    };
  }
  const radiusMeters = Math.max(15, Math.round(Number(classroomGps.radiusMeters) || 50));
  if (!deviceCoords || !isValidCoordinatePair(deviceCoords.lat, deviceCoords.lng)) {
    return {
      configured: true,
      hasDeviceCoords: false,
      inRange: false,
      distanceMeters: null,
      radiusMeters,
    };
  }
  const distanceMeters = calculateHaversineDistanceMeters(
    deviceCoords.lat,
    deviceCoords.lng,
    classroomGps.lat,
    classroomGps.lng
  );
  return {
    configured: true,
    hasDeviceCoords: true,
    inRange: distanceMeters <= radiusMeters,
    distanceMeters,
    radiusMeters,
  };
}
