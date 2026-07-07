import { describe, expect, it } from 'vitest';

import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { createInteractionEvent } from './gesture.helper';
import { isRoutineBonusEligible } from './routine.helper';
import { resolveSpriteUrl, resolveStatusSpriteKey } from './sprite-variation.helper';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';

describe('sprite-variation.helper', () => {
  describe('Happy Path', () => {
    it('должен возвращать ключ спрайта сна, когда покемон спит', () => {
      expect(
        resolveStatusSpriteKey(false, true, {
          energy: 50,
          experience: 0,
          health: 50,
          hunger: 50,
          hydration: 50,
          lastCareTime: null,
          lastFeedTime: null,
          lastHydrationTime: null,
          lastPlayTime: null,
          lastSaveTime: null,
          lastSleepTime: null,
          lastTrainTime: null,
          level: 1,
          mood: 50,
        }),
      ).toBe('sleeping');
    });

    it('должен использовать вариацию спрайта по умолчанию при резолве url', () => {
      const url = resolveSpriteUrl(TEST_POKEMON, 'normal');

      expect(url).toBe(TEST_POKEMON.spriteVariations.default.normal);
    });
  });
});

describe('routine.helper', () => {
  describe('Edge Cases', () => {
    it('должен требовать и подряд идущие дни, и достаточное число действий за день', () => {
      expect(isRoutineBonusEligible(3, 3)).toBe(true);
      expect(isRoutineBonusEligible(2, 5)).toBe(false);
      expect(isRoutineBonusEligible(4, 2)).toBe(false);
    });
  });
});

describe('gesture.helper', () => {
  describe('Happy Path', () => {
    it('должен увеличивать настроение пропорционально интенсивности', () => {
      const low = createInteractionEvent('click', 0.2);
      const high = createInteractionEvent('click', 0.9);

      expect(high.moodIncrease).toBeGreaterThanOrEqual(low.moodIncrease);
    });
  });
});

describe('STATUS_THRESHOLDS', () => {
  describe('Edge Cases', () => {
    it('должен задавать warning выше critical для энергии', () => {
      expect(STATUS_THRESHOLDS.energyWarning).toBeGreaterThan(STATUS_THRESHOLDS.energyCritical);
    });
  });
});
