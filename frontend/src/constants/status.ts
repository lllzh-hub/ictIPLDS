export const DEFECT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
} as const;

export const DEFECT_STATUS_LABELS = {
  pending: '待处理',
  'in-progress': '处理中',
  review: '审核中',
  completed: '已完成',
} as const;

export const DRONE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  IN_FLIGHT: 'IN_FLIGHT',
  CHARGING: 'CHARGING',
  MAINTENANCE: 'MAINTENANCE',
  OFFLINE: 'OFFLINE',
} as const;

export const DRONE_STATUS_LABELS = {
  AVAILABLE: '可用',
  IN_FLIGHT: '飞行中',
  CHARGING: '充电中',
  MAINTENANCE: '维护中',
  OFFLINE: '离线',
} as const;
