import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import type { ItemType, NpcKind, PlayerEffectKind } from '@game/frenzy/types';

/**
 * Phase-1 contract net for the definition refactoring: the flat `FRENZY` read-model, the NPC descriptor and the
 * id unions must stay byte-stable while their SOURCE moves from `config/*` partials to per-entity definition
 * slices. The golden master guards behavior; this spec guards the derived data the behavior reads.
 */

/** Type-level equality: resolves to `true` only when A and B are exactly the same type (both directions). */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

describe('frenzy definition contract', () => {
  it('keeps the item/effect/npc unions exactly equal to the legacy literal sets', () => {
    // Each const compiles ONLY while the derived union matches the legacy literals byte-for-byte — a drifted
    // (widened to `string`, grown or shrunk) union turns `Equal<...>` into `false` and breaks the assignment.
    // `cactus` (enabled) IS in the public unions; the dormant `barbedWire` demo slices (`enabled: false`) stay
    // out — `EnabledKey` keeps flagged-off slices out of the public unions until their flags flip.
    const itemTypeStable: Equal<
      ItemType,
      | 'food'
      | 'rotten'
      | 'rock'
      | 'brick'
      | 'rareCandy'
      | 'bomb'
      | 'goldenBerry'
      | 'crumb'
      | 'mushroom'
      | 'vitamin'
      | 'shield'
      | 'easterEgg'
      | 'poop'
      | 'cactus'
    > = true;
    const effectKindStable: Equal<
      PlayerEffectKind,
      'shield' | 'wellFed' | 'laying' | 'pooping' | 'cactus'
    > = true;
    const npcKindStable: Equal<NpcKind, 'angryBomb'> = true;

    expect([itemTypeStable, effectKindStable, npcKindStable]).toEqual([true, true, true]);
  });

  it('keeps weight-pool key order byte-stable (pickItemType walks Object.entries cumulatively)', () => {
    // New slices only ever APPEND to the pool, never reorder: `barbedWire` (dormant, `enabled: false`) trails it
    // filtered out before the cumulative walk; `cactus` (enabled) trails it as a live tail band. Appending keeps
    // the enabled PREFIX's rng mapping byte-stable — the golden master proves the scripted scenario is untouched.
    expect(Object.keys(FRENZY.spawnWeights)).toEqual([
      'food',
      'rotten',
      'rock',
      'brick',
      'rareCandy',
      'bomb',
      'goldenBerry',
      'crumb',
      'mushroom',
      'vitamin',
      'shield',
      'easterEgg',
      'poop',
      'barbedWire',
      'cactus',
    ]);
    expect(Object.keys(FRENZY.eggEmitWeights)).toEqual([
      'food',
      'crumb',
      'mushroom',
      'vitamin',
      'shield',
      'rareCandy',
      'goldenBerry',
    ]);
    expect(Object.keys(FRENZY.poopEmitWeights)).toEqual(['rock', 'brick', 'bomb']);
  });

  it('keeps the flat FRENZY read-model values stable', () => {
    // One DELIBERATE diff vs the legacy `config/*` values: `itemEffects.poop` normalized -10 → 0. The cell was a
    // stale duplicate — poop resolves through `grantEffect` (its -10 rides `hpOnPickup`/the descriptor's
    // `hpDelta`), and the `eat` builder that reads `itemEffects` is never routed poop. Golden master unchanged.
    expect(FRENZY).toMatchSnapshot();
  });

  it('keeps the NPC definition slice values stable', () => {
    // Pins the FULL slice (phase 5 dropped the narrow `ANGRY_BOMB` compat projection this used to snapshot) —
    // spawn/identity contract plus the kind-specific tuning the runtime reads.
    expect(ANGRY_BOMB_NPC).toMatchSnapshot();
  });

  it('pins the separation-impulse speed cap to the historical global blast cap', () => {
    // `playerCollision.impulseMaxFactor` is NOT projected into flat FRENZY, so the snapshot above cannot pin it.
    // Historically applyImpulses capped EVERY knockback (incl. bump/separation kicks) at the bomb blast's
    // `blastImpulseMaxFactor`; phase 4 made the cap per-impulse data, which lets the two knobs drift apart.
    // Pin today's parity explicitly — retune deliberately, not by accident.
    expect(FRENZY_DEFINITION.playerCollision.impulseMaxFactor).toBe(1.3);
    expect(FRENZY_DEFINITION.playerCollision.impulseMaxFactor).toBe(
      FRENZY.bomb.blastImpulseMaxFactor,
    );
  });
});
