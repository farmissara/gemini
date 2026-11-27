import React, { useEffect } from 'react';
import { Check, Lightbulb, Play, RefreshCw, X } from 'lucide-react';
import {
  LIFE_SUBJECT_CATALOG,
  LIFE_SUBJECT_MAP,
  type LifeChallengeScenario,
  type LifeSubjectId,
} from '../../lib/farmLifeSubjects';
import type { SchoolFarmState } from '../../lib/schoolFarmEngine';

export const SubjectBadgeSvg: React.FC<{ subjectId: LifeSubjectId; className?: string }> = ({
  subjectId,
  className = 'w-7 h-7',
}) => {
  switch (subjectId) {
    case 'science_tech':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M14 6 H22 V13 L29 27 C30 29 28.5 31 26 31 H10 C7.5 31 6 29 7 27 L14 13 Z" fill="#e0f2fe" stroke="#0369a1" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9.5 23 H26.5 L28.5 27.5 C29 29 28 30 26 30 H10 C8 30 7 29 7.5 27.5 Z" fill="#38bdf8" />
          <circle cx="16" cy="26" r="1.6" fill="#fff" />
          <circle cx="21" cy="24" r="1.2" fill="#fff" />
        </svg>
      );
    case 'math':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="6" y="6" width="24" height="24" rx="5" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
          <path d="M11 13 H17 M14 10 V16 M20 13 H26" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M11 21 L16 26 M16 21 L11 26 M20 22 H26 M20 25 H26" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'thai':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="7" y="6" width="22" height="24" rx="4" fill="#fff1f2" stroke="#be123c" strokeWidth="2" />
          <path d="M13 24 V16 C13 13.5 16 12 18 14.5 C20 12 23 13.5 23 16 V24" fill="none" stroke="#be123c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="13" cy="24" r="1.5" fill="#be123c" />
        </svg>
      );
    case 'foreign_lang':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <circle cx="18" cy="18" r="12" fill="#eef2ff" stroke="#4338ca" strokeWidth="2" />
          <ellipse cx="18" cy="18" rx="5.5" ry="12" fill="none" stroke="#4338ca" strokeWidth="1.6" />
          <line x1="6.5" y1="18" x2="29.5" y2="18" stroke="#4338ca" strokeWidth="1.6" />
          <line x1="9" y1="12" x2="27" y2="12" stroke="#6366f1" strokeWidth="1.3" />
          <line x1="9" y1="24" x2="27" y2="24" stroke="#6366f1" strokeWidth="1.3" />
        </svg>
      );
    case 'social':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M18 6 L30 14 H6 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="9" y="14" width="18" height="12" fill="#fef3c7" stroke="#78350f" strokeWidth="1.6" />
          <rect x="6" y="26" width="24" height="4" rx="1.5" fill="#b45309" />
          <line x1="14" y1="14" x2="14" y2="26" stroke="#92400e" strokeWidth="1.6" />
          <line x1="22" y1="14" x2="22" y2="26" stroke="#92400e" strokeWidth="1.6" />
        </svg>
      );
    case 'health_pe':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M18 30 C18 30 7 22.5 7 14.5 C7 10.5 10 8 13.5 8 C15.8 8 17.3 9.2 18 10.8 C18.7 9.2 20.2 8 22.5 8 C26 8 29 10.5 29 14.5 C29 22.5 18 30 18 30 Z" fill="#dcfce7" stroke="#15803d" strokeWidth="2" />
          <path d="M18 14 V22 M14 18 H22" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'arts':
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <path d="M18 6 C11 6 6 11.5 6 18 C6 25 11.5 30 18 30 C20.5 30 22 28.5 22 26.5 C22 25 20.8 24 20.8 22.8 C20.8 21.5 22 20.5 24 20.5 H26.5 C28.5 20.5 30 19 30 16.5 C30 10.5 24.5 6 18 6 Z" fill="#fdf2f8" stroke="#be185d" strokeWidth="2" />
          <circle cx="13" cy="14" r="2" fill="#f43f5e" />
          <circle cx="19" cy="11.5" r="2" fill="#f59e0b" />
          <circle cx="24" cy="14.5" r="2" fill="#6366f1" />
          <circle cx="12.5" cy="21" r="2" fill="#10b981" />
        </svg>
      );
    case 'career_tech':
    default:
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
          <rect x="8" y="13" width="20" height="16" rx="3" fill="#ccfbf1" stroke="#0f766e" strokeWidth="2" />
          <path d="M13 13 V10 C13 8.5 14.2 7.5 15.8 7.5 H20.2 C21.8 7.5 23 8.5 23 10 V13" fill="none" stroke="#0f766e" strokeWidth="2" />
          <line x1="8" y1="20" x2="28" y2="20" stroke="#14b8a6" strokeWidth="1.8" />
          <circle cx="18" cy="20" r="2" fill="#0f766e" />
        </svg>
      );
  }
};

export interface LiveSubjectChallengeCardProps {
  challenge: LifeChallengeScenario | null;
  pickedIndex: number | null;
  canNext?: boolean;
  onSelectOption: (idx: number) => void;
  onNextSameSubject?: () => void;
  onClose: () => void;
}

export const LiveSubjectChallengeCard: React.FC<LiveSubjectChallengeCardProps> = ({
  challenge,
  pickedIndex,
  canNext = false,
  onSelectOption,
  onNextSameSubject,
  onClose,
}) => {
  useEffect(() => {
    if (!challenge) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [challenge, onClose]);

  if (!challenge) return null;
  const meta = LIFE_SUBJECT_MAP[challenge.subjectId];
  const isAnswered = pickedIndex !== null;
  const isCorrect = pickedIndex === challenge.correctIndex;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/38 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`เหตุการณ์จริงวิชา${challenge.subjectNameTh}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[24px] border-2 border-[#c8a165] bg-[#fcf7ec]/98 dark:bg-[#1f1912]/98 backdrop-blur-xl shadow-[0_18px_46px_rgba(10,20,8,0.52)] overflow-hidden"
      >
        {/* Slim header */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#5a3d20] to-[#3f6212] text-amber-50 flex items-center justify-between gap-2 border-b border-[#d6b37c]/45">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/95 flex items-center justify-center shrink-0">
              <SubjectBadgeSvg subjectId={challenge.subjectId} className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-amber-200 truncate">
                วิชา{meta.shortTh} · เหตุการณ์จริงในสวน
              </p>
              <h3 className="text-xs sm:text-sm font-black truncate">{challenge.contextActionTh}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-amber-50 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Question & Reward line (plain typography, no static pills) */}
          <div className="space-y-1.5">
            <p className="text-sm font-black text-[#45270f] dark:text-amber-50 leading-snug">
              {challenge.questionTh}
            </p>
            <p className="text-[11px] font-bold text-[#7c5c3e] dark:text-stone-400 tabular-nums">
              ตอบถูกจะได้รับ +{challenge.rewardCoins}🪙 · +{challenge.rewardWater}💧 · +{challenge.rewardXp} XP
              {challenge.rewardStars > 0 ? ` · +${challenge.rewardStars}★` : ''}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {challenge.options.map((opt, idx) => {
              const selected = pickedIndex === idx;
              const rightOpt = idx === challenge.correctIndex;
              let btnCls =
                'border-[#d6b37c] bg-white dark:bg-stone-900 text-[#45270f] dark:text-amber-50 hover:bg-amber-50 dark:hover:bg-stone-800';
              if (isAnswered) {
                if (rightOpt) {
                  btnCls = 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200';
                } else if (selected) {
                  btnCls = 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200';
                } else {
                  btnCls = 'border-[#d6b37c]/50 bg-white/60 dark:bg-stone-900/50 text-[#7c5c3e] opacity-65';
                }
              }
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => onSelectOption(idx)}
                  className={`w-full min-h-[42px] px-3 py-2 rounded-xl border text-left text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition ${btnCls}`}
                >
                  <span>
                    {idx + 1}. {opt}
                  </span>
                  {isAnswered && rightOpt && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Feedback + Real-Life Application Tip */}
          {isAnswered ? (
            <div className="rounded-xl border border-[#d6b37c]/80 bg-white/90 dark:bg-stone-900/90 p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className={`text-xs font-black ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {isCorrect ? 'เข้าใจถูกต้อง! นำความรู้ไปใช้จริงสำเร็จ' : 'คำตอบที่ถูกต้องตามหลักวิชาชีวิตจริง'}
                  </p>
                  <p className="text-[11px] text-[#45270f] dark:text-stone-300 leading-relaxed">
                    {challenge.realLifeTipTh}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                {canNext && onNextSameSubject && (
                  <button
                    type="button"
                    onClick={onNextSameSubject}
                    className="min-h-[38px] px-3 rounded-xl border border-[#c8a165] bg-[#f1e4c9] text-[#45270f] text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>เคสถัดไป</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[38px] px-4 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-black cursor-pointer"
                >
                  กลับไปดูแลสวนต่อ
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[34px] px-3 rounded-lg text-[11px] font-bold text-[#7c5c3e] hover:text-[#45270f] cursor-pointer"
              >
                ข้ามไว้ทีหลัง
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export interface LifeSubjectsMatrixPanelProps {
  farmState: SchoolFarmState;
  lifeAutoPromptEnabled: boolean;
  onToggleLifeAutoPrompt: () => void;
  onLaunchSubjectScenario: (subjectId: LifeSubjectId) => void;
}

export const LifeSubjectsMatrixPanel: React.FC<LifeSubjectsMatrixPanelProps> = ({
  farmState,
  lifeAutoPromptEnabled,
  onToggleLifeAutoPrompt,
  onLaunchSubjectScenario,
}) => {
  const mastery = farmState.lifeSubjectMastery || {};
  const totalSolved = LIFE_SUBJECT_CATALOG.reduce((sum, s) => sum + (mastery[s.id]?.solved || 0), 0);

  return (
    <div className="space-y-3">
      {/* Auto-Prompt Control Row */}
      <div className="rounded-2xl border border-[#d6b37c] bg-white/85 dark:bg-stone-900/80 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-[#45270f] dark:text-amber-50">
            บูรณาการ 8 กลุ่มสาระสู่ชีวิตจริงในฟาร์มและคาเฟ่
          </p>
          <p className="text-[11px] text-[#7c5c3e] dark:text-stone-400 tabular-nums">
            แก้โจทย์ชีวิตจริงสำเร็จแล้ว {totalSolved} ครั้ง · รดน้ำข้าว ขายของ ชงชา จะเชื่อมโยงวิชาอัตโนมัติ
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleLifeAutoPrompt}
          className={`min-h-[36px] px-3 rounded-xl text-[11px] font-black cursor-pointer transition whitespace-nowrap ${
            lifeAutoPromptEnabled
              ? 'bg-[#15803d] text-white'
              : 'bg-stone-200 dark:bg-stone-800 text-[#45270f] dark:text-stone-300'
          }`}
        >
          {lifeAutoPromptEnabled ? 'ถามระหว่างเล่น: เปิด' : 'ถามระหว่างเล่น: ปิด'}
        </button>
      </div>

      {/* 8 MOE Subject Branches Compact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {LIFE_SUBJECT_CATALOG.map((subj) => {
          const entry = mastery[subj.id];
          const solved = entry?.solved || 0;
          return (
            <div
              key={subj.id}
              className="rounded-2xl border border-[#d6b37c]/85 bg-white/90 dark:bg-stone-900/85 p-2.5 flex items-center justify-between gap-2.5"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#fcf7ec] dark:bg-stone-800 border border-[#d6b37c]/60 flex items-center justify-center shrink-0">
                  <SubjectBadgeSvg subjectId={subj.id} className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-black text-[#45270f] dark:text-amber-50 truncate">{subj.shortTh}</span>
                    <span aria-hidden="true" className="text-[#7c5c3e]">·</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                      ผ่าน {solved}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7c5c3e] dark:text-stone-400 leading-snug line-clamp-2 mt-0.5">
                    {subj.farmRoleTh}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onLaunchSubjectScenario(subj.id)}
                aria-label={`จำลองเหตุการณ์วิชา${subj.shortTh}`}
                className="min-h-[36px] px-2.5 rounded-xl text-white text-[11px] font-black inline-flex items-center gap-1 cursor-pointer shrink-0 transition hover:opacity-90"
                style={{ backgroundColor: subj.accentHex }}
              >
                <Play className="w-3 h-3" />
                <span>จำลอง</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
