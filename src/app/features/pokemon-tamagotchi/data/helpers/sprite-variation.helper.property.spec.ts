import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbitraryPokemonStatus } from '../fixtures/tamagotchi-arbitraries';
import { resolveStatusSpriteKey } from './sprite-variation.helper';

const PROPERTY_RUNS = 100;
const SPRITE_KEYS = new Set(['evolving', 'sleeping', 'happy', 'sad', 'normal']);

const BASE_STATUS = {
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
};

describe('sprite-variation.helper', () => {
  describe('Happy Path', () => {
    describe('Property 12: соответствие спрайта состоянию', () => {
      it('должен отдавать приоритет evolving над sleeping и возвращать ключ из известного множества', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.boolean(),
            fc.boolean(),
            (status, isSleeping, isEvolving) => {
              const key = resolveStatusSpriteKey(isEvolving, isSleeping, status);

              if (!SPRITE_KEYS.has(key)) {
                return false;
              }

              if (isEvolving) {
                return key === 'evolving';
              }

              if (isSleeping) {
                return key === 'sleeping';
              }

              return true;
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен маппить граничные mood/hunger на литеральные ключи спрайта', () => {
        expect(resolveStatusSpriteKey(false, false, { ...BASE_STATUS, mood: 70 })).toBe('happy');
        expect(resolveStatusSpriteKey(false, false, { ...BASE_STATUS, mood: 25 })).toBe('sad');
        expect(resolveStatusSpriteKey(false, false, { ...BASE_STATUS, hunger: 25 })).toBe('sad');
        expect(resolveStatusSpriteKey(false, false, BASE_STATUS)).toBe('normal');
        expect(resolveStatusSpriteKey(false, true, BASE_STATUS)).toBe('sleeping');
        expect(resolveStatusSpriteKey(true, true, BASE_STATUS)).toBe('evolving');
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Property 12: соответствие спрайта состоянию', () => {
      it('должен предпочитать evolving даже когда покемон спит', () => {
        expect(resolveStatusSpriteKey(true, true, BASE_STATUS)).toBe('evolving');
      });
    });
  });
});
