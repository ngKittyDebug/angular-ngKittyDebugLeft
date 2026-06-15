import { describe, expect, it } from 'vitest';

import { FRENZY_EFFECTS, FRENZY_ITEMS, SPAWN_POOLS } from '@game/frenzy/definition';
import { CACTUS_EFFECT } from '@game/frenzy/definition/effects/cactus';
import { CACTUS_ITEM } from '@game/frenzy/definition/items/cactus';
import type { ItemType, PlayerEffectKind } from '@game/frenzy/types';

import { damageDealtMultiplier } from '../../../../../engine/core/effect-modifiers';
import { pickItemType } from '../../../../../engine/core/pick-item-type';
import { resolveInteraction } from '../../../../../engine/verbs';

/**
 * The cactus slice: a NEW item + effect shipped as two definition files and ZERO engine edits, ENABLED from the
 * start (unlike the dormant barbed-wire demo). These specs prove the live contract — the spiky pickup grants a
 * 10s aura through the closed verb set, and the holder's outgoing bump damage is tripled — exactly the generic
 * vocabulary (grant resolution, `damageDealt` consultation) the engine already speaks.
 */

/** The roster ids — what definition-level machinery speaks (cactus is enabled, so it is also in the public union). */
type RosterItemId = keyof typeof FRENZY_ITEMS;
type RosterEffectId = keyof typeof FRENZY_EFFECTS;

/** Type-level equality: resolves to `true` only when A and B are exactly the same type (both directions). */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

describe('cactus slice (enabled)', () => {
  it('is present in the public item and effect unions', () => {
    // The compile-time half of the feature flag: an ENABLED slice's literal joins the public unions, so every
    // exhaustive client `Record` (art, legend, stats, aura/badge/status/sound maps) now demands a cactus entry.
    const itemKindLive: Equal<Extract<ItemType, 'cactus'>, 'cactus'> = true;
    const effectKindLive: Equal<Extract<PlayerEffectKind, 'cactus'>, 'cactus'> = true;

    expect([itemKindLive, effectKindLive]).toEqual([true, true]);
  });

  it('sits in the world pool and is reachable by a weighted pick', () => {
    // Membership is real (the mandatory `spawn.world` weight lands in the assembled pool)...
    expect(SPAWN_POOLS.world.cactus).toBe(CACTUS_ITEM.spawn.world);

    // ...and because cactus is enabled, `pickItemType` keeps it in the cumulative walk — some roll lands on it.
    const isEnabled = (type: RosterItemId): boolean => FRENZY_ITEMS[type].enabled;
    let landedOnCactus = false;

    for (let step = 0; step < 1000; step += 1) {
      const roll = step / 1000;

      if (pickItemType<RosterItemId>(() => roll, isEnabled, SPAWN_POOLS.world) === 'cactus') {
        landedOnCactus = true;
        break;
      }
    }

    expect(landedOnCactus).toBe(true);
  });

  it('resolves its pickup to a cactus grant through the closed verb set', () => {
    const interaction = resolveInteraction<RosterItemId, RosterEffectId, never>(
      CACTUS_ITEM.interactions,
      'onCollide',
      {
        item: { id: 'i1', type: 'cactus', x: 0.5, y: 0.5, vy: 0.16 },
        state: { players: [], items: [], tick: 0 },
        effects: FRENZY_EFFECTS,
        takerId: 'p1',
      },
    );

    expect(interaction).toEqual({
      hpDeltas: [],
      consumed: true,
      effects: [{ playerId: 'p1', kind: 'cactus', durationMs: 10_000 }],
    });
  });

  it('triples the outgoing bump damage of the holder and nothing else', () => {
    const holder = [{ kind: 'cactus' as const, expiresAt: 1 }];

    // The generic bump pass already consults `damageDealt` — granting the effect IS the whole feature.
    expect(damageDealtMultiplier({ cactus: CACTUS_EFFECT }, holder, 'bump')).toBe(3);
    expect(damageDealtMultiplier({ cactus: CACTUS_EFFECT }, holder, 'item')).toBe(1);
    expect(damageDealtMultiplier({ cactus: CACTUS_EFFECT }, holder, 'blast')).toBe(1);
    expect(damageDealtMultiplier({ cactus: CACTUS_EFFECT }, [], 'bump')).toBe(1);
  });

  it('keeps the slice values stable', () => {
    expect({ item: CACTUS_ITEM, effect: CACTUS_EFFECT }).toMatchSnapshot();
  });
});
