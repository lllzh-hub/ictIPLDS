export const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export const SEVERITY_LABELS = {
  critical: '危急',
  high: '高',
  medium: '中',
  low: '低',
} as const;

export const SEVERITY_CONFIG = {
  critical: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: 'heroicons:fire',
  },
  high: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    icon: 'heroicons:exclamation-triangle',
  },
  medium: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    icon: 'heroicons:exclamation-circle',
  },
  low: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: 'heroicons:information-circle',
  },
} as const;
