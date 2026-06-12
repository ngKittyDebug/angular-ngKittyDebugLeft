import { FRENZY } from '@game/frenzy/config';
import type { Player } from '@game/frenzy/types';

import type { HpDelta, PlayerImpulse } from './types';

/** Tunable blast parameters — defaults are a normal item mine (`FRENZY.bomb`); the NPC strong blast scales them up. */
export interface BlastParams {
  /** Blast epicentre (normalized 0..1). */
  x: number;
  y: number;
  /** Normalized blast radius (0..1). */
  radius: number;
  /** Hp at the epicentre (t=0), negative; falls off quadratically toward the edge. */
  maxDamage: number;
  /** Floor on blast damage by magnitude: anyone inside loses at least this (negative). */
  minDamage: number;
  /** Radial knockback velocity (normalized units/sec) at the epicentre; falls off quadratically. */
  blastImpulse: number;
}

/** The hp deltas + knockback impulses a blast produces. */
export interface BlastResult {
  hpDeltas: HpDelta[];
  impulses: PlayerImpulse[];
}

/**
 * Distance-scaled blast effect on one caught player: damage and knockback both fall off quadratically with the
 * normalized distance `t = dist/radius` (0 at the epicentre, 1 at the edge). Damage is `maxDamage·(1−t)²` floored
 * by magnitude at `minDamage`; knockback is a radial kick of `blastImpulse·(1−t)²` pointing from the centre to the
 * player (straight up when they sit exactly on it).
 */
function blastEffect(
  player: Player,
  dx: number,
  dy: number,
  dist: number,
  params: BlastParams,
): { hp: HpDelta; impulse: PlayerImpulse } {
  const t = Math.min(1, dist / params.radius);
  const falloff = (1 - t) * (1 - t);
  const amount = Math.min(params.minDamage, Math.round(params.maxDamage * falloff));
  const magnitude = params.blastImpulse * falloff;
  const dirX = dist > 0 ? dx / dist : 0;
  const dirY = dist > 0 ? dy / dist : -1;

  return {
    hp: { playerId: player.id, amount },
    impulse: { playerId: player.id, ix: dirX * magnitude, iy: dirY * magnitude },
  };
}

/**
 * Compute a blast over `players` from a given epicentre/radius/damage. Every alive, unshielded player within the
 * radius takes distance-scaled damage AND a radial knockback kick. Skipped (no damage/knockback, absent from the
 * result): shielded players and the optional `immuneId` — the item bomb passes its un-armed owner here, the NPC
 * passes its own id so it never blasts itself (O8). Pure: returns the deltas/impulses for the caller to apply.
 */
export function computeBlast(
  params: BlastParams,
  players: readonly Player[],
  immuneId?: string,
): BlastResult {
  const radiusSquared = params.radius * params.radius;
  const hpDeltas: HpDelta[] = [];
  const impulses: PlayerImpulse[] = [];

  for (const player of players) {
    if (
      player.status !== 'alive' ||
      player.id === immuneId ||
      player.effects.some((effect) => effect.kind === 'shield')
    ) {
      continue;
    }

    const dx = player.x - params.x;
    const dy = player.y - params.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= radiusSquared) {
      const effect = blastEffect(player, dx, dy, Math.sqrt(distanceSquared), params);

      hpDeltas.push(effect.hp);
      impulses.push(effect.impulse);
    }
  }

  return { hpDeltas, impulses };
}

/** The item-bomb blast params from `FRENZY.bomb` — a normal mine. The NPC weak (starvation) blast reuses these. */
export function itemBombBlastParams(x: number, y: number): BlastParams {
  return {
    x,
    y,
    radius: FRENZY.bomb.blastRadius,
    maxDamage: FRENZY.bomb.maxDamage,
    minDamage: FRENZY.bomb.minDamage,
    blastImpulse: FRENZY.bomb.blastImpulse,
  };
}
