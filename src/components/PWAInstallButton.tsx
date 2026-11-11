import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  X, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles,
  Apple
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppLanguage } from '../types';
import { QrCodeMatrix } from './QrCodeMatrix';

interface PWAInstallButtonProps {
  lang?: AppLanguage;
  variant?: 'nav' | 'hero' | 'banner' | 'mobile_card' | 'sidebar';
  className?: string;
  defaultTab?: 'android' | 'ios' | 'qr';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang = 'th',
  variant = 'nav',
  className = '',
  defaultTab,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'qr'>(() => {
    if (defaultTab) return defaultTab;
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'android';
  });
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // If already running as an installed PWA in standalone mode, return null
  if (isInstalled) {
    return null;
  }

  const appUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://eduverse.school';

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
        return;
      }
    }
    // If not installable directly (e.g. iOS Safari, or Chrome before prompt), open the guided modal
    setShowModal(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const renderTriggerButton = () => {
    if (variant === 'hero') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`group relative inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-700/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${className}`}
          title={lang === 'th' ? 'ติดตั้งแอป EduVerse สำหรับ Android และ iOS' : 'Install EduVerse for Android and iOS'}
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <span className="block leading-tight">{lang === 'th' ? 'ติดตั้งแอปบนมือถือ' : 'Install Mobile App'}</span>
            <span className="block text-[11px] text-blue-100 font-normal">
              {lang === 'th' ? 'รองรับทั้ง Android & iOS (iPhone/iPad)' : 'Android & iOS Supported'}
            </span>
          </div>
          <Download className="w-4 h-4 ml-1 text-white group-hover:translate-y-0.5 transition-transform" />
        </button>
      );
    }

    if (variant === 'mobile_card') {
      return (
        <div className={`p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-white dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 shadow-sm ${className}`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-[var(--color-text-title)]">
                  {lang === 'th' ? 'ติดตั้ง EduVerse ลงบนมือถือ' : 'Install EduVerse on Mobile'}
                </h2>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold">
                  {lang === 'th' ? 'Android & iOS' : 'PWA App'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                {lang === 'th'
                  ? 'เปิดใช้งานได้ทันทีแบบเต็มจอเสมือนแอปจริงจาก Store ไม่กินความจำเครื่อง'
                  : 'Add to home screen for fullscreen native-like app experience.'}
              </p>

              {/* Action Buttons */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'กดติดตั้งทันที (1-Click Install)' : 'Install Now'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('android');
                        setShowModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <span>🤖 {lang === 'th' ? 'สำหรับ Android' : 'Android'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('ios');
                        setShowModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <span>🍏 {lang === 'th' ? 'สำหรับ iOS (iPhone)' : 'iOS'}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('qr');
                    setShowModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] text-xs font-medium transition cursor-pointer"
                  title="สแกน QR Code"
                >
                  <QrCode className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  <span className="text-[11px]">{lang === 'th' ? 'QR Code' : 'Scan QR'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (variant === 'sidebar') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold transition shadow-2xs cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-700 dark:text-blue-300" />
            <div className="text-left">
              <span>{lang === 'th' ? 'ติดตั้งแอปบนมือถือ' : 'Install Mobile App'}</span>
              <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                Android & iOS
              </span>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300" />
        </button>
      );
    }

    if (variant === 'banner') {
      return (
        <div className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-xs ${className}`}>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>
              {lang === 'th'
                ? 'ติดตั้ง EduVerse บนมือถือ (Android & iOS) เพื่อการใช้งานที่รวดเร็วยิ่งขึ้น'
                : 'Install EduVerse for Android and iOS'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1 rounded-lg bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition shrink-0 cursor-pointer"
          >
            {lang === 'th' ? 'วิธีติดตั้ง' : 'Install'}
          </button>
        </div>
      );
    }

    // Default 'nav' style
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer bg-[var(--color-primary-light)] border-[var(--color-border)] text-[var(--color-primary-text)] hover:opacity-90 shadow-2xs ${className}`}
        title={lang === 'th' ? 'ติดตั้งแอป EduVerse บนมือถือ Android และ iOS' : 'Install EduVerse App for Android & iOS'}
      >
        <Smartphone className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
        <span>{lang === 'th' ? 'ติดตั้งแอป' : 'Install App'}</span>
        <span className="hidden md:inline-flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] font-mono">
          Android/iOS
        </span>
      </button>
    );
  };

  return (
    <>
      {renderTriggerButton()}

      {/* Guided Multi-Platform Modal (Android, iOS & QR Code) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 sm:p-6 shadow-2xl relative text-[var(--color-text-body)] max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] leading-tight">
                  {lang === 'th' ? 'ติดตั้งแอป EduVerse บนมือถือ' : 'Install EduVerse on Mobile'}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {lang === 'th'
                    ? 'รองรับทั้ง Android (Chrome/Samsung) และ iOS (iPhone & iPad Safari)'
                    : 'Progressive Web App installation for Android & iOS'}
                </p>
              </div>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] p-1 gap-1 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2 px-2.5 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'android'
                    ? 'bg-[var(--color-card)] text-emerald-700 dark:text-emerald-400 shadow-xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <span>🤖</span>
                <span>{lang === 'th' ? 'Android (แอนดรอยด์)' : 'Android'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2 px-2.5 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'ios'
                    ? 'bg-[var(--color-card)] text-indigo-700 dark:text-indigo-400 shadow-xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <span>🍏</span>
                <span>{lang === 'th' ? 'iOS (iPhone / iPad)' : 'iOS (iPhone)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`py-2 px-3 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'qr'
                    ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{lang === 'th' ? 'สแกน QR' : 'QR Code'}</span>
              </button>
            </div>

            {/* TAB 1: ANDROID INSTRUCTIONS */}
            {activeTab === 'android' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                    <span>✨</span>
                    <span>{lang === 'th' ? 'ระบบ Android (Google Chrome & Samsung Internet)' : 'Android Chrome / Browser'}</span>
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-200 leading-relaxed text-[11px]">
                    {lang === 'th'
                      ? 'แอปจะติดตั้งเป็นไอคอนอิสระบนหน้าจอโฮมและ App Drawer เปิดทำงานแบบเต็มจอเร็วขึ้น 3 เท่า และรองรับการทำงานออฟไลน์'
                      : 'Installs as a standalone home screen app with instant boot and offline caching.'}
                  </p>
                </div>

                {isInstallable && (
                  <button
                    type="button"
                    onClick={async () => {
                      const success = await install();
                      if (success) {
                        setShowModal(false);
                        setInstallSuccess(true);
                        setTimeout(() => setInstallSuccess(false), 4000);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/25 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{lang === 'th' ? 'กดติดตั้งลง Android ทันที (1-Click Install)' : 'Install on Android Now'}</span>
                  </button>
                )}

                <div className="bg-[var(--color-card-subtle)] p-4 rounded-xl border border-[var(--color-border)] text-xs space-y-3">
                  <p className="font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ขั้นตอนการติดตั้งบนโทรศัพท์ Android:' : 'Installation steps on Android:'}
                  </p>
                  <ol className="space-y-3 text-[var(--color-text-body)]">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <span>{lang === 'th' ? 'เปิดเว็บนี้ใน' : 'Open in'} <strong>Google Chrome</strong> {lang === 'th' ? 'บนมือถือ Android' : 'on Android'}</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <span>{lang === 'th' ? 'แตะปุ่มเมนูจุด 3 จุด' : 'Tap the'} <strong>(⋮)</strong> {lang === 'th' ? 'ที่มุมบนขวาของ Chrome' : 'menu at the top right'}</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <span>{lang === 'th' ? 'เลือก' : 'Select'} <strong>"{lang === 'th' ? 'ติดตั้งแอป' : 'Install app'}"</strong> {lang === 'th' ? 'หรือ' : 'or'} <strong>"{lang === 'th' ? 'เพิ่มลงในหน้าจอหลัก' : 'Add to Home screen'}"</strong></span>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          {lang === 'th' ? 'แตะ "ติดตั้ง" จะได้ไอคอน EduVerse บนหน้าจอมือถือทันที' : 'Tap Install to place the app on your home screen.'}
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB 2: IOS (IPHONE / IPAD) INSTRUCTIONS */}
            {activeTab === 'ios' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs">
                  <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                    <Apple className="w-4 h-4 inline" />
                    <span>{lang === 'th' ? 'ระบบ iOS (iPhone & iPad ผ่าน Safari)' : 'Apple iOS (Safari Browser)'}</span>
                  </div>
                  <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed text-[11px]">
                    {lang === 'th'
                      ? 'Apple อนุญาตให้ติดตั้งเว็บแอปผ่านฟังก์ชัน "เพิ่มไปยังหน้าจอโฮม" ใน Safari เพื่อให้เปิดได้เต็มจอ ไร้แถบ URL เสมือนแอปจาก App Store'
                      : 'Apple supports installing web apps directly from Safari via "Add to Home Screen".'}
                  </p>
                </div>

                <div className="bg-[var(--color-card-subtle)] p-4 rounded-xl border border-[var(--color-border)] text-xs space-y-3">
                  <p className="font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ขั้นตอนการติดตั้งบน iPhone / iPad:' : 'Installation steps on iPhone / iPad:'}
                  </p>
                  <ol className="space-y-3 text-[var(--color-text-body)]">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <span>{lang === 'th' ? 'เปิดเว็บนี้ด้วย' : 'Open this website in'} <strong>Safari</strong> {lang === 'th' ? '(เบราว์เซอร์มาตรฐานของ iPhone)' : '(iOS Safari)'}</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <span>{lang === 'th' ? 'แตะปุ่ม' : 'Tap the'} </span>
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80">
                          <Share className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'แชร์ (Share)' : 'Share'}</span>
                        </span>
                        <span> {lang === 'th' ? 'ที่แถบด้านล่างสุดของหน้าจอ Safari' : 'icon at the bottom bar of Safari'}</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <span>{lang === 'th' ? 'เลื่อนลงมาแล้วแตะ' : 'Scroll down and tap'} </span>
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80">
                          <PlusSquare className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)' : 'Add to Home Screen'}</span>
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        4
                      </span>
                      <div>
                        <span>{lang === 'th' ? 'แตะปุ่ม' : 'Tap'} <strong>"{lang === 'th' ? 'เพิ่ม' : 'Add'}"</strong> {lang === 'th' ? 'มุมขวาบน จะมีไอคอนแอป EduVerse บนหน้าจอ iPhone ทันที' : 'at top-right to finish.'}</span>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB 3: QR CODE (FOR MOBILE SCANNING) */}
            {activeTab === 'qr' && (
              <div className="space-y-4 text-center animate-in fade-in duration-150">
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200">
                  <p className="font-bold">{lang === 'th' ? 'สแกน QR ด้วยกล้องมือถือ เพื่อเปิดและติดตั้งได้ทันที' : 'Scan with your mobile camera to install directly'}</p>
                </div>

                <div className="flex justify-center py-2">
                  <QrCodeMatrix value={appUrl} size={200} label="EduVerse Mobile PWA Install URL" />
                </div>

                <div className="flex items-center gap-2 max-w-sm mx-auto">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] select-all truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold transition shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied!') : (lang === 'th' ? 'คัดลอก' : 'Copy')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
              <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>PWA Standards Compliant</span>
              </span>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-bold transition cursor-pointer"
              >
                {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {installSuccess && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-xl animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{lang === 'th' ? 'ติดตั้งแอป EduVerse บนอุปกรณ์เรียบร้อยแล้ว!' : 'EduVerse installed successfully!'}</span>
        </div>
      )}
    </>
  );
};
