import type { DamageSource, EffectDefinition } from '@game/engine/definition';
import type { PlayerEffect } from '@game/engine/types';

/**
 * Readers of the effect-modifier vocabulary (`EffectDefinition.modifiers`): every engine pass that would
 * otherwise hardcode effect kinds consults these instead, so what a timed effect DOES is data in the game
 * definition — a new effect needs a slice file, not an engine edit. Each reader takes the game's effect roster
 * (`GameDefinition.effects`) so the engine stays unbound from any concrete game.
 */

/** Whether any active effect suspends natural hp decay (`modifiers.decayPaused`). */
export function isDecayPaused<TEffectId extends string>(
  definitions: Record<TEffectId, EffectDefinition>,
  effects: readonly PlayerEffect<TEffectId>[],
): boolean {
  return effects.some((effect) => definitions[effect.kind].modifiers?.decayPaused === true);
}

/** Product of the active effects' incoming-damage multipliers for one source; a missing entry contributes 1. */
export function damageTakenMultiplier<TEffectId extends string>(
  definitions: Record<TEffectId, EffectDefinition>,
  effects: readonly PlayerEffect<TEffectId>[],
  source: DamageSource,
): number {
  return effects.reduce(
    (product, effect) => product * (definitions[effect.kind].modifiers?.damageTaken?.[source] ?? 1),
    1,
  );
}

/** Product of the active effects' outgoing-damage multipliers for one source the holder DEALS. */
export function damageDealtMultiplier<TEffectId extends string>(
  definitions: Record<TEffectId, EffectDefinition>,
  effects: readonly PlayerEffect<TEffectId>[],
  source: DamageSource,
): number {
  return effects.reduce(
    (product, effect) => product * (definitions[effect.kind].modifiers?.damageDealt?.[source] ?? 1),
    1,
  );
}

/**
 * Full ward on a source: the incoming multiplier is exactly 0 (e.g. a shield effect). By engine convention a
 * full ward suppresses the source's WHOLE hit — damage AND its secondary effects (blast knockback, bump kick,
 * presence in `detonated.hits`) — while a partial multiplier scales damage only. That keeps the historical
 * "skip the player entirely" semantics at the blast/bump sites without naming any concrete effect there.
 */
export function isFullyWarded<TEffectId extends string>(
  definitions: Record<TEffectId, EffectDefinition>,
  effects: readonly PlayerEffect<TEffectId>[],
  source: DamageSource,
): boolean {
  return damageTakenMultiplier(definitions, effects, source) === 0;
}
