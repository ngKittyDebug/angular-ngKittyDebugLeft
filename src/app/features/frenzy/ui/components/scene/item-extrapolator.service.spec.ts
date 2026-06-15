import { describe, expect, it } from 'vitest';

import type { Item } from '@game/frenzy/types';

import { ItemExtrapolatorService } from './item-extrapolator.service';

function item(partial: Partial<Item> & Pick<Item, 'id'>): Item {
  return { type: 'food', x: 0.5, y: 0, vy: 0.2, ...partial };
}

describe('ItemExtrapolatorService', () => {
  it('extrapolates the vertical fall along the baseline clock', () => {
    const service = new ItemExtrapolatorService();
    const falling = item({ id: 'i1', y: 0, vy: 0.2 });

    service.ingest([falling], 1000);
    expect(service.rendered()[0].y).toBeCloseTo(0);

    service.tick([falling], 2000); // +1s at 0.2 units/s
    expect(service.rendered()[0].y).toBeCloseTo(0.2);
  });

  it('clamps an item off the wall so the sprite stays on-scene', () => {
    const service = new ItemExtrapolatorService();

    service.ingest([item({ id: 'i1', x: 0, vx: -1, vy: 0.2 })], 0);

    expect(service.rendered()[0].x).toBeGreaterThan(0);
  });

  it('marks an item landed once it reaches its seabed line', () => {
    const service = new ItemExtrapolatorService();
    const falling = item({ id: 'i1', y: 0.5, vy: 0.2 });

    service.ingest([falling], 0);
    expect(service.rendered()[0].landed).toBe(false);

    // +3s at 0.2 u/s overshoots the rest line (~0.92 for this id), so it clamps there and reads as landed.
    service.tick([falling], 3000);
    expect(service.rendered()[0].landed).toBe(true);
  });

  it('treats a server-rested item as landed', () => {
    const service = new ItemExtrapolatorService();

    service.ingest([item({ id: 'i1', y: 1, restMs: 100 })], 0);

    expect(service.rendered()[0].landed).toBe(true);
  });

  it('drifts a bomb horizontally with a reflective bounce (not an edge-stop)', () => {
    const service = new ItemExtrapolatorService();

    // Heading right; well before the wall it just advances, but given enough time it bounces back off the edge.
    service.ingest([item({ id: 'b1', type: 'bomb', x: 0.5, vx: 0.1, vy: 0.02 })], 0);

    service.tick([item({ id: 'b1', type: 'bomb', x: 0.5, vx: 0.1, vy: 0.02 })], 1000);
    expect(service.rendered()[0].x).toBeCloseTo(0.6, 5); // +1s at 0.1 u/s, still mid-scene

    // +100s would run far past the right wall on a straight line; reflect keeps it inside [halfW, 1-halfW].
    service.tick([item({ id: 'b1', type: 'bomb', x: 0.5, vx: 0.1, vy: 0.02 })], 100_000);
    expect(service.rendered()[0].x).toBeLessThan(1);
    expect(service.rendered()[0].x).toBeGreaterThan(0);
  });

  it('glides a bomb to a divergent snapshot instead of snapping (reconciliation offset)', () => {
    const service = new ItemExtrapolatorService();

    // Spawn drifting gently down; after 1s the client has it at ~0.34 (0.3 + 0.04·1).
    service.ingest([item({ id: 'b1', type: 'bomb', x: 0.5, y: 0.3, vx: 0, vy: 0.04 })], 0);

    // A snapshot that diverges hard — server says y=0.5 with a steeper vy (e.g. a shove the client never
    // predicted). The render must NOT jump to 0.5: it carries the on-screen gap and stays near where it already
    // was (~0.34), then eases onto the new track.
    service.ingest([item({ id: 'b1', type: 'bomb', x: 0.5, y: 0.5, vx: 0, vy: 0.08 })], 1000);
    expect(service.rendered()[0].y).toBeCloseTo(0.34, 2);

    // Given enough time the offset decays to ~0 and the render converges onto the authoritative track
    // (0.5 + 0.08·1 = 0.58 at +1s).
    service.tick([item({ id: 'b1', type: 'bomb', x: 0.5, y: 0.5, vx: 0, vy: 0.08 })], 2000);
    expect(service.rendered()[0].y).toBeCloseTo(0.58, 2);
  });

  it('flips a bomb to landed once its drift sinks it to the seabed line', () => {
    const service = new ItemExtrapolatorService();
    const bomb = item({ id: 'b1', type: 'bomb', x: 0.5, y: 0.5, vx: 0, vy: 0.2 });

    service.ingest([bomb], 0);
    expect(service.rendered()[0].landed).toBe(false);

    // Given enough drift the bomb reaches its rest line and reads as landed — this is the rising edge the
    // sand-puff effect keys off when a mine detonates on the floor.
    service.tick([bomb], 3000);
    expect(service.rendered()[0].landed).toBe(true);
  });

  it('drops items absent from the latest snapshot', () => {
    const service = new ItemExtrapolatorService();

    service.ingest([item({ id: 'a' }), item({ id: 'b' })], 0);
    expect(service.rendered()).toHaveLength(2);

    service.ingest([item({ id: 'a' })], 100);
    expect(service.rendered()).toHaveLength(1);
    expect(service.rendered()[0].id).toBe('a');
  });
});
