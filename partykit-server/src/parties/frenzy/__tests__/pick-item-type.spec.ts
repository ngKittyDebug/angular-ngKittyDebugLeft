import { describe, expect, it } from 'vitest';

import { pickItemType } from '../engine/pick-item-type';

describe('pickItemType', () => {
  // Cumulative weight bands over FRENZY.spawnWeights in insertion order:
  // food=55 rotten=15 rock=20 rareCandy=5 bomb=10 goldenBerry=5 crumb=35 mushroom=12 vitamin=8 shield=6 easterEgg=6 → total=177.
  // Multiplied roll bands: food<55, rotten<70, rock<90, rareCandy<95, bomb<105, goldenBerry<110, crumb<145,
  // mushroom<157, vitamin<165, shield<171, else easterEgg. Rolls below pick a representative point per band.
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

  it('returns rareCandy in the 90..95 roll band', () => {
    expect(pickItemType(() => 0.52)).toBe('rareCandy');
  });

  it('returns bomb in the 95..105 roll band', () => {
    expect(pickItemType(() => 0.56)).toBe('bomb');
  });

  it('returns goldenBerry in the 105..110 roll band', () => {
    expect(pickItemType(() => 0.6)).toBe('goldenBerry');
  });

  it('returns crumb in the 110..145 roll band', () => {
    expect(pickItemType(() => 0.73)).toBe('crumb');
  });

  it('returns mushroom in the 145..157 roll band', () => {
    expect(pickItemType(() => 0.85)).toBe('mushroom');
  });

  it('returns vitamin in the 157..165 roll band', () => {
    expect(pickItemType(() => 0.9)).toBe('vitamin');
  });

  it('returns shield in the 165..171 roll band', () => {
    expect(pickItemType(() => 0.95)).toBe('shield');
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
