import { describe, expect, it } from 'vitest';

import type { NotificationModel } from '../models/notification.model';
import {
  garbageCollectTamagotchiState,
  pruneReadNotifications,
  trimBoundedList,
  trimNewestFirst,
} from './memory-management.helper';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';

function createNotification(id: string, read: boolean, timestamp: number): NotificationModel {
  return {
    id,
    message: `Message ${id}`,
    priority: 'info',
    read,
    timestamp,
    title: `Title ${id}`,
  };
}

describe('memory-management.helper', () => {
  it('trimBoundedList keeps the newest tail entries', () => {
    expect(trimBoundedList([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
  });

  it('trimNewestFirst keeps the newest head entries', () => {
    expect(trimNewestFirst(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b']);
  });

  it('pruneReadNotifications removes stale read notifications', () => {
    const now = 1_000_000;
    const notificationList = [
      createNotification('fresh-unread', false, now - 1_000),
      createNotification('stale-read', true, now - 10_000),
      createNotification('fresh-read', true, now - 2_000),
    ];

    const result = pruneReadNotifications(notificationList, 5_000, 10, now);

    expect(result.map((notification) => notification.id)).toEqual(['fresh-unread', 'fresh-read']);
  });

  it('garbageCollectTamagotchiState enforces collection limits', () => {
    const state = {
      ...createInitialTamagotchiState(),
      interactionHistory: Array.from({ length: 30 }, (_, index) => ({
        intensity: 0.5,
        moodIncrease: 1,
        timestamp: index,
        type: 'click' as const,
      })),
      notificationList: Array.from({ length: 12 }, (_, index) =>
        createNotification(`n-${index}`, true, index),
      ),
    };

    const collected = garbageCollectTamagotchiState(state, {
      interactionHistoryLimit: 10,
      notificationHistoryLimit: 5,
      readNotificationMaxAgeMs: Number.MAX_SAFE_INTEGER,
    });

    expect(collected.interactionHistory).toHaveLength(10);
    expect(collected.notificationList).toHaveLength(5);
  });
});
