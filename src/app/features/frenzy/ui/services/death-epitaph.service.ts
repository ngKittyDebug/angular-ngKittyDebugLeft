import { Injectable } from '@angular/core';

import type { FaintCause } from '@game/frenzy/types';

/** A resolved obituary line for the fainted modal: a Transloco key (under the `frenzy.faintedModal` prefix)
 * plus its interpolation params (only `killer` so far). The component renders it with `t(textKey, params)`. */
export interface Epitaph {
  textKey: string;
  params: Record<string, string>;
}

/** Obituary buckets and how many funny variants each has in i18n (`faintedModal.obituary.<bucket>.<index>`).
 * Buckets with a `killer.` prefix interpolate `{{killer}}`; the rest stand alone. Keep counts in step with the
 * JSON — a count larger than the phrases present would key a missing translation. */
const VARIANT_COUNT: Record<string, number> = {
  unknown: 3,
  decay: 4,
  rock: 3,
  brick: 3,
  rotten: 4,
  bomb: 4,
  mushroom: 3,
  item: 3,
  self: 3,
  'killer.bomb': 3,
  'killer.thrown': 3,
  'killer.generic': 3,
};

/**
 * Turns the server's structured `FaintCause` (decay vs which item, and who threw it) into a funny obituary line
 * for the fainted modal — the "cause of death" replacing the flat "Pokémon fainted!" title.
 *
 * Pure analysis, deliberately split out of the modal: the component just renders whatever key this returns. The
 * variant is rolled once per death (the caller memoizes via a computed keyed on the cause), so it stays put while
 * the modal re-renders on the respawn cooldown. `rng` is injected for deterministic tests, mirroring the engine.
 */
@Injectable()
export class DeathEpitaphService {
  public compose(
    cause: FaintCause | null,
    killerName: string | null,
    selfDestruct = false,
    rng: () => number = Math.random,
  ): Epitaph {
    const bucket = this.bucketFor(cause, killerName, selfDestruct);
    const index = Math.floor(rng() * VARIANT_COUNT[bucket]);
    const parameters: Record<string, string> =
      killerName !== null && bucket.startsWith('killer.') ? { killer: killerName } : {};

    return { textKey: `obituary.${bucket}.${index}`, params: parameters };
  }

  // Map cause + whether a culprit is named to an i18n bucket. A named killer (an easter-egg/poop layer whose
  // item landed the blow, or a rival that rammed us to death) gets the gloatier `killer.*` lines; otherwise it's
  // a plain item or starvation.
  private bucketFor(
    cause: FaintCause | null,
    killerName: string | null,
    selfDestruct: boolean,
  ): string {
    if (cause === null) {
      return 'unknown';
    }

    if (cause.by === 'decay') {
      return 'decay';
    }

    // Hoisted by your own petard — shoved your own mine (or laid your own poison) into yourself. The killer
    // resolves to your own name, so skip the gloat lines and own the comedy with a dedicated self-destruct bucket.
    if (selfDestruct) {
      return 'self';
    }

    // A fatal collision has no item — reuse the generic gloat line, naming the rival that rammed us.
    if (cause.by === 'bump') {
      return killerName !== null ? 'killer.generic' : 'unknown';
    }

    if (killerName !== null) {
      if (cause.itemType === 'bomb') {
        return 'killer.bomb';
      }

      return cause.itemType === 'rock' || cause.itemType === 'brick'
        ? 'killer.thrown'
        : 'killer.generic';
    }

    switch (cause.itemType) {
      case 'rock': {
        return 'rock';
      }

      case 'brick': {
        return 'brick';
      }

      case 'rotten': {
        return 'rotten';
      }

      case 'bomb': {
        return 'bomb';
      }

      case 'mushroom': {
        return 'mushroom';
      }

      default: {
        return 'item';
      }
    }
  }
}
