import type { Notification } from '../../models/notification.model';
import type { InteractionEvent } from '../../models/interaction.model';
import type { PerformanceProfile } from '../../models/performance-mode.model';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';

export function trimBoundedList<T>(items: readonly T[], limit: number): T[] {
  if (items.length <= limit) {
    return [...items];
  }

  return items.slice(-limit);
}

export function trimNewestFirst<T>(items: readonly T[], limit: number): T[] {
  if (items.length <= limit) {
    return [...items];
  }

  return items.slice(0, limit);
}

export function pruneReadNotifications(
  notifications: readonly Notification[],
  maxAgeMs: number,
  limit: number,
  now: number = Date.now(),
): Notification[] {
  const cutoff = now - maxAgeMs;
  const kept = notifications.filter(
    (notification) => !notification.read || notification.timestamp >= cutoff,
  );

  return trimNewestFirst(kept, limit);
}

export interface GarbageCollectLimits {
  interactionHistoryLimit: number;
  notificationHistoryLimit: number;
  readNotificationMaxAgeMs: number;
}

export function garbageCollectTamagotchiState(
  state: TamagotchiState,
  limits: GarbageCollectLimits,
  now: number = Date.now(),
): TamagotchiState {
  return {
    ...state,
    interactionHistory: trimBoundedList(
      state.interactionHistory,
      limits.interactionHistoryLimit,
    ) as InteractionEvent[],
    notifications: pruneReadNotifications(
      state.notifications,
      limits.readNotificationMaxAgeMs,
      limits.notificationHistoryLimit,
      now,
    ),
  };
}

export function profileToGarbageCollectLimits(profile: PerformanceProfile): GarbageCollectLimits {
  return {
    interactionHistoryLimit: profile.interactionHistoryLimit,
    notificationHistoryLimit: profile.notificationHistoryLimit,
    readNotificationMaxAgeMs: profile.readNotificationMaxAgeMs,
  };
}
