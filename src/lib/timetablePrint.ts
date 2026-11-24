const TIMETABLE_LANDSCAPE_STYLE_ID = 'baanpakkru-timetable-landscape-page';

/**
 * Ensures browsers print the active timetable in A4 Landscape even when
 * the user presses Ctrl+P / Cmd+P or clicks the Print button inside an iframe.
 * Browsers frequently ignore named `@page timetable` rules when a global
 * `@page { size: A4 portrait; }` rule exists, so we mount an unnamed
 * `@page { size: A4 landscape; }` override only while the landscape timetable view is active.
 */
export function setTimetableLandscapePageRule(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(TIMETABLE_LANDSCAPE_STYLE_ID);
  if (enabled) {
    const css = '@media print { @page { size: A4 landscape !important; margin: 6mm !important; } }';
    if (existing) {
      if (existing.textContent !== css) existing.textContent = css;
      return;
    }
    const styleEl = document.createElement('style');
    styleEl.id = TIMETABLE_LANDSCAPE_STYLE_ID;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  } else if (existing) {
    existing.remove();
  }
}

export function printTimetableLandscape(): void {
  setTimetableLandscapePageRule(true);
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.requestAnimationFrame(() => {
      window.print();
    });
  }
}
