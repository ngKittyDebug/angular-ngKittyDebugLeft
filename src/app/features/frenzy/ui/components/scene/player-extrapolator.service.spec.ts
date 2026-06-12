import { describe, expect, it } from 'vitest';

import type { Player } from '@game/frenzy/types';

import { PlayerExtrapolatorService } from './player-extrapolator.service';

function player(partial: Partial<Player> & Pick<Player, 'id'>): Player {
  return {
    name: 'Ash',
    appearance: 'pidgey',
    stage: 1,
    hp: 100,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
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

  it('emits an aura class for a live effect and drops it once expired', () => {
    const service = new PlayerExtrapolatorService();
    const live = player({
      id: 'p1',
      effects: [{ kind: 'shield', expiresAt: Date.now() + 10_000 }],
    });

    service.ingest([live], null, NONE, 0);
    expect(service.rendered()[0].effectAuras).toContain('scene__shield');

    const expired = player({
      id: 'p1',
      effects: [{ kind: 'shield', expiresAt: Date.now() - 1000 }],
    });

    service.ingest([expired], null, NONE, 1);
    expect(service.rendered()[0].effectAuras).toEqual([]);
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

    expect(service.rendered()[0].x).toBeGreaterThan(0.5);
  });

  it('ignores a steer when there is no local player', () => {
    const service = new PlayerExtrapolatorService();

    expect(() => service.predictSteer(null, 0.9, 0.5, 0)).not.toThrow();
    expect(() => service.predictSteer('ghost', 0.9, 0.5, 0)).not.toThrow();
  });

  it('drops players absent from the latest snapshot', () => {
    const service = new PlayerExtrapolatorService();

    service.ingest([player({ id: 'a' }), player({ id: 'b' })], null, NONE, 0);
    expect(service.rendered()).toHaveLength(2);

    service.ingest([player({ id: 'a' })], null, NONE, 1);
    expect(service.rendered()).toHaveLength(1);
  });
});
