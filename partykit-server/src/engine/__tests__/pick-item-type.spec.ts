import { describe, expect, it } from 'vitest';

import { isItemEnabled } from '@game/frenzy/config';
import { SPAWN_POOLS } from '@game/frenzy/definition';

import { pickItemType } from '../core/pick-item-type';

describe('pickItemType', () => {
  // Cumulative weight bands over FRENZY.spawnWeights in insertion order:
  // food=55 rotten=15 rock=20 brick=10 rareCandy=5 bomb=10 goldenBerry=5 crumb=35 mushroom=12 vitamin=8 shield=6 easterEgg=12 poop=6 → total=199.
  // Multiplied roll bands: food<55, rotten<70, rock<90, brick<100, rareCandy<105, bomb<115, goldenBerry<120,
  // crumb<155, mushroom<167, vitamin<175, shield<181, easterEgg<193, else poop. Rolls below pick a band midpoint.
  it('returns food for low rolls', () => {
    expect(pickItemType(() => 0, isItemEnabled, SPAWN_POOLS.world)).toBe('food');
    expect(pickItemType(() => 0.2, isItemEnabled, SPAWN_POOLS.world)).toBe('food');
  });

  it('returns rotten in the 55..70 roll band', () => {
    expect(pickItemType(() => 0.324, isItemEnabled, SPAWN_POOLS.world)).toBe('rotten');
  });

  it('returns rock in the 70..90 roll band', () => {
    expect(pickItemType(() => 0.414, isItemEnabled, SPAWN_POOLS.world)).toBe('rock');
  });

  it('returns brick in the 90..100 roll band', () => {
    expect(pickItemType(() => 0.492, isItemEnabled, SPAWN_POOLS.world)).toBe('brick');
  });

  it('returns rareCandy in the 100..105 roll band', () => {
    expect(pickItemType(() => 0.515, isItemEnabled, SPAWN_POOLS.world)).toBe('rareCandy');
  });

  it('returns bomb in the 105..115 roll band', () => {
    expect(pickItemType(() => 0.57, isItemEnabled, SPAWN_POOLS.world)).toBe('bomb');
  });

  it('returns goldenBerry in the 115..120 roll band', () => {
    expect(pickItemType(() => 0.59, isItemEnabled, SPAWN_POOLS.world)).toBe('goldenBerry');
  });

  it('returns crumb in the 120..155 roll band', () => {
    expect(pickItemType(() => 0.712, isItemEnabled, SPAWN_POOLS.world)).toBe('crumb');
  });

  it('returns mushroom in the 155..167 roll band', () => {
    expect(pickItemType(() => 0.834, isItemEnabled, SPAWN_POOLS.world)).toBe('mushroom');
  });

  it('returns vitamin in the 167..175 roll band', () => {
    expect(pickItemType(() => 0.859, isItemEnabled, SPAWN_POOLS.world)).toBe('vitamin');
  });

  it('returns shield in the 175..181 roll band', () => {
    expect(pickItemType(() => 0.894, isItemEnabled, SPAWN_POOLS.world)).toBe('shield');
  });

  it('returns easterEgg in the 181..193 roll band', () => {
    expect(pickItemType(() => 0.953, isItemEnabled, SPAWN_POOLS.world)).toBe('easterEgg');
    expect(pickItemType(() => 0.965, isItemEnabled, SPAWN_POOLS.world)).toBe('easterEgg');
  });

  it('returns poop at the top end', () => {
    expect(pickItemType(() => 0.99, isItemEnabled, SPAWN_POOLS.world)).toBe('poop');
    expect(pickItemType(() => 0.999, isItemEnabled, SPAWN_POOLS.world)).toBe('poop');
  });

  it('honours a custom weight map (the poop emit pool) over the default spawn weights', () => {
    // rock=10 brick=20 bomb=10 → total 40; bands: rock<10, brick<30, bomb<40.
    const poolWeights = { rock: 10, brick: 20, bomb: 10 };
    const all = (): boolean => true;

    expect(pickItemType(() => 0.1, all, poolWeights)).toBe('rock'); // 4
    expect(pickItemType(() => 0.5, all, poolWeights)).toBe('brick'); // 20
    expect(pickItemType(() => 0.9, all, poolWeights)).toBe('bomb'); // 36
  });

  it('never returns a feature-flag-disabled item across the whole roll range', () => {
    const bombDisabled = (type: string): boolean => type !== 'bomb';

    for (let roll = 0; roll < 1; roll += 0.001) {
      expect(pickItemType(() => roll, bombDisabled, SPAWN_POOLS.world)).not.toBe('bomb');
    }
  });
});
