import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Check, 
  RefreshCw, 
  Sparkles, 
  SwitchCamera,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import {
  openCameraStream,
  stopCameraStream,
  formatCameraErrorTh,
  type CameraFacingMode,
} from '../../lib/cameraStream';
import { compressImageFileToDataUrl } from '../../lib/imageCompression';

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
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const facingModeRef = useRef<CameraFacingMode>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('user');
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
      setCameraNotice(null);
      setUploadError(null);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, currentImageUrl]);

  // Handle switching to camera tab or changing front/rear camera
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !capturedPhotoUrl) {
      void startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, isOpen, facingMode, capturedPhotoUrl]);

  const startCamera = async (targetFacingMode: CameraFacingMode = facingModeRef.current) => {
    const requestId = ++cameraRequestRef.current;
    facingModeRef.current = targetFacingMode;
    setCameraError(null);
    setCameraNotice(null);
    setIsCapturing(true);

    try {
      const result = await openCameraStream({
        facingMode: targetFacingMode,
        currentStream: cameraStreamRef.current,
        videoEl: videoRef.current,
        idealWidth: 960,
        idealHeight: 960,
        allowAnyFallback: true,
        isCancelled: () => cameraRequestRef.current !== requestId,
      });

      if (cameraRequestRef.current !== requestId) {
        stopCameraStream(result.stream, null);
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stopCameraStream(result.stream, null);
        return;
      }

      cameraStreamRef.current = result.stream;
      video.srcObject = result.stream;
      try {
        await video.play();
      } catch {
        // Autoplay attribute handles playback
      }

      if (cameraRequestRef.current !== requestId) {
        stopCameraStream(result.stream, video);
        return;
      }

      facingModeRef.current = result.resolvedFacingMode;
      if (result.resolvedFacingMode !== facingMode) {
        setFacingMode(result.resolvedFacingMode);
      }

      if (result.requestedUnavailable) {
        setCameraNotice(
          targetFacingMode === 'environment'
            ? 'อุปกรณ์นี้มีกล้องเพียง 1 ตัว จึงแสดงภาพจากกล้องที่มีอยู่'
            : 'แสดงภาพจากกล้องที่มีอยู่บนอุปกรณ์นี้'
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'CAMERA_CANCELLED') {
        return;
      }
      if (cameraRequestRef.current !== requestId) return;
      console.warn('Camera error:', err);
      setCameraError(formatCameraErrorTh(err, targetFacingMode));
    } finally {
      if (cameraRequestRef.current === requestId) {
        setIsCapturing(false);
      }
    }
  };

  const stopCamera = () => {
    cameraRequestRef.current++;
    stopCameraStream(cameraStreamRef.current, videoRef.current);
    cameraStreamRef.current = null;
    setIsCapturing(false);
  };

  const flipCamera = () => {
    if (isCapturing) return;
    const nextMode: CameraFacingMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    facingModeRef.current = nextMode;
    setFacingMode(nextMode);
  };

  // Capture snapshot from live video
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const sourceCropSize = Math.min(video.videoWidth || 320, video.videoHeight || 320);
    const outputSize = Math.min(320, sourceCropSize);
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop square
    const sx = ((video.videoWidth || sourceCropSize) - sourceCropSize) / 2;
    const sy = ((video.videoHeight || sourceCropSize) - sourceCropSize) / 2;

    // Flip if front camera
    if (facingMode === 'user') {
      ctx.translate(outputSize, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, sourceCropSize, sourceCropSize, 0, 0, outputSize, outputSize);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    setCapturedPhotoUrl(dataUrl);
    setPreviewUrl(dataUrl);
    stopCamera();
  };

  const retakeSnapshot = () => {
    setCapturedPhotoUrl(null);
  };

  // File Upload Handler (Compressed Base64 conversion to keep storage & DB lightweight)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    setUploadError(null);
    void compressImageFileToDataUrl(file, {
      maxDimension: 320,
      quality: 0.78,
      maxDataUrlLength: 60_000,
    })
      .then((compressed) => {
        setPreviewUrl(compressed);
      })
      .catch(() => {
        setUploadError('ไม่สามารถอ่านไฟล์รูปภาพได้');
      });
  };

  const handleConfirm = () => {
    if (previewUrl) {
      onSelectImage(previewUrl);
      onClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="ถ่ายรูปสด อัปโหลดจากเครื่อง หรือเลือก Avatar"
      icon={<Camera className="w-5 h-5 text-[var(--color-primary-text)]" />}
      maxWidthClass="max-w-lg"
      heightClass="max-h-[90dvh]"
      zIndexClass="z-[108]"
      showMobileHandle
      bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden p-0 select-none"
      footerClassName="!justify-between"
      footer={
        <>
          <div className="flex items-center gap-2">
            {previewUrl && (
              <div className="flex items-center gap-2">
                <img
                  src={previewUrl}
                  alt="Current"
                  className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shadow-sm"
                />
                <span className="text-xs font-bold text-[var(--color-text-title)] hidden sm:inline">รูปภาพที่เลือก</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-bold hover:bg-[var(--color-primary-light)] transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={!previewUrl}
              onClick={handleConfirm}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition ${
                previewUrl
                  ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white active:scale-95 cursor-pointer'
                  : 'bg-[var(--color-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] opacity-60 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>บันทึกรูปภาพ</span>
            </button>
          </div>
        </>
      }
    >
        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 pt-2 gap-1 overflow-x-auto text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-2 rounded-t-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] border-t-2 border-[var(--color-primary)] font-bold shadow-sm'
                : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
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
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] border-t-2 border-[var(--color-primary)] font-bold shadow-sm'
                : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
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
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] border-t-2 border-[var(--color-primary)] font-bold shadow-sm'
                : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
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
                ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] border-t-2 border-[var(--color-primary)] font-bold shadow-sm'
                : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>ใส่ลิงก์ URL</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 min-h-0 overflow-y-auto flex-1 space-y-4 bg-[var(--color-card)]">
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--color-primary)]/50 hover:border-[var(--color-primary)] bg-[var(--color-primary-light)]/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary-text)] flex items-center justify-center mb-3 transition">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="font-bold text-sm text-[var(--color-text-title)]">แตะเพื่อเลือกรูปภาพจากเครื่อง</p>
                <p className="text-xs text-[var(--color-text-body)] mt-1">รองรับ JPG, PNG, WEBP (เลือกจากอัลบั้มหรือกล้องมือถือ)</p>
              </div>
              {uploadError && (
                <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 rounded-xl px-3 py-2">
                  {uploadError}
                </p>
              )}

              {previewUrl && (
                <div className="flex flex-col items-center pt-2">
                  <span className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">ตัวอย่างรูปภาพที่เลือก:</span>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-[var(--color-primary)] shadow-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE CAMERA SNAPSHOT */}
          {activeTab === 'camera' && (
            <div className="space-y-4 flex flex-col items-center">
              {cameraError ? (
                <div className="w-full p-4 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-700 dark:text-rose-300 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-bold">ไม่สามารถเปิดกล้องได้</p>
                      <p className="mt-0.5">{cameraError}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { void startCamera(facingModeRef.current); }}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs cursor-pointer"
                      >
                        ลองเปิดกล้องอีกครั้ง
                      </button>
                      <button
                        type="button"
                        onClick={flipCamera}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-[var(--color-text-title)] font-bold text-xs cursor-pointer"
                      >
                        สลับใช้{facingMode === 'user' ? 'กล้องหลัง' : 'กล้องหน้า'}
                      </button>
                    </div>
                    <p className="text-[var(--color-text-title)] font-medium">
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
                      className="w-56 h-56 rounded-3xl object-cover border-4 border-[var(--color-primary)] shadow-2xl"
                    />
                    <div className="absolute top-2 right-2 px-2.5 py-1 bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow">
                      ถ่ายสำเร็จ ✓
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={retakeSnapshot}
                    className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] border border-[var(--color-border)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ถ่ายรูปใหม่</span>
                  </button>
                </div>
              ) : (
                /* Live Camera Feed */
                <div className="flex flex-col items-center space-y-3 w-full">
                  <div className="relative w-64 h-64 bg-slate-950 rounded-3xl overflow-hidden border-2 border-[var(--color-primary)] shadow-xl flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                    <button
                      type="button"
                      disabled={isCapturing}
                      onClick={flipCamera}
                      className="absolute top-2.5 right-2.5 z-20 h-8 px-2.5 rounded-xl bg-slate-950/75 hover:bg-slate-900/90 text-white border border-white/25 backdrop-blur-md shadow-md flex items-center gap-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50"
                      title={facingMode === 'user' ? 'สลับเป็นกล้องหลัง' : 'สลับเป็นกล้องหน้า'}
                      aria-label="สลับกล้องหน้าหรือกล้องหลัง"
                    >
                      <SwitchCamera className="w-3.5 h-3.5 shrink-0" />
                      <span>{facingMode === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'}</span>
                    </button>
                    {isCapturing && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-white text-xs font-semibold">
                        กำลังเปิด{facingMode === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'}...
                      </div>
                    )}
                    {cameraNotice && !isCapturing && (
                      <div className="absolute inset-x-2 bottom-2 px-2.5 py-1 rounded-xl bg-slate-900/85 text-slate-100 text-[10px] text-center">
                        {cameraNotice}
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isCapturing}
                      onClick={flipCamera}
                      className="px-3.5 py-2.5 rounded-2xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] border border-[var(--color-border)] transition cursor-pointer shadow-sm flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
                      title={facingMode === 'user' ? 'สลับเป็นกล้องหลัง' : 'สลับเป็นกล้องหน้า'}
                    >
                      <SwitchCamera className="w-4 h-4 shrink-0" />
                      <span>สลับกล้อง ({facingMode === 'user' ? 'หน้า' : 'หลัง'})</span>
                    </button>

                    <button
                      type="button"
                      disabled={isCapturing}
                      onClick={takeSnapshot}
                      className="px-6 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-extrabold text-sm shadow-lg flex items-center gap-2 active:scale-95 transition cursor-pointer disabled:opacity-50"
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
              <p className="text-xs text-[var(--color-text-muted)]">เลือกรูป Avatar สำเร็จรูปที่เหมาะสมกับคุณ:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRESET_AVATARS.slice(presetPage * 6, (presetPage + 1) * 6).map((avatar) => {
                  const isSelected = previewUrl === avatar.url;
                  return (
                    <div
                      key={avatar.id}
                      onClick={() => setPreviewUrl(avatar.url)}
                      className={`relative p-2 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-md'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-card-subtle)]'
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="w-16 h-16 rounded-xl object-cover shadow-sm"
                      />
                      <span className="text-[11px] font-semibold text-[var(--color-text-title)] text-center leading-tight">
                        {avatar.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {PRESET_AVATARS.length > 6 && (
                <div className="flex items-center justify-between text-xs text-[var(--color-text-body)]">
                  <button type="button" onClick={() => setPresetPage(page => Math.max(0, page - 1))} disabled={presetPage === 0} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] font-semibold disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
                  <span className="font-medium">หน้า {presetPage + 1} / {Math.ceil(PRESET_AVATARS.length / 6)} · {PRESET_AVATARS.length} รูป</span>
                  <button type="button" onClick={() => setPresetPage(page => Math.min(Math.ceil(PRESET_AVATARS.length / 6) - 1, page + 1))} disabled={presetPage >= Math.ceil(PRESET_AVATARS.length / 6) - 1} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary-light)] font-semibold disabled:opacity-40 cursor-pointer">ถัดไป</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIRECT URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-title)] mb-1">
                  วางลิงก์รูปภาพโดยตรง (Image URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setPreviewUrl(e.target.value);
                      setUploadError(null);
                    }}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-3 py-2 text-xs bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none font-mono placeholder:text-[var(--color-text-muted)]"
                  />
                </div>
              </div>

              {uploadError && (
                <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 rounded-xl px-3 py-2">
                  {uploadError}
                </p>
              )}

              {previewUrl && (
                <div className="flex flex-col items-center pt-2">
                  <span className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">ตัวอย่างรูปภาพ:</span>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    onError={() => setUploadError('ไม่สามารถโหลดภาพจากลิงก์นี้ได้ กรุณาตรวจสอบ URL')}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-[var(--color-primary)] shadow-lg"
                  />
                </div>
              )}
            </div>
          )}
        </div>

    </BaseModal>
  );
};
