import { describe, expect, it } from 'vitest';

import { FRENZY_EFFECTS, FRENZY_ITEMS, SPAWN_POOLS } from '@game/frenzy/definition';
import { BARBED_WIRE_EFFECT } from '@game/frenzy/definition/effects/barbed-wire';
import { BARBED_WIRE_ITEM } from '@game/frenzy/definition/items/barbed-wire';
import type { ItemType, PlayerEffectKind } from '@game/frenzy/types';

import { damageDealtMultiplier } from '../../../../../engine/core/effect-modifiers';
import { pickItemType } from '../../../../../engine/core/pick-item-type';
import { resolveInteraction } from '../../../../../engine/verbs';

/**
 * The phase-6 demo slice: a NEW item + effect shipped as two definition files and ZERO engine edits, dormant
 * behind their `enabled: false` flags. These specs prove the dormancy contract — present in the roster and the
 * spawn pool, absent from every spawn path and from the public unions — and that the generic vocabulary already
 * carries the feature (grant resolution, outgoing-bump doubling) the moment the flags flip.
 */

/** The FULL roster ids (incl. disabled slices) — what definition-level machinery, unlike the wire, speaks. */
type RosterItemId = keyof typeof FRENZY_ITEMS;
type RosterEffectId = keyof typeof FRENZY_EFFECTS;

/** Type-level equality: resolves to `true` only when A and B are exactly the same type (both directions). */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

describe('barbed-wire demo slice (disabled)', () => {
  it('stays out of the public unions while its flags are off', () => {
    // The compile-time half of the feature flag: the wire/client unions never see the dormant literals, so no
    // exhaustive client `Record` (art, legend, stats, aura/status/sound maps) demands entries for them.
    const itemKindDormant: Equal<Extract<ItemType, 'barbedWire'>, never> = true;
    const effectKindDormant: Equal<Extract<PlayerEffectKind, 'barbedWire'>, never> = true;

    expect([itemKindDormant, effectKindDormant]).toEqual([true, true]);
  });

  it('sits in the world pool yet is filtered from every weighted pick', () => {
    // Membership is real (the mandatory `spawn.world` weight lands in the assembled pool)...
    expect(SPAWN_POOLS.world.barbedWire).toBe(BARBED_WIRE_ITEM.spawn.world);

    // ...but `pickItemType` drops disabled entries before the cumulative walk, so no roll can land on it.
    // (That the enabled items' picks stayed rng-identical is proven by the golden master, not by this sweep.)
    const isEnabled = (type: RosterItemId): boolean => FRENZY_ITEMS[type].enabled;

    for (let step = 0; step < 1000; step += 1) {
      const roll = step / 1000;

      expect(pickItemType<RosterItemId>(() => roll, isEnabled, SPAWN_POOLS.world)).not.toBe(
        'barbedWire',
      );
    }
  });

  it('resolves its pickup to a barbed-wire grant through the closed verb set', () => {
    const interaction = resolveInteraction<RosterItemId, RosterEffectId, never>(
      BARBED_WIRE_ITEM.interactions,
      'onCollide',
      {
        item: { id: 'i1', type: 'barbedWire', x: 0.5, y: 0.5, vy: 0.16 },
        state: { players: [], items: [], tick: 0 },
        effects: FRENZY_EFFECTS,
        takerId: 'p1',
      },
    );

    expect(interaction).toEqual({
      hpDeltas: [],
      consumed: true,
      effects: [{ playerId: 'p1', kind: 'barbedWire', durationMs: 10_000 }],
    });
  });

  it('doubles the holder’s outgoing bump damage and nothing else', () => {
    const holder = [{ kind: 'barbedWire' as const, expiresAt: 1 }];

    // The generic bump pass already consults `damageDealt` — granting the effect IS the whole feature.
    expect(damageDealtMultiplier({ barbedWire: BARBED_WIRE_EFFECT }, holder, 'bump')).toBe(2);
    expect(damageDealtMultiplier({ barbedWire: BARBED_WIRE_EFFECT }, holder, 'item')).toBe(1);
    expect(damageDealtMultiplier({ barbedWire: BARBED_WIRE_EFFECT }, holder, 'blast')).toBe(1);
    expect(damageDealtMultiplier({ barbedWire: BARBED_WIRE_EFFECT }, [], 'bump')).toBe(1);
  });

  it('keeps the demo slice values stable', () => {
    expect({ item: BARBED_WIRE_ITEM, effect: BARBED_WIRE_EFFECT }).toMatchSnapshot();
  });
});
