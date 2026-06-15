import { describe, expect, it } from 'vitest';

import type { EffectDefinition } from '@game/engine/definition';
import { FRENZY_EFFECTS } from '@game/frenzy/definition';
import type { PlayerEffect, PlayerEffectKind } from '@game/frenzy/types';

import {
  damageDealtMultiplier,
  damageTakenMultiplier,
  isDecayPaused,
  isFullyWarded,
} from '../core/effect-modifiers';

function active(kind: PlayerEffectKind): PlayerEffect {
  return { kind, expiresAt: 10_000 };
}

describe('effect modifiers', () => {
  // The shield's historical semantics are now TWO declarations (decay pause + a full damage ward) that could
  // silently drift apart in the definition slice — pin both halves explicitly.
  it('shield = decayPaused + damageTaken zeros on every source', () => {
    expect(FRENZY_EFFECTS.shield.modifiers.decayPaused).toBe(true);
    expect(FRENZY_EFFECTS.shield.modifiers.damageTaken).toEqual({ item: 0, blast: 0, bump: 0 });
  });

  it('pauses decay for any effect declaring decayPaused (shield, wellFed) and no other', () => {
    expect(isDecayPaused(FRENZY_EFFECTS, [active('shield')])).toBe(true);
    expect(isDecayPaused(FRENZY_EFFECTS, [active('wellFed')])).toBe(true);
    expect(isDecayPaused(FRENZY_EFFECTS, [active('laying')])).toBe(false);
    expect(isDecayPaused(FRENZY_EFFECTS, [active('pooping')])).toBe(false);
    expect(isDecayPaused(FRENZY_EFFECTS, [])).toBe(false);
  });

  it('multiplies incoming damage by the active damageTaken modifiers (shield wards every source to 0)', () => {
    for (const source of ['item', 'blast', 'bump'] as const) {
      expect(damageTakenMultiplier(FRENZY_EFFECTS, [active('shield')], source)).toBe(0);
      expect(damageTakenMultiplier(FRENZY_EFFECTS, [active('wellFed')], source)).toBe(1);
      expect(damageTakenMultiplier(FRENZY_EFFECTS, [], source)).toBe(1);
    }
  });

  it('treats a 0 damageTaken product as a full ward (and anything else as not warded)', () => {
    for (const source of ['item', 'blast', 'bump'] as const) {
      expect(isFullyWarded(FRENZY_EFFECTS, [active('shield')], source)).toBe(true);
      expect(isFullyWarded(FRENZY_EFFECTS, [active('shield'), active('laying')], source)).toBe(
        true,
      );
      expect(isFullyWarded(FRENZY_EFFECTS, [active('wellFed')], source)).toBe(false);
      expect(isFullyWarded(FRENZY_EFFECTS, [], source)).toBe(false);
    }
  });

  it('deals unscaled damage while no ENABLED effect declares damageDealt', () => {
    // Only grantable kinds: a dormant slice (the flagged-off barbed-wire demo declares `damageDealt`) can never
    // reach a player's effects, and its scaling is covered by its own slice spec.
    const kinds = (Object.keys(FRENZY_EFFECTS) as (keyof typeof FRENZY_EFFECTS)[]).filter(
      (kind): kind is PlayerEffectKind => {
        // Widening lookup — the roster's literal slice types don't all carry the optional `enabled` field.
        const definition: EffectDefinition = FRENZY_EFFECTS[kind];

        return definition.enabled !== false;
      },
    );

    for (const kind of kinds) {
      for (const source of ['item', 'blast', 'bump'] as const) {
        expect(damageDealtMultiplier(FRENZY_EFFECTS, [active(kind)], source)).toBe(1);
      }
    }
  });
});
