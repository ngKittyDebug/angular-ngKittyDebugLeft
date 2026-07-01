import type {
  EffectivePerformanceMode,
  PerformanceMode,
  PerformanceProfile,
} from '../../models/performance-mode.model';
import { TIMER_CONFIG } from './timer.constants';

export const PERFORMANCE_MODE_STORAGE_KEY = 'pokemon-tamagotchi-performance-mode';

export const DEFAULT_PERFORMANCE_MODE: PerformanceMode = 'auto';

export const MEMORY_GC_INTERVAL_TICKS = 5;

export const MEMORY_LIMITS = {
  INTERACTION_HISTORY_MAX: 50,
  NOTIFICATION_HISTORY_MAX: 20,
} as const;

export const PERFORMANCE_PROFILES: Record<EffectivePerformanceMode, PerformanceProfile> = {
  high: {
    complexAnimations: true,
    decayIntervalMs: TIMER_CONFIG.DECAY_INTERVAL_MS,
    interactionHistoryLimit: MEMORY_LIMITS.INTERACTION_HISTORY_MAX,
    notificationHistoryLimit: MEMORY_LIMITS.NOTIFICATION_HISTORY_MAX,
    readNotificationMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
  balanced: {
    complexAnimations: true,
    decayIntervalMs: TIMER_CONFIG.DECAY_INTERVAL_MS,
    interactionHistoryLimit: 40,
    notificationHistoryLimit: 15,
    readNotificationMaxAgeMs: 3 * 24 * 60 * 60 * 1000,
  },
  low: {
    complexAnimations: false,
    decayIntervalMs: TIMER_CONFIG.DECAY_INTERVAL_MS * 2,
    interactionHistoryLimit: 25,
    notificationHistoryLimit: 10,
    readNotificationMaxAgeMs: 24 * 60 * 60 * 1000,
  },
};
