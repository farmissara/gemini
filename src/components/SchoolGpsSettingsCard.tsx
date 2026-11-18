import React, { useState, useEffect, useMemo } from 'react';
import { School, CampusGateGeofence, AppLanguage, UserRole } from '../types';
import {
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Compass,
  Radio,
  RefreshCw,
  LocateFixed,
  Sparkles,
  Layers,
  Activity,
  Copy,
} from 'lucide-react';
import { PagedList } from './PagedList';
import {
  buildPrimaryGateFromSchool,
  calculateHaversineDistanceMeters,
  isValidCoordinatePair,
  sanitizeSchoolCampusGates,
} from '../lib/schoolGps';

interface SchoolGpsSettingsCardProps {
  activeSchool: School;
  campusGates: CampusGateGeofence[];
  currentRole: UserRole;
  lang?: AppLanguage;
  onUpdateCampusGates: (gates: CampusGateGeofence[]) => void;
  onSaveCampusGates?: (gates: CampusGateGeofence[]) => Promise<boolean>;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radius: number) => void;
}

type GpsSubTab = 'center_geofence' | 'campus_gates' | 'radar_test';

export const SchoolGpsSettingsCard: React.FC<SchoolGpsSettingsCardProps> = ({
  activeSchool,
  campusGates,
  currentRole,
  lang = 'th',
  onUpdateCampusGates,
  onSaveCampusGates,
  onUpdateSchoolCoordinates,
}) => {
  const canManageGeofence = currentRole === 'admin' || currentRole === 'super_admin';
  const [activeTab, setActiveTab] = useState<GpsSubTab>('center_geofence');

  const initialCleanGates = useMemo(() => {
    const sanitized = sanitizeSchoolCampusGates(campusGates, activeSchool.id);
    if (sanitized.length > 0) return sanitized;
    const fromSchool = buildPrimaryGateFromSchool(activeSchool);
    return fromSchool ? [fromSchool] : [];
  }, [campusGates, activeSchool]);

  const initialPrimaryGate = initialCleanGates.find((g) => g.isPrimary) || initialCleanGates[0] || null;
  const initialLat = isValidCoordinatePair(activeSchool.latitude, activeSchool.longitude)
    ? Number(activeSchool.latitude)
    : initialPrimaryGate?.lat ?? null;
  const initialLng = isValidCoordinatePair(activeSchool.latitude, activeSchool.longitude)
    ? Number(activeSchool.longitude)
    : initialPrimaryGate?.lng ?? null;
  const initialRadius =
    Number.isFinite(Number(activeSchool.geofenceRadiusMeters)) && Number(activeSchool.geofenceRadiusMeters) > 0
      ? Math.round(Number(activeSchool.geofenceRadiusMeters))
      : initialPrimaryGate?.radiusMeters || 150;

  const [schoolLatText, setSchoolLatText] = useState<string>(initialLat !== null ? String(initialLat) : '');
  const [schoolLngText, setSchoolLngText] = useState<string>(initialLng !== null ? String(initialLng) : '');
  const [schoolRadius, setSchoolRadius] = useState<number>(initialRadius);

  const [gatesList, setGatesList] = useState<CampusGateGeofence[]>(initialCleanGates);
  const [isLocating, setIsLocating] = useState(false);
  const [locateStatus, setLocateStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  const [currentDeviceCoords, setCurrentDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [testResult, setTestResult] = useState<{ distance: number; isInside: boolean } | null>(null);
  const [isTestingDistance, setIsTestingDistance] = useState(false);

  const parsedLat = schoolLatText.trim() !== '' ? Number(schoolLatText) : NaN;
  const parsedLng = schoolLngText.trim() !== '' ? Number(schoolLngText) : NaN;
  const hasValidCenterCoords = isValidCoordinatePair(parsedLat, parsedLng);

  useEffect(() => {
    setGatesList(initialCleanGates);
    const prim = initialCleanGates.find((g) => g.isPrimary) || initialCleanGates[0] || null;
    if (isValidCoordinatePair(activeSchool.latitude, activeSchool.longitude)) {
      setSchoolLatText(String(activeSchool.latitude));
      setSchoolLngText(String(activeSchool.longitude));
      setSchoolRadius(
        Number.isFinite(Number(activeSchool.geofenceRadiusMeters)) && Number(activeSchool.geofenceRadiusMeters) > 0
          ? Math.round(Number(activeSchool.geofenceRadiusMeters))
          : prim?.radiusMeters || 150
      );
    } else if (prim && isValidCoordinatePair(prim.lat, prim.lng)) {
      setSchoolLatText(String(prim.lat));
      setSchoolLngText(String(prim.lng));
      setSchoolRadius(prim.radiusMeters);
    } else {
      setSchoolLatText('');
      setSchoolLngText('');
      setSchoolRadius(150);
    }
  }, [activeSchool.id, activeSchool.latitude, activeSchool.longitude, activeSchool.geofenceRadiusMeters, initialCleanGates]);

  const handleDetectCurrentLocation = (targetGateId?: string) => {
    if (!canManageGeofence) return;
    if (!navigator.geolocation) {
      setLocateStatus({
        type: 'error',
        message:
          lang === 'th'
            ? 'เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด Geolocation'
            : 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setIsLocating(true);
    setLocateStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setIsLocating(false);
        const latVal = Number(latitude.toFixed(6));
        const lngVal = Number(longitude.toFixed(6));
        setCurrentDeviceCoords({ lat: latVal, lng: lngVal });

        if (targetGateId) {
          setGatesList((prev) =>
            prev.map((g) =>
              g.id === targetGateId
                ? { ...g, lat: latVal, lng: lngVal, latitude: latVal, longitude: lngVal }
                : g
            )
          );
          setLocateStatus({
            type: 'success',
            message:
              lang === 'th'
                ? `อัปเดตพิกัดจุดเช็คชื่อสำเร็จ (ความแม่นยำ ±${Math.round(accuracy)} ม.)`
                : `Gate location updated (Accuracy ±${Math.round(accuracy)}m)`,
          });
        } else {
          setSchoolLatText(String(latVal));
          setSchoolLngText(String(lngVal));

          setGatesList((prev) => {
            if (prev.length === 0) {
              return [
                {
                  id: `gate_${activeSchool.id}_1`,
                  schoolId: activeSchool.id,
                  nameTh: `ประตูหลัก ${activeSchool.nameTh}`,
                  nameEn: `Main Gate ${activeSchool.nameEn}`,
                  lat: latVal,
                  lng: lngVal,
                  latitude: latVal,
                  longitude: lngVal,
                  radiusMeters: schoolRadius,
                  isPrimary: true,
                  isActive: true,
                  type: 'main_gate',
                },
              ];
            }
            return prev.map((g, idx) =>
              g.isPrimary || idx === 0
                ? { ...g, lat: latVal, lng: lngVal, latitude: latVal, longitude: lngVal, radiusMeters: schoolRadius }
                : g
            );
          });

          setLocateStatus({
            type: 'success',
            message:
              lang === 'th'
                ? `ดึงพิกัด GPS จริงสำเร็จ: ${latVal}, ${lngVal} (ความแม่นยำ ±${Math.round(accuracy)} ม.)`
                : `Real GPS detected: ${latVal}, ${lngVal} (Accuracy ±${Math.round(accuracy)}m)`,
          });
        }

        setTimeout(() => setLocateStatus(null), 5000);
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = lang === 'th' ? 'ไม่สามารถดึงพิกัด GPS ได้' : 'Unable to acquire GPS position';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg =
            lang === 'th'
              ? 'ผู้ใช้ปฏิเสธการเข้าถึงตำแหน่ง GPS (โปรดอนุญาต Location Permission ในเบราว์เซอร์)'
              : 'GPS access denied by user.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = lang === 'th' ? 'สัญญาณดาวเทียม GPS ไม่พร้อมใช้งาน' : 'GPS signal unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = lang === 'th' ? 'หมดเวลาในการค้นหาสัญญาณพิกัด GPS' : 'GPS request timed out.';
        }
        setLocateStatus({ type: 'error', message: errorMsg });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleTestDistance = () => {
    if (!hasValidCenterCoords) {
      setLocateStatus({
        type: 'error',
        message:
          lang === 'th'
            ? 'กรุณากำหนดพิกัด GPS จริงของโรงเรียนก่อนทดสอบระยะทาง'
            : 'Please set real school GPS coordinates before testing distance.',
      });
      return;
    }
    if (!navigator.geolocation) {
      setLocateStatus({
        type: 'error',
        message: lang === 'th' ? 'เบราว์เซอร์นี้ไม่รองรับการตรวจสอบพิกัด Geolocation' : 'Geolocation is not supported',
      });
      return;
    }

    setIsTestingDistance(true);
    setLocateStatus(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsTestingDistance(false);
        const { latitude, longitude } = pos.coords;
        const latVal = Number(latitude.toFixed(6));
        const lngVal = Number(longitude.toFixed(6));
        setCurrentDeviceCoords({ lat: latVal, lng: lngVal });
        const distance = calculateHaversineDistanceMeters(latitude, longitude, parsedLat, parsedLng);
        setTestResult({
          distance,
          isInside: distance <= schoolRadius,
        });
      },
      () => {
        setIsTestingDistance(false);
        setLocateStatus({
          type: 'error',
          message:
            lang === 'th'
              ? 'กรุณาอนุญาตสิทธิ์ Location ในเบราว์เซอร์เพื่อทดสอบระยะทางจริง'
              : 'Please allow Location permission to test real distance.',
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleAddNewGate = () => {
    if (!canManageGeofence) return;
    if (!hasValidCenterCoords) {
      setLocateStatus({
        type: 'error',
        message:
          lang === 'th'
            ? 'กรุณาดึงพิกัด GPS จริงหรือกรอกละติจูด/ลองจิจูดของโรงเรียนในแท็บที่ 1 ก่อนเพิ่มจุดเช็คชื่อ'
            : 'Please set valid school coordinates in Tab 1 before adding a new gate.',
      });
      return;
    }
    const newGate: CampusGateGeofence = {
      id: `gate_${activeSchool.id}_${Date.now()}`,
      schoolId: activeSchool.id,
      nameTh:
        gatesList.length === 0
          ? `ประตูหลัก ${activeSchool.nameTh}`
          : `จุดเช็คชื่อ ${gatesList.length + 1}`,
      nameEn:
        gatesList.length === 0
          ? `Main Gate ${activeSchool.nameEn}`
          : `Gate Zone ${gatesList.length + 1}`,
      lat: parsedLat,
      lng: parsedLng,
      latitude: parsedLat,
      longitude: parsedLng,
      radiusMeters: schoolRadius,
      isPrimary: gatesList.length === 0,
      isActive: true,
      type: 'main_gate',
    };
    setGatesList((prev) => [...prev, newGate]);
  };

  const handleRemoveGate = (gateId: string) => {
    if (!canManageGeofence) return;
    if (gatesList.length <= 1) {
      setLocateStatus({
        type: 'error',
        message:
          lang === 'th'
            ? 'ต้องมีจุดเช็คชื่อพิกัด Geofence อย่างน้อย 1 จุดในโรงเรียน'
            : 'At least one campus gate must remain.',
      });
      return;
    }
    setGatesList((prev) => {
      const remaining = prev.filter((g) => g.id !== gateId);
      if (remaining.length > 0 && !remaining.some((g) => g.isPrimary)) {
        remaining[0] = { ...remaining[0], isPrimary: true };
      }
      return remaining;
    });
  };

  const handleSetPrimary = (gateId: string) => {
    if (!canManageGeofence) return;
    setGatesList((prev) =>
      prev.map((g) => ({
        ...g,
        isPrimary: g.id === gateId,
      }))
    );
    const target = gatesList.find((g) => g.id === gateId);
    if (target && isValidCoordinatePair(target.lat, target.lng)) {
      setSchoolLatText(String(target.lat));
      setSchoolLngText(String(target.lng));
      setSchoolRadius(target.radiusMeters);
    }
  };

  const handleCopyCoords = () => {
    if (!hasValidCenterCoords) return;
    navigator.clipboard.writeText(`${parsedLat}, ${parsedLng}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleSaveAll = async () => {
    if (!canManageGeofence) return;
    setSaveError(null);
    setSaveWarning(null);

    let gatesToSave = sanitizeSchoolCampusGates(gatesList, activeSchool.id);

    if (hasValidCenterCoords) {
      if (gatesToSave.length === 0) {
        gatesToSave = [
          {
            id: `gate_${activeSchool.id}_1`,
            schoolId: activeSchool.id,
            nameTh: `ประตูหลัก ${activeSchool.nameTh}`,
            nameEn: `Main Gate ${activeSchool.nameEn}`,
            lat: parsedLat,
            lng: parsedLng,
            latitude: parsedLat,
            longitude: parsedLng,
            radiusMeters: schoolRadius,
            isPrimary: true,
            isActive: true,
            type: 'main_gate',
          },
        ];
      } else {
        gatesToSave = gatesToSave.map((g, idx) =>
          g.isPrimary || idx === 0
            ? {
                ...g,
                lat: parsedLat,
                lng: parsedLng,
                latitude: parsedLat,
                longitude: parsedLng,
                radiusMeters: schoolRadius,
              }
            : g
        );
      }
    }

    if (gatesToSave.length === 0) {
      setSaveError(
        lang === 'th'
          ? 'กรุณาดึงพิกัด GPS จริงของโรงเรียน หรือกรอกละติจูดและลองจิจูดให้ถูกต้องก่อนบันทึก'
          : 'Please detect or enter valid real school GPS coordinates before saving.'
      );
      return;
    }

    const primaryToSync = gatesToSave.find((g) => g.isPrimary) || gatesToSave[0];

    setIsSaving(true);
    try {
      setGatesList(gatesToSave);
      let savedToDatabase = false;
      if (onSaveCampusGates) {
        savedToDatabase = await onSaveCampusGates(gatesToSave);
      } else {
        onUpdateCampusGates(gatesToSave);
      }

      if (onUpdateSchoolCoordinates && primaryToSync && isValidCoordinatePair(primaryToSync.lat, primaryToSync.lng)) {
        onUpdateSchoolCoordinates(primaryToSync.lat, primaryToSync.lng, primaryToSync.radiusMeters);
      }

      localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(gatesToSave));
      if (primaryToSync && isValidCoordinatePair(primaryToSync.lat, primaryToSync.lng)) {
        localStorage.setItem(
          `eduverse_school_gps_${activeSchool.id}`,
          JSON.stringify({
            latitude: primaryToSync.lat,
            longitude: primaryToSync.lng,
            geofenceRadiusMeters: primaryToSync.radiusMeters,
          })
        );
      }

      setSaveSuccess(true);
      if (!savedToDatabase) {
        setSaveWarning(
          lang === 'th'
            ? 'บันทึกไว้ในอุปกรณ์นี้เท่านั้น กรุณาตรวจสอบตาราง school_campus_gates ใน Supabase เพื่อให้ทุกคนในโรงเรียนใช้พิกัดร่วมกัน'
            : 'Saved locally only. Ensure the school_campus_gates table is installed in Supabase to sync across devices.'
        );
      }
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'บันทึกพิกัดโรงเรียนไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Header Bar */}
      <div className="p-3 sm:p-4 rounded-xl bg-[var(--color-primary)] text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/15 text-emerald-200 border border-white/25">
              <MapPin className="w-4 h-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
              <span>{lang === 'th' ? 'กำหนดพิกัด GPS ประจำโรงเรียน' : 'School GPS & Geofence Settings'}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/15 text-white border border-white/25">
                {activeSchool.nameTh}
              </span>
            </h2>
          </div>
          <p className="text-xs text-white/85 leading-relaxed">
            {lang === 'th'
              ? 'เฉพาะผู้ดูแลระบบโรงเรียนกำหนดพิกัด รัศมี และจุดประตูเช็คชื่อจริงสำหรับนักเรียนและครูทุกคน'
              : 'School administrators configure real GPS coordinates, radius, and check-in gates for all students and staff.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!canManageGeofence || isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5 text-slate-950" />
            <span>{isSaving ? 'กำลังบันทึก...' : lang === 'th' ? 'บันทึกพิกัดโรงเรียน' : 'Save School GPS'}</span>
          </button>
        </div>
      </div>

      {/* Save Success / Error / Warning Banners */}
      {saveSuccess && (
        <div className="shrink-0 p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            <span>
              {lang === 'th'
                ? `บันทึกพิกัดจริง ${gatesList.length} จุดของ ${activeSchool.nameTh} สำเร็จแล้ว`
                : `Saved ${gatesList.length} real check-in point(s) for ${activeSchool.nameTh}.`}
            </span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 border border-emerald-400 dark:border-emerald-700">
            {activeSchool.code}
          </span>
        </div>
      )}
      {saveError && (
        <div role="alert" className="shrink-0 p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-semibold">
          {saveError}
        </div>
      )}
      {saveWarning && (
        <div role="status" className="shrink-0 p-2.5 rounded-lg bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-semibold">
          {saveWarning}
        </div>
      )}

      {/* Feedback Message */}
      {locateStatus && (
        <div
          className={`shrink-0 p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            locateStatus.type === 'success'
              ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
              : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
          }`}
        >
          {locateStatus.type === 'success' ? (
            <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-300 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-300 shrink-0" />
          )}
          <span>{locateStatus.message}</span>
        </div>
      )}

      {/* Subtabs Selector Header */}
      <div className="shrink-0 flex flex-wrap items-center gap-1.5 border-b border-[var(--color-border)] pb-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('center_geofence')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'center_geofence'
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>1. พิกัดศูนย์กลาง &amp; รัศมี ({schoolRadius} ม.)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('campus_gates')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'campus_gates'
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. จุดเช็คชื่อ &amp; ประตูโรงเรียน ({gatesList.length} จุด)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('radar_test')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'radar_test'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>3. ทดสอบระยะ GPS จริง</span>
          {testResult && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${testResult.isInside ? 'bg-emerald-200 text-emerald-950' : 'bg-amber-200 text-amber-950'}`}>
              {testResult.isInside ? 'อยู่ในเขต' : 'นอกเขต'}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content Panel */}
      <div className="space-y-3">
        {/* TAB 1: SCHOOL CENTER & GEOFENCE RADIUS */}
        {activeTab === 'center_geofence' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Coordinates Inputs Card */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[var(--color-primary-text)]" />
                    <h3 className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider">
                      พิกัด GPS จริงของโรงเรียน (Latitude / Longitude)
                    </h3>
                  </div>

                  <button
                    type="button"
                    disabled={isLocating || !canManageGeofence}
                    onClick={() => handleDetectCurrentLocation()}
                    className="px-2.5 py-1 rounded-md bg-[var(--color-primary-light)] hover:opacity-90 text-[var(--color-primary-text)] text-xs font-bold flex items-center gap-1.5 border border-[var(--color-border)] transition cursor-pointer disabled:opacity-50"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'กำลังดึงพิกัด...' : 'ดึงพิกัดจากตำแหน่งปัจจุบัน'}</span>
                  </button>
                </div>

                {!hasValidCenterCoords && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-300" />
                    <span>
                      ยังไม่ได้ตั้งค่าพิกัด GPS ของโรงเรียน กรุณากดปุ่ม &quot;ดึงพิกัดจากตำแหน่งปัจจุบัน&quot; ณ บริเวณโรงเรียน หรือกรอกค่าละติจูด/ลองจิจูดจริงจาก Google Maps แล้วกดบันทึก
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-body)] mb-1">
                      ละติจูด (Latitude) <span className="text-rose-600 dark:text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      disabled={!canManageGeofence}
                      value={schoolLatText}
                      onChange={(e) => setSchoolLatText(e.target.value)}
                      placeholder="กรอกละติจูดจริงของโรงเรียน"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-mono font-bold focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-body)] mb-1">
                      ลองจิจูด (Longitude) <span className="text-rose-600 dark:text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      disabled={!canManageGeofence}
                      value={schoolLngText}
                      onChange={(e) => setSchoolLngText(e.target.value)}
                      placeholder="กรอกลองจิจูดจริงของโรงเรียน"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] text-xs font-mono font-bold focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Geofence Radius Slider */}
                <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-body)]">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-300" />
                      <span>รัศมีขอบเขตที่อนุญาต (Geofence Radius):</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 font-mono font-bold text-xs tabular-nums">
                      {schoolRadius} เมตร
                    </span>
                  </div>

                  <input
                    type="range"
                    min="30"
                    max="1000"
                    step="10"
                    disabled={!canManageGeofence}
                    value={schoolRadius}
                    onChange={(e) => setSchoolRadius(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-700 cursor-pointer"
                  />

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[50, 100, 150, 200, 300, 500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={!canManageGeofence}
                        onClick={() => setSchoolRadius(preset)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer tabular-nums ${
                          schoolRadius === preset
                            ? 'bg-indigo-700 text-white'
                            : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
                        }`}
                      >
                        {preset} ม.
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Links & Copy */}
                {hasValidCenterCoords && (
                  <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={handleCopyCoords}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)] text-xs font-semibold cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCoords ? 'คัดลอกแล้ว!' : 'คัดลอกพิกัด'}</span>
                    </button>

                    <a
                      href={`https://www.google.com/maps?q=${parsedLat},${parsedLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-primary-text)] text-xs font-semibold hover:opacity-90"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ตรวจสอบตำแหน่งบน Google Maps</span>
                    </a>
                  </div>
                )}
              </div>

              {/* School GPS Summary & Setup Guide (No Sample Presets) */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider pb-2 border-b border-[var(--color-border)]">
                    สถานะพิกัด GPS ที่ใช้งานจริง
                  </h3>
                  <ol className="space-y-2 text-xs text-[var(--color-text-body)] list-decimal list-inside leading-relaxed">
                    <li>ยืนที่บริเวณประตูหลักของโรงเรียน แล้วกดปุ่ม &quot;ดึงพิกัดจากตำแหน่งปัจจุบัน&quot; หรือนำพิกัดจริงจาก Google Maps มากรอก</li>
                    <li>กำหนดรัศมีเช็คชื่อที่เหมาะสมกับพื้นที่โรงเรียน (เช่น 100–300 เมตร)</li>
                    <li>กด &quot;บันทึกพิกัดโรงเรียน&quot; เพื่อส่งพิกัดจริงไปยังเครื่องนักเรียนและครูทุกคนทันที</li>
                  </ol>
                </div>

                {/* Live Coordinates Status Box */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-white flex items-center gap-3">
                  <div
                    className={`relative w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${
                      hasValidCenterCoords
                        ? 'border-emerald-500/60 bg-emerald-950'
                        : 'border-amber-500/60 bg-amber-950'
                    }`}
                  >
                    {hasValidCenterCoords && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />}
                    <MapPin className={`w-5 h-5 relative z-10 ${hasValidCenterCoords ? 'text-emerald-300' : 'text-amber-300'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {activeSchool.nameTh}
                    </div>
                    <div className={`font-mono text-[11px] truncate ${hasValidCenterCoords ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {hasValidCenterCoords
                        ? `Lat ${parsedLat.toFixed(6)} · Lng ${parsedLng.toFixed(6)}`
                        : 'ยังไม่ได้กำหนดพิกัด GPS จริง'}
                    </div>
                    <div className="text-[10px] text-slate-300 tabular-nums">
                      รัศมี: {schoolRadius} ม. · จุดเช็คชื่อที่บันทึกไว้: {gatesList.length} จุด
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAMPUS GATES LIST */}
        {activeTab === 'campus_gates' && (
          <div className="h-full flex flex-col min-h-0 space-y-2">
            <div className="shrink-0 flex items-center justify-between pb-1 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-300" />
                  <span>จุดตรวจสแกนเข้าเรียนและประตูโรงเรียน ({gatesList.length} จุด)</span>
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  นักเรียนและครูจะเช็คชื่อได้เมื่ออยู่ภายในรัศมีของจุดตรวจจริงที่โรงเรียนกำหนดไว้เท่านั้น
                </p>
              </div>

              <button
                type="button"
                disabled={!canManageGeofence}
                onClick={handleAddNewGate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มจุดตรวจใหม่</span>
              </button>
            </div>

            {gatesList.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] text-center space-y-2">
                <MapPin className="w-6 h-6 text-[var(--color-text-muted)] mx-auto" />
                <p className="text-xs font-semibold text-[var(--color-text-title)]">
                  ยังไม่มีจุดเช็คชื่อพิกัด GPS ของโรงเรียน
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  กรุณาดึงพิกัด GPS จริงในแท็บที่ 1 หรือกด &quot;เพิ่มจุดตรวจใหม่&quot; เพื่อสร้างประตูเช็คชื่อแรกของโรงเรียน
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-hidden pr-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <PagedList
                  items={gatesList}
                  pageSize={4}
                  renderItem={(gate, index) => (
                    <div
                      key={gate.id}
                      className={`p-3 rounded-xl border transition ${
                        gate.isPrimary
                          ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950 shadow-xs'
                          : 'border-[var(--color-border)] bg-[var(--color-card)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                              gate.isPrimary
                                ? 'bg-indigo-700 text-white'
                                : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={gate.nameTh}
                            disabled={!canManageGeofence}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGatesList((prev) => prev.map((g) => (g.id === gate.id ? { ...g, nameTh: val } : g)));
                            }}
                            className="w-full text-xs font-bold text-[var(--color-text-title)] bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-indigo-600 focus:outline-hidden px-1"
                            placeholder="ชื่อจุดเช็คชื่อ (ไทย)"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={!canManageGeofence}
                            onClick={() => handleSetPrimary(gate.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              gate.isPrimary
                                ? 'bg-indigo-700 text-white'
                                : 'bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
                            }`}
                          >
                            {gate.isPrimary ? 'จุดหลัก' : 'ตั้งเป็นหลัก'}
                          </button>

                          {gatesList.length > 1 && (
                            <button
                              type="button"
                              disabled={!canManageGeofence}
                              onClick={() => handleRemoveGate(gate.id)}
                              className="p-1 rounded text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950 transition cursor-pointer"
                              aria-label="ลบจุดเช็คชื่อ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-medium">ละติจูด (Lat)</span>
                          <input
                            type="number"
                            step="any"
                            value={gate.lat}
                            disabled={!canManageGeofence}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setGatesList((prev) =>
                                prev.map((g) =>
                                  g.id === gate.id
                                    ? { ...g, lat: Number.isFinite(val) ? val : 0, latitude: Number.isFinite(val) ? val : 0 }
                                    : g
                                )
                              );
                            }}
                            className="w-full px-2 py-1 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono text-[11px]"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-medium">ลองจิจูด (Lng)</span>
                          <input
                            type="number"
                            step="any"
                            value={gate.lng}
                            disabled={!canManageGeofence}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setGatesList((prev) =>
                                prev.map((g) =>
                                  g.id === gate.id
                                    ? { ...g, lng: Number.isFinite(val) ? val : 0, longitude: Number.isFinite(val) ? val : 0 }
                                    : g
                                )
                              );
                            }}
                            className="w-full px-2 py-1 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono text-[11px]"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-medium">รัศมี (ม.)</span>
                          <input
                            type="number"
                            value={gate.radiusMeters}
                            disabled={!canManageGeofence}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 50;
                              setGatesList((prev) =>
                                prev.map((g) => (g.id === gate.id ? { ...g, radiusMeters: val } : g))
                              );
                            }}
                            className="w-full px-2 py-1 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-text-muted)] capitalize">
                          ประเภท: {gate.type.replace('_', ' ')}
                        </span>
                        <button
                          type="button"
                          disabled={!canManageGeofence}
                          onClick={() => handleDetectCurrentLocation(gate.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
                        >
                          <LocateFixed className="w-3 h-3" />
                          <span>ดึงพิกัดจุดนี้จาก GPS จริง</span>
                        </button>
                      </div>
                    </div>
                  )}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE GPS DISTANCE VERIFICATION */}
        {activeTab === 'radar_test' && (
          <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-3 pr-1">
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                  <h3 className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider">
                    ทดสอบวัดระยะจากตำแหน่ง GPS จริงของอุปกรณ์
                  </h3>
                </div>

                <button
                  type="button"
                  disabled={isTestingDistance || !hasValidCenterCoords}
                  onClick={handleTestDistance}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingDistance ? 'animate-spin' : ''}`} />
                  <span>{isTestingDistance ? 'กำลังคำนวณ...' : 'คำนวณระยะห่างจริงเดี๋ยวนี้'}</span>
                </button>
              </div>

              <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                {hasValidCenterCoords
                  ? `ระบบจะอ่านพิกัดดาวเทียมจริงจากอุปกรณ์ปัจจุบัน และคำนวณระยะห่างถึงศูนย์กลางโรงเรียน (${parsedLat.toFixed(6)}, ${parsedLng.toFixed(6)})`
                  : 'ยังไม่ได้ตั้งค่าพิกัดโรงเรียน กรุณากำหนดพิกัดจริงในแท็บที่ 1 ก่อนทดสอบระยะห่าง'}
              </p>

              {testResult ? (
                <div
                  className={`p-4 rounded-xl border ${
                    testResult.isInside
                      ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm flex items-center gap-2">
                      {testResult.isInside ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                      )}
                      <span>
                        {testResult.isInside
                          ? 'อยู่ในขอบเขตรั้วโรงเรียน (สามารถเช็คชื่อได้)'
                          : 'อยู่นอกขอบเขตรั้วโรงเรียน (เช็คชื่อไม่ได้)'}
                      </span>
                    </span>
                    <span className="font-mono font-black text-base tabular-nums">
                      {testResult.distance.toLocaleString()} เมตร
                    </span>
                  </div>

                  <div className="text-xs mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between tabular-nums">
                    <span>
                      ระยะห่างจริง: <strong>{testResult.distance.toLocaleString()} ม.</strong>
                    </span>
                    <span>
                      รัศมีที่อนุญาต: <strong>{schoolRadius} ม.</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
                  กดปุ่ม &quot;คำนวณระยะห่างจริงเดี๋ยวนี้&quot; เพื่อตรวจสอบตำแหน่งปัจจุบันของคุณเทียบกับพิกัดโรงเรียน
                </div>
              )}

              {currentDeviceCoords && (
                <div className="text-xs text-[var(--color-text-body)] font-mono bg-[var(--color-card-subtle)] p-2.5 rounded-lg border border-[var(--color-border)]">
                  ตำแหน่งอุปกรณ์ปัจจุบัน: Lat {currentDeviceCoords.lat.toFixed(6)}, Lng {currentDeviceCoords.lng.toFixed(6)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
