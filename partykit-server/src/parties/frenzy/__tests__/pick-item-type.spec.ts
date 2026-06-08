import { describe, expect, it } from 'vitest';

import { pickItemType } from '../engine/pick-item-type';

describe('pickItemType', () => {
  // Cumulative bands over GAME.spawnWeights in insertion order
  // food=55 rotten=15 rock=20 rareCandy=5 bomb=10 goldenBerry=5 crumb=35 mushroom=12 vitamin=8 → total=165.
  // Multiplied roll bands: food<55, rotten<70, rock<90, rareCandy<95, bomb<105, goldenBerry<110, crumb<145, mushroom<157, else vitamin.
  it('returns food for low rolls', () => {
    expect(pickItemType(() => 0)).toBe('food');
    expect(pickItemType(() => 0.3)).toBe('food');
  });

  it('returns rotten in the 55..70 roll band', () => {
    expect(pickItemType(() => 0.4)).toBe('rotten');
  });

  it('returns rock in the 70..90 roll band', () => {
    expect(pickItemType(() => 0.5)).toBe('rock');
  });

  it('returns rareCandy in the 90..95 roll band', () => {
    expect(pickItemType(() => 0.55)).toBe('rareCandy');
  });

  it('returns bomb in the 95..105 roll band', () => {
    expect(pickItemType(() => 0.6)).toBe('bomb');
  });

  it('returns goldenBerry in the 105..110 roll band', () => {
    expect(pickItemType(() => 0.65)).toBe('goldenBerry');
  });

  it('returns crumb in the 110..145 roll band', () => {
    expect(pickItemType(() => 0.8)).toBe('crumb');
  });

  it('returns mushroom in the 145..157 roll band', () => {
    expect(pickItemType(() => 0.9)).toBe('mushroom');
  });

  it('returns vitamin at the top end', () => {
    expect(pickItemType(() => 0.97)).toBe('vitamin');
    expect(pickItemType(() => 0.999)).toBe('vitamin');
  });
});
