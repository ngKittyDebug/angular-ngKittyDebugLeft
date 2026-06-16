import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import { FRENZY_DEFINITION } from '@game/frenzy/definition';

import { spawnItem } from '../core/spawn-item';

/** Scripted rng: returns the queued values in order, throws past the end (over-consumption = drift). */
function sequenceRng(values: number[]): () => number {
  let index = 0;

  return () => {
    if (index >= values.length) {
      throw new Error(`rng over-consumed: draw #${index + 1} of ${values.length}`);
    }

    return values[index++];
  };
}

describe('spawnItem', () => {
  // The rng draw order (type → x → budget) is load-bearing under a seeded rng — pin it with a scripted sequence.
  it('draws type, then x, then the click budget — in that order — for a budget-carrying item', () => {
    // Roll 0.54 lands in the bomb band of the world pool (see pick-item-type.spec band map).
    const item = spawnItem(FRENZY_DEFINITION, sequenceRng([0.54, 0.5, 0]), () => 'id-1');
    const [minX, maxX] = FRENZY_DEFINITION.spawn.xRange;
    const [minClicks] = FRENZY.bomb.clicksToExplodeRange;

    expect(item.type).toBe('bomb');
    expect(item.id).toBe('id-1');
    expect(item.x).toBeCloseTo(minX + 0.5 * (maxX - minX), 10);
    expect(item.y).toBe(0);
    expect(item.vy).toBe(FRENZY.fallSpeed.bomb);
    // Third draw = 0 → the budget bottoms out at the range's inclusive lower edge.
    expect(item.clicksLeft).toBe(minClicks);
  });

  it('stamps the budget range inclusively at the top edge', () => {
    const [, maxClicks] = FRENZY.bomb.clicksToExplodeRange;
    // rng → 0.999…: floor(rng * (max - min + 1)) hits the last bucket → max, never max + 1.
    const item = spawnItem(FRENZY_DEFINITION, sequenceRng([0.54, 0.5, 0.999999]), () => 'id-2');

    expect(item.clicksLeft).toBe(maxClicks);
  });

  it('gives a non-nudge item NO clicksLeft key and consumes exactly two draws', () => {
    // Roll 0 → food (plain eat verb). The scripted rng throws on a third draw, proving none happens.
    const item = spawnItem(FRENZY_DEFINITION, sequenceRng([0, 0.25]), () => 'id-3');

    expect(item.type).toBe('food');
    expect('clicksLeft' in item).toBe(false);
    expect(item.vy).toBe(FRENZY.fallSpeed.food);
  });

  it('never picks a disabled item type (the enabled flag gates the world pool)', () => {
    const noBombGame = {
      ...FRENZY_DEFINITION,
      items: {
        ...FRENZY_DEFINITION.items,
        bomb: { ...FRENZY_DEFINITION.items.bomb, enabled: false },
      },
    };

    for (let roll = 0; roll < 1; roll += 0.01) {
      const item = spawnItem(noBombGame, sequenceRng([roll, 0.5, 0.5]), () => 'id-4');

      expect(item.type).not.toBe('bomb');
    }
  });
});
