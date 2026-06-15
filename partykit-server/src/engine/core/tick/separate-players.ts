import type { GameDefinition } from '@game/engine/definition';
import { halfExtentNorm } from '@game/engine/geometry';
import type { Player } from '@game/engine/types';

import { isContactRammer, isFullyWarded } from '../effect-modifiers';
import type { PlayerImpulse } from '../../verbs';

/** A collision bump that dealt damage: the victim and the rival that rammed it (its killer, for the obituary). */
export interface BumpDamage {
  playerId: string;
  killerId: string;
  /** True when the hit only landed because the rammer's contact-hazard aura lowered the gate (closing speed below
   * the normal `bumpSpeedThreshold`) — a gentle scratch, not a hard ram. Selects the holder's split damage. */
  scratch: boolean;
}

/** Outcome of the separation pass: bodies with corrected (and re-clamped) positions, plus bump knockback + damage to apply. */
export interface SeparationResult<
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  players: Player<TEffectId, TNpcId>[];
  impulses: PlayerImpulse[];
  bumps: BumpDamage[];
}

interface Vector {
  x: number;
  y: number;
}

/** Minimum-translation overlap of two bodies (world px): the shallowest axis is the contact normal, pointing a→b. */
interface Overlap {
  normalX: number;
  normalY: number;
  depth: number;
}

/** Per-pair contributions, accumulated by the caller so the whole pass is order-independent (Jacobi-style). */
interface PairResolution {
  idA: string;
  idB: string;
  moveA: Vector;
  moveB: Vector;
  impulses: PlayerImpulse[];
  bumps: BumpDamage[];
}

/** Mass proxy from the body-box area (world px²): a stage-3 torso is ~4× a stage-1, so it barely yields on contact. */
function playerMass<TEffectId extends string, TNpcId extends string>(
  player: Player<TEffectId, TNpcId>,
): number {
  const body = player.body[player.stage];

  return body.width * body.height;
}

/**
 * Minimum-translation overlap of two players' AABBs (world px), or null when they don't overlap. The contact
 * normal is the axis of shallowest penetration (standard AABB resolution), pointing from `a` toward `b`; a
 * perfectly co-located pair falls back to a +x normal so they still separate. X is tested first (cheaper reject).
 */
function aabbOverlap<TEffectId extends string, TNpcId extends string>(
  world: { width: number; height: number },
  a: Player<TEffectId, TNpcId>,
  b: Player<TEffectId, TNpcId>,
): Overlap | null {
  const bodyA = a.body[a.stage];
  const bodyB = b.body[b.stage];
  const dx = (b.x - a.x) * world.width;
  const overlapX = (bodyA.width + bodyB.width) / 2 - Math.abs(dx);

  if (overlapX <= 0) {
    return null;
  }

  const dy = (b.y - a.y) * world.height;
  const overlapY = (bodyA.height + bodyB.height) / 2 - Math.abs(dy);

  if (overlapY <= 0) {
    return null;
  }

  if (overlapX < overlapY) {
    return { normalX: dx < 0 ? -1 : 1, normalY: 0, depth: overlapX };
  }

  return { normalX: 0, normalY: dy < 0 ? -1 : 1, depth: overlapY };
}

/** Converts an axis-aligned push of `distancePx` along `(normalX, normalY)` into a normalized position delta. */
function toNormalizedPush(
  world: { width: number; height: number },
  normalX: number,
  normalY: number,
  distancePx: number,
): Vector {
  return { x: (normalX * distancePx) / world.width, y: (normalY * distancePx) / world.height };
}

/**
 * Resolves one overlapping pair into its corrections: a fractional, inverse-mass-weighted positional push (only the
 * part above the slop), removal of the approaching normal velocity (restitution 0), and — only when the closing
 * speed clears the ram threshold — light bump damage plus an extra outward kick. The heavier body (smaller inverse
 * mass) takes the smaller share of every push. A bump-warded body still separates and damps, but takes no ram damage
 * or knockback (the other side still does). Pure: returns contributions, the caller accumulates them.
 */
function resolvePair<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  a: Player<TEffectId, TNpcId>,
  b: Player<TEffectId, TNpcId>,
  overlap: Overlap,
): PairResolution {
  const config = game.playerCollision;
  const world = game.world;
  const { normalX, normalY } = overlap;
  const invMassA = 1 / playerMass(a);
  const invMassB = 1 / playerMass(b);
  const invMassSum = invMassA + invMassB;
  const shareA = invMassA / invMassSum;
  const shareB = invMassB / invMassSum;

  // Positional correction (only the part above the slop), fractional and split by inverse mass; px → normalized.
  const corrected = Math.max(0, overlap.depth - config.slopPx);
  const total = corrected * config.relaxation;
  const moveDistanceA = Math.min(total * shareA, config.maxCorrectionPx);
  const moveDistanceB = Math.min(total * shareB, config.maxCorrectionPx);
  const moveA = toNormalizedPush(world, normalX, normalY, -moveDistanceA);
  const moveB = toNormalizedPush(world, normalX, normalY, moveDistanceB);

  const impulses: PlayerImpulse[] = [];
  const bumps: BumpDamage[] = [];

  /** A bump-warded player (`damageTaken.bump === 0`) takes no ram damage or bump knockback (it still separates — it's a solid body). */
  const isBumpWarded = (player: Player<TEffectId, TNpcId>): boolean =>
    isFullyWarded(game.effects, player.effects, 'bump');

  // Relative velocity along the contact normal: negative ⇒ the bodies are closing.
  const closing = (b.vx - a.vx) * normalX + (b.vy - a.vy) * normalY;

  if (closing >= 0) {
    return { idA: a.id, idB: b.id, moveA, moveB, impulses, bumps };
  }

  // Remove the approaching component (restitution 0 ⇒ they stop pressing in; tangential drift is preserved).
  const dampMagnitude = (-(1 + config.restitution) * closing) / invMassSum;

  impulses.push(
    {
      playerId: a.id,
      ix: -normalX * dampMagnitude * invMassA,
      iy: -normalY * dampMagnitude * invMassA,
      maxFactor: config.impulseMaxFactor,
    },
    {
      playerId: b.id,
      ix: normalX * dampMagnitude * invMassB,
      iy: normalY * dampMagnitude * invMassB,
      maxFactor: config.impulseMaxFactor,
    },
  );

  const closingSpeed = -closing;

  // The ram gate is evaluated per direction: the threshold drops to `scratchSpeedThreshold` when the RAMMER is a
  // contact hazard (cactus), so its spikes prick the toucher on a gentle touch — one-directional, since the other
  // side keeps the full `bumpSpeedThreshold` (brushing a cactus chips the toucher, not the holder). A normal pair
  // uses `bumpSpeedThreshold` both ways, identical to before.
  const rammThreshold = (rammer: Player<TEffectId, TNpcId>): number =>
    isContactRammer(game.effects, rammer.effects)
      ? config.scratchSpeedThreshold
      : config.bumpSpeedThreshold;

  /**
   * Records a ram on `victim` dealt by `rammer` when the closing speed clears the rammer's threshold and the
   * victim isn't bump-warded: light hp damage plus an outward kick (split by the victim's inverse-mass `share`,
   * oriented along the normal by `sign` — −1 for `a`, +1 for `b`). The kick scales from the SAME threshold, so a
   * gentle scratch recoils softly.
   */
  const addRam = (
    victim: Player<TEffectId, TNpcId>,
    rammer: Player<TEffectId, TNpcId>,
    share: number,
    sign: number,
  ): void => {
    const threshold = rammThreshold(rammer);

    if (closingSpeed < threshold || isBumpWarded(victim)) {
      return;
    }

    const kick = config.bumpImpulse + (closingSpeed - threshold) * config.bumpImpulseScale;

    impulses.push({
      playerId: victim.id,
      ix: sign * normalX * kick * share,
      iy: sign * normalY * kick * share,
      maxFactor: config.impulseMaxFactor,
    });
    // A hit below the normal ram threshold can only have landed via the lowered scratch gate — mark it a scratch.
    bumps.push({
      playerId: victim.id,
      killerId: rammer.id,
      scratch: closingSpeed < config.bumpSpeedThreshold,
    });
  };

  addRam(a, b, shareA, -1);
  addRam(b, a, shareB, 1);

  return { idA: a.id, idB: b.id, moveA, moveB, impulses, bumps };
}

/** Accumulates a position delta for a player so a body pressed by several others gets the sum of all pushes. */
function addDelta(deltas: Map<string, Vector>, id: string, move: Vector): void {
  const current = deltas.get(id) ?? { x: 0, y: 0 };

  deltas.set(id, { x: current.x + move.x, y: current.y + move.y });
}

/** The looser of the drift zone and a half-sprite inset on each axis — identical to the bounds in `movePlayers`. */
function sizeAwareBounds<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  player: Player<TEffectId, TNpcId>,
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const zone = game.player.driftZone;
  const world = game.world;
  const body = player.body[player.stage];
  const insetX = halfExtentNorm(body.width, world.width);
  const insetY = halfExtentNorm(body.height, world.height);

  return {
    minX: Math.max(zone.minX, insetX),
    maxX: Math.min(zone.maxX, 1 - insetX),
    minY: Math.max(zone.minY, insetY),
    maxY: Math.min(zone.maxY, 1 - insetY),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Applies the accumulated positional corrections, then clamps each moved body to its size-aware world bounds (the
 * same bounds `movePlayers` enforces). The clamp runs last so the world edge is the final authority: a cluster
 * shoved against a corner settles in-bounds with a tiny residual overlap instead of escaping the scene.
 */
function applyPositionDeltas<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  players: readonly Player<TEffectId, TNpcId>[],
  deltas: Map<string, Vector>,
): Player<TEffectId, TNpcId>[] {
  return players.map((player) => {
    const move = deltas.get(player.id);

    if (move === undefined) {
      return player;
    }

    const bounds = sizeAwareBounds(game, player);

    return {
      ...player,
      x: clamp(player.x + move.x, bounds.minX, bounds.maxX),
      y: clamp(player.y + move.y, bounds.minY, bounds.maxY),
    };
  });
}

/**
 * One soft-separation pass over the alive players. Resolves every overlapping pair once (no iterate-to-convergence
 * loop), accumulating fractional inverse-mass-weighted positional pushes, normal-velocity damping and — on hard
 * head-on contacts — bump damage/knockback. Convergence happens across ticks via `relaxation`, and the per-pair
 * `slopPx` floor plus the final size-aware clamp keep a jammed cluster (even in a corner) stable and in-bounds.
 *
 * Pure and order-independent: all corrections are computed from the input positions, accumulated, then applied
 * once. Knockback and bump damage are returned for the orchestrator to route through `applyImpulses` / `applyBumpDamage`.
 */
export function separatePlayers<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  players: readonly Player<TEffectId, TNpcId>[],
): SeparationResult<TEffectId, TNpcId> {
  const alive = players.filter((player) => player.status === 'alive');
  const positionDeltas = new Map<string, Vector>();
  const impulses: PlayerImpulse[] = [];
  const bumps: BumpDamage[] = [];

  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const overlap = aabbOverlap(game.world, alive[i], alive[j]);

      if (overlap === null) {
        continue;
      }

      const resolution = resolvePair(game, alive[i], alive[j], overlap);

      addDelta(positionDeltas, resolution.idA, resolution.moveA);
      addDelta(positionDeltas, resolution.idB, resolution.moveB);
      impulses.push(...resolution.impulses);
      bumps.push(...resolution.bumps);
    }
  }

  return { players: applyPositionDeltas(game, players, positionDeltas), impulses, bumps };
}
