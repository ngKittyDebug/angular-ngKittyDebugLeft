import { describe, expect, it } from 'vitest';

import { pickItemType } from '../engine/pick-item-type';

describe('pickItemType', () => {
  // weights: food=70 rotten=15 rock=25 rareCandy=5 bomb=10 → total=125
  // boundaries on the multiplied roll: <70 food, <85 rotten, <110 rock, <115 rareCandy, else bomb
  it('returns food for low rolls', () => {
    expect(pickItemType(() => 0)).toBe('food');
    expect(pickItemType(() => 0.5)).toBe('food');
  });

  it('returns rotten in the 70..85 roll band', () => {
    expect(pickItemType(() => 0.57)).toBe('rotten');
    expect(pickItemType(() => 0.67)).toBe('rotten');
  });

  it('returns rock in the 85..110 roll band', () => {
    expect(pickItemType(() => 0.7)).toBe('rock');
    expect(pickItemType(() => 0.87)).toBe('rock');
  });

  it('returns rareCandy in the 110..115 roll band', () => {
    expect(pickItemType(() => 0.89)).toBe('rareCandy');
    expect(pickItemType(() => 0.91)).toBe('rareCandy');
  });

  it('returns bomb at the top end', () => {
    expect(pickItemType(() => 0.93)).toBe('bomb');
    expect(pickItemType(() => 0.999)).toBe('bomb');
  });
});
