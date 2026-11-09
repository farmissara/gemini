import React, { useState, useEffect } from 'react';
import { School, CampusGateGeofence, AppLanguage } from '../types';
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
  ShieldCheck, 
  RefreshCw,
  LocateFixed,
  Eye,
  Sliders,
  Sparkles
} from 'lucide-react';

interface SchoolGpsSettingsCardProps {
  activeSchool: School;
  campusGates: CampusGateGeofence[];
  lang?: AppLanguage;
  onUpdateCampusGates: (gates: CampusGateGeofence[]) => void;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radius: number) => void;
}

export const SchoolGpsSettingsCard: React.FC<SchoolGpsSettingsCardProps> = ({
  activeSchool,
  campusGates,
  lang = 'th',
  onUpdateCampusGates,
  onUpdateSchoolCoordinates
}) => {
  // Find primary gate or first gate for school center coordinates
  const primaryGate = campusGates.find(g => g.isPrimary) || campusGates[0] || {
    id: `gate-${activeSchool.id}-main`,
    schoolId: activeSchool.id,
    nameTh: `ประตูหลัก ${activeSchool.nameTh}`,
    nameEn: `Main Gate ${activeSchool.nameEn}`,
    lat: 13.736717,
    lng: 100.523186,
    radiusMeters: 300,
    isPrimary: true,
    type: 'main_gate' as const
  };

  const [schoolLat, setSchoolLat] = useState<number>(activeSchool.latitude || primaryGate.lat || 13.736717);
  const [schoolLng, setSchoolLng] = useState<number>(activeSchool.longitude || primaryGate.lng || 100.523186);
  const [schoolRadius, setSchoolRadius] = useState<number>(activeSchool.geofenceRadiusMeters || primaryGate.radiusMeters || 250);

  // Editable Gates list
  const [gatesList, setGatesList] = useState<CampusGateGeofence[]>(campusGates);
  const [isLocating, setIsLocating] = useState(false);
  const [locateStatus, setLocateStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live test distance state
  const [currentDeviceCoords, setCurrentDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [testResult, setTestResult] = useState<{ distance: number; isInside: boolean } | null>(null);

  // Sync state if activeSchool or campusGates prop changes
  useEffect(() => {
    setGatesList(campusGates);
    if (activeSchool.latitude && activeSchool.longitude) {
      setSchoolLat(activeSchool.latitude);
      setSchoolLng(activeSchool.longitude);
      setSchoolRadius(activeSchool.geofenceRadiusMeters || 250);
    } else if (campusGates.length > 0) {
      const prim = campusGates.find(g => g.isPrimary) || campusGates[0];
      setSchoolLat(prim.lat);
      setSchoolLng(prim.lng);
      setSchoolRadius(prim.radiusMeters);
    }
  }, [activeSchool.id, campusGates]);

  // Haversine formula to compute distance in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  // Get current device GPS coordinates
  const handleDetectCurrentLocation = (targetGateId?: string) => {
    if (!navigator.geolocation) {
      setLocateStatus({
        type: 'error',
        message: lang === 'th' ? 'เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด Geolocation' : 'Geolocation is not supported by your browser.'
      });
      return;
    }

    setIsLocating(true);
    setLocateStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setIsLocating(false);
        setCurrentDeviceCoords({ lat: latitude, lng: longitude });

        if (targetGateId) {
          // Update specific gate
          setGatesList(prev => prev.map(g => g.id === targetGateId ? { ...g, lat: Number(latitude.toFixed(6)), lng: Number(longitude.toFixed(6)) } : g));
          setLocateStatus({
            type: 'success',
            message: lang === 'th' 
              ? `อัปเดตพิกัดจุดตรวจสำเร็จ! (ความแม่นยำ ±${Math.round(accuracy)} เมตร)` 
              : `Gate location updated! (Accuracy ±${Math.round(accuracy)}m)`
          });
        } else {
          // Update main school coordinates
          setSchoolLat(Number(latitude.toFixed(6)));
          setSchoolLng(Number(longitude.toFixed(6)));
          
          // Also sync to primary gate
          setGatesList(prev => prev.map(g => g.isPrimary ? { ...g, lat: Number(latitude.toFixed(6)), lng: Number(longitude.toFixed(6)) } : g));

          setLocateStatus({
            type: 'success',
            message: lang === 'th' 
              ? `ดึงพิกัด GPS สำเร็จ: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (ความแม่นยำ ±${Math.round(accuracy)} เมตร)` 
              : `GPS detected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (Accuracy ±${Math.round(accuracy)}m)`
          });
        }

        setTimeout(() => setLocateStatus(null), 5000);
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = lang === 'th' ? 'ไม่สามารถดึงพิกัด GPS ได้' : 'Unable to acquire GPS position';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = lang === 'th' ? 'ผู้ใช้ปฏิเสธการเข้าถึงตำแหน่ง GPS (โปรดอนุญาต Location Permission)' : 'GPS access denied by user.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = lang === 'th' ? 'สัญญาณดาวเทียม GPS ไม่พร้อมใช้งาน' : 'GPS signal unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = lang === 'th' ? 'หมดเวลาในการค้นหาสัญญาณพิกัด GPS' : 'GPS request timed out.';
        }
        setLocateStatus({ type: 'error', message: errorMsg });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Test distance from current device to school
  const handleTestDistance = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentDeviceCoords({ lat: latitude, lng: longitude });
        const distance = calculateDistance(latitude, longitude, schoolLat, schoolLng);
        setTestResult({
          distance,
          isInside: distance <= schoolRadius
        });
      },
      (err) => {
        alert(lang === 'th' ? 'กรุณาอนุญาตสิทธิ์ Location ในเบราว์เซอร์เพื่อทดสอบระยะทาง' : 'Please allow Location permission to test distance');
      },
      { enableHighAccuracy: true }
    );
  };

  // Add new gate
  const handleAddNewGate = () => {
    const newGate: CampusGateGeofence = {
      id: `gate-${activeSchool.id}-${Date.now()}`,
      schoolId: activeSchool.id,
      nameTh: `จุดเช็กชื่อใหม่ ${gatesList.length + 1}`,
      nameEn: `Gate Zone ${gatesList.length + 1}`,
      lat: Number((schoolLat + (Math.random() - 0.5) * 0.001).toFixed(6)),
      lng: Number((schoolLng + (Math.random() - 0.5) * 0.001).toFixed(6)),
      radiusMeters: 100,
      isPrimary: gatesList.length === 0,
      type: 'main_gate'
    };
    setGatesList(prev => [...prev, newGate]);
  };

  // Remove gate
  const handleRemoveGate = (gateId: string) => {
    if (gatesList.length <= 1) {
      alert(lang === 'th' ? 'ต้องมีจุดเช็กชื่อพิกัด Geofence อย่างน้อย 1 จุดในโรงเรียน' : 'At least one campus gate must remain.');
      return;
    }
    setGatesList(prev => prev.filter(g => g.id !== gateId));
  };

  // Set primary gate
  const handleSetPrimary = (gateId: string) => {
    setGatesList(prev => prev.map(g => ({
      ...g,
      isPrimary: g.id === gateId
    })));
    const target = gatesList.find(g => g.id === gateId);
    if (target) {
      setSchoolLat(target.lat);
      setSchoolLng(target.lng);
      setSchoolRadius(target.radiusMeters);
    }
  };

  // Save all GPS configuration
  const handleSaveAll = () => {
    // 1. Update gates
    onUpdateCampusGates(gatesList);

    // 2. Update school coordinates if callback provided
    if (onUpdateSchoolCoordinates) {
      onUpdateSchoolCoordinates(schoolLat, schoolLng, schoolRadius);
    }

    // 3. Save to localStorage with activeSchool.id for persistence
    try {
      localStorage.setItem(`eduverse_campus_gates_${activeSchool.id}`, JSON.stringify(gatesList));
      localStorage.setItem(`eduverse_school_gps_${activeSchool.id}`, JSON.stringify({
        latitude: schoolLat,
        longitude: schoolLng,
        geofenceRadiusMeters: schoolRadius
      }));
    } catch (e) {
      console.warn('Failed to save GPS settings to localStorage', e);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto pr-1">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <MapPin className="w-4 h-4 text-emerald-400" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>{lang === 'th' ? 'การตั้งค่าพิกัด GPS & รัศมี Geofence ประจำโรงเรียน' : 'School GPS Coordinates & Campus Geofence Setup'}</span>
            </h2>
          </div>
          <p className="text-xs text-blue-200/90 leading-relaxed">
            {lang === 'th' 
              ? `ผู้ดูแลระบบ (Admin) โรงเรียน ${activeSchool.nameTh} (${activeSchool.code}) สามารถกำหนดพิกัดดาวเทียมและรัศมีที่อนุญาตให้นักเรียน/ครูเช็กชื่อถ่ายรูปได้`
              : `Admins of ${activeSchool.nameEn} can configure central GPS coordinates and allowable radius for selfie attendance verification.`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4 text-slate-950" />
            <span>{lang === 'th' ? 'บันทึกพิกัด GPS โรงเรียน' : 'Save GPS Settings'}</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === 'th' ? `บันทึกพิกัด GPS และจุดเช็กชื่อ ${gatesList.length} จุดสำหรับ ${activeSchool.nameTh} เรียบร้อยแล้ว!` : `Saved GPS settings with ${gatesList.length} gate zones!`}</span>
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
            Active School: {activeSchool.code}
          </span>
        </div>
      )}

      {/* Locate Feedback Message */}
      {locateStatus && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          locateStatus.type === 'success' 
            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
        }`}>
          {locateStatus.type === 'success' ? (
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{locateStatus.message}</span>
        </div>
      )}

      {/* Top 2 Columns: Center Coordinates Configuration & Live Distance Test */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Column 1: School Center GPS Settings */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'th' ? '1. พิกัดศูนย์กลางโรงเรียน (Central School Coordinates)' : '1. School Central GPS Coordinates'}
              </h3>
            </div>
            <button
              type="button"
              disabled={isLocating}
              onClick={() => handleDetectCurrentLocation()}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 transition cursor-pointer disabled:opacity-50"
              title="ดึงพิกัด GPS อัตโนมัติจากตำแหน่งที่คุณยืนอยู่ขณะนี้"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? (lang === 'th' ? 'กำลังค้นหา...' : 'Locating...') : (lang === 'th' ? 'ดึงพิกัดจุดที่ฉันอยู่' : 'Use My GPS')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Latitude Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ละติจูด (Latitude - N/S)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={schoolLat}
                  onChange={(e) => setSchoolLat(parseFloat(e.target.value) || 0)}
                  placeholder="เช่น 13.736717"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                องศาทศนิยม (Decimal Degrees เช่น 13.xxxxxx)
              </span>
            </div>

            {/* Longitude Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ลองจิจูด (Longitude - E/W)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={schoolLng}
                  onChange={(e) => setSchoolLng(parseFloat(e.target.value) || 0)}
                  placeholder="เช่น 100.523186"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                องศาทศนิยม (Decimal Degrees เช่น 100.xxxxxx)
              </span>
            </div>
          </div>

          {/* Fence Radius Slider */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-500" />
                <span>รัศมีขอบเขตโรงเรียนที่อนุญาต (Geofence Radius):</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs">
                {schoolRadius} เมตร
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={schoolRadius}
              onChange={(e) => setSchoolRadius(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer"
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[50, 100, 200, 300, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSchoolRadius(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    schoolRadius === preset
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {preset} ม.
                </button>
              ))}
              <span className="text-[10px] text-slate-500 ml-auto">
                {schoolRadius <= 100 ? '🟢 แม่นยำสูง (ป้อม/หน้าประตู)' : schoolRadius <= 300 ? '🔵 มาตรฐาน (ครอบคลุมทั้งรั้ว)' : '🟠 พื้นที่กว้าง (รวมสนามกีฬา/อาคารรอบนอก)'}
              </span>
            </div>
          </div>

          {/* Quick Action links */}
          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800">
            <a
              href={`https://www.google.com/maps?q=${schoolLat},${schoolLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดดูพิกัดนี้บน Google Maps</span>
            </a>

            <span className="text-[11px] text-slate-500">
              พิกัดปัจจุบัน: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{schoolLat.toFixed(5)}, {schoolLng.toFixed(5)}</code>
            </span>
          </div>
        </div>

        {/* Column 2: Live Distance Calibration & Radar Test */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'th' ? '2. ทดสอบวัดระยะจากตำแหน่งจริง' : '2. Live Distance Calibration'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleTestDistance}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'คำนวณระยะห่าง' : 'Test Distance'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {lang === 'th'
                ? 'กดเพื่อวัดระยะจริงระหว่างอุปกรณ์เครื่องนี้กับพิกัดโรงเรียน เพื่อทดสอบว่าหากนักเรียนหรือครูเช็กชื่อตรงนี้ ระบบจะอนุญาตหรือไม่'
                : 'Test if your current location falls within the geofenced attendance perimeter.'}
            </p>

            {testResult ? (
              <div className={`mt-3 p-3.5 rounded-xl border ${
                testResult.isInside
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    {testResult.isInside ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span>{testResult.isInside ? 'อยู่ในขอบเขตรั้วโรงเรียน (เช็กชื่อได้)' : 'อยู่นอกรั้วโรงเรียน (ไม่สามารถเช็กชื่อ)'}</span>
                  </span>
                  <span className="font-mono font-black text-sm">
                    {testResult.distance.toLocaleString()} เมตร
                  </span>
                </div>
                <div className="text-[11px] mt-1 text-slate-600 dark:text-slate-300">
                  ระยะทางจริง: {testResult.distance} ม. / รัศมีที่อนุญาต: {schoolRadius} ม.
                </div>
              </div>
            ) : (
              <div className="mt-3 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                ยังไม่ได้ทดสอบระยะ — กดปุ่ม "คำนวณระยะห่าง" ด้านบนเพื่อเริ่มทดสอบ
              </div>
            )}
          </div>

          {/* Geofence Radar Preview Indicator */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ระบบสแกนเซลฟี่ Geofence:
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
              พร้อมใช้งาน (Active)
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Multiple Campus Gate Zones Table */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>3. รายชื่อจุดเช็กชื่อ & ประตูโรงเรียน ({gatesList.length} จุด)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              สามารถเพิ่มประตูหลายจุด เช่น ประตูหน้า, ประตูหลัง, โรงอาหาร หรือลานจอดรถ เพื่อให้นักเรียนและครูเลือกจุดเช็กชื่อที่ใกล้ที่สุดได้
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddNewGate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มจุดเช็กชื่อใหม่</span>
          </button>
        </div>

        {/* Gate Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {gatesList.map((gate, index) => (
            <div
              key={gate.id}
              className={`p-3.5 rounded-xl border transition ${
                gate.isPrimary
                  ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                    gate.isPrimary ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <input
                      type="text"
                      value={gate.nameTh}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGatesList(prev => prev.map(g => g.id === gate.id ? { ...g, nameTh: val } : g));
                      }}
                      className="text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden px-1"
                      placeholder="ชื่อจุดเช็กชื่อ (ไทย)"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(gate.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                      gate.isPrimary
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                    title="กำหนดให้เป็นจุดหลักของโรงเรียน"
                  >
                    {gate.isPrimary ? '★ ประตูหลัก' : 'ตั้งเป็นหลัก'}
                  </button>

                  {gatesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGate(gate.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="ลบจุดตรวจนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Coordinates Inputs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">ละติจูด (Lat)</span>
                  <input
                    type="number"
                    step="any"
                    value={gate.lat}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setGatesList(prev => prev.map(g => g.id === gate.id ? { ...g, lat: val } : g));
                    }}
                    className="w-full px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-medium">ลองจิจูด (Lng)</span>
                  <input
                    type="number"
                    step="any"
                    value={gate.lng}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setGatesList(prev => prev.map(g => g.id === gate.id ? { ...g, lng: val } : g));
                    }}
                    className="w-full px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Radius & Type Row */}
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">รัศมี:</span>
                  <input
                    type="number"
                    min="10"
                    max="800"
                    step="10"
                    value={gate.radiusMeters}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 50;
                      setGatesList(prev => prev.map(g => g.id === gate.id ? { ...g, radiusMeters: val } : g));
                    }}
                    className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-center"
                  />
                  <span className="text-[10px] text-slate-500">ม.</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDetectCurrentLocation(gate.id)}
                    className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="ใช้พิกัดตำแหน่งที่คุณยืนอยู่ตอนนี้"
                  >
                    <LocateFixed className="w-3 h-3" />
                    <span>ใช้พิกัดนี้</span>
                  </button>
                  <a
                    href={`https://www.google.com/maps?q=${gate.lat},${gate.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="ดูบน Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
