export type PerformanceMode = 'balanced' | 'high' | 'low';

export interface PerformanceProfileModel {
  complexAnimations: boolean;
  decayIntervalMs: number;
  interactionHistoryLimit: number;
  notificationHistoryLimit: number;
  readNotificationMaxAgeMs: number;
}
