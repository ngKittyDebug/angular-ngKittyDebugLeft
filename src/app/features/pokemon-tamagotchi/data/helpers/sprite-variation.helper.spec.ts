import { describe, expect, it } from 'vitest';

import { DEFAULT_CUSTOMIZATION } from '../constants/customization.constants';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { createInteractionEvent } from './gesture.helper';
import { isRoutineBonusEligible } from './routine.helper';
import { resolveSpriteUrl, resolveStatusSpriteKey } from './sprite-variation.helper';
import { TEST_POKEMON } from '../testing/tamagotchi-arbitraries';

describe('sprite-variation.helper', () => {
  it('resolves sleeping sprite key when pokemon is sleeping', () => {
    expect(
      resolveStatusSpriteKey(false, true, {
        energy: 50,
        experience: 0,
        health: 50,
        hunger: 50,
        hydration: 50,
        lastFeedTime: null,
        lastHydrationTime: null,
        lastPlayTime: null,
        lastSaveTime: null,
        lastSleepTime: null,
        level: 1,
        mood: 50,
      }),
    ).toBe('sleeping');
  });

  it('uses selected sprite variation when resolving url', () => {
    const url = resolveSpriteUrl(
      TEST_POKEMON,
      {
        ...DEFAULT_CUSTOMIZATION,
        spriteVariation: 'shiny',
      },
      'normal',
    );

    expect(url).toBe(TEST_POKEMON.spriteVariations.shiny.normal);
  });
});

describe('routine.helper eligibility', () => {
  it('requires both consecutive days and daily actions', () => {
    expect(isRoutineBonusEligible(3, 3)).toBe(true);
    expect(isRoutineBonusEligible(2, 5)).toBe(false);
    expect(isRoutineBonusEligible(4, 2)).toBe(false);
  });
});

describe('gesture.helper mood scaling', () => {
  it('increases mood proportionally to intensity', () => {
    const low = createInteractionEvent('click', 0.2);
    const high = createInteractionEvent('click', 0.9);

    expect(high.moodIncrease).toBeGreaterThanOrEqual(low.moodIncrease);
  });
});

describe('energy threshold', () => {
  it('marks low energy at configured warning threshold', () => {
    expect(STATUS_THRESHOLDS.energyWarning).toBeGreaterThan(STATUS_THRESHOLDS.energyCritical);
  });
});
