import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Check,
  Edit3,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { AppLanguage, Teacher } from '../types';
import { DEFAULT_STAFF_POSITION_OPTIONS } from '../lib/schoolSettings';

interface StaffPositionConfigPanelProps {
  positions: string[];
  teachers: Teacher[];
  lang: AppLanguage;
  onSavePositions: (nextPositions: string[]) => Promise<void> | void;
  onRenamePositionAcrossTeachers?: (oldTitle: string, newTitle: string) => void;
  onClose?: () => void;
}

export const StaffPositionConfigPanel: React.FC<StaffPositionConfigPanelProps> = ({
  positions,
  teachers,
  lang,
  onSavePositions,
  onRenamePositionAcrossTeachers,
  onClose,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [cascadeRename, setCascadeRename] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const countStaffInPosition = (title: string) =>
    teachers.filter((t) => (t.positionTitle || '').trim() === title.trim()).length;

  const persistPositions = async (next: string[], successMessage: string) => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await onSavePositions(next);
      setFeedback({ type: 'success', text: successMessage });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : lang === 'th'
              ? 'ไม่สามารถบันทึกตำแหน่งบุคลากรได้'
              : 'Failed to save staff positions',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    if (positions.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      setFeedback({
        type: 'error',
        text:
          lang === 'th'
            ? `มีตำแหน่ง "${trimmed}" อยู่ในรายการแล้ว`
            : `Position "${trimmed}" already exists`,
      });
      return;
    }
    const next = [...positions, trimmed];
    setNewTitle('');
    await persistPositions(
      next,
      lang === 'th'
        ? `เพิ่มตำแหน่ง "${trimmed}" เรียบร้อยแล้ว`
        : `Added position "${trimmed}"`
    );
  };

  const handleStartEdit = (idx: number, currentTitle: string) => {
    setEditingIndex(idx);
    setEditingValue(currentTitle);
    setFeedback(null);
  };

  const handleSaveEdit = async (idx: number) => {
    const oldTitle = positions[idx];
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setFeedback({
        type: 'error',
        text: lang === 'th' ? 'กรุณาระบุชื่อตำแหน่ง' : 'Position title cannot be empty',
      });
      return;
    }
    if (
      trimmed !== oldTitle &&
      positions.some((p, i) => i !== idx && p.toLowerCase() === trimmed.toLowerCase())
    ) {
      setFeedback({
        type: 'error',
        text:
          lang === 'th'
            ? `มีตำแหน่ง "${trimmed}" อยู่ในรายการแล้ว`
            : `Position "${trimmed}" already exists`,
      });
      return;
    }

    const next = positions.map((p, i) => (i === idx ? trimmed : p));
    setEditingIndex(null);
    setEditingValue('');

    if (trimmed !== oldTitle && cascadeRename && onRenamePositionAcrossTeachers) {
      onRenamePositionAcrossTeachers(oldTitle, trimmed);
    }

    await persistPositions(
      next,
      lang === 'th'
        ? `อัปเดตตำแหน่ง "${oldTitle}" เป็น "${trimmed}" แล้ว`
        : `Updated "${oldTitle}" to "${trimmed}"`
    );
  };

  const handleMove = async (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= positions.length) return;
    const next = [...positions];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    await persistPositions(
      next,
      lang === 'th' ? 'อัปเดตลำดับตำแหน่งแล้ว' : 'Updated position order'
    );
  };

  const handleDelete = async (idx: number) => {
    if (positions.length <= 1) {
      setFeedback({
        type: 'error',
        text:
          lang === 'th'
            ? 'ต้องมีตำแหน่งบุคลากรอย่างน้อย 1 รายการ'
            : 'At least 1 staff position must remain',
      });
      return;
    }
    const removed = positions[idx];
    const next = positions.filter((_, i) => i !== idx);
    if (editingIndex === idx) {
      setEditingIndex(null);
      setEditingValue('');
    }
    await persistPositions(
      next,
      lang === 'th' ? `ลบตำแหน่ง "${removed}" ออกจากตัวเลือกแล้ว` : `Removed "${removed}"`
    );
  };

  const handleRestoreDefaults = async () => {
    const merged = Array.from(new Set([...positions, ...DEFAULT_STAFF_POSITION_OPTIONS]));
    await persistPositions(
      merged,
      lang === 'th'
        ? 'เพิ่มตำแหน่งมาตรฐานของโรงเรียนครบถ้วนแล้ว'
        : 'Merged standard school staff positions'
    );
  };

  return (
    <section
      aria-label={lang === 'th' ? 'ตั้งค่าตำแหน่งบุคลากรประจำโรงเรียน' : 'Staff Position Configuration'}
      className="shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <Briefcase className="w-4 h-4 text-[var(--color-primary-text)] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                {lang === 'th'
                  ? 'ตั้งค่าตำแหน่งบุคลากร (Staff Positions)'
                  : 'Staff Position Configuration'}
              </h2>
              <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                {positions.length} {lang === 'th' ? 'ตำแหน่งในระบบ' : 'configured titles'}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {lang === 'th'
                ? 'กำหนด แก้ไข และจัดเรียงตำแหน่งบุคลากรเฉพาะของโรงเรียน ข้อมูลจะซิงก์ไปยังตัวเลือก Dropdown ในประวัติครู/บุคลากรทันที'
                : 'Define, rename, and reorder school-specific staff titles. Changes immediately populate staff profile dropdowns.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleRestoreDefaults()}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'เติมตำแหน่งมาตรฐาน' : 'Merge Defaults'}</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'th' ? 'ปิดแผงตั้งค่าตำแหน่ง' : 'Close position panel'}
              className="p-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Add Form + Cascade Toggle */}
      <div className="px-4 py-3 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] space-y-2.5">
        <form onSubmit={(e) => void handleAddPosition(e)} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={
              lang === 'th'
                ? 'เพิ่มตำแหน่งบุคลากรใหม่ เช่น บรรณารักษ์, นักจิตวิทยาโรงเรียน, เจ้าหน้าที่ IT'
                : 'Add new staff title (e.g. School Counselor, Librarian, IT Officer)'
            }
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] text-xs focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={isSaving || !newTitle.trim()}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:opacity-95 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'เพิ่มตำแหน่งใหม่' : 'Add Position'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <label className="inline-flex items-center gap-1.5 text-[var(--color-text-body)] font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cascadeRename}
              onChange={(e) => setCascadeRename(e.target.checked)}
              className="rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer"
            />
            <span>
              {lang === 'th'
                ? 'เมื่อแก้ไขชื่อตำแหน่ง ให้อัปเดตในประวัติบุคลากรเดิมที่ถือตำแหน่งนั้นโดยอัตโนมัติ'
                : 'Automatically update existing staff profiles when a title is renamed'}
            </span>
          </label>

          {feedback && (
            <span
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`font-semibold ${
                feedback.type === 'error'
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {feedback.text}
            </span>
          )}
        </div>
      </div>

      {/* Positions List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border)]">
        {positions.map((pos, idx) => {
          const staffCount = countStaffInPosition(pos);
          const isEditing = editingIndex === idx;

          return (
            <div
              key={`${pos}-${idx}`}
              className="px-4 py-2 flex items-center justify-between gap-3 text-xs hover:bg-[var(--color-card-subtle)] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-5 text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums shrink-0">
                  {idx + 1}.
                </span>

                {isEditing ? (
                  <div className="flex flex-1 items-center gap-1.5 min-w-0">
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSaveEdit(idx);
                        } else if (e.key === 'Escape') {
                          setEditingIndex(null);
                          setEditingValue('');
                        }
                      }}
                      autoFocus
                      className="flex-1 min-w-0 px-2.5 py-1 rounded-md border border-[var(--color-primary)] bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-semibold focus:outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handleSaveEdit(idx)}
                      className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'บันทึก' : 'Save'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(null);
                        setEditingValue('');
                      }}
                      className="px-2 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] font-semibold cursor-pointer whitespace-nowrap"
                    >
                      {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-baseline gap-x-2 min-w-0">
                    <span className="font-semibold text-[var(--color-text-title)] truncate">
                      {pos}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      · {staffCount} {lang === 'th' ? 'บุคลากร' : 'staff'}
                    </span>
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={isSaving || idx === 0}
                    onClick={() => void handleMove(idx, -1)}
                    aria-label={lang === 'th' ? `เลื่อน ${pos} ขึ้น` : `Move ${pos} up`}
                    className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || idx === positions.length - 1}
                    onClick={() => void handleMove(idx, 1)}
                    aria-label={lang === 'th' ? `เลื่อน ${pos} ลง` : `Move ${pos} down`}
                    className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleStartEdit(idx, pos)}
                    aria-label={lang === 'th' ? `แก้ไข ${pos}` : `Edit ${pos}`}
                    className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || positions.length <= 1}
                    onClick={() => void handleDelete(idx)}
                    aria-label={lang === 'th' ? `ลบ ${pos}` : `Delete ${pos}`}
                    className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 disabled:opacity-35 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
