import React, { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  KeyRound,
  Link as LinkIcon,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Save,
  CheckCircle2,
  Info,
  Download,
  Printer,
  Smartphone,
  Mail,
  UserCheck,
  Building2,
  Eye,
} from 'lucide-react';
import { School, AppLanguage } from '../types';
import { QrCodeMatrix } from './QrCodeMatrix';
import { getSupabaseClient } from '../lib/supabase';
import { normalizeSchoolStudentIdPolicy } from '../lib/studentIdPolicy';
import { BaseModal } from './common/BaseModal';

interface SchoolStudentLoginSettingsCardProps {
  activeSchool: School;
  lang: AppLanguage;
  onUpdateSchool?: (updates: Partial<School>) => void;
}

function getSuggestedSchoolShortCode(school: School): string {
  const words = school.nameEn
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  return words.map((word) => word[0]).join('').slice(0, 8).toLowerCase();
}

function getSchoolShortCode(school: School): string {
  const savedShortCode = school.customLoginSlug?.trim();
  return savedShortCode && savedShortCode.toLowerCase() !== school.code.toLowerCase()
    ? savedShortCode
    : getSuggestedSchoolShortCode(school);
}

export const SchoolStudentLoginSettingsCard: React.FC<SchoolStudentLoginSettingsCardProps> = ({
  activeSchool,
  lang,
  onUpdateSchool,
}) => {
  const initialPolicy = useMemo(() => normalizeSchoolStudentIdPolicy(activeSchool), [activeSchool]);
  // Login identifier preference
  const [identifierType, setIdentifierType] = useState<'student_id_only' | 'email_only' | 'both'>(
    activeSchool.studentLoginIdentifierType || 'both'
  );
  const [customSlug, setCustomSlug] = useState<string>(
    getSchoolShortCode(activeSchool)
  );
  const [defaultPasswordType, setDefaultPasswordType] = useState<'student_id' | 'birthdate' | 'custom' | 'pin'>(
    activeSchool.studentDefaultPasswordType || 'student_id'
  );
  const [passwordNote, setPasswordNote] = useState<string>(
    activeSchool.studentDefaultPasswordNote || 'ใช้รหัสนักเรียนเป็นรหัสผ่านเริ่มต้น (เมื่อเข้าครั้งแรก ระบบจะให้ตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร)'
  );
  const [studentIdMinLength, setStudentIdMinLength] = useState<number>(initialPolicy.minLength);
  const [studentIdMaxLength, setStudentIdMaxLength] = useState<number>(initialPolicy.maxLength);
  const [studentIdDigitsOnly, setStudentIdDigitsOnly] = useState<boolean>(initialPolicy.digitsOnly);
  const [studentIdExample, setStudentIdExample] = useState<string>(initialPolicy.example);
  const [shortIdPasswordPrefix, setShortIdPasswordPrefix] = useState<string>(initialPolicy.shortIdPasswordPrefix);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showQrPrintModal, setShowQrPrintModal] = useState(false);
  const [shortCodeAvailability, setShortCodeAvailability] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'error'
  >('idle');
  const [shortCodeAvailabilityMessage, setShortCodeAvailabilityMessage] = useState('');

  useEffect(() => {
    setCustomSlug(getSchoolShortCode(activeSchool));
    const nextPolicy = normalizeSchoolStudentIdPolicy(activeSchool);
    setStudentIdMinLength(nextPolicy.minLength);
    setStudentIdMaxLength(nextPolicy.maxLength);
    setStudentIdDigitsOnly(nextPolicy.digitsOnly);
    setStudentIdExample(nextPolicy.example);
    setShortIdPasswordPrefix(nextPolicy.shortIdPasswordPrefix);
  }, [
    activeSchool.id,
    activeSchool.code,
    activeSchool.customLoginSlug,
    activeSchool.studentIdMinLength,
    activeSchool.studentIdMaxLength,
    activeSchool.studentIdDigitsOnly,
    activeSchool.studentIdExample,
    activeSchool.studentShortIdPasswordPrefix,
  ]);

  useEffect(() => {
    let current = true;
    const candidate = customSlug.trim().toLowerCase();
    if (candidate.length < 2 || candidate.length > 16) {
      setShortCodeAvailability('idle');
      setShortCodeAvailabilityMessage('');
      return () => {
        current = false;
      };
    }

    setShortCodeAvailability('checking');
    setShortCodeAvailabilityMessage('');
    const timeout = window.setTimeout(async () => {
      const client = getSupabaseClient();
      if (!client) {
        if (current) {
          setShortCodeAvailability('error');
          setShortCodeAvailabilityMessage('ไม่สามารถเชื่อมต่อฐานข้อมูลเพื่อตรวจสอบรหัสได้');
        }
        return;
      }

      const { data, error } = await client.rpc('is_school_login_shortcode_available', {
        target_school_id: activeSchool.id,
        candidate_shortcode: candidate,
      });
      if (!current) return;
      if (error || typeof data !== 'boolean') {
        setShortCodeAvailability('error');
        setShortCodeAvailabilityMessage('ตรวจสอบรหัสไม่ได้ กรุณาตรวจสอบว่าได้รัน migration ล่าสุดแล้ว');
        return;
      }
      setShortCodeAvailability(data ? 'available' : 'taken');
      setShortCodeAvailabilityMessage(
        data ? 'รหัสนี้ยังว่าง สามารถใช้ได้' : 'มีโรงเรียนอื่นใช้รหัสนี้แล้ว กรุณาเลือกตัวย่ออื่น'
      );
    }, 350);

    return () => {
      current = false;
      window.clearTimeout(timeout);
    };
  }, [activeSchool.id, customSlug]);

  // Dedicated School Login Link
  const schoolLoginUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const cleanSlug = encodeURIComponent(customSlug.trim() || activeSchool.id);
    return `${origin}/?schoolId=${activeSchool.id}&schoolCode=${cleanSlug}&school=${cleanSlug}&loginMode=student`;
  }, [activeSchool.id, customSlug]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(schoolLoginUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    const shortCode = customSlug.trim();
    if (shortCode.length < 2 || shortCode.length > 16) {
      setSaveError('รหัสโรงเรียนต้องมีความยาว 2–16 ตัวอักษร');
      return;
    }
    if (shortCodeAvailability !== 'available') {
      setSaveError(
        shortCodeAvailability === 'taken'
          ? 'รหัสโรงเรียนนี้มีผู้ใช้งานแล้ว กรุณาเลือกตัวย่ออื่น'
          : shortCodeAvailability === 'error'
          ? shortCodeAvailabilityMessage || 'ตรวจสอบรหัสโรงเรียนไม่สำเร็จ กรุณาลองใหม่'
          : 'กำลังตรวจสอบรหัสโรงเรียน กรุณารอสักครู่แล้วกดบันทึกอีกครั้ง'
      );
      return;
    }

    if (studentIdMinLength < 1 || studentIdMinLength > 20 || studentIdMaxLength < studentIdMinLength || studentIdMaxLength > 30) {
      setSaveError('ความยาวรหัสนักเรียนขั้นต่ำต้องอยู่ระหว่าง 1–20 ตัว และไม่มากกว่าความยาวสูงสุด (ไม่เกิน 30 ตัว)');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const updates: Partial<School> = {
      studentLoginIdentifierType: identifierType,
      customLoginSlug: shortCode,
      studentDefaultPasswordType: defaultPasswordType,
      studentDefaultPasswordNote: passwordNote.trim(),
      customSchoolLoginUrl: schoolLoginUrl,
      studentIdMinLength: Math.max(1, Math.min(20, Math.round(studentIdMinLength))),
      studentIdMaxLength: Math.max(Math.round(studentIdMinLength), Math.min(30, Math.round(studentIdMaxLength))),
      studentIdDigitsOnly,
      studentIdExample: studentIdExample.trim() || undefined,
      studentShortIdPasswordPrefix: shortIdPasswordPrefix.trim() || '',
    };

    try {
      if (!onUpdateSchool) throw new Error('ไม่พบฟังก์ชันบันทึกการตั้งค่าโรงเรียน');
      await onUpdateSchool(updates);
      try {
        localStorage.setItem(`eduverse_school_login_config_${activeSchool.id}`, JSON.stringify(updates));
      } catch {
        // The database save has already succeeded; local storage is only a same-device fallback.
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setSaveError(
        /duplicate key|schools_custom_login_slug_unique_lower_idx|23505/i.test(message)
          ? 'รหัสโรงเรียนแบบสั้นนี้ถูกใช้งานแล้ว กรุณาเลือกรหัสอื่น'
          : message || 'ไม่สามารถบันทึกการตั้งค่าลงฐานข้อมูลได้'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>บันทึกการตั้งค่าระบบล็อกอินนักเรียนและลิงก์เฉพาะโรงเรียนเรียบร้อยแล้ว</span>
        </div>
      )}
      {saveError && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2 shadow-xs">
          <span>{saveError}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-800 text-white p-6 shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-white border border-white/20">
              <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
              <span>ระบบเข้าสู่ระบบนักเรียน · Student Authentication &amp; School Portal</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              ตั้งค่ารูปแบบล็อกอินนักเรียน &amp; สร้างลิงก์เฉพาะโรงเรียน
            </h2>
            <p className="text-xs md:text-sm text-blue-100 max-w-2xl leading-relaxed">
              ผู้ดูแลโรงเรียนสามารถกำหนดให้นักเรียนล็อกอินด้วย <strong>รหัสนักเรียน</strong> หรือ <strong>อีเมล</strong> ได้
              พร้อมสร้างลิงก์และ QR Code เฉพาะของโรงเรียน ให้นักเรียนสแกนหรือคลิกเพื่อเข้าสู่ระบบได้ทันทีโดยไม่ต้องค้นหาชื่อโรงเรียน
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section 1: Choose Login Identifier Mode */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[var(--color-primary-text)]" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                    1. เลือกรูปแบบชื่อผู้ใช้สำหรับนักเรียน (Student Username / Identifier)
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    เลือกวิธีที่นักเรียนใช้ระบุตัวตนในการล็อกอินเข้าสู่ระบบ
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Option A: Student ID Only */}
              <label
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                  identifierType === 'student_id_only'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="identifierType"
                  value="student_id_only"
                  checked={identifierType === 'student_id_only'}
                  onChange={() => setIdentifierType('student_id_only')}
                  className="mt-1 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-[var(--color-text-title)]">
                      รหัสนักเรียน + รหัสผ่าน (Student ID Only)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      แนะนำสำหรับโรงเรียน
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-body)] leading-relaxed">
                    นักเรียนใช้รหัสประจำตัวนักเรียนของโรงเรียน (เช่น <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-mono font-bold text-blue-600">{studentIdExample || '1001'}</code>) คู่กับรหัสผ่าน โดยไม่ต้องมีอีเมล สะดวกสำหรับนักเรียนประถมและมัธยม
                  </p>
                </div>
              </label>

              {/* Option B: Both Student ID & Email */}
              <label
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                  identifierType === 'both'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="identifierType"
                  value="both"
                  checked={identifierType === 'both'}
                  onChange={() => setIdentifierType('both')}
                  className="mt-1 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-[var(--color-text-title)]">
                      ใช้ได้ทั้งรหัสนักเรียน หรือ อีเมล (Both Student ID &amp; Email)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                      ยืดหยุ่นสูงสุด
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-body)] leading-relaxed">
                    นักเรียนสามารถเลือกกรอกรหัสนักเรียน หรืออีเมลโรงเรียน/ส่วนตัว ในช่องชื่อผู้ใช้เดียวกันได้เลยตามความสะดวก
                  </p>
                </div>
              </label>

              {/* Option C: Email Only */}
              <label
                className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                  identifierType === 'email_only'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="identifierType"
                  value="email_only"
                  checked={identifierType === 'email_only'}
                  onChange={() => setIdentifierType('email_only')}
                  className="mt-1 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-[var(--color-text-title)]">
                      อีเมล + รหัสผ่านเท่านั้น (Email Only)
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-body)] leading-relaxed">
                    บังคับให้นักเรียนใช้อีเมลในการเข้าสู่ระบบเท่านั้น เหมาะสำหรับโรงเรียนที่มี Google Workspace for Education หรือ Microsoft 365 ให้นักเรียนทุกคน
                  </p>
                </div>
              </label>
            </div>

            {/* Per-School Student ID Format Rules */}
            <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-text-title)]">
                    เงื่อนไขความยาวและรูปแบบรหัสนักเรียนของโรงเรียน (Student ID Rules)
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    ตั้งค่าให้ตรงกับรหัสนักเรียนจริงของโรงเรียน เช่น 4 หลัก (1001), 5 หลัก (69001) หรือรหัสที่มีตัวอักษร
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '4 หลัก (1001)', min: 4, max: 4, digits: true, example: '1001' },
                    { label: '5 หลัก (69001)', min: 5, max: 5, digits: true, example: '69001' },
                    { label: '4–12 ตัวอิสระ', min: 4, max: 12, digits: false, example: '1001' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setStudentIdMinLength(preset.min);
                        setStudentIdMaxLength(preset.max);
                        setStudentIdDigitsOnly(preset.digits);
                        setStudentIdExample(preset.example);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[11px] font-semibold text-[var(--color-text-body)] cursor-pointer transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1 text-xs font-bold text-[var(--color-text-title)]">
                  <span>ความยาวขั้นต่ำ (ตัว)</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={studentIdMinLength}
                    onChange={(e) => {
                      const nextMin = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                      setStudentIdMinLength(nextMin);
                      if (studentIdMaxLength < nextMin) setStudentIdMaxLength(nextMin);
                    }}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none"
                  />
                </label>

                <label className="space-y-1 text-xs font-bold text-[var(--color-text-title)]">
                  <span>ความยาวสูงสุด (ตัว)</span>
                  <input
                    type="number"
                    min={studentIdMinLength}
                    max={30}
                    value={studentIdMaxLength}
                    onChange={(e) => setStudentIdMaxLength(Math.max(studentIdMinLength, Math.min(30, Number(e.target.value) || studentIdMinLength)))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none"
                  />
                </label>

                <label className="space-y-1 text-xs font-bold text-[var(--color-text-title)]">
                  <span>ตัวอย่างที่แสดงหน้าล็อกอิน</span>
                  <input
                    type="text"
                    maxLength={24}
                    value={studentIdExample}
                    onChange={(e) => setStudentIdExample(e.target.value)}
                    placeholder="เช่น 1001"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-body)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={studentIdDigitsOnly}
                  onChange={(e) => setStudentIdDigitsOnly(e.target.checked)}
                  className="rounded border-[var(--color-border)] text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>อนุญาตเฉพาะตัวเลข 0–9 เท่านั้น (ไม่อนุญาตตัวอักษรภาษาอังกฤษหรือขีด)</span>
              </label>
            </div>
          </div>

          {/* Section 2: Dedicated School Login Link Generator */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                    2. สร้างลิงก์เข้าสู่ระบบเฉพาะโรงเรียน (Dedicated School Login Link)
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    ลิงก์นี้จะเปิดหน้าล็อกอินของโรงเรียนโดยตรง พร้อมระบุชื่อโรงเรียนและตั้งค่าให้ล็อกอินด้วยรหัสนักเรียนทันที
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text-title)]">
                  ตัวย่อโรงเรียนภาษาอังกฤษ (รหัสสำหรับนักเรียน)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--color-text-muted)] px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] shrink-0">
                    /?school=
                  </span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => {
                      setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                      setSaveError(null);
                      setSaveSuccess(false);
                    }}
                    maxLength={16}
                    placeholder="เช่น bpk, bkkw หรือ skt01"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  ผู้ดูแลโรงเรียนเลือกตัวย่อได้เอง ระบบตรวจสอบรหัสซ้ำให้อัตโนมัติ รหัสเดิมยังใช้ได้ (2–16 ตัวอักษร)
                </p>
                <p
                  aria-live="polite"
                  className={`text-[11px] font-semibold ${
                    shortCodeAvailability === 'available'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : shortCodeAvailability === 'taken' || shortCodeAvailability === 'error'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {shortCodeAvailability === 'checking'
                    ? 'กำลังตรวจสอบรหัส...'
                    : shortCodeAvailabilityMessage}
                </p>
              </div>

              {/* Full Generated Link Card */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-700">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>ลิงก์เข้าสู่ระบบเฉพาะสำหรับนักเรียน {activeSchool.nameTh}:</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">พร้อมใช้งาน</span>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 font-mono text-[11px] text-sky-300 break-all border border-white/10 select-all">
                  {schoolLoginUrl}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'คัดลอกลิงก์แล้ว!' : 'คัดลอกลิงก์'}</span>
                    </button>

                    <a
                      href={schoolLoginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ทดสอบเปิดลิงก์</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowQrPrintModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>พิมพ์ / แสดง QR Code สำหรับนักเรียน</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Password Policy Hint */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>3. นโยบายและคำแนะนำรหัสผ่านเริ่มต้นสำหรับนักเรียน (Student Password Policy)</span>
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-bold text-[var(--color-text-title)]">
                  <span>รูปแบบรหัสผ่านเริ่มต้น</span>
                  <select
                    value={defaultPasswordType}
                    onChange={(e) => {
                      const next = e.target.value as 'student_id' | 'birthdate' | 'custom' | 'pin';
                      setDefaultPasswordType(next);
                      if (next === 'birthdate') {
                        setPasswordNote('ใช้วันเดือนปีเกิด พ.ศ. 8 หลัก (เช่น 12042551) เป็นรหัสผ่านเริ่มต้น');
                      } else if (next === 'student_id') {
                        setPasswordNote(
                          shortIdPasswordPrefix.trim()
                            ? `รหัสผ่านเริ่มต้นคือ "${shortIdPasswordPrefix.trim()}" + รหัสนักเรียน (เช่น ${shortIdPasswordPrefix.trim()}${studentIdExample || '1001'})`
                            : 'ใช้รหัสนักเรียนเป็นรหัสผ่านเริ่มต้น (เมื่อเข้าครั้งแรก ระบบจะให้ตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร)'
                        );
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none"
                  >
                    <option value="student_id">ใช้รหัสนักเรียนเป็นรหัสผ่านเริ่มต้น (แนะนำ · ตั้งรหัสใหม่เมื่อเข้าครั้งแรก)</option>
                    <option value="birthdate">วันเดือนปีเกิด พ.ศ. 8 หลัก (ววดดปปปป เช่น 12042551)</option>
                    <option value="custom">รหัสผ่านที่โรงเรียนกำหนดเอง (Default Password)</option>
                    <option value="pin">เลขประจำตัวประชาชน 4 ตัวท้าย</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs font-bold text-[var(--color-text-title)]">
                  <span>คำนำหน้ารหัสผ่านเริ่มต้น (เมื่อรหัสสั้นกว่า 6 ตัว)</span>
                  <input
                    type="text"
                    maxLength={12}
                    value={shortIdPasswordPrefix}
                    onChange={(e) => {
                      const prefix = e.target.value.replace(/\s+/g, '');
                      setShortIdPasswordPrefix(prefix);
                    }}
                    placeholder="เว้นว่าง หรือใส่เช่น 00 / std"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none"
                  />
                </label>
              </div>

              <label className="block space-y-1 text-xs font-bold text-[var(--color-text-title)]">
                <span>ข้อความแนะนำนักเรียนในหน้าเข้าสู่ระบบ</span>
                <input
                  type="text"
                  value={passwordNote}
                  onChange={(e) => setPasswordNote(e.target.value)}
                  placeholder="เช่น ใช้รหัสนักเรียน 4 หลัก หรือ วันเดือนปีเกิด 8 หลัก"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none"
                />
              </label>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    <strong>รหัสนักเรียนใช้เป็นชื่อผู้ใช้ได้ทุกความยาว (เช่น 4 หลัก)</strong> ส่วนรหัสผ่านเริ่มต้น: หากระบบ Auth ตั้งขั้นต่ำไว้ที่ 6 ตัวอักษร โรงเรียนที่ใช้รหัส 4 หลักสามารถใส่คำนำหน้า (เช่น <code className="px-1 rounded bg-white/70 dark:bg-slate-800 font-mono">00</code> เพื่อให้รหัสผ่านแรกเข้าเป็น <code className="px-1 rounded bg-white/70 dark:bg-slate-800 font-mono">00{studentIdExample || '1001'}</code>) หรือใช้วันเดือนปีเกิด 8 หลักได้ทันที และเมื่อนักเรียนเข้าสู่ระบบครั้งแรก ระบบจะให้ตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร
                  </p>
                  <p className="opacity-90">
                    ข้อความแนะนำนี้จะปรากฏใต้ช่องกรอกรหัสผ่านในหน้าล็อกอินนักเรียน เพื่อช่วยให้นักเรียนเข้าสู่ระบบด้วยตนเองได้ถูกต้อง
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QR Code & Live Student Login Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-4 space-y-4">
            {/* Student QR Card */}
            <div className="bg-[var(--color-card)] border-2 border-blue-500/30 rounded-2xl p-5 shadow-lg space-y-4 text-center">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-extrabold text-[var(--color-text-title)] uppercase tracking-wider">
                    QR Code ทางเข้าโรงเรียนสำหรับนักเรียน
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrPrintModal(true)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์แผ่นป้าย</span>
                </button>
              </div>

              {/* QR Code Matrix */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <QrCodeMatrix
                  value={schoolLoginUrl}
                  size={180}
                  label={`QR เข้าสู่ระบบนักเรียน ${activeSchool.nameTh}`}
                />
                <div className="mt-3 text-xs font-bold text-[var(--color-text-title)]">
                  {activeSchool.nameTh}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  รหัสโรงเรียน: {customSlug ? customSlug.toUpperCase() : 'ยังไม่กำหนด'}
                </div>
              </div>

              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                โรงเรียนสามารถนำ QR Code นี้ไปติดที่บอร์ดประชาสัมพันธ์ห้องเรียน, หน้าสมุดบันทึกนักเรียน หรือโพสต์ลงกลุ่ม LINE ห้องเรียน เพื่อให้นักเรียนสแกนเข้าใช้งานได้ง่าย
              </p>
            </div>

            {/* Login Screen Mockup Preview */}
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-title)] border-b border-[var(--color-border)] pb-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>หน้าจอนักเรียนจะเห็นตอนเปิดลิงก์:</span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 space-y-2.5 text-left text-xs">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="text-[11px]">
                    <div className="font-extrabold text-blue-900 dark:text-blue-200 truncate">{activeSchool.nameTh}</div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300">ระบบเข้าสู่ระบบนักเรียน (Student Portal)</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {identifierType === 'student_id_only'
                      ? 'รหัสนักเรียน (Student ID)'
                      : identifierType === 'email_only'
                      ? 'อีเมลนักเรียน (Email Address)'
                      : 'รหัสนักเรียน หรือ อีเมล (Student ID or Email)'}
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-400">
                    {identifierType === 'email_only'
                      ? 'student@school.ac.th'
                      : `เช่น ${studentIdExample || '1001'} (${studentIdMinLength === studentIdMaxLength ? `${studentIdMinLength} ตัว` : `${studentIdMinLength}–${studentIdMaxLength} ตัว`})`}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">รหัสผ่าน (Password)</div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-400">
                    ••••••••
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    💡 คำแนะนำ: {passwordNote}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-blue-600 text-white font-bold text-center text-xs shadow-xs">
                  เข้าสู่ระบบนักเรียน
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Printable Modal */}
      <BaseModal
        isOpen={showQrPrintModal}
        onClose={() => setShowQrPrintModal(false)}
        title="แผ่นป้าย QR Code ประจำโรงเรียนสำหรับนักเรียน"
        icon={<Printer className="w-5 h-5 text-blue-600" />}
        maxWidthClass="max-w-md"
        showMobileHandle
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-5 bg-white text-slate-900"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowQrPrintModal(false)}
              className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)] cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์แผ่นป้าย (Print)</span>
            </button>
          </>
        }
      >
            <div id="school-student-qr-poster" className="p-6 bg-slate-50 border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold">
                <Building2 className="w-3.5 h-3.5" />
                <span>{activeSchool.nameTh}</span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                สแกนเข้าสู่ระบบนักเรียน (Student Portal)
              </h2>
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                <QrCodeMatrix
                  value={schoolLoginUrl}
                  size={200}
                  label={`QR Code ${activeSchool.nameTh}`}
                />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-800">
                  {identifierType === 'student_id_only'
                    ? 'ใช้รหัสนักเรียน และ รหัสผ่าน เข้าสู่ระบบ'
                    : 'ใช้รหัสนักเรียน หรือ อีเมล เข้าสู่ระบบ'}
                </div>
                <div className="text-[11px] text-slate-500">
                  รหัสผ่านเริ่มต้น: {passwordNote}
                </div>
                <div className="font-mono text-[10px] text-blue-700 pt-1">
                  รหัสโรงเรียน: {customSlug ? customSlug.toUpperCase() : 'ยังไม่กำหนด'}
                </div>
              </div>
            </div>
      </BaseModal>
    </div>
  );
};
