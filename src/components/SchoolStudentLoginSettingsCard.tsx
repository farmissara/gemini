import React, { useMemo, useState } from 'react';
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

interface SchoolStudentLoginSettingsCardProps {
  activeSchool: School;
  lang: AppLanguage;
  onUpdateSchool?: (updates: Partial<School>) => void;
}

export const SchoolStudentLoginSettingsCard: React.FC<SchoolStudentLoginSettingsCardProps> = ({
  activeSchool,
  lang,
  onUpdateSchool,
}) => {
  // Login identifier preference
  const [identifierType, setIdentifierType] = useState<'student_id_only' | 'email_only' | 'both'>(
    activeSchool.studentLoginIdentifierType || 'both'
  );
  const [customSlug, setCustomSlug] = useState<string>(
    activeSchool.customLoginSlug || activeSchool.code.toLowerCase() || 'school-portal'
  );
  const [defaultPasswordType, setDefaultPasswordType] = useState<'student_id' | 'birthdate' | 'custom' | 'pin'>(
    activeSchool.studentDefaultPasswordType || 'birthdate'
  );
  const [passwordNote, setPasswordNote] = useState<string>(
    activeSchool.studentDefaultPasswordNote || 'ใช้วันเดือนปีเกิด (ววดดปปปป เช่น 12042551) หรือรหัสนักเรียน'
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showQrPrintModal, setShowQrPrintModal] = useState(false);

  // Dedicated School Login Link
  const schoolLoginUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const cleanSlug = encodeURIComponent(customSlug.trim() || activeSchool.id);
    return `${origin}/?schoolId=${activeSchool.id}&schoolCode=${encodeURIComponent(activeSchool.code)}&school=${cleanSlug}&loginMode=student`;
  }, [activeSchool.id, activeSchool.code, customSlug]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(schoolLoginUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenTestLink = () => {
    window.open(schoolLoginUrl, '_blank');
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const updates: Partial<School> = {
      studentLoginIdentifierType: identifierType,
      customLoginSlug: customSlug.trim(),
      studentDefaultPasswordType: defaultPasswordType,
      studentDefaultPasswordNote: passwordNote.trim(),
      customSchoolLoginUrl: schoolLoginUrl,
    };

    // Save to local storage for school persistence
    try {
      localStorage.setItem(`eduverse_school_login_config_${activeSchool.id}`, JSON.stringify(updates));
    } catch {
      // ignore
    }

    try {
      if (onUpdateSchool) {
        await onUpdateSchool(updates);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกการตั้งค่าลงฐานข้อมูลได้');
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
                    นักเรียนใช้รหัสประจำตัวนักเรียน (เช่น <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-mono font-bold text-blue-600">ED-6901</code> หรือ <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-mono font-bold text-blue-600">10001</code>) คู่กับรหัสผ่าน โดยไม่ต้องมีอีเมล สะดวกสำหรับนักเรียนประถมและมัธยม
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
                  ชื่อย่อ / รหัสอ้างอิง URL โรงเรียน (School Slug / Shortcode)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--color-text-muted)] px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] shrink-0">
                    /?school=
                  </span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="เช่น bkk-wittaya หรือ sch-bkk01"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
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

                    <button
                      type="button"
                      onClick={handleOpenTestLink}
                      className="px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ทดสอบเปิดลิงก์</span>
                    </button>
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
                    onChange={(e) => setDefaultPasswordType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none"
                  >
                    <option value="birthdate">วันเดือนปีเกิด (ววดดปปปป เช่น 12042551)</option>
                    <option value="student_id">ใช้รหัสนักเรียนเป็นรหัสผ่านเริ่มต้น</option>
                    <option value="custom">รหัสผ่านที่โรงเรียนกำหนดเอง (Default Password)</option>
                    <option value="pin">เลขประจำตัวประชาชน 4 ตัวท้าย</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs font-bold text-[var(--color-text-title)]">
                  <span>ข้อความแนะนำนักเรียนในหน้าเข้าสู่ระบบ</span>
                  <input
                    type="text"
                    value={passwordNote}
                    onChange={(e) => setPasswordNote(e.target.value)}
                    placeholder="เช่น ใช้วันเดือนปีเกิด หรือ รหัสนักเรียน"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] outline-none"
                  />
                </label>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  ข้อความแนะนำนี้จะปรากฏใต้ช่องกรอกรหัสผ่านในหน้าล็อกอินนักเรียน เพื่อช่วยให้นักเรียนสามารถเข้าสู่ระบบได้ด้วยตนเองโดยไม่ต้องรบกวนครูประจำชั้น
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
                  รหัสโรงเรียน: {activeSchool.code}
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
                    {identifierType === 'email_only' ? 'student@school.ac.th' : 'เช่น ED-6901, 10001'}
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
      {showQrPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">แผ่นป้าย QR Code ประจำโรงเรียนสำหรับนักเรียน</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrPrintModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

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
                  รหัสสถานศึกษา: {activeSchool.code}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowQrPrintModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
