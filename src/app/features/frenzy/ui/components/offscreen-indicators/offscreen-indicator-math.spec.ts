import { describe, expect, it } from 'vitest';

import type { CameraSnapshot } from '../scene/camera/scene-camera.service';
import {
  clusterEdgeArrows,
  edgeHit,
  isOffscreen,
  projectToScreen,
} from './offscreen-indicator-math';
import type { EdgeArrowInput } from './offscreen-indicator-math';

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 900;

function camera(partial: Partial<CameraSnapshot> = {}): CameraSnapshot {
  return {
    camX: 0,
    camY: 0,
    scale: 1,
    viewportWidth: 1000,
    viewportHeight: 600,
    ready: true,
    ...partial,
  };
}

function single(id: string, side: EdgeArrowInput['side'], t: number): EdgeArrowInput {
  return { id, name: id, side, t };
}

describe('projectToScreen', () => {
  it('maps a normalized world point to screen px via scale and camera offset', () => {
    const screen = projectToScreen(
      0.5,
      0.5,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      camera({ camX: -200, camY: -100 }),
    );

    expect(screen.sx).toBeCloseTo(0.5 * WORLD_WIDTH - 200);
    expect(screen.sy).toBeCloseTo(0.5 * WORLD_HEIGHT - 100);
  });

  it('applies the camera scale before the offset', () => {
    const screen = projectToScreen(
      1,
      1,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      camera({ scale: 0.5, camX: 10, camY: 20 }),
    );

    expect(screen.sx).toBeCloseTo(WORLD_WIDTH * 0.5 + 10);
    expect(screen.sy).toBeCloseTo(WORLD_HEIGHT * 0.5 + 20);
  });
});

describe('isOffscreen', () => {
  it('is false inside the viewport rect', () => {
    expect(isOffscreen({ sx: 500, sy: 300 }, 1000, 600)).toBe(false);
  });

  it('flags points past any edge — including the vertical edges independently (no symmetry assumption)', () => {
    expect(isOffscreen({ sx: 1100, sy: 300 }, 1000, 600)).toBe(true);
    expect(isOffscreen({ sx: 500, sy: -5 }, 1000, 600)).toBe(true);
    expect(isOffscreen({ sx: 500, sy: 605 }, 1000, 600)).toBe(true);
  });
});

describe('edgeHit', () => {
  const vw = 1000;
  const vh = 600;
  const margin = 30;

  it('exits the right edge for a player to the right, sliding the badge to the crossing y', () => {
    const hit = edgeHit({ sx: 2000, sy: 300 }, vw, vh, margin);

    expect(hit.side).toBe('right');
    expect(hit.x).toBe(vw - margin);
    expect(hit.y).toBeCloseTo(300);
    expect(hit.t).toBeCloseTo(300);
  });

  it('exits the top edge for a player above', () => {
    const hit = edgeHit({ sx: 500, sy: -500 }, vw, vh, margin);

    expect(hit.side).toBe('top');
    expect(hit.y).toBe(margin);
    expect(hit.x).toBeCloseTo(500);
  });

  it('exits the bottom edge for a player below', () => {
    const hit = edgeHit({ sx: 500, sy: 2000 }, vw, vh, margin);

    expect(hit.side).toBe('bottom');
    expect(hit.y).toBe(vh - margin);
  });

  it('exits the left edge for a player to the left', () => {
    const hit = edgeHit({ sx: -1000, sy: 300 }, vw, vh, margin);

    expect(hit.side).toBe('left');
    expect(hit.x).toBe(margin);
  });

  it('resolves a corner deterministically to the vertical edge (tie → vertical)', () => {
    const hit = edgeHit({ sx: 2000, sy: -500 }, vw, vh, margin);

    expect(hit.side).toBe('right');
    expect(hit.y).toBeGreaterThanOrEqual(margin);
    expect(hit.y).toBeLessThanOrEqual(vh - margin);
  });
});

describe('clusterEdgeArrows', () => {
  it('keeps far-apart points on the same edge as named singles', () => {
    const groups = clusterEdgeArrows([single('a', 'top', 100), single('b', 'top', 300)], 72, 4);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.count === 1 && group.name !== null)).toBe(true);
  });

  it('chain-merges a dense run on one edge into a single count-badge', () => {
    const inputs = [
      single('a', 'top', 0),
      single('b', 'top', 50),
      single('c', 'top', 100),
      single('d', 'top', 150),
    ];
    const groups = clusterEdgeArrows(inputs, 72, 4);

    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(4);
    expect(groups[0].name).toBeNull();
    expect(groups[0].memberIds).toEqual(['a', 'b', 'c', 'd']);
  });

  it('breaks the chain when a gap exceeds the cluster distance', () => {
    const inputs = [
      single('a', 'top', 0),
      single('b', 'top', 50),
      single('c', 'top', 200),
      single('d', 'top', 250),
    ];
    const groups = clusterEdgeArrows(inputs, 72, 4);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.count === 2)).toBe(true);
  });

  it('never merges across different edges', () => {
    const groups = clusterEdgeArrows([single('a', 'top', 100), single('b', 'bottom', 110)], 72, 4);

    expect(groups).toHaveLength(2);
  });

  it('caps named arrows by folding the closest singles on the most-crowded edge first', () => {
    const inputs = [single('a', 'top', 100), single('b', 'top', 200), single('c', 'top', 400)];
    const groups = clusterEdgeArrows(inputs, 72, 1);

    const named = groups.filter((group) => group.name !== null);
    const clustered = groups.filter((group) => group.name === null);

    expect(named).toHaveLength(1);
    expect(clustered).toHaveLength(1);
    // The two closest (100,200) fold; the distant 400 keeps its name.
    expect(clustered[0].memberIds).toEqual(['a', 'b']);
    expect(named[0].memberIds).toEqual(['c']);
  });

  it('stops capping when no edge has two singles left to merge', () => {
    const inputs = [single('a', 'top', 100), single('b', 'bottom', 100), single('c', 'left', 100)];
    const groups = clusterEdgeArrows(inputs, 72, 1);

    // Three lone singles on three edges — nothing adjacent to merge, so they stay as-is despite the cap.
    expect(groups).toHaveLength(3);
    expect(groups.every((group) => group.count === 1)).toBe(true);
  });
});
