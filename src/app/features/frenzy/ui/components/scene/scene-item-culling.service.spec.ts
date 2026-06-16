import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CameraSnapshot } from './scene-camera.service';
import { SceneItemCullingService } from './scene-item-culling.service';
import type { RenderedItem } from './scene-view-models';

// World is 2400×900 (FRENZY.world). With this snapshot (scale 1, camera at 0, viewport 1000×600) and the service's
// 160px margin, the visible normalized window is x ∈ [-0.067, 0.483], y ∈ [-0.178, 0.844]. The fixtures below sit
// clearly inside or outside that band so the exact margin arithmetic isn't load-bearing on the assertions.
function snapshot(overrides: Partial<CameraSnapshot> = {}): CameraSnapshot {
  return {
    camX: 0,
    camY: 0,
    scale: 1,
    viewportWidth: 1000,
    viewportHeight: 600,
    ready: true,
    ...overrides,
  };
}

function item(overrides: Partial<RenderedItem> = {}): RenderedItem {
  return {
    id: 'i1',
    type: 'food',
    x: 0.2,
    y: 0.5,
    landed: false,
    spinDurationMs: 2000,
    spinReverse: false,
    ...overrides,
  };
}

describe('SceneItemCullingService', () => {
  let service: SceneItemCullingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SceneItemCullingService] });
    service = TestBed.inject(SceneItemCullingService);
  });

  it('reports null (render everything) until the camera snapshot is ready', () => {
    expect(service.visibleIds()).toBeNull();

    service.update(snapshot({ ready: false }), [item()]);

    expect(service.visibleIds()).toBeNull();
  });

  it('publishes only the items inside the camera window (+ margin)', () => {
    service.update(snapshot(), [
      item({ id: 'in', x: 0.2, y: 0.5 }),
      item({ id: 'far-right', x: 0.9, y: 0.5 }),
      item({ id: 'below', x: 0.2, y: 0.95 }),
    ]);

    const visible = service.visibleIds();

    expect(visible).not.toBeNull();
    expect([...visible!]).toEqual(['in']);
  });

  it('keeps the same set reference across frames while membership is unchanged (no re-publish → no CD)', () => {
    const items = [item({ id: 'in', x: 0.2, y: 0.5 })];

    service.update(snapshot(), items);
    const first = service.visibleIds();

    service.update(snapshot(), items);

    expect(service.visibleIds()).toBe(first);
  });

  it('re-publishes a new set when an item crosses the boundary into view', () => {
    service.update(snapshot(), [
      item({ id: 'in', x: 0.2, y: 0.5 }),
      item({ id: 'mover', x: 0.9, y: 0.5 }),
    ]);
    const before = service.visibleIds();

    expect([...before!]).toEqual(['in']);

    // The mover drifts into the window: the published set changes (new reference, now both ids).
    service.update(snapshot(), [
      item({ id: 'in', x: 0.2, y: 0.5 }),
      item({ id: 'mover', x: 0.3, y: 0.5 }),
    ]);

    expect(service.visibleIds()).not.toBe(before);
    expect([...service.visibleIds()!].sort()).toEqual(['in', 'mover']);
  });

  it('drops an item from the set when it leaves the window', () => {
    service.update(snapshot(), [item({ id: 'leaver', x: 0.2, y: 0.5 })]);
    expect([...service.visibleIds()!]).toEqual(['leaver']);

    service.update(snapshot(), [item({ id: 'leaver', x: 0.95, y: 0.5 })]);

    expect([...service.visibleIds()!]).toEqual([]);
  });
});
