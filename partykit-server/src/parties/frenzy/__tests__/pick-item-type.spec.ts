import { describe, expect, it } from 'vitest';

import { pickItemType } from '../engine/pick-item-type';

describe('pickItemType', () => {
  // Cumulative bands over GAME.spawnWeights in insertion order
  // food=55 rotten=15 rock=20 rareCandy=5 bomb=10 goldenBerry=5 crumb=35 mushroom=12 → total=157.
  // Multiplied roll bands: food<55, rotten<70, rock<90, rareCandy<95, bomb<105, goldenBerry<110, crumb<145, else mushroom.
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
    expect(pickItemType(() => 0.59)).toBe('rareCandy');
  });

  it('returns bomb in the 95..105 roll band', () => {
    expect(pickItemType(() => 0.64)).toBe('bomb');
  });

  it('returns goldenBerry in the 105..110 roll band', () => {
    expect(pickItemType(() => 0.685)).toBe('goldenBerry');
  });

  it('returns crumb in the 110..145 roll band', () => {
    expect(pickItemType(() => 0.8)).toBe('crumb');
  });

  it('returns mushroom at the top end', () => {
    expect(pickItemType(() => 0.95)).toBe('mushroom');
    expect(pickItemType(() => 0.999)).toBe('mushroom');
  });
});
