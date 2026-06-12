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

  it('marks an item landed once it reaches the floor', () => {
    const service = new ItemExtrapolatorService();
    const falling = item({ id: 'i1', y: 0.95, vy: 0.2 });

    service.ingest([falling], 0);
    expect(service.rendered()[0].landed).toBe(false);

    service.tick([falling], 1000); // y = min(1, 0.95 + 0.2)
    expect(service.rendered()[0].landed).toBe(true);
  });

  it('treats a server-rested item as landed', () => {
    const service = new ItemExtrapolatorService();

    service.ingest([item({ id: 'i1', y: 1, restMs: 100 })], 0);

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
