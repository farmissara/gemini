import React from 'react';
import { Check, Palette } from 'lucide-react';
import {
  getTimetableSlotCardStyle,
  isCustomHexColor,
  TIMETABLE_COLOR_PRESETS,
} from '../../lib/timetableColors';

interface TimetableColorPickerProps {
  value: string;
  onChange: (nextColor: string) => void;
}

export const TimetableColorPicker: React.FC<TimetableColorPickerProps> = ({ value, onChange }) => {
  const activeStyle = getTimetableSlotCardStyle(value);
  const customHexValue = isCustomHexColor(value) ? value : activeStyle.swatchHex;

  return (
    <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-body)]">
          <Palette className="h-3.5 w-3.5 text-[var(--color-primary-text)]" />
          <span>สีในตารางสอน</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-text-muted)]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border border-black/15"
            style={{ backgroundColor: activeStyle.swatchHex }}
          />
          <span className="truncate max-w-[170px]">{activeStyle.labelTh}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {TIMETABLE_COLOR_PRESETS.map((preset) => {
          const isSelected = value.toLowerCase() === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onChange(preset.key)}
              title={preset.labelTh}
              aria-label={preset.labelTh}
              aria-pressed={isSelected}
              className={`relative flex h-6 w-6 items-center justify-center rounded-full border transition cursor-pointer ${
                isSelected
                  ? 'scale-110 ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-card-subtle)] border-white shadow-sm'
                  : 'border-black/15 hover:scale-105'
              }`}
              style={{ backgroundColor: preset.swatchHex }}
            >
              {isSelected && <Check className="h-3 w-3 text-white drop-shadow-xs" strokeWidth={3} />}
            </button>
          );
        })}

        <label
          title="เลือกสีเองตามต้องการ"
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition cursor-pointer ${
            activeStyle.isCustomHex
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
              : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:border-[var(--color-primary)]'
          }`}
        >
          <input
            type="color"
            value={customHexValue}
            onChange={(e) => onChange(e.target.value)}
            aria-label="เลือกสีตารางสอนเอง"
            className="h-3.5 w-3.5 cursor-pointer rounded-full border-0 bg-transparent p-0"
          />
          <span>กำหนดเอง</span>
        </label>
      </div>
    </div>
  );
};
