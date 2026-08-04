import { describe, expect, it } from 'vitest';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import { resolveSpriteUrl, resolveStatusSpriteKey } from './sprite-variation.helper';

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
