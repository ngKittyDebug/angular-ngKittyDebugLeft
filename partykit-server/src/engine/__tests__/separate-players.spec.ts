import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import type { HumanPlayer, ItemType, NpcKind, Player, PlayerEffectKind } from '@game/frenzy/types';

import type { PlayerImpulse } from '../verbs';
import { separatePlayers } from '../core/tick/separate-players';
import { TEST_BODY } from './test-body';

const WORLD = FRENZY.world.width;

function makePlayer(overrides: Partial<HumanPlayer> = {}): Player {
  return {
    kind: 'human',
    id: 'p',
    name: 'P',
    appearance: 'caterpie',
    body: TEST_BODY,
    stage: 1,
    hp: 100,
    mana: 0,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
    ...overrides,
  };
}

/** Horizontal gap (normalized) for a given world-px separation, so cases survive a world resize. */
function gapX(px: number): number {
  return px / WORLD;
}

/** Sums the velocity-impulse magnitude a player received across all contacts this pass. */
function impulseMagnitude(impulses: readonly PlayerImpulse[], id: string): number {
  return impulses
    .filter((impulse) => impulse.playerId === id)
    .reduce((sum, impulse) => sum + Math.hypot(impulse.ix, impulse.iy), 0);
}

describe('separatePlayers', () => {
  it('pushes two overlapping bodies apart along the shallowest axis', () => {
    // Stage-1 bodies are 60px wide → they overlap on X within 60px; a 40px gap is a 20px penetration.
    const a = makePlayer({ id: 'a', x: 0.5, y: 0.5 });
    const b = makePlayer({ id: 'b', x: 0.5 + gapX(40), y: 0.5 });
    const { players } = separatePlayers(FRENZY_DEFINITION, [a, b]);
    const [movedA, movedB] = players;

    expect(movedA.x).toBeLessThan(a.x);
    expect(movedB.x).toBeGreaterThan(b.x);
    expect(movedB.x - movedA.x).toBeGreaterThan(b.x - a.x);
  });

  it('splits the correction evenly between equal-mass bodies (centre of mass unchanged)', () => {
    const a = makePlayer({ id: 'a', x: 0.5, y: 0.5 });
    const b = makePlayer({ id: 'b', x: 0.5 + gapX(40), y: 0.5 });
    const { players } = separatePlayers(FRENZY_DEFINITION, [a, b]);
    const [movedA, movedB] = players;

    expect(a.x - movedA.x).toBeCloseTo(movedB.x - b.x, 10);
    expect((movedA.x + movedB.x) / 2).toBeCloseTo((a.x + b.x) / 2, 10);
  });

  it('moves the heavier (evolved) body less, in proportion to inverse mass', () => {
    // Stage 3 mass = 120² = 14400, stage 1 mass = 60² = 3600 → invMass ratio 0.25 → heavy moves a quarter as far.
    const heavy = makePlayer({ id: 'heavy', stage: 3, x: 0.5, y: 0.5 });
    const light = makePlayer({ id: 'light', stage: 1, x: 0.5 + gapX(70), y: 0.5 });
    const { players } = separatePlayers(FRENZY_DEFINITION, [heavy, light]);
    const [movedHeavy, movedLight] = players;
    const deltaHeavy = Math.abs(movedHeavy.x - heavy.x);
    const deltaLight = Math.abs(movedLight.x - light.x);

    expect(deltaHeavy).toBeLessThan(deltaLight);
    expect(deltaHeavy / deltaLight).toBeCloseTo(0.25, 5);
  });

  it('leaves a sub-slop overlap uncorrected (anti-jitter floor)', () => {
    // 59px gap → 1px penetration, below the 2px slop → no positional change, no velocity (both parked).
    const a = makePlayer({ id: 'a', x: 0.5, y: 0.5 });
    const b = makePlayer({ id: 'b', x: 0.5 + gapX(59), y: 0.5 });
    const { players, bumps, impulses } = separatePlayers(FRENZY_DEFINITION, [a, b]);
    const [movedA, movedB] = players;

    expect(movedA.x).toBeCloseTo(a.x, 10);
    expect(movedB.x).toBeCloseTo(b.x, 10);
    expect(bumps).toEqual([]);
    expect(impulses).toEqual([]);
  });

  it('keeps three bodies jammed in a corner stable and in-bounds (converges, no jitter, no escape)', () => {
    const bounds = {
      minX: Math.max(FRENZY.playerDriftZone.minX, 30 / WORLD),
      maxY: Math.min(FRENZY.playerDriftZone.maxY, 1 - 30 / FRENZY.world.height),
    };
    // Three stage-1 bodies stacked into the bottom-left corner, overlapping heavily.
    let cluster: Player[] = [
      makePlayer({ id: 'a', x: bounds.minX, y: bounds.maxY }),
      makePlayer({ id: 'b', x: bounds.minX + gapX(15), y: bounds.maxY - gapX(15) }),
      makePlayer({ id: 'c', x: bounds.minX + gapX(30), y: bounds.maxY }),
    ];

    const moves: number[] = [];

    for (let tick = 0; tick < 60; tick++) {
      const previous = cluster;
      // Explicit type args: with the `cluster` accumulator annotated with the public (enabled-only) unions,
      // inference over the raw definition would widen `TEffectId` to the full roster keys.
      const { players } = separatePlayers<ItemType, PlayerEffectKind, NpcKind>(
        FRENZY_DEFINITION,
        cluster,
      );

      cluster = players;
      moves.push(
        Math.max(
          ...players.map((player, index) =>
            Math.hypot(player.x - previous[index].x, player.y - previous[index].y),
          ),
        ),
      );
    }

    // Converging, not oscillating: each tick moves no more than the previous (monotonic decay), and the final
    // tick's movement is negligible (sub-pixel) — a stable fixed point, never a jittering limit cycle.
    for (let tick = 1; tick < moves.length; tick++) {
      expect(moves[tick]).toBeLessThanOrEqual(moves[tick - 1] + 1e-12);
    }

    expect(moves[moves.length - 1]).toBeLessThan(1e-4);

    for (const player of cluster) {
      expect(player.x).toBeGreaterThanOrEqual(bounds.minX - 1e-9);
      expect(player.y).toBeLessThanOrEqual(bounds.maxY + 1e-9);
      expect(player.x).toBeLessThanOrEqual(1);
      expect(player.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("records a bump (with each victim's killer) and knockback on a hard head-on contact", () => {
    const a = makePlayer({ id: 'a', x: 0.5, y: 0.5, vx: 0.04 });
    const b = makePlayer({ id: 'b', x: 0.5 + gapX(50), y: 0.5, vx: -0.04 });
    const { bumps, impulses } = separatePlayers(FRENZY_DEFINITION, [a, b]);

    // Each victim's killer is the other player — the attribution the obituary reuses. A hard ram, so neither is a scratch.
    expect(bumps).toEqual(
      expect.arrayContaining([
        { playerId: 'a', killerId: 'b', scratch: false },
        { playerId: 'b', killerId: 'a', scratch: false },
      ]),
    );
    expect(bumps).toHaveLength(2);
    expect(impulseMagnitude(impulses, 'a')).toBeGreaterThan(0);
    expect(impulseMagnitude(impulses, 'b')).toBeGreaterThan(0);
  });

  it('separates a slow contact without dealing damage', () => {
    const a = makePlayer({ id: 'a', x: 0.5, y: 0.5, vx: 0.01 });
    const b = makePlayer({ id: 'b', x: 0.5 + gapX(50), y: 0.5, vx: -0.01 });
    const { players, bumps } = separatePlayers(FRENZY_DEFINITION, [a, b]);
    const [movedA, movedB] = players;

    expect(bumps).toEqual([]);
    expect(movedA.x).toBeLessThan(a.x);
    expect(movedB.x).toBeGreaterThan(b.x);
  });

  it('spares a shielded player from bump damage and knockback (the rammer still takes it)', () => {
    const shielded = makePlayer({
      id: 'shielded',
      x: 0.5,
      y: 0.5,
      vx: 0.04,
      effects: [{ kind: 'shield', expiresAt: 10_000 }],
    });
    const rammer = makePlayer({ id: 'rammer', x: 0.5 + gapX(50), y: 0.5, vx: -0.04 });
    const { players, bumps, impulses } = separatePlayers(FRENZY_DEFINITION, [shielded, rammer]);
    const [movedShielded] = players;

    // Only the rammer is bumped; the shielded one takes no ram knockback — but still separates (it's a solid body).
    expect(bumps).toEqual([{ playerId: 'rammer', killerId: 'shielded', scratch: false }]);
    expect(impulseMagnitude(impulses, 'rammer')).toBeGreaterThan(0);
    expect(movedShielded.x).toBeLessThan(shielded.x);
  });

  it('lets a cactus holder scratch a gentle toucher one-directionally', () => {
    // Closing speed 0.02 — below the 0.05 ram threshold but above the 0.01 scratch threshold. The cactus holder
    // is a contact hazard, so its spikes prick the toucher even on this lazy contact; the toucher is a normal
    // body, so its (sub-threshold) ram doesn't hurt the holder back.
    const cactus = makePlayer({
      id: 'cactus',
      x: 0.5,
      y: 0.5,
      vx: 0.01,
      effects: [{ kind: 'cactus', expiresAt: 10_000 }],
    });
    const other = makePlayer({ id: 'other', x: 0.5 + gapX(50), y: 0.5, vx: -0.01 });
    const { bumps } = separatePlayers(FRENZY_DEFINITION, [cactus, other]);

    // Below the ram threshold → flagged a scratch (drives the lighter `scratchDamage` downstream).
    expect(bumps).toEqual([{ playerId: 'other', killerId: 'cactus', scratch: true }]);
  });

  it('stays silent on a sub-scratch-threshold cactus contact (a resting overlap never tick-drains hp)', () => {
    // Closing speed 0.005 — below even the scratch threshold (0.01), so a barely-moving cactus contact deals
    // nothing. This is the property that keeps a damped resting overlap from pricking every tick.
    const cactus = makePlayer({
      id: 'cactus',
      x: 0.5,
      y: 0.5,
      vx: 0.0025,
      effects: [{ kind: 'cactus', expiresAt: 10_000 }],
    });
    const other = makePlayer({ id: 'other', x: 0.5 + gapX(50), y: 0.5, vx: -0.0025 });
    const { bumps } = separatePlayers(FRENZY_DEFINITION, [cactus, other]);

    expect(bumps).toEqual([]);
  });

  it('still bumps both ways on a hard ram even when one holds a cactus', () => {
    // A real ram clears the normal threshold for both, so the cactus changes only the downstream damage scaling
    // (in applyBumpDamage), not who gets bumped in this pass.
    const cactus = makePlayer({
      id: 'cactus',
      x: 0.5,
      y: 0.5,
      vx: 0.04,
      effects: [{ kind: 'cactus', expiresAt: 10_000 }],
    });
    const other = makePlayer({ id: 'other', x: 0.5 + gapX(50), y: 0.5, vx: -0.04 });
    const { bumps } = separatePlayers(FRENZY_DEFINITION, [cactus, other]);

    // A hard ram clears the normal threshold both ways → neither side is a scratch (cactus deals its ramDamage).
    expect(bumps).toEqual(
      expect.arrayContaining([
        { playerId: 'cactus', killerId: 'other', scratch: false },
        { playerId: 'other', killerId: 'cactus', scratch: false },
      ]),
    );
    expect(bumps).toHaveLength(2);
  });

  it('removes the approaching normal velocity while preserving tangential drift', () => {
    // Slow closing (below the ram threshold) so only the damping impulse is produced.
    const a = makePlayer({ id: 'a', x: 0.5, y: 0.5, vx: 0.01, vy: 0.02 });
    const b = makePlayer({ id: 'b', x: 0.5 + gapX(50), y: 0.5, vx: -0.01, vy: 0.02 });
    const { impulses } = separatePlayers(FRENZY_DEFINITION, [a, b]);
    const impulseA = impulses.find((impulse) => impulse.playerId === 'a');
    const impulseB = impulses.find((impulse) => impulse.playerId === 'b');
    const nextAvx = a.vx + (impulseA?.ix ?? 0);
    const nextBvx = b.vx + (impulseB?.ix ?? 0);

    // Normal is +x: after applying the impulses the bodies no longer close along it; the y drift is untouched.
    expect(nextBvx - nextAvx).toBeCloseTo(0, 6);
    expect(impulseA?.iy).toBeCloseTo(0, 10);
    expect(impulseB?.iy).toBeCloseTo(0, 10);
  });

  it('shoves the heavier body back less than the lighter one on a ram', () => {
    const heavy = makePlayer({ id: 'heavy', stage: 3, x: 0.5, y: 0.5, vx: 0.04 });
    const light = makePlayer({ id: 'light', stage: 1, x: 0.5 + gapX(70), y: 0.5, vx: -0.04 });
    const { impulses } = separatePlayers(FRENZY_DEFINITION, [heavy, light]);

    expect(impulseMagnitude(impulses, 'heavy')).toBeLessThan(impulseMagnitude(impulses, 'light'));
  });

  it('is deterministic under input permutation', () => {
    const a = makePlayer({ id: 'a', x: 0.5, y: 0.5, vx: 0.03 });
    const b = makePlayer({ id: 'b', x: 0.5 + gapX(45), y: 0.5, vx: -0.03 });
    const c = makePlayer({ id: 'c', x: 0.5 + gapX(20), y: 0.5 + gapX(40), vx: 0 });

    const first = separatePlayers(FRENZY_DEFINITION, [a, b, c]);
    const second = separatePlayers(FRENZY_DEFINITION, [c, a, b]);
    const positionsOf = (result: typeof first): Record<string, [number, number]> =>
      Object.fromEntries(result.players.map((player) => [player.id, [player.x, player.y]]));

    expect(positionsOf(first)).toEqual(positionsOf(second));
    expect(impulseMagnitude(first.impulses, 'a')).toBeCloseTo(
      impulseMagnitude(second.impulses, 'a'),
      10,
    );
    expect(first.bumps.length).toBe(second.bumps.length);
  });

  it('ignores disconnected bodies', () => {
    const alive = makePlayer({ id: 'alive', x: 0.5, y: 0.5 });
    const offline = makePlayer({
      id: 'offline',
      status: 'disconnected',
      x: 0.5 + gapX(20),
      y: 0.5,
    });
    const { players, bumps } = separatePlayers(FRENZY_DEFINITION, [alive, offline]);
    const [movedAlive, movedOffline] = players;

    expect(movedAlive.x).toBe(alive.x);
    expect(movedOffline.x).toBe(offline.x);
    expect(bumps).toEqual([]);
  });
});
