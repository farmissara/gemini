import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Image as ImageIcon, 
  FlipHorizontal,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';

interface ImageCaptureUploadModalProps {
  isOpen: boolean;
  currentImageUrl?: string;
  title?: string;
  onSelectImage: (imageUrl: string) => void;
  onClose: () => void;
}

export const ImageCaptureUploadModal: React.FC<ImageCaptureUploadModalProps> = ({
  isOpen,
  currentImageUrl,
  title = 'อัปเดตรูปโปรไฟล์ (Profile Photo)',
  onSelectImage,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'presets' | 'url'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl || '');
  const [urlInput, setUrlInput] = useState<string>(currentImageUrl || '');
  
  // Camera state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [presetPage, setPresetPage] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preset educator and student avatars
  const PRESET_AVATARS = [
    // Educators & Teachers
    {
      id: 'tch-m-1',
      label: 'ครูผู้ชาย (ทางการ)',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'tch-f-1',
      label: 'ครูผู้หญิง (ทางการ)',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'tch-f-2',
      label: 'ครูผู้หญิง (วิชาการ)',
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'tch-m-2',
      label: 'ครูผู้ชาย (รุ่นใหม่)',
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'tch-f-3',
      label: 'ครูผู้หญิง (ภาษา)',
      url: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=300&auto=format&fit=crop&q=80',
    },
    // Students
    {
      id: 'stu-m-1',
      label: 'นักเรียนชาย ม.ปลาย',
      url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'stu-f-1',
      label: 'นักเรียนหญิง ม.ปลาย',
      url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'stu-m-2',
      label: 'นักเรียนชาย ม.ต้น',
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'stu-f-2',
      label: 'นักเรียนหญิง สดใส',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'adm-1',
      label: 'ผู้บริหาร/แอดมิน',
      url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
    },
  ];

  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentImageUrl || '');
      setUrlInput(currentImageUrl || '');
      setPresetPage(0);
      setCapturedPhotoUrl(null);
      setCameraError(null);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, currentImageUrl]);

  // Handle switching to camera tab
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [activeTab, isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsCapturing(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('อุปกรณ์นี้ไม่รองรับการเข้าถึงกล้อง (Webcam API)');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(err.message || 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องหรือใช้วิธีอัปโหลดไฟล์แทน');
    } finally {
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture snapshot from live video
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 400, video.videoHeight || 400);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop square
    const sx = ((video.videoWidth || size) - size) / 2;
    const sy = ((video.videoHeight || size) - size) / 2;

    // Flip if front camera
    if (facingMode === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhotoUrl(dataUrl);
    setPreviewUrl(dataUrl);
    stopCamera();
  };

  const retakeSnapshot = () => {
    setCapturedPhotoUrl(null);
    startCamera();
  };

  // File Upload Handler (Base64 conversion)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (previewUrl) {
      onSelectImage(previewUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">{title}</h3>
              <p className="text-xs text-indigo-200/80">ถ่ายรูปสด อัปโหลดจากเครื่อง หรือเลือก Avatar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>อัปโหลดไฟล์</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>ถ่ายรูปจากกล้อง</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>คลัง Avatar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>ใส่ลิงก์ URL</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 min-h-0 overflow-hidden flex-1 space-y-4">
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600 flex items-center justify-center mb-3 transition">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="font-bold text-sm text-slate-800">แตะเพื่อเลือกรูปภาพจากเครื่อง</p>
                <p className="text-xs text-slate-500 mt-1">รองรับ JPG, PNG, WEBP (เลือกจากอัลบั้มหรือกล้องมือถือ)</p>
              </div>

              {previewUrl && (
                <div className="flex flex-col items-center pt-2">
                  <span className="text-xs font-semibold text-slate-500 mb-2">ตัวอย่างรูปภาพที่เลือก:</span>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE CAMERA SNAPSHOT */}
          {activeTab === 'camera' && (
            <div className="space-y-4 flex flex-col items-center">
              {cameraError ? (
                <div className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <p className="font-bold">ไม่สามารถเปิดกล้องได้</p>
                    <p className="mt-0.5">{cameraError}</p>
                    <p className="mt-2 text-slate-600 font-medium">
                      💡 แนะนำ: สลับไปแท็บ <strong>"อัปโหลดไฟล์"</strong> เพื่อถ่ายรูปผ่านกล้องมือถือโดยตรงได้เช่นกัน
                    </p>
                  </div>
                </div>
              ) : capturedPhotoUrl ? (
                /* Snapshot Captured Preview */
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative">
                    <img
                      src={capturedPhotoUrl}
                      alt="Captured"
                      className="w-56 h-56 rounded-3xl object-cover border-4 border-indigo-600 shadow-2xl"
                    />
                    <div className="absolute top-2 right-2 px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow">
                      ถ่ายสำเร็จ ✓
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={retakeSnapshot}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ถ่ายรูปใหม่</span>
                  </button>
                </div>
              ) : (
                /* Live Camera Feed */
                <div className="flex flex-col items-center space-y-3 w-full">
                  <div className="relative w-64 h-64 bg-slate-900 rounded-3xl overflow-hidden border-2 border-indigo-500 shadow-xl flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                    {isCapturing && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs">
                        กำลังเชื่อมต่อกล้อง...
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={flipCamera}
                      className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shadow-sm"
                      title="สลับกล้องหน้า/หลัง"
                    >
                      <FlipHorizontal className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={takeSnapshot}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/30 flex items-center gap-2 active:scale-95 transition cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span>กดถ่ายภาพ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRESET AVATARS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">เลือกรูป Avatar สำเร็จรูปที่เหมาะสมกับคุณ:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRESET_AVATARS.slice(presetPage * 6, (presetPage + 1) * 6).map((avatar) => {
                  const isSelected = previewUrl === avatar.url;
                  return (
                    <div
                      key={avatar.id}
                      onClick={() => setPreviewUrl(avatar.url)}
                      className={`relative p-2 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="w-16 h-16 rounded-xl object-cover shadow-sm"
                      />
                      <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                        {avatar.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {PRESET_AVATARS.length > 6 && (
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => setPresetPage(page => Math.max(0, page - 1))} disabled={presetPage === 0} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">ก่อนหน้า</button>
                  <span>หน้า {presetPage + 1} / {Math.ceil(PRESET_AVATARS.length / 6)} · {PRESET_AVATARS.length} รูป</span>
                  <button type="button" onClick={() => setPresetPage(page => Math.min(Math.ceil(PRESET_AVATARS.length / 6) - 1, page + 1))} disabled={presetPage >= Math.ceil(PRESET_AVATARS.length / 6) - 1} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">ถัดไป</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIRECT URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วางลิงก์รูปภาพโดยตรง (Image URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setPreviewUrl(e.target.value);
                    }}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {previewUrl && (
                <div className="flex flex-col items-center pt-2">
                  <span className="text-xs font-semibold text-slate-500 mb-2">ตัวอย่างรูปภาพ:</span>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    onError={() => alert('ไม่สามารถโหลดภาพจากลิงก์นี้ได้ กรุณาตรวจสอบ URL')}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-lg"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {previewUrl && (
              <div className="flex items-center gap-2">
                <img
                  src={previewUrl}
                  alt="Current"
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-sm"
                />
                <span className="text-xs font-bold text-slate-700 hidden sm:inline">รูปภาพที่เลือก</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={!previewUrl}
              onClick={handleConfirm}
              className={`px-5 py-2 rounded-xl text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                previewUrl
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 active:scale-95'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>บันทึกรูปภาพ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
