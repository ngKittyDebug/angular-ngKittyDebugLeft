import { describe, expect, it } from 'vitest';

import { pickItemType } from '../engine/pick-item-type';

describe('pickItemType', () => {
  // Cumulative weight bands over FRENZY.spawnWeights in insertion order:
  // food=55 rotten=15 rock=20 brick=10 rareCandy=5 bomb=10 goldenBerry=5 crumb=35 mushroom=12 vitamin=8 shield=6 easterEgg=6 → total=187.
  // Multiplied roll bands: food<55, rotten<70, rock<90, brick<100, rareCandy<105, bomb<115, goldenBerry<120,
  // crumb<155, mushroom<167, vitamin<175, shield<181, else easterEgg. Rolls below pick a representative point per band.
  it('returns food for low rolls', () => {
    expect(pickItemType(() => 0)).toBe('food');
    expect(pickItemType(() => 0.2)).toBe('food');
  });

  it('returns rotten in the 55..70 roll band', () => {
    expect(pickItemType(() => 0.34)).toBe('rotten');
  });

  it('returns rock in the 70..90 roll band', () => {
    expect(pickItemType(() => 0.45)).toBe('rock');
  });

  it('returns brick in the 90..100 roll band', () => {
    expect(pickItemType(() => 0.5)).toBe('brick');
  });

  it('returns rareCandy in the 100..105 roll band', () => {
    expect(pickItemType(() => 0.55)).toBe('rareCandy');
  });

  it('returns bomb in the 105..115 roll band', () => {
    expect(pickItemType(() => 0.59)).toBe('bomb');
  });

  it('returns goldenBerry in the 115..120 roll band', () => {
    expect(pickItemType(() => 0.63)).toBe('goldenBerry');
  });

  it('returns crumb in the 120..155 roll band', () => {
    expect(pickItemType(() => 0.73)).toBe('crumb');
  });

  it('returns mushroom in the 155..167 roll band', () => {
    expect(pickItemType(() => 0.86)).toBe('mushroom');
  });

  it('returns vitamin in the 167..175 roll band', () => {
    expect(pickItemType(() => 0.91)).toBe('vitamin');
  });

  it('returns shield in the 175..181 roll band', () => {
    expect(pickItemType(() => 0.952)).toBe('shield');
  });

  it('returns easterEgg at the top end', () => {
    expect(pickItemType(() => 0.98)).toBe('easterEgg');
    expect(pickItemType(() => 0.999)).toBe('easterEgg');
  });

  it('never returns a feature-flag-disabled item across the whole roll range', () => {
    const bombDisabled = (type: string): boolean => type !== 'bomb';

    for (let roll = 0; roll < 1; roll += 0.001) {
      expect(pickItemType(() => roll, bombDisabled)).not.toBe('bomb');
    }
  });
});
