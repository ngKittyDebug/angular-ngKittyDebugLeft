import { describe, expect, it } from 'vitest';

import type { Item } from '@game/frenzy/types';

import { MAX_OFFSET_COLLAPSE_PER_FRAME } from './drift-math';
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
    // Plain falling motion advances the live `frame`, not the structure signal (which republishes only on a
    // snapshot or a `landed` rising edge) — so the mid-fall position is read from `frame`. See ADR 0001.
    expect(service.frame()[0].y).toBeCloseTo(0.2);
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
    // Mid-drift position lives in the live `frame` (no `landed` edge → the structure signal is not republished).
    expect(service.frame()[0].x).toBeCloseTo(0.6, 5); // +1s at 0.1 u/s, still mid-scene

    // +100s would run far past the right wall on a straight line; reflect keeps it inside [halfW, 1-halfW].
    service.tick([item({ id: 'b1', type: 'bomb', x: 0.5, vx: 0.1, vy: 0.02 })], 100_000);
    expect(service.frame()[0].x).toBeLessThan(1);
    expect(service.frame()[0].x).toBeGreaterThan(0);
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
    // Converged position lives in the live `frame` (still falling → no `landed` edge → no structure republish).
    expect(service.frame()[0].y).toBeCloseTo(0.58, 2);
  });

  it('stretches a bomb reconciliation glide on a slow client so no single frame snaps it', () => {
    const service = new ItemExtrapolatorService();
    const slowFrameMs = 60; // ~17fps
    const drifting = item({ id: 'b1', type: 'bomb', x: 0.5, y: 0.3, vx: 0, vy: 0 });

    // Establish the baseline, then warm the frame-interval estimate with several slow frames.
    service.ingest([drifting], 0);

    for (let frame = 1; frame <= 12; frame += 1) {
      service.tick([drifting], frame * slowFrameMs);
    }

    // The server now reports the bomb far from the client's track (a shove it never predicted): the on-screen gap
    // of ~0.3 is captured as a reconciliation offset.
    const correctionNow = 13 * slowFrameMs;
    const shoved = item({ id: 'b1', type: 'bomb', x: 0.5, y: 0.6, vx: 0, vy: 0 });

    service.ingest([shoved], correctionNow);
    const gap = Math.abs(0.6 - service.frame()[0].y);

    // Advance one slow frame: the bomb must glide, not snap — at most MAX_OFFSET_COLLAPSE_PER_FRAME of the gap
    // closes in this single frame (frame-aware τ, mirroring the player extrapolator). With the plain wall-clock τ
    // ~half the gap would vanish here.
    service.tick([shoved], correctionNow + slowFrameMs);
    const remaining = Math.abs(0.6 - service.frame()[0].y);

    expect(gap).toBeGreaterThan(0.2);
    expect(remaining).toBeGreaterThanOrEqual((1 - MAX_OFFSET_COLLAPSE_PER_FRAME) * gap - 1e-6);
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

  it('re-anchors a plain faller horizontally without disturbing its vertical fall clock', () => {
    const service = new ItemExtrapolatorService();

    // A launched item drifting right while falling; the vertical clock starts here.
    service.ingest([item({ id: 'i1', x: 0.3, y: 0, vx: 0.1, vy: 0.2 })], 0);

    // 1s later the server reports it advanced rightward (x re-anchored to 0.4) — the horizontal clock resets, but
    // the independent vertical clock keeps running from spawn (y ≈ 0.2 at +1s, unaffected by the x re-anchor).
    service.ingest([item({ id: 'i1', x: 0.4, y: 0, vx: 0.1, vy: 0.2 })], 1000);

    expect(service.rendered()[0].x).toBeCloseTo(0.4, 5);
    expect(service.rendered()[0].y).toBeCloseTo(0.2, 5);
  });

  it('freezes the horizontal drift the instant a launched item lands', () => {
    const service = new ItemExtrapolatorService();

    // Launched fast rightward and falling toward its seabed line.
    service.ingest([item({ id: 'i1', x: 0.2, y: 0.5, vx: 0.5, vy: 0.5 })], 0);

    // Well past the landing instant the item has settled; its x must stop where it touched down rather than keep
    // sliding along the floor for the full elapsed time.
    service.tick([item({ id: 'i1', x: 0.2, y: 0.5, vx: 0.5, vy: 0.5 })], 100_000);
    const landedX = service.rendered()[0].x;

    expect(service.rendered()[0].landed).toBe(true);
    // A faller that kept sliding for the full 100s would pin to the right wall (~0.97); freezing at the landing
    // instant leaves it mid-scene instead.
    expect(landedX).toBeLessThan(0.9);
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
