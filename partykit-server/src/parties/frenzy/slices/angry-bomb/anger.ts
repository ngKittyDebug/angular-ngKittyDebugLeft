/** Anger accumulation for the angry-bomb NPC — pure, so the superlinear curve and the sliding window are unit-testable. */

/**
 * Exponent of the per-poke gain curve (see `accrueAnger`). >1 keeps it superlinear (a lone poke ≈ 0, rapid pokes
 * ramp faster than linear), but kept GENTLE (1.25, not 1.5) so the anger — and the sprite reddening it drives —
 * climbs visibly across ~8–12 sustained pokes instead of spiking to max in the last 2 (which made the red flash by
 * before the blast). Tunable alongside `NPC.anger.base`/`max` for the rage-detonation feel.
 */
export const ANGER_CURVE_EXPONENT = 1.25;

/** The slice of `NPC.anger` this module needs: the sliding window length, the per-poke base and the hard cap. */
export interface AngerConfig {
  windowMs: number;
  base: number;
  max: number;
}

/** Outcome of one poke: the pruned + appended timestamp window, and the anger to add (already clamped to ≥0). */
export interface AngerAccrual {
  timestamps: number[];
  gain: number;
}

/**
 * Accrue anger for one poke at `now`. The NPC keeps a window of EVERY clicker's poke timestamps (anger is summed
 * across players — D4), pruned to `config.windowMs`. The gain is superlinear in the in-window poke count `n`:
 *
 *   gain = base × max(0, n − 1)^ANGER_CURVE_EXPONENT
 *
 * A lone poke (`n === 1`, after this poke is appended) yields exactly 0 — just a client-side quip, no reddening.
 * A rapid double (`n = 2`) yields `base`, a triple `base × 2^1.25 ≈ 2.38·base`, etc., so spamming ramps fast (but
 * gently enough that the reddening is visible — see `ANGER_CURVE_EXPONENT`). The returned `gain` is what the caller
 * adds to `mana` (then clamps to `config.max` against the stored value).
 */
export function accrueAnger(
  timestamps: readonly number[],
  now: number,
  config: AngerConfig,
): AngerAccrual {
  const recent = timestamps.filter((timestamp) => now - timestamp < config.windowMs);
  const next = [...recent, now];
  const n = next.length;
  const gain = config.base * Math.max(0, n - 1) ** ANGER_CURVE_EXPONENT;

  return { timestamps: next, gain };
}
