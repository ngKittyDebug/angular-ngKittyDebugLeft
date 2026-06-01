import { describe, expect, it } from 'vitest';

import { pickItemType } from '../engine/pick-item-type';

describe('pickItemType', () => {
  // weights: food=70 rotten=15 rock=25 rareCandy=5 → total=115
  // boundaries on the multiplied roll: <70 food, <85 rotten, <110 rock, else rareCandy
  it('returns food for low rolls', () => {
    expect(pickItemType(() => 0)).toBe('food');
    expect(pickItemType(() => 0.6)).toBe('food');
  });

  it('returns rotten in the 70..85 roll band', () => {
    expect(pickItemType(() => 0.61)).toBe('rotten');
    expect(pickItemType(() => 0.73)).toBe('rotten');
  });

  it('returns rock in the 85..110 roll band', () => {
    expect(pickItemType(() => 0.74)).toBe('rock');
    expect(pickItemType(() => 0.95)).toBe('rock');
  });

  it('returns rareCandy at the top end', () => {
    expect(pickItemType(() => 0.96)).toBe('rareCandy');
    expect(pickItemType(() => 0.999)).toBe('rareCandy');
  });
});
