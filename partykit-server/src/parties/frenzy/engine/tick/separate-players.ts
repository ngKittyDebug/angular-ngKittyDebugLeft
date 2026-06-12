import { FRENZY, halfExtentNorm } from '@game/frenzy/config';
import type { Player } from '@game/frenzy/types';

import type { PlayerImpulse } from '../item-behaviors';

/** A collision bump that dealt damage: the victim and the rival that rammed it (its killer, for the obituary). */
export interface BumpDamage {
  playerId: string;
  killerId: string;
}

/** Outcome of the separation pass: bodies with corrected (and re-clamped) positions, plus bump knockback + damage to apply. */
export interface SeparationResult {
  players: Player[];
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
function playerMass(player: Player): number {
  const body = player.body[player.stage];

  return body.width * body.height;
}

/** A shielded Pokémon is immune to collision damage and bump knockback (it still separates — it's a solid body). */
function isShielded(player: Player): boolean {
  return player.effects.some((effect) => effect.kind === 'shield');
}

/**
 * Minimum-translation overlap of two players' AABBs (world px), or null when they don't overlap. The contact
 * normal is the axis of shallowest penetration (standard AABB resolution), pointing from `a` toward `b`; a
 * perfectly co-located pair falls back to a +x normal so they still separate. X is tested first (cheaper reject).
 */
function aabbOverlap(a: Player, b: Player): Overlap | null {
  const world = FRENZY.world;
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
function toNormalizedPush(normalX: number, normalY: number, distancePx: number): Vector {
  const world = FRENZY.world;

  return { x: (normalX * distancePx) / world.width, y: (normalY * distancePx) / world.height };
}

/**
 * Resolves one overlapping pair into its corrections: a fractional, inverse-mass-weighted positional push (only the
 * part above the slop), removal of the approaching normal velocity (restitution 0), and — only when the closing
 * speed clears the ram threshold — light bump damage plus an extra outward kick. The heavier body (smaller inverse
 * mass) takes the smaller share of every push. A shielded body still separates and damps, but takes no ram damage
 * or knockback (the other side still does). Pure: returns contributions, the caller accumulates them.
 */
function resolvePair(a: Player, b: Player, overlap: Overlap): PairResolution {
  const config = FRENZY.playerCollision;
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
  const moveA = toNormalizedPush(normalX, normalY, -moveDistanceA);
  const moveB = toNormalizedPush(normalX, normalY, moveDistanceB);

  const impulses: PlayerImpulse[] = [];
  const bumps: BumpDamage[] = [];

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
    },
    {
      playerId: b.id,
      ix: normalX * dampMagnitude * invMassB,
      iy: normalY * dampMagnitude * invMassB,
    },
  );

  const closingSpeed = -closing;

  if (closingSpeed >= config.bumpSpeedThreshold) {
    const kick =
      config.bumpImpulse + (closingSpeed - config.bumpSpeedThreshold) * config.bumpImpulseScale;

    // Each side takes ram damage + an outward kick unless shielded — the shield wards the hit, not the other's.
    if (!isShielded(a)) {
      impulses.push({ playerId: a.id, ix: -normalX * kick * shareA, iy: -normalY * kick * shareA });
      bumps.push({ playerId: a.id, killerId: b.id });
    }

    if (!isShielded(b)) {
      impulses.push({ playerId: b.id, ix: normalX * kick * shareB, iy: normalY * kick * shareB });
      bumps.push({ playerId: b.id, killerId: a.id });
    }
  }

  return { idA: a.id, idB: b.id, moveA, moveB, impulses, bumps };
}

/** Accumulates a position delta for a player so a body pressed by several others gets the sum of all pushes. */
function addDelta(deltas: Map<string, Vector>, id: string, move: Vector): void {
  const current = deltas.get(id) ?? { x: 0, y: 0 };

  deltas.set(id, { x: current.x + move.x, y: current.y + move.y });
}

/** The looser of the drift zone and a half-sprite inset on each axis — identical to the bounds in `movePlayers`. */
function sizeAwareBounds(player: Player): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const zone = FRENZY.playerDriftZone;
  const world = FRENZY.world;
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
function applyPositionDeltas(players: readonly Player[], deltas: Map<string, Vector>): Player[] {
  return players.map((player) => {
    const move = deltas.get(player.id);

    if (move === undefined) {
      return player;
    }

    const bounds = sizeAwareBounds(player);

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
export function separatePlayers(players: readonly Player[]): SeparationResult {
  const alive = players.filter((player) => player.status === 'alive');
  const positionDeltas = new Map<string, Vector>();
  const impulses: PlayerImpulse[] = [];
  const bumps: BumpDamage[] = [];

  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const overlap = aabbOverlap(alive[i], alive[j]);

      if (overlap === null) {
        continue;
      }

      const resolution = resolvePair(alive[i], alive[j], overlap);

      addDelta(positionDeltas, resolution.idA, resolution.moveA);
      addDelta(positionDeltas, resolution.idB, resolution.moveB);
      impulses.push(...resolution.impulses);
      bumps.push(...resolution.bumps);
    }
  }

  return { players: applyPositionDeltas(players, positionDeltas), impulses, bumps };
}
