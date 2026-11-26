import React from 'react';
import { StatusBadge, type StatusBadgeStatus } from './StatusBadge';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusIndicatorProps {
  tone: StatusTone;
  label?: React.ReactNode;
  size?: 'xs' | 'sm';
  dotOnly?: boolean;
  title?: string;
  ariaLabel?: string;
  className?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
}

const TONE_TO_STATUS: Record<StatusTone, StatusBadgeStatus> = {
  success: 'complete',
  warning: 'pending',
  danger: 'delayed',
  info: 'info',
  neutral: 'neutral',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  tone,
  label,
  size = 'sm',
  dotOnly = false,
  title,
  ariaLabel,
  className = '',
  icon,
  pulse = false,
}) => (
  <StatusBadge
    status={TONE_TO_STATUS[tone]}
    label={label}
    size={size}
    dotOnly={dotOnly}
    title={title}
    ariaLabel={ariaLabel}
    className={className}
    icon={icon}
    pulse={pulse}
  />
);
