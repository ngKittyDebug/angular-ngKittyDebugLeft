import type { InteractionEventModel } from '../models/interaction.model';
import type { NotificationModel } from '../models/notification.model';
import type { PerformanceProfileModel } from '../models/performance-mode.model';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';

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
  notificationList: readonly NotificationModel[],
  maxAgeMs: number,
  limit: number,
  now: number = Date.now(),
): NotificationModel[] {
  const cutoff = now - maxAgeMs;
  const kept = notificationList.filter(
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
  state: TamagotchiStateModel,
  limits: GarbageCollectLimits,
  now: number = Date.now(),
): TamagotchiStateModel {
  return {
    ...state,
    interactionHistory: trimBoundedList(
      state.interactionHistory,
      limits.interactionHistoryLimit,
    ) as InteractionEventModel[],
    notificationList: pruneReadNotifications(
      state.notificationList,
      limits.readNotificationMaxAgeMs,
      limits.notificationHistoryLimit,
      now,
    ),
  };
}

export function profileToGarbageCollectLimits(
  profile: PerformanceProfileModel,
): GarbageCollectLimits {
  return {
    interactionHistoryLimit: profile.interactionHistoryLimit,
    notificationHistoryLimit: profile.notificationHistoryLimit,
    readNotificationMaxAgeMs: profile.readNotificationMaxAgeMs,
  };
}
