import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppLanguage } from '../types';

interface PWAInstallButtonProps {
  lang?: AppLanguage;
  variant?: 'nav' | 'hero' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang = 'th',
  variant = 'nav',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running as an installed PWA in standalone mode, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      setShowGuide(true);
    }
  };

  const buttonText = lang === 'th' ? 'ติดตั้งแอป' : 'Install App';
  const subtitleText = lang === 'th' ? 'ใช้งานบนมือถือ / PC' : 'For Mobile & Desktop';

  const renderButton = () => {
    if (variant === 'hero') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`group relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${className}`}
          title={lang === 'th' ? 'ติดตั้งแอป EduVerse ลงบนหน้าจอหลัก' : 'Install EduVerse on Home Screen'}
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-left">
            <span className="block leading-tight">{buttonText}</span>
            <span className="block text-[10px] text-blue-100 font-normal">{subtitleText}</span>
          </div>
          <Download className="w-4 h-4 ml-1 opacity-80 group-hover:translate-y-0.5 transition-transform" />
        </button>
      );
    }

    if (variant === 'banner') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-200" />
          <span>{buttonText}</span>
        </button>
      );
    }

    // Default 'nav' style (clean, compact)
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300 dark:hover:bg-blue-900/60 ${className}`}
        title={lang === 'th' ? 'ติดตั้ง EduVerse เป็นแอปในเครื่อง' : 'Install EduVerse PWA'}
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="hidden sm:inline">{buttonText}</span>
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Installation Guide Modal (For iOS Safari or Desktop manual guide) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative text-slate-900 dark:text-slate-100">
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'th' ? 'ติดตั้ง EduVerse ลงในอุปกรณ์' : 'Install EduVerse PWA'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'th'
                    ? 'เปิดใช้งานได้เสมือนแอปจริง รวดเร็ว ไม่ต้องโหลดผ่านสโตร์'
                    : 'Fast native-like experience on home screen'}
                </p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
                <p className="font-semibold text-blue-700 dark:text-blue-400">
                  {lang === 'th' ? 'ขั้นตอนสำหรับ iPhone / iPad (Safari):' : 'Instructions for iPhone / iPad:'}
                </p>
                <ol className="space-y-2.5 text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                    <span>
                      {lang === 'th' ? 'แตะที่ปุ่ม' : 'Tap the'}{' '}
                      <span className="font-semibold inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Share className="w-3.5 h-3.5 inline" /> {lang === 'th' ? 'แชร์ (Share)' : 'Share'}
                      </span>{' '}
                      {lang === 'th' ? 'ที่แถบด้านล่างของ Safari' : 'icon at the bottom'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                    <span>
                      {lang === 'th' ? 'เลื่อนลงมาแล้วเลือก' : 'Scroll down and tap'}{' '}
                      <span className="font-semibold inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <PlusSquare className="w-3.5 h-3.5 inline" /> {lang === 'th' ? 'เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)' : 'Add to Home Screen'}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                    <span>
                      {lang === 'th' ? 'แตะปุ่ม "เพิ่ม" (Add) มุมขวาบน จะมีไอคอน EduVerse บนหน้าจอมือถือทันที' : 'Tap "Add" at the top-right corner to complete.'}
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
                <p className="font-semibold text-blue-700 dark:text-blue-400">
                  {lang === 'th' ? 'ขั้นตอนสำหรับ Android / Chrome / Edge:' : 'Instructions for Chrome / Edge:'}
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lang === 'th'
                    ? 'แตะที่เมนู 3 จุด (⋮) ที่มุมบนขวาของเบราว์เซอร์ แล้วเลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก" (Add to Home screen)'
                    : 'Tap the three dots (⋮) menu in your browser bar and select "Install app" or "Add to Home Screen".'}
                </p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-md shadow-blue-700/20"
              >
                {lang === 'th' ? 'เข้าใจแล้ว' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {installSuccess && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xl animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{lang === 'th' ? 'ติดตั้งแอปเรียบร้อยแล้ว!' : 'App installed successfully!'}</span>
        </div>
      )}
    </>
  );
};
