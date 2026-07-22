import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import type { HumanPlayer, NpcPlayer, Player } from '@game/frenzy/types';

import { bodyForAppearance } from '../../../../data/constants/pokemon-body';
import { MAX_OFFSET_COLLAPSE_PER_FRAME } from './drift-math';
import { PlayerExtrapolatorService } from './player-extrapolator.service';

function player(partial: Partial<HumanPlayer> & Pick<Player, 'id'>): Player {
  return {
    kind: 'human',
    name: 'Ash',
    appearance: 'pidgey',
    body: bodyForAppearance('pidgey'),
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
    ...partial,
  };
}

function npc(partial: Partial<NpcPlayer> & Pick<Player, 'id'>): Player {
  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    name: 'Angry Bomb',
    appearance: ANGRY_BOMB_NPC.appearance,
    body: ANGRY_BOMB_NPC.body,
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
    ...partial,
  };
}

const NONE = new Map<string, number>();

describe('PlayerExtrapolatorService', () => {
  it('renders a stationary player at its authoritative position', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest([player({ id: 'p1', x: 0.4, y: 0.6 })], null, NONE, 0);

    const rendered = service.rendered()[0];

    expect(rendered.x).toBeCloseTo(0.4);
    expect(rendered.y).toBeCloseTo(0.6);
  });

  it('flags the local player as me', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest([player({ id: 'p1' }), player({ id: 'p2' })], 'p2', NONE, 0);

    expect(service.rendered().find((p) => p.id === 'p2')?.isMe).toBe(true);
    expect(service.rendered().find((p) => p.id === 'p1')?.isMe).toBe(false);
  });

  it('emits an aura render descriptor for a live effect and drops it once expired', () => {
    const service = new PlayerExtrapolatorService();
    const live = player({
      id: 'p1',
      effects: [{ kind: 'shield', expiresAt: Date.now() + 10_000 }],
    });

    service.ingest([live], null, NONE, 0);
    expect(service.rendered()[0].effectAuras).toEqual([
      { className: 'scene__shield', render: 'shield' },
    ]);

    const expired = player({
      id: 'p1',
      effects: [{ kind: 'shield', expiresAt: Date.now() - 1000 }],
    });

    service.ingest([expired], null, NONE, 1);
    expect(service.rendered()[0].effectAuras).toEqual([]);
  });

  it('maps each aura-bearing effect to its render mode (shield / bubble / bespoke)', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest(
      [
        player({
          id: 'p1',
          effects: [
            { kind: 'shield', expiresAt: Date.now() + 10_000 },
            { kind: 'pooping', expiresAt: Date.now() + 10_000 },
            { kind: 'laying', expiresAt: Date.now() + 10_000 },
          ],
        }),
      ],
      null,
      NONE,
      0,
    );

    expect(service.rendered()[0].effectAuras).toEqual([
      { className: 'scene__shield', render: 'shield' },
      { className: 'scene__poop', render: 'bubble' },
      { className: 'scene__laying', render: 'bespoke' },
    ]);
  });

  it('gives wellFed no aura at all — only its badge (and the grounding-shadow tint)', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest(
      [player({ id: 'p1', effects: [{ kind: 'wellFed', expiresAt: Date.now() + 10_000 }] })],
      null,
      NONE,
      0,
    );

    const rendered = service.rendered()[0];

    expect(rendered.effectAuras).toEqual([]);
    expect(rendered.effectBadges).toEqual([
      { kind: 'wellFed', icon: '@tui.heart', tone: 'positive' },
    ]);
  });

  it('resolves no grounding-shadow tint when the player has no active effects', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest([player({ id: 'p1' })], null, NONE, 0);

    expect(service.rendered()[0].shadowEffectClass).toBeNull();
  });

  it('tints the grounding shadow for the sole active effect (wellFed alone, which has no bubble)', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest(
      [player({ id: 'p1', effects: [{ kind: 'wellFed', expiresAt: Date.now() + 10_000 }] })],
      null,
      NONE,
      0,
    );

    expect(service.rendered()[0].shadowEffectClass).toBe('scene__shadow--wellFed');
  });

  it('prefers shield over wellFed for the grounding-shadow tint when both stack', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest(
      [
        player({
          id: 'p1',
          effects: [
            { kind: 'wellFed', expiresAt: Date.now() + 10_000 },
            { kind: 'shield', expiresAt: Date.now() + 10_000 },
          ],
        }),
      ],
      null,
      NONE,
      0,
    );

    expect(service.rendered()[0].shadowEffectClass).toBe('scene__shadow--shield');
  });

  it('prefers the emitter (laying) over shield and wellFed for the grounding-shadow tint', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest(
      [
        player({
          id: 'p1',
          effects: [
            { kind: 'wellFed', expiresAt: Date.now() + 10_000 },
            { kind: 'shield', expiresAt: Date.now() + 10_000 },
            { kind: 'laying', expiresAt: Date.now() + 10_000 },
          ],
        }),
      ],
      null,
      NONE,
      0,
    );

    expect(service.rendered()[0].shadowEffectClass).toBe('scene__shadow--laying');
  });

  it('drops the grounding-shadow tint once the only effect expires (neutral again)', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest(
      [player({ id: 'p1', effects: [{ kind: 'shield', expiresAt: Date.now() - 1000 }] })],
      null,
      NONE,
      0,
    );

    expect(service.rendered()[0].shadowEffectClass).toBeNull();
  });

  it('emits an effect badge (icon + tone) for a live effect and drops it once expired', () => {
    const service = new PlayerExtrapolatorService();
    const live = player({
      id: 'p1',
      effects: [{ kind: 'shield', expiresAt: Date.now() + 10_000 }],
    });

    service.ingest([live], null, NONE, 0);
    expect(service.rendered()[0].effectBadges).toEqual([
      { kind: 'shield', icon: '@tui.shield', tone: 'positive' },
    ]);

    const expired = player({
      id: 'p1',
      effects: [{ kind: 'shield', expiresAt: Date.now() - 1000 }],
    });

    service.ingest([expired], null, NONE, 1);
    expect(service.rendered()[0].effectBadges).toEqual([]);
  });

  it('tones the pooping debuff badge as a warning, distinct from positive buffs', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest(
      [player({ id: 'p1', effects: [{ kind: 'pooping', expiresAt: Date.now() + 10_000 }] })],
      null,
      NONE,
      0,
    );

    expect(service.rendered()[0].effectBadges).toEqual([
      { kind: 'pooping', icon: '@tui.wind', tone: 'warning' },
    ]);
  });

  it('badges the NPC too when it picks up an effect, matching its aura ring', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest(
      [npc({ id: 'bomb', effects: [{ kind: 'shield', expiresAt: Date.now() + 10_000 }] })],
      null,
      NONE,
      0,
    );

    expect(service.rendered()[0].effectBadges).toEqual([
      { kind: 'shield', icon: '@tui.shield', tone: 'positive' },
    ]);
  });

  it('flags the NPC and normalizes its mana into anger (0..1)', () => {
    const service = new PlayerExtrapolatorService();
    const half = FRENZY.npc.anger.max / 2;

    service.ingest([npc({ id: 'bomb', mana: half })], null, NONE, 0);

    const rendered = service.rendered()[0];

    expect(rendered.isNpc).toBe(true);
    expect(rendered.npcAnger).toBeCloseTo(0.5);
  });

  it('clamps NPC anger to 1 when mana exceeds the max', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest([npc({ id: 'bomb', mana: FRENZY.npc.anger.max * 2 })], null, NONE, 0);

    expect(service.rendered()[0].npcAnger).toBe(1);
  });

  it('leaves humans non-NPC with zero anger regardless of mana', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest([player({ id: 'p1', mana: 50 })], null, NONE, 0);

    const rendered = service.rendered()[0];

    expect(rendered.isNpc).toBe(false);
    expect(rendered.npcAnger).toBe(0);
  });

  it('marks an evolving player from the evolving map', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest([player({ id: 'p1' })], null, new Map([['p1', 2]]), 0);

    expect(service.rendered()[0].isEvolving).toBe(true);
  });

  it('turns the local heading toward a steer target on the same frame', () => {
    const service = new PlayerExtrapolatorService();
    const me = player({ id: 'me', x: 0.5, y: 0.5, vx: 0, vy: 0 });

    service.ingest([me], 'me', NONE, 0);
    service.predictSteer('me', 0.9, 0.5, 0); // steer right
    service.tick([me], 'me', NONE, 500); // advance 0.5s

    // `tick` advances the live per-frame view models (`frame`), not the structure signal (`rendered`), which only
    // republishes on a snapshot — so the post-tick position is read from `frame`. See ADR 0001.
    expect(service.frame()[0].x).toBeGreaterThan(0.5);
  });

  it('ignores a steer when there is no local player', () => {
    const service = new PlayerExtrapolatorService();

    expect(() => service.predictSteer(null, 0.9, 0.5, 0)).not.toThrow();
    expect(() => service.predictSteer('ghost', 0.9, 0.5, 0)).not.toThrow();
  });

  it('never renders a player outside the drift zone after a large reconciliation correction', () => {
    const service = new PlayerExtrapolatorService();
    const zone = FRENZY.playerDriftZone;

    // Client extrapolated the player against the right/bottom wall...
    service.ingest([player({ id: 'p1', x: zone.maxX, y: zone.maxY })], null, NONE, 0);
    // ...then the server snaps it to the opposite wall with high velocity (e.g. a bomb knockback): a large gap is
    // captured as the reconciliation offset, which must not fling the offset-adjusted sprite past the wall.
    service.ingest(
      [player({ id: 'p1', x: zone.minX, y: zone.minY, vx: 50, vy: 50 })],
      null,
      NONE,
      0,
    );

    for (const now of [10, 30, 90, 270]) {
      // Each iteration is a fresh, distinct snapshot arriving mid-glide so `sync` actually re-anchors (re-captures
      // the gap). The captured offset must come from the clamped rendered position, never re-extending the excursion.
      const vx = now % 2 === 0 ? 50 : -50;

      service.ingest(
        [player({ id: 'p1', x: zone.minX, y: zone.minY, vx, vy: vx })],
        null,
        NONE,
        now,
      );
      service.tick(
        [player({ id: 'p1', x: zone.minX, y: zone.minY, vx, vy: vx })],
        null,
        NONE,
        now + 5,
      );

      // Post-tick position lives in `frame` (the structure signal only republishes on a snapshot). See ADR 0001.
      const rendered = service.frame()[0];

      expect(rendered.x).toBeGreaterThanOrEqual(zone.minX);
      expect(rendered.x).toBeLessThanOrEqual(zone.maxX);
      expect(rendered.y).toBeGreaterThanOrEqual(zone.minY);
      expect(rendered.y).toBeLessThanOrEqual(zone.maxY);
    }
  });

  it('stretches the reconciliation glide on a slow client so no single frame snaps the sprite', () => {
    const service = new PlayerExtrapolatorService();
    const slowFrameMs = 60; // ~17fps

    // Establish a baseline, then warm the frame-interval estimate with several slow frames.
    service.ingest([player({ id: 'me', x: 0.5, y: 0.5 })], 'me', NONE, 0);

    for (let frame = 1; frame <= 12; frame += 1) {
      service.tick([player({ id: 'me', x: 0.5, y: 0.5 })], 'me', NONE, frame * slowFrameMs);
    }

    // The server now reports the player at a new position: a reconciliation gap of ~0.2 is captured as an offset.
    const correctionNow = 13 * slowFrameMs;

    service.ingest([player({ id: 'me', x: 0.7, y: 0.5 })], 'me', NONE, correctionNow);
    const gap = Math.abs(0.7 - service.frame()[0].x); // ≈ 0.2 right after the correction

    // Advance one slow frame: the sprite must glide, not snap — at most MAX_OFFSET_COLLAPSE_PER_FRAME of the gap
    // closes in this single frame (frame-aware τ). With the plain wall-clock τ ~half the gap would vanish here.
    service.tick([player({ id: 'me', x: 0.7, y: 0.5 })], 'me', NONE, correctionNow + slowFrameMs);
    const remaining = Math.abs(0.7 - service.frame()[0].x);

    expect(gap).toBeGreaterThan(0.15);
    expect(remaining).toBeGreaterThanOrEqual((1 - MAX_OFFSET_COLLAPSE_PER_FRAME) * gap - 1e-6);
  });

  it('drops players absent from the latest snapshot', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest([player({ id: 'a' }), player({ id: 'b' })], null, NONE, 0);
    expect(service.rendered()).toHaveLength(2);

    service.ingest([player({ id: 'a' })], null, NONE, 1);
    expect(service.rendered()).toHaveLength(1);
  });
});
