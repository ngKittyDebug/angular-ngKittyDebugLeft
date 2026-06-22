import { describe, expect, it } from 'vitest';

import { buriedClipPoints, buriedClipPolygon } from './buried-clip';

describe('buriedClipPoints', () => {
  it('returns the two top corners then one wavy sample per segment boundary', () => {
    const points = buriedClipPoints('item-1');

    // Two corners + (5 segments + 1) wavy samples = 8 points.
    expect(points).toHaveLength(8);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[1]).toEqual({ x: 100, y: 0 });
  });

  it('walks the wavy edge right→left across the full width', () => {
    const wavy = buriedClipPoints('item-1').slice(2);

    expect(wavy[0].x).toBe(100);
    expect(wavy.at(-1)?.x).toBe(0);
  });

  it('keeps every sand-line depth within the cut ± swing band (63%..77%)', () => {
    for (const point of buriedClipPoints('jagged-egg').slice(2)) {
      expect(point.y).toBeGreaterThanOrEqual(63);
      expect(point.y).toBeLessThanOrEqual(77);
    }
  });

  it('is deterministic per id (stable shape, never re-rolls)', () => {
    expect(buriedClipPoints('same-id')).toEqual(buriedClipPoints('same-id'));
  });

  it('gives different ids different sand lines', () => {
    expect(buriedClipPoints('aaa')).not.toEqual(buriedClipPoints('zzz'));
  });
});

describe('buriedClipPolygon', () => {
  it('formats the shared points into a CSS polygon() value', () => {
    const polygon = buriedClipPolygon('item-1');

    expect(polygon.startsWith('polygon(')).toBe(true);
    expect(polygon.endsWith(')')).toBe(true);
    expect(polygon).toContain('0.0% 0.0%');
    expect(polygon).toContain('100.0% 0.0%');
  });
});
