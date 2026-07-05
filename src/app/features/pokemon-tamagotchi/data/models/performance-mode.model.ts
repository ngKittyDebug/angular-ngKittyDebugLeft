export type PerformanceMode = 'auto' | 'balanced' | 'high' | 'low';

export type EffectivePerformanceMode = 'balanced' | 'high' | 'low';

export interface PerformanceProfileModel {
  complexAnimations: boolean;
  decayIntervalMs: number;
  interactionHistoryLimit: number;
  notificationHistoryLimit: number;
  readNotificationMaxAgeMs: number;
}
