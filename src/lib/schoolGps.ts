import { CampusGateGeofence, School } from '../types';

const LEGACY_SAMPLE_GATE_IDS = new Set(['gate-1', 'gate-2', 'gate-3', 'gate-4']);

const LEGACY_SAMPLE_GATE_NAME_PATTERNS = [
  'Main Gate ถนนวิทยุ',
  'Main Gate (Witthayu Road)',
  'North Canteen Gate',
  'North Gate & Canteen',
  'School Bus Drop-off',
  'Staff & Faculty Parking',
  'ประตูใหญ่ด้านหน้า (Main Gate ถนนวิทยุ)',
  'ประตูทิศเหนือ & โรงอาหาร (North Canteen Gate)',
  'จุดรับ-ส่งนักเรียนรถตู้โรงเรียน (School Bus Drop-off)',
  'ลานจอดรถครูและบุคลากร (Staff & Faculty Parking)',
];

const LEGACY_SAMPLE_COORDS: Array<{ lat: number; lng: number }> = [
  { lat: 13.736717, lng: 100.523186 },
  { lat: 13.73715, lng: 100.52342 },
  { lat: 13.7364, lng: 100.5229 },
  { lat: 13.7369, lng: 100.5226 },
  { lat: 13.7563, lng: 100.5018 },
];

export function isValidCoordinatePair(lat?: number | null, lng?: number | null): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false;
  if (latNum === 0 && lngNum === 0) return false;
  return Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180;
}

export function isLegacySampleCoordinatePair(lat?: number | null, lng?: number | null): boolean {
  if (!isValidCoordinatePair(lat, lng)) return false;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return LEGACY_SAMPLE_COORDS.some(
    (sample) => Math.abs(latNum - sample.lat) < 0.00001 && Math.abs(lngNum - sample.lng) < 0.00001
  );
}

export function isLegacySampleCampusGate(gate?: Partial<CampusGateGeofence> | null): boolean {
  if (!gate) return true;
  const nameTh = (gate.nameTh || '').trim();
  const nameEn = (gate.nameEn || '').trim();
  const hasSampleName = LEGACY_SAMPLE_GATE_NAME_PATTERNS.some(
    (pattern) => nameTh.includes(pattern) || nameEn.includes(pattern)
  );
  if (hasSampleName) return true;

  const lat = gate.lat ?? gate.latitude;
  const lng = gate.lng ?? gate.longitude;
  if (gate.id && LEGACY_SAMPLE_GATE_IDS.has(gate.id) && isLegacySampleCoordinatePair(lat, lng)) {
    return true;
  }
  return false;
}

export function sanitizeSchoolCampusGates(
  gates: CampusGateGeofence[] | null | undefined,
  schoolId?: string
): CampusGateGeofence[] {
  if (!Array.isArray(gates)) return [];

  const cleaned: CampusGateGeofence[] = [];
  for (let i = 0; i < gates.length; i += 1) {
    const gate = gates[i];
    if (!gate || isLegacySampleCampusGate(gate)) continue;

    const latRaw = gate.lat ?? gate.latitude;
    const lngRaw = gate.lng ?? gate.longitude;
    if (!isValidCoordinatePair(latRaw, lngRaw)) continue;

    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    const radiusMeters =
      Number.isFinite(Number(gate.radiusMeters)) && Number(gate.radiusMeters) > 0
        ? Math.round(Number(gate.radiusMeters))
        : 150;

    cleaned.push({
      ...gate,
      id: gate.id || `gate_${schoolId || 'school'}_${i + 1}`,
      schoolId: gate.schoolId || schoolId || '',
      nameTh: (gate.nameTh || gate.nameEn || `จุดเช็คชื่อ ${i + 1}`).trim(),
      nameEn: (gate.nameEn || gate.nameTh || `Check-in Gate ${i + 1}`).trim(),
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      radiusMeters,
      isPrimary: Boolean(gate.isPrimary),
      isActive: gate.isActive !== false,
      type: gate.type || 'main_gate',
    });
  }

  if (cleaned.length > 0 && !cleaned.some((g) => g.isPrimary)) {
    cleaned[0] = { ...cleaned[0], isPrimary: true };
  }

  return cleaned;
}

export function buildPrimaryGateFromSchool(school?: School | null): CampusGateGeofence | null {
  if (!school) return null;
  if (!isValidCoordinatePair(school.latitude, school.longitude)) return null;
  const lat = Number(school.latitude);
  const lng = Number(school.longitude);
  const radiusMeters =
    Number.isFinite(Number(school.geofenceRadiusMeters)) && Number(school.geofenceRadiusMeters) > 0
      ? Math.round(Number(school.geofenceRadiusMeters))
      : 150;

  return {
    id: `gate_${school.id}_1`,
    schoolId: school.id,
    nameTh: `ประตูหลัก ${school.nameTh}`,
    nameEn: `Main Gate ${school.nameEn}`,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    radiusMeters,
    isPrimary: true,
    isActive: true,
    type: 'main_gate',
  };
}

export function calculateHaversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
