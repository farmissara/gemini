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
  RefreshCw,
  LocateFixed,
  Sparkles,
  Layers,
  Activity,
  Sliders,
  Copy
} from 'lucide-react';

interface SchoolGpsSettingsCardProps {
  activeSchool: School;
  campusGates: CampusGateGeofence[];
  lang?: AppLanguage;
  onUpdateCampusGates: (gates: CampusGateGeofence[]) => void;
  onUpdateSchoolCoordinates?: (lat: number, lng: number, radius: number) => void;
}

type GpsSubTab = 'center_geofence' | 'campus_gates' | 'radar_test';

export const SchoolGpsSettingsCard: React.FC<SchoolGpsSettingsCardProps> = ({
  activeSchool,
  campusGates,
  lang = 'th',
  onUpdateCampusGates,
  onUpdateSchoolCoordinates
}) => {
  const [activeTab, setActiveTab] = useState<GpsSubTab>('center_geofence');

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
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Live test distance state
  const [currentDeviceCoords, setCurrentDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [testResult, setTestResult] = useState<{ distance: number; isInside: boolean } | null>(null);
  const [isTestingDistance, setIsTestingDistance] = useState(false);

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
        const latVal = Number(latitude.toFixed(6));
        const lngVal = Number(longitude.toFixed(6));
        setCurrentDeviceCoords({ lat: latVal, lng: lngVal });

        if (targetGateId) {
          // Update specific gate
          setGatesList(prev => prev.map(g => g.id === targetGateId ? { ...g, lat: latVal, lng: lngVal } : g));
          setLocateStatus({
            type: 'success',
            message: lang === 'th' 
              ? `อัปเดตพิกัดจุดตรวจสำเร็จ! (ความแม่นยำ ±${Math.round(accuracy)} ม.)` 
              : `Gate location updated! (Accuracy ±${Math.round(accuracy)}m)`
          });
        } else {
          // Update main school coordinates
          setSchoolLat(latVal);
          setSchoolLng(lngVal);
          
          // Also sync to primary gate
          setGatesList(prev => prev.map(g => g.isPrimary ? { ...g, lat: latVal, lng: lngVal } : g));

          setLocateStatus({
            type: 'success',
            message: lang === 'th' 
              ? `ดึงพิกัด GPS สำเร็จ: ${latVal}, ${lngVal} (ความแม่นยำ ±${Math.round(accuracy)} ม.)` 
              : `GPS detected: ${latVal}, ${lngVal} (Accuracy ±${Math.round(accuracy)}m)`
          });
        }

        setTimeout(() => setLocateStatus(null), 5000);
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = lang === 'th' ? 'ไม่สามารถดึงพิกัด GPS ได้' : 'Unable to acquire GPS position';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = lang === 'th' ? 'ผู้ใช้ปฏิเสธการเข้าถึงตำแหน่ง GPS (โปรดอนุญาต Location Permission ในเบราว์เซอร์)' : 'GPS access denied by user.';
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

  // Preset Thai Landmark coordinates
  const presetLocations = [
    { label: 'กรุงเทพฯ (สยาม/ปทุมวัน)', lat: 13.736717, lng: 100.523186 },
    { label: 'กรุงเทพฯ (จตุจักร/ลาดพร้าว)', lat: 13.803607, lng: 100.553925 },
    { label: 'เชียงใหม่ (มช./สุเทพ)', lat: 18.795278, lng: 98.952778 },
    { label: 'ขอนแก่น (กังสดาล/มข.)', lat: 16.474167, lng: 102.823611 },
    { label: 'สงขลา (หาดใหญ่)', lat: 7.008333, lng: 100.476667 },
  ];

  // Test distance from current device to school
  const handleTestDistance = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported');
      return;
    }

    setIsTestingDistance(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsTestingDistance(false);
        const { latitude, longitude } = pos.coords;
        const latVal = Number(latitude.toFixed(6));
        const lngVal = Number(longitude.toFixed(6));
        setCurrentDeviceCoords({ lat: latVal, lng: lngVal });
        const distance = calculateDistance(latitude, longitude, schoolLat, schoolLng);
        setTestResult({
          distance,
          isInside: distance <= schoolRadius
        });
      },
      () => {
        setIsTestingDistance(false);
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

  // Copy coordinates
  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${schoolLat}, ${schoolLng}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
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
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Top Header Bar */}
      <div className="shrink-0 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <MapPin className="w-4 h-4 text-emerald-400" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>{lang === 'th' ? 'กำหนดพิกัด GPS ประจำโรงเรียน' : 'School GPS & Geofence Settings'}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-800/80 text-blue-200 border border-blue-600/40">
                {activeSchool.nameTh}
              </span>
            </h2>
          </div>
          <p className="text-xs text-blue-200/90 leading-relaxed">
            {lang === 'th' 
              ? 'ผู้ดูแลระบบสามารถกำหนดละติจูด ลองจิจูด รัศมีเขตโรงเรียน และประตูสแกนเข้าเรียนได้โดยตรง'
              : 'School admins can configure latitude, longitude, allowable check-in radius, and gate geofences.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
          >
            <Save className="w-3.5 h-3.5 text-slate-950" />
            <span>{lang === 'th' ? 'บันทึกพิกัดโรงเรียน' : 'Save GPS Settings'}</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="shrink-0 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === 'th' ? `บันทึกพิกัด GPS (${schoolLat}, ${schoolLng}) และ ${gatesList.length} ประตูของ ${activeSchool.nameTh} สำเร็จแล้ว!` : `Saved GPS settings (${schoolLat}, ${schoolLng}) successfully!`}</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
            {activeSchool.code}
          </span>
        </div>
      )}

      {/* Feedback Message */}
      {locateStatus && (
        <div className={`shrink-0 p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          locateStatus.type === 'success' 
            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
        }`}>
          {locateStatus.type === 'success' ? (
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{locateStatus.message}</span>
        </div>
      )}

      {/* Subtabs Selector Header */}
      <div className="shrink-0 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('center_geofence')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'center_geofence'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. จุดเช็กชื่อ &amp; ประตูโรงเรียน ({gatesList.length} จุด)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('radar_test')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'radar_test'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>3. เรดาร์จำลอง &amp; ทดสอบระยะ</span>
          {testResult && (
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${testResult.isInside ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>
              {testResult.isInside ? 'อยู่ในเขต' : 'นอกเขต'}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content Panel - fills height without outer scrolling */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* TAB 1: SCHOOL CENTER & GEOFENCE RADIUS */}
        {activeTab === 'center_geofence' && (
          <div className="h-full flex flex-col min-h-0 overflow-y-auto space-y-3 pr-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Coordinates Inputs Card */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      ช่องกรอกพิกัด GPS ละติจูด / ลองจิจูด
                    </h3>
                  </div>

                  <button
                    type="button"
                    disabled={isLocating}
                    onClick={() => handleDetectCurrentLocation()}
                    className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 transition cursor-pointer disabled:opacity-50"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'กำลังดึงพิกัด...' : 'ดึงพิกัดจากตำแหน่งปัจจุบัน'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Latitude */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ละติจูด (Latitude - N/S) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={schoolLat}
                      onChange={(e) => setSchoolLat(parseFloat(e.target.value) || 0)}
                      placeholder="เช่น 13.736717"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      ตัวเลขทศนิยม เช่น 13.736717
                    </span>
                  </div>

                  {/* Longitude */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ลองจิจูด (Longitude - E/W) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={schoolLng}
                      onChange={(e) => setSchoolLng(parseFloat(e.target.value) || 0)}
                      placeholder="เช่น 100.523186"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      ตัวเลขทศนิยม เช่น 100.523186
                    </span>
                  </div>
                </div>

                {/* Geofence Radius Slider */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-indigo-500" />
                      <span>รัศมีขอบเขตที่อนุญาต (Geofence Radius):</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs">
                      {schoolRadius} เมตร
                    </span>
                  </div>

                  <input
                    type="range"
                    min="30"
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
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                          schoolRadius === preset
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {preset} ม.
                      </button>
                    ))}
                    <span className="text-[10px] text-slate-500 ml-auto">
                      {schoolRadius <= 100 ? '🟢 เขตประตูหน้า' : schoolRadius <= 300 ? '🔵 ครอบคลุมรั้วโรงเรียน' : '🟠 รวมสนามกีฬา/อาคารรอบนอก'}
                    </span>
                  </div>
                </div>

                {/* Action Links & Copy */}
                <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCoords ? 'คัดลอกแล้ว!' : 'คัดลอกพิกัด'}</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps?q=${schoolLat},${schoolLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดพิกัดบน Google Maps</span>
                  </a>
                </div>
              </div>

              {/* Thailand Landmark Presets & Map Visual */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
                    พิกัดตัวอย่างโรงเรียน / วิทยาเขตในไทย
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-2">
                    คลิกเพื่อเลือกพิกัดตัวอย่างสำหรับทดลองระบบเช็กชื่อ Geofence
                  </p>

                  <div className="space-y-1.5">
                    {presetLocations.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSchoolLat(item.lat);
                          setSchoolLng(item.lng);
                          setGatesList(prev => prev.map(g => g.isPrimary ? { ...g, lat: item.lat, lng: item.lng } : g));
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition border cursor-pointer ${
                          Math.abs(schoolLat - item.lat) < 0.001 && Math.abs(schoolLng - item.lng) < 0.001
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>{item.label}</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mini Visual Radar Box */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-white flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full border border-emerald-500/50 flex items-center justify-center shrink-0 bg-emerald-950/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                    <MapPin className="w-5 h-5 text-amber-400 relative z-10" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>ศูนย์กลางพิกัด: {activeSchool.nameTh}</span>
                    </div>
                    <div className="font-mono text-[11px] text-emerald-400 truncate">
                      Lat: {schoolLat.toFixed(5)} • Lng: {schoolLng.toFixed(5)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      รัศมีตรวจจับ: {schoolRadius} ม. • จุดตรวจย่อย: {gatesList.length} จุด
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
            <div className="shrink-0 flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>จุดตรวจสแกนเข้าเรียนและประตูวิทยาเขต ({gatesList.length} จุด)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ครูและนักเรียนสามารถสแกนบัตรหรือถ่ายรูปเช็กชื่อผ่านรัศมีของจุดตรวจใดก็ได้ที่ใกล้ที่สุด
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddNewGate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มจุดตรวจใหม่</span>
              </button>
            </div>

            {/* Gates Cards Grid - scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              {gatesList.map((gate, index) => (
                <div
                  key={gate.id}
                  className={`p-3 rounded-xl border transition ${
                    gate.isPrimary
                      ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
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
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {gate.isPrimary ? '★ จุดหลัก' : 'ตั้งเป็นหลัก'}
                      </button>

                      {gatesList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGate(gate.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lat / Lng / Radius Inputs */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
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
                        className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
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
                        className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">รัศมี (ม.)</span>
                      <input
                        type="number"
                        value={gate.radiusMeters}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 50;
                          setGatesList(prev => prev.map(g => g.id === gate.id ? { ...g, radiusMeters: val } : g));
                        }}
                        className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Quick locate button for this gate */}
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 capitalize">
                      ประเภท: {gate.type.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDetectCurrentLocation(gate.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <LocateFixed className="w-3 h-3" />
                      <span>ดึงพิกัดจุดนี้จาก GPS</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RADAR SIMULATION & LIVE TEST */}
        {activeTab === 'radar_test' && (
          <div className="h-full flex flex-col min-h-0 overflow-y-auto space-y-3 pr-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Distance Calibrator */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      ทดสอบวัดระยะจากตำแหน่งจริงของอุปกรณ์
                    </h3>
                  </div>

                  <button
                    type="button"
                    disabled={isTestingDistance}
                    onClick={handleTestDistance}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingDistance ? 'animate-spin' : ''}`} />
                    <span>{isTestingDistance ? 'กำลังคำนวณ...' : 'คำนวณระยะห่างเดี๋ยวนี้'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  ระบบจะอ่านพิกัดดาวเทียมของอุปกรณ์ปัจจุบัน และคำนวณระยะทางถึงศูนย์กลางโรงเรียน ({schoolLat.toFixed(5)}, {schoolLng.toFixed(5)}) โดยใช้สูตร Haversine
                </p>

                {testResult ? (
                  <div className={`p-4 rounded-xl border ${
                    testResult.isInside
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm flex items-center gap-2">
                        {testResult.isInside ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        )}
                        <span>{testResult.isInside ? 'อยู่ในขอบเขตรั้วโรงเรียน (สามารถเช็กชื่อได้)' : 'อยู่นอกขอบเขตรั้วโรงเรียน (เช็กชื่อไม่ได้)'}</span>
                      </span>
                      <span className="font-mono font-black text-base">
                        {testResult.distance.toLocaleString()} เมตร
                      </span>
                    </div>

                    <div className="text-xs mt-2 pt-2 border-t border-current/20 flex items-center justify-between">
                      <span>ระยะห่างจริง: <strong>{testResult.distance} ม.</strong></span>
                      <span>รัศมีที่อนุญาต: <strong>{schoolRadius} ม.</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    กดปุ่ม "คำนวณระยะห่างเดี๋ยวนี้" เพื่อทดสอบตำแหน่งปัจจุบันของคุณเทียบกับพิกัดโรงเรียน
                  </div>
                )}

                {currentDeviceCoords && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    ตำแหน่งอุปกรณ์ปัจจุบัน: Lat {currentDeviceCoords.lat.toFixed(6)}, Lng {currentDeviceCoords.lng.toFixed(6)}
                  </div>
                )}
              </div>

              {/* Animated Radar Visual */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950 border border-slate-800 text-white flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative w-36 h-36 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-emerald-500/20 scale-75" />
                  <div className="absolute inset-0 rounded-full border border-emerald-500/10 scale-50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute z-10" />
                  <div className="absolute top-2 text-[9px] text-emerald-400/80 font-mono">N 0°</div>
                  <div className="absolute bottom-2 text-[9px] text-emerald-400/80 font-mono">S 180°</div>
                  <div className="absolute left-2 text-[9px] text-emerald-400/80 font-mono">W 270°</div>
                  <div className="absolute right-2 text-[9px] text-emerald-400/80 font-mono">E 90°</div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-300">
                    EduVerse Geofence Radar
                  </span>
                  <p className="text-[11px] text-slate-400">
                    ตรวจจับตำแหน่งอัตโนมัติสำหรับการสแกนบัตรนักเรียนผ่านแอปพลิเคชัน
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
