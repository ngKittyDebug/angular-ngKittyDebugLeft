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
  describe('Happy Path', () => {
    it('должен оставлять в trimBoundedList самые новые хвостовые элементы', () => {
      expect(trimBoundedList([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
    });

    it('должен оставлять в trimNewestFirst самые новые головные элементы', () => {
      expect(trimNewestFirst(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b']);
    });

    it('должен удалять устаревшие прочитанные уведомления', () => {
      const now = 1_000_000;
      const notificationList = [
        createNotification('fresh-unread', false, now - 1_000),
        createNotification('stale-read', true, now - 10_000),
        createNotification('fresh-read', true, now - 2_000),
      ];

      const result = pruneReadNotifications(notificationList, 5_000, 10, now);

      expect(result.map((notification) => notification.id)).toEqual(['fresh-unread', 'fresh-read']);
    });
  });

  describe('Edge Cases', () => {
    it('должен применять лимиты коллекций в garbageCollectTamagotchiState', () => {
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
});
