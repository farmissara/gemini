export type CameraFacingMode = 'user' | 'environment';

export interface OpenCameraStreamOptions {
  facingMode: CameraFacingMode;
  currentStream?: MediaStream | null;
  videoEl?: HTMLVideoElement | null;
  preferredDeviceId?: string | null;
  idealWidth?: number;
  idealHeight?: number;
  allowAnyFallback?: boolean;
  isCancelled?: () => boolean;
}

export interface OpenCameraStreamResult {
  stream: MediaStream;
  resolvedFacingMode: CameraFacingMode;
  deviceId: string | null;
  devices: MediaDeviceInfo[];
  usedFallback: boolean;
  requestedUnavailable: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function stopCameraStream(
  stream?: MediaStream | null,
  videoEl?: HTMLVideoElement | null
): void {
  const seenTracks = new Set<MediaStreamTrack>();
  const stopStream = (target?: MediaStream | null) => {
    if (!target) return;
    target.getTracks().forEach((track) => {
      if (seenTracks.has(track)) return;
      seenTracks.add(track);
      try {
        track.stop();
      } catch {
        // Ignore track stop errors
      }
    });
  };

  stopStream(stream);

  if (videoEl) {
    const attached = videoEl.srcObject as MediaStream | null;
    if (attached && attached !== stream) {
      stopStream(attached);
    }
    try {
      videoEl.pause();
    } catch {
      // Ignore pause errors
    }
    videoEl.srcObject = null;
  }
}

const REAR_CAMERA_RE = /back|rear|environment|world|facing\s*back|camera\s*0\b|camera2\s*0\b|กล้องหลัง|ด้านหลัง/i;
const FRONT_CAMERA_RE = /front|user|selfie|facetime|integrated|webcam|facing\s*front|camera\s*1\b|camera2\s*1\b|กล้องหน้า|ด้านหน้า/i;
const SECONDARY_LENS_RE = /ultra|macro|depth|telephoto|\btele\b|\btof\b|\bir\b|0\.5x|0\.6x/i;
const MAIN_REAR_HINT_RE = /main|wide|standard|normal|\b1x\b|camera\s*0\b|camera2\s*0\b/i;

function scoreVideoDevice(
  device: MediaDeviceInfo,
  targetFacingMode: CameraFacingMode,
  previousDeviceId?: string | null
): number {
  const label = (device.label || '').trim();
  let score = 0;

  if (targetFacingMode === 'environment') {
    if (REAR_CAMERA_RE.test(label)) score += 100;
    if (FRONT_CAMERA_RE.test(label)) score -= 120;
    if (MAIN_REAR_HINT_RE.test(label)) score += 20;
    if (SECONDARY_LENS_RE.test(label)) score -= 25;
  } else {
    if (FRONT_CAMERA_RE.test(label)) score += 100;
    if (REAR_CAMERA_RE.test(label)) score -= 120;
  }

  if (previousDeviceId && device.deviceId === previousDeviceId) {
    score -= 40;
  }

  return score;
}

export function pickBestDeviceForFacingMode(
  devices: MediaDeviceInfo[],
  targetFacingMode: CameraFacingMode,
  previousDeviceId?: string | null
): MediaDeviceInfo | null {
  const videoDevices = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
  if (videoDevices.length === 0) return null;

  const scored = videoDevices
    .map((device, index) => ({
      device,
      index,
      score: scoreVideoDevice(device, targetFacingMode, previousDeviceId),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  // If label-based match succeeded positively, return highest scored match
  if (scored[0].score > 0) {
    return scored[0].device;
  }

  // If browser omits labels (or generic labels) and multiple cameras exist, pick an unused deviceId
  if (previousDeviceId && videoDevices.length > 1) {
    const alternate = videoDevices.find((d) => d.deviceId !== previousDeviceId);
    if (alternate) return alternate;
  }

  // Fallback heuristic by common mobile order (index 1 often rear when index 0 is front, or index 0)
  if (videoDevices.length > 1 && targetFacingMode === 'environment') {
    return videoDevices[videoDevices.length - 1];
  }

  return videoDevices[0];
}

export function detectTrackFacingMode(
  track: MediaStreamTrack | undefined,
  devices: MediaDeviceInfo[],
  requestedFacingMode: CameraFacingMode
): CameraFacingMode {
  if (!track) return requestedFacingMode;
  const settings = typeof track.getSettings === 'function' ? track.getSettings() : {};
  if (settings.facingMode === 'user' || settings.facingMode === 'environment') {
    return settings.facingMode;
  }

  const matchedDevice = settings.deviceId
    ? devices.find((d) => d.deviceId === settings.deviceId)
    : undefined;
  const combinedLabel = `${track.label || ''} ${matchedDevice?.label || ''}`.trim();

  if (REAR_CAMERA_RE.test(combinedLabel)) return 'environment';
  if (FRONT_CAMERA_RE.test(combinedLabel)) return 'user';
  return requestedFacingMode;
}

async function listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'videoinput');
  } catch {
    return [];
  }
}

async function requestStreamWithRetry(
  videoConstraint: MediaTrackConstraints | boolean
): Promise<MediaStream> {
  const getStream = () =>
    navigator.mediaDevices.getUserMedia({
      video: videoConstraint,
      audio: false,
    });

  try {
    return await getStream();
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') {
      await sleep(220);
      return await getStream();
    }
    throw err;
  }
}

function isFatalPermissionError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : '';
  return name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError';
}

export async function openCameraStream(
  options: OpenCameraStreamOptions
): Promise<OpenCameraStreamResult> {
  const {
    facingMode,
    currentStream = null,
    videoEl = null,
    preferredDeviceId = null,
    idealWidth = 1280,
    idealHeight = 720,
    allowAnyFallback = true,
    isCancelled,
  } = options;

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    throw new Error('CAMERA_UNAVAILABLE');
  }

  const activeAttached =
    currentStream || (videoEl?.srcObject as MediaStream | null) || null;
  const previousTrack = activeAttached?.getVideoTracks?.()[0];
  const previousDeviceId =
    previousTrack && typeof previousTrack.getSettings === 'function'
      ? previousTrack.getSettings().deviceId || null
      : null;

  const hadActiveStream = Boolean(activeAttached && activeAttached.getTracks().length > 0);
  stopCameraStream(activeAttached, videoEl);

  // Allow mobile camera hardware (Android/iOS HAL) enough time to release before reopening
  if (hadActiveStream) {
    await sleep(140);
  }

  if (isCancelled?.()) {
    throw new Error('CAMERA_CANCELLED');
  }

  let stream: MediaStream | null = null;
  let lastError: unknown = null;
  let usedFallback = false;

  // 1. Explicit deviceId if user/caller picked a specific lens/camera
  if (preferredDeviceId) {
    try {
      stream = await requestStreamWithRetry({
        deviceId: { exact: preferredDeviceId },
        width: { ideal: idealWidth },
        height: { ideal: idealHeight },
      });
    } catch (err) {
      lastError = err;
      if (isFatalPermissionError(err)) throw err;
    }
  }

  // 2. Try strict facingMode ({ exact }) first so browsers don't silently reuse the wrong camera
  if (!stream) {
    try {
      stream = await requestStreamWithRetry({
        facingMode: { exact: facingMode },
        width: { ideal: idealWidth },
        height: { ideal: idealHeight },
      });
    } catch (err) {
      lastError = err;
      if (isFatalPermissionError(err)) throw err;
    }
  }

  // 3. Enumerate video devices and match rear/front by label or alternate deviceId
  let devices = await listVideoInputDevices();
  if (!stream && devices.length > 0) {
    const matched = pickBestDeviceForFacingMode(devices, facingMode, previousDeviceId);
    if (matched?.deviceId) {
      try {
        stream = await requestStreamWithRetry({
          deviceId: { exact: matched.deviceId },
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        });
        usedFallback = true;
      } catch (err) {
        lastError = err;
        if (isFatalPermissionError(err)) throw err;
      }
    }
  }

  // 4. Try soft facingMode ({ ideal })
  if (!stream) {
    try {
      const candidate = await requestStreamWithRetry({
        facingMode: { ideal: facingMode },
        width: { ideal: idealWidth },
        height: { ideal: idealHeight },
      });

      const candidateTrack = candidate.getVideoTracks()[0];
      const candidateDeviceId =
        candidateTrack && typeof candidateTrack.getSettings === 'function'
          ? candidateTrack.getSettings().deviceId || null
          : null;

      // Refresh devices after permission is active; if browser silently stuck to previous camera when >1 exist, swap explicitly
      devices = await listVideoInputDevices();
      if (
        previousDeviceId &&
        candidateDeviceId === previousDeviceId &&
        devices.length > 1
      ) {
        const alternate = pickBestDeviceForFacingMode(devices, facingMode, previousDeviceId);
        if (alternate?.deviceId && alternate.deviceId !== candidateDeviceId) {
          stopCameraStream(candidate, null);
          await sleep(140);
          try {
            stream = await requestStreamWithRetry({
              deviceId: { exact: alternate.deviceId },
              width: { ideal: idealWidth },
              height: { ideal: idealHeight },
            });
            usedFallback = true;
          } catch {
            // Alternate device failed; reopen ideal stream or allow fallback below
            stream = await requestStreamWithRetry({
              facingMode: { ideal: facingMode },
              width: { ideal: idealWidth },
              height: { ideal: idealHeight },
            });
            usedFallback = true;
          }
        } else {
          stream = candidate;
        }
      } else {
        stream = candidate;
        usedFallback = true;
      }
    } catch (err) {
      lastError = err;
      if (isFatalPermissionError(err)) throw err;
    }
  }

  // 5. Final unconstrained fallback (e.g. desktop webcam with only 1 camera)
  if (!stream && allowAnyFallback) {
    try {
      stream = await requestStreamWithRetry(true);
      usedFallback = true;
    } catch (err) {
      lastError = err;
    }
  }

  if (!stream) {
    throw lastError || new Error('CAMERA_START_FAILED');
  }

  if (isCancelled?.()) {
    stopCameraStream(stream, null);
    throw new Error('CAMERA_CANCELLED');
  }

  devices = await listVideoInputDevices();
  const track = stream.getVideoTracks()[0];
  const deviceId =
    track && typeof track.getSettings === 'function'
      ? track.getSettings().deviceId || null
      : null;
  const resolvedFacingMode = detectTrackFacingMode(track, devices, facingMode);
  const requestedUnavailable =
    resolvedFacingMode !== facingMode && devices.length <= 1;

  return {
    stream,
    resolvedFacingMode,
    deviceId,
    devices,
    usedFallback,
    requestedUnavailable,
  };
}

export function formatCameraErrorTh(
  err: unknown,
  facingMode: CameraFacingMode
): string {
  const errorName = err instanceof Error ? err.name : '';
  const errorMessage = err instanceof Error ? err.message : '';
  const targetLabel = facingMode === 'environment' ? 'กล้องหลัง' : 'กล้องหน้า';

  if (errorMessage === 'CAMERA_UNAVAILABLE') {
    return 'เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง (ต้องใช้งานผ่าน HTTPS หรือ localhost)';
  }
  if (errorMessage === 'CAMERA_VIEW_UNAVAILABLE') {
    return 'ไม่พบหน้าต่างแสดงภาพกล้อง กรุณาปิดแล้วเปิดใหม่อีกครั้ง';
  }
  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorName === 'SecurityError') {
    return 'ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณากดอนุญาตสิทธิ์กล้องในการตั้งค่าเบราว์เซอร์';
  }
  if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError') {
    return `ไม่พบ${targetLabel}บนอุปกรณ์นี้ กรุณาสลับกล้องหรือเลือกอุปกรณ์กล้องอื่น`;
  }
  if (errorName === 'NotReadableError' || errorName === 'TrackStartError' || errorName === 'AbortError') {
    return `ไม่สามารถเปิด${targetLabel}ได้ชั่วคราว (อาจถูกใช้งานอยู่) กรุณากดรีเฟรชหรือสลับกล้องอีกครั้ง`;
  }
  return `เปิด${targetLabel}ไม่สำเร็จ กรุณาตรวจสอบสิทธิ์กล้องแล้วลองใหม่`;
}
