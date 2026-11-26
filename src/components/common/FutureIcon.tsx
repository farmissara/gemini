import React, { useId } from 'react';
import type { NavTab } from '../layout/Sidebar';
import type { ModuleTone } from '../../lib/moduleTheme';

interface FutureNavIconProps {
  tab?: NavTab | string;
  fallback?: React.ComponentType<{ className?: string }>;
  size?: number;
  className?: string;
  active?: boolean;
}

/**
 * Sleek futuristic geometric duotone SVG icons for all core EduVerse / BaanPakKru modules.
 * Combines crisp architectural strokes with translucent prism fills that inherit `--tone` & `--tone-2nd`
 * (or white when rendered inside an active solid-gradient tile).
 */
export const FutureNavIcon: React.FC<FutureNavIconProps> = ({
  tab,
  fallback: FallbackIcon,
  size = 18,
  className = '',
  active = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const gradId = `fi-${uid}`;
  const fillOpacity = active ? 0.28 : 0.2;

  const renderGlyph = () => {
    switch (tab) {
      case 'dashboard':
        return (
          <>
            <rect x="3" y="3" width="8.5" height="8.5" rx="2.5" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <rect x="13.5" y="3" width="7.5" height="5" rx="2" stroke="currentColor" strokeWidth="1.85" />
            <rect x="13.5" y="10" width="7.5" height="11" rx="2.5" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <rect x="3" y="13.5" width="8.5" height="7.5" rx="2.2" stroke="currentColor" strokeWidth="1.85" />
          </>
        );

      case 'students':
        return (
          <>
            <circle cx="9.5" cy="7.5" r="3.5" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <path d="M3 19.5C3.4 15.8 6.2 13.5 9.5 13.5C12.8 13.5 15.6 15.8 16 19.5" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
            <circle cx="17" cy="8.5" r="2.3" stroke="currentColor" strokeWidth="1.7" />
            <path d="M17.5 13.8C19.6 14.3 21 16 21.3 18.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </>
        );

      case 'teachers':
        return (
          <>
            <path d="M2.5 9L12 4.5L21.5 9L12 13.5L2.5 9Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M6.5 11.2V16C6.5 17.8 9 19.5 12 19.5C15 19.5 17.5 17.8 17.5 16V11.2" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
            <path d="M20.5 10.2V15.5" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
          </>
        );

      case 'courses':
      case 'central_exam_hub':
      case 'super_admin_central_exams':
        return (
          <>
            <path d="M3.5 5.5C3.5 4.4 4.4 3.5 5.5 3.5H10.5C11.3 3.5 12 4.2 12 5V19.5C11 18.7 9.6 18.2 8 18.2H5.5C4.4 18.2 3.5 17.3 3.5 16.2V5.5Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M20.5 5.5C20.5 4.4 19.6 3.5 18.5 3.5H13.5C12.7 3.5 12 4.2 12 5V19.5C13 18.7 14.4 18.2 16 18.2H18.5C19.6 18.2 20.5 17.3 20.5 16.2V5.5Z" stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M15.5 8.5H18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </>
        );

      case 'timetable':
        return (
          <>
            <rect x="3" y="4.5" width="18" height="16.5" rx="3.2" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <path d="M3 9.5H21" stroke="currentColor" strokeWidth="1.85" />
            <path d="M8 2.8V5.8M16 2.8V5.8" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
            <rect x="7" y="12.5" width="4" height="4" rx="1" fill="currentColor" />
            <path d="M14 14.5H17.5" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
          </>
        );

      case 'attendance':
      case 'mobile_checkin':
        return (
          <>
            <path d="M4 8V5.5C4 4.4 4.9 3.5 6 3.5H8.5M15.5 3.5H18C19.1 3.5 20 4.4 20 5.5V8M20 16V18.5C20 19.6 19.1 20.5 18 20.5H15.5M8.5 20.5H6C4.9 20.5 4 19.6 4 18.5V16" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
            <rect x="7" y="7" width="4" height="4" rx="1" fill={`url(#${gradId})`} fillOpacity={0.35} stroke="currentColor" strokeWidth="1.7" />
            <rect x="13" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.7" />
            <rect x="7" y="13" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.7" />
            <path d="M13.5 15L15.2 16.7L18.2 13.3" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'gradebook':
      case 'student_development_book':
      case 'qualitative_summary':
        return (
          <>
            <circle cx="12" cy="9" r="5.5" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <path d="M9.5 13.8L8.2 21L12 19L15.8 21L14.5 13.8" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 6.8L12.7 8.2L14.2 8.4L13.1 9.5L13.4 11L12 10.3L10.6 11L10.9 9.5L9.8 8.4L11.3 8.2L12 6.8Z" fill="currentColor" />
          </>
        );

      case 'homework':
        return (
          <>
            <path d="M6 3.5H14.5L18.5 7.5V18.5C18.5 19.6 17.6 20.5 16.5 20.5H6C4.9 20.5 4 19.6 4 18.5V5.5C4 4.4 4.9 3.5 6 3.5Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M14 3.5V8H18.5" stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M8 13.5L10.3 15.8L15 11" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'announcements':
        return (
          <>
            <path d="M12 3.5C8.7 3.5 6 6.2 6 9.5V13.8L4.2 16.5H19.8L18 13.8V9.5C18 6.2 15.3 3.5 12 3.5Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M9.8 19C10.3 20 11.1 20.5 12 20.5C12.9 20.5 13.7 20 14.2 19" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
            <circle cx="18.2" cy="5.8" r="2.2" fill="currentColor" />
          </>
        );

      case 'behavior_sdq':
        return (
          <>
            <path d="M12 20.2C12 20.2 4 15.2 4 9.2C4 6.5 6.1 4.5 8.7 4.5C10.3 4.5 11.5 5.3 12 6.4C12.5 5.3 13.7 4.5 15.3 4.5C17.9 4.5 20 6.5 20 9.2C20 15.2 12 20.2 12 20.2Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M8.5 11.5L11 13.5L15.5 9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'infirmary':
        return (
          <>
            <rect x="3.5" y="4.5" width="17" height="15" rx="3.2" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <path d="M12 8.2V15.8M8.2 12H15.8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          </>
        );

      case 'student_id_cards':
      case 'super_admin_exam_payment':
        return (
          <>
            <rect x="2.8" y="4.8" width="18.4" height="14.4" rx="3" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <circle cx="8.5" cy="11" r="2" stroke="currentColor" strokeWidth="1.7" />
            <path d="M6 15.5C6.5 14.2 7.5 13.6 8.5 13.6C9.5 13.6 10.5 14.2 11 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M13.5 10H18M13.5 13.5H16.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        );

      case 'career_quest':
        return (
          <>
            <circle cx="12" cy="12" r="9" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <path d="M15.6 8.4L13.7 13.7L8.4 15.6L10.3 10.3L15.6 8.4Z" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          </>
        );

      case 'socratic_tutor':
        return (
          <>
            <path d="M12 3L14.1 8.9L20 11L14.1 13.1L12 19L9.9 13.1L4 11L9.9 8.9L12 3Z" fill={`url(#${gradId})`} fillOpacity={0.28} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M18.5 4V7M17 5.5H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </>
        );

      case 'ai_diagnostic':
        return (
          <>
            <rect x="5" y="5" width="14" height="14" rx="3.5" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
            <path d="M9 2.5V5M15 2.5V5M9 19V21.5M15 19V21.5M2.5 9H5M2.5 15H5M19 9H21.5M19 15H21.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </>
        );

      case 'subject_labs':
        return (
          <>
            <path d="M9.5 3.5H14.5M10.5 3.5V9L5.4 17.5C4.7 18.7 5.5 20.2 6.9 20.2H17.1C18.5 20.2 19.3 18.7 18.6 17.5L13.5 9V3.5" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7.5 15H16.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </>
        );

      case 'realworld_quests':
        return (
          <>
            <path d="M4 8.5C4 7.4 4.9 6.5 6 6.5H8L9.5 4.5H14.5L16 6.5H18C19.1 6.5 20 7.4 20 8.5V17.5C20 18.6 19.1 19.5 18 19.5H6C4.9 19.5 4 18.6 4 17.5V8.5Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.85" />
          </>
        );

      case 'study_streak':
        return (
          <>
            <path d="M12.5 2.8C12.5 2.8 17.5 6.8 17.5 12.2C17.5 16.2 14.9 19.8 11.8 19.8C8.4 19.8 6 17 6 13.5C6 10.6 7.8 8.3 9.2 7.2C9.2 7.2 9.4 9.5 10.8 10.4C10.5 7.4 12.5 2.8 12.5 2.8Z" fill={`url(#${gradId})`} fillOpacity={0.28} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
          </>
        );

      case 'games':
      case 'boss_raid':
        return (
          <>
            <rect x="2.8" y="6.5" width="18.4" height="11" rx="5.5" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <path d="M7.5 10V14M5.5 12H9.5" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
            <circle cx="15.2" cy="10.8" r="1" fill="currentColor" />
            <circle cx="17.2" cy="12.8" r="1" fill="currentColor" />
          </>
        );

      case 'hall_of_fame':
        return (
          <>
            <path d="M7 4.5H17V10C17 12.8 14.8 15 12 15C9.2 15 7 12.8 7 10V4.5Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M7 6.5H4.2C4.2 9.2 5.4 10.5 7 10.8M17 6.5H19.8C19.8 9.2 18.6 10.5 17 10.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M12 15V19.5M8.5 19.5H15.5" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
          </>
        );

      case 'portfolio':
        return (
          <>
            <path d="M3.5 6.5C3.5 5.4 4.4 4.5 5.5 4.5H9.5L11.5 6.8H18.5C19.6 6.8 20.5 7.7 20.5 8.8V17.5C20.5 18.6 19.6 19.5 18.5 19.5H5.5C4.4 19.5 3.5 18.6 3.5 17.5V6.5Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M8.5 13H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        );

      case 'realtime_daily':
        return (
          <>
            <rect x="3" y="4" width="18" height="16" rx="3.2" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <path d="M6 12.5H9L11 8.5L13.5 15.5L15.5 12H18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'executive_monitor':
      case 'obec_executive_dashboard':
      case 'pp6_executive_dashboard':
      case 'report_insights':
        return (
          <>
            <rect x="3.2" y="3.8" width="17.6" height="16.4" rx="3.2" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" />
            <path d="M7.5 15.5V12M12 15.5V8.5M16.5 15.5V10.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          </>
        );

      case 'executive_warning':
      case 'super_admin_audit':
        return (
          <>
            <path d="M12 3L19.5 6V11.8C19.5 16.4 16.3 19.8 12 21C7.7 19.8 4.5 16.4 4.5 11.8V6L12 3Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M12 8.5V12.5M12 15.5H12.01" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          </>
        );

      case 'super_admin_console':
      case 'super_admin_approvals':
      case 'school_permissions':
        return (
          <>
            <path d="M12 3L19.5 6V11.8C19.5 16.4 16.3 19.8 12 21C7.7 19.8 4.5 16.4 4.5 11.8V6L12 3Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M9 12L11 14L15.2 9.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'system_settings':
      case 'admin_saas_audit':
        return (
          <>
            <path d="M4.5 7H14.5M18 7H19.5M4.5 12H7.5M11 12H19.5M4.5 17H13.5M17 17H19.5" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
            <circle cx="16.2" cy="7" r="2" fill={`url(#${gradId})`} fillOpacity={0.35} stroke="currentColor" strokeWidth="1.8" />
            <circle cx="9.2" cy="12" r="2" fill={`url(#${gradId})`} fillOpacity={0.35} stroke="currentColor" strokeWidth="1.8" />
            <circle cx="15.2" cy="17" r="2" fill={`url(#${gradId})`} fillOpacity={0.35} stroke="currentColor" strokeWidth="1.8" />
          </>
        );

      case 'school_gps':
        return (
          <>
            <path d="M12 20.5C12 20.5 18 15 18 9.8C18 6.5 15.3 3.8 12 3.8C8.7 3.8 6 6.5 6 9.8C6 15 12 20.5 12 20.5Z" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <circle cx="12" cy="9.8" r="2.4" stroke="currentColor" strokeWidth="1.8" />
          </>
        );

      default:
        if (FallbackIcon) {
          return null;
        }
        return (
          <>
            <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill={`url(#${gradId})`} fillOpacity={fillOpacity} stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          </>
        );
    }
  };

  const glyph = renderGlyph();
  if (!glyph && FallbackIcon) {
    const fallbackSizeClass =
      size <= 13 ? 'w-3 h-3' : size <= 15 ? 'w-3.5 h-3.5' : size <= 18 ? 'w-4 h-4' : size <= 22 ? 'w-5 h-5' : 'w-6 h-6';
    return (
      <FallbackIcon
        className={`${fallbackSizeClass} shrink-0 transition-transform duration-200 ${className}`}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {glyph}
    </svg>
  );
};

interface FutureIconBadgeProps {
  tone?: ModuleTone;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'glass' | 'solid';
  className?: string;
  children: React.ReactNode;
}

const BADGE_SIZE_CLASS: Record<NonNullable<FutureIconBadgeProps['size']>, string> = {
  xs: 'w-6 h-6 rounded-lg',
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-12 h-12 rounded-2xl',
};

/**
 * Unified futuristic glass / gradient badge container for icons across cards, heroes, and dashboards.
 */
export const FutureIconBadge: React.FC<FutureIconBadgeProps> = ({
  tone,
  size = 'md',
  variant = 'glass',
  className = '',
  children,
}) => {
  const toneClass = tone || '';
  const variantClass = variant === 'solid' ? 'tone-chip-solid' : 'tone-chip';
  return (
    <span
      className={`${toneClass} ${variantClass} ${BADGE_SIZE_CLASS[size]} ${className}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
};
