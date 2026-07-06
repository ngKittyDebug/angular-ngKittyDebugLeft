import { describe, expect, it, vi } from 'vitest';

import { SceneActorRegistryService } from './scene-actor-registry.service';
import type { VisibleNormBounds } from '../../camera/camera-math';
import type { RenderedItem, RenderedPlayer } from '../../scene-view-models';

// A stand-in element that counts how often its `translate` is actually written and its facing custom property set,
// so the tests assert the registry's per-frame write GUARD (write only on change) — the FPS lever, not a value.
function probeElement(): {
  element: HTMLElement;
  translateWrites: () => number;
  translateValue: () => string;
  setProperty: ReturnType<typeof vi.fn>;
} {
  let translateWrites = 0;
  let translateValue = '';
  const setProperty = vi.fn();
  const style = {
    set translate(value: string) {
      translateWrites += 1;
      translateValue = value;
    },
    get translate(): string {
      return translateValue;
    },
    setProperty,
  };

  return {
    element: { style } as unknown as HTMLElement,
    translateWrites: () => translateWrites,
    translateValue: () => translateValue,
    setProperty,
  };
}

function item(id: string, x: number, y: number): RenderedItem {
  return { id, x, y } as RenderedItem;
}

function player(id: string, x: number, y: number, facingRight: boolean): RenderedPlayer {
  return { id, x, y, facingRight } as RenderedPlayer;
}

describe('SceneActorRegistryService', () => {
  describe('items', () => {
    it('positions a registered item on the first frame', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerItem('a', probe.element);
      registry.writeItems([item('a', 0.5, 0.5)]);

      expect(probe.translateWrites()).toBe(1);
    });

    it('skips the translate write when an item has not moved', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerItem('a', probe.element);
      registry.writeItems([item('a', 0.5, 0.5)]);
      registry.writeItems([item('a', 0.5, 0.5)]);
      registry.writeItems([item('a', 0.5, 0.5)]);

      expect(probe.translateWrites()).toBe(1);
    });

    it('writes again once an item moves', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerItem('a', probe.element);
      registry.writeItems([item('a', 0.5, 0.5)]);
      registry.writeItems([item('a', 0.6, 0.5)]);

      expect(probe.translateWrites()).toBe(2);
    });

    it('positions an item immediately on registration from the last frame (no origin flash on mid-game entry)', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      // A frame arrives before the host registers (the @for paints a frame behind the data).
      registry.writeItems([item('a', 0.25, 0.75)]);
      registry.registerItem('a', probe.element);

      expect(probe.translateWrites()).toBe(1);
    });

    it('does not write on registration when the item is absent from the last frame', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.writeItems([item('other', 0.25, 0.75)]);
      registry.registerItem('a', probe.element);

      expect(probe.translateWrites()).toBe(0);
    });

    it('stops writing an item once it is unregistered', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerItem('a', probe.element);
      registry.unregisterItem('a');
      registry.writeItems([item('a', 0.6, 0.6)]);

      expect(probe.translateWrites()).toBe(0);
    });
  });

  describe('soft-cull (visible bounds)', () => {
    const bounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 } as const satisfies VisibleNormBounds;

    it('writes an item inside the visible bounds', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerItem('a', probe.element);
      registry.writeItems([item('a', 0.5, 0.5)], bounds);

      expect(probe.translateWrites()).toBe(1);
    });

    it('skips the write for an item outside the visible bounds', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerItem('a', probe.element);
      registry.writeItems([item('a', 2, 2)], bounds);

      expect(probe.translateWrites()).toBe(0);
    });

    it('tallies the on-screen/off-screen split for the perf census', () => {
      const registry = new SceneActorRegistryService();
      const onScreen = probeElement();
      const offScreen = probeElement();

      registry.registerItem('a', onScreen.element);
      registry.registerItem('b', offScreen.element);
      registry.writeItems([item('a', 0.5, 0.5), item('b', 2, 2)], bounds);

      expect(registry.writeTally()).toEqual({ total: 2, written: 1, skipped: 1 });
    });

    it('counts every framed item even when no host is registered for it', () => {
      const registry = new SceneActorRegistryService();

      registry.writeItems([item('a', 0.5, 0.5)]);

      expect(registry.writeTally()).toEqual({ total: 1, written: 0, skipped: 0 });
    });
  });

  describe('players', () => {
    it('positions a registered player on the first frame', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerPlayer('p', probe.element);
      registry.writePlayers([player('p', 0.5, 0.5, false)]);

      expect(probe.translateWrites()).toBe(1);
    });

    it('writes a player facing only when the direction flips', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerPlayer('p', probe.element);
      registry.writePlayers([player('p', 0.5, 0.5, false)]);
      registry.writePlayers([player('p', 0.5, 0.5, false)]);
      registry.writePlayers([player('p', 0.5, 0.5, true)]);

      expect(probe.setProperty).toHaveBeenCalledTimes(2);
    });

    it('sets the facing custom property to left (1) then mirrored right (-1)', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerPlayer('p', probe.element);
      registry.writePlayers([player('p', 0.5, 0.5, false)]);
      registry.writePlayers([player('p', 0.5, 0.5, true)]);

      expect(probe.setProperty).toHaveBeenNthCalledWith(1, '--scene-facing', '1');
      expect(probe.setProperty).toHaveBeenNthCalledWith(2, '--scene-facing', '-1');
    });

    it('positions and faces a player immediately on registration from the last frame', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.writePlayers([player('p', 0.25, 0.75, true)]);
      registry.registerPlayer('p', probe.element);

      expect(probe.translateWrites()).toBe(1);
      expect(probe.setProperty).toHaveBeenCalledTimes(1);
    });

    it('stops writing a player once it is unregistered', () => {
      const registry = new SceneActorRegistryService();
      const probe = probeElement();

      registry.registerPlayer('p', probe.element);
      registry.unregisterPlayer('p');
      registry.writePlayers([player('p', 0.6, 0.6, false)]);

      expect(probe.translateWrites()).toBe(0);
    });
  });

  describe('owned-float column', () => {
    it("drives a player's float column along the same body point as the sprite", () => {
      const registry = new SceneActorRegistryService();
      const sprite = probeElement();
      const floatColumn = probeElement();

      registry.registerPlayer('p', sprite.element);
      registry.registerFloat('p', floatColumn.element);
      registry.writePlayers([player('p', 0.4, 0.6, false)]);

      expect(floatColumn.translateValue()).toBe(sprite.translateValue());
    });

    it('does not write a facing on the float column (position only)', () => {
      const registry = new SceneActorRegistryService();
      const floatColumn = probeElement();

      registry.registerFloat('p', floatColumn.element);
      registry.writePlayers([player('p', 0.4, 0.6, true)]);

      expect(floatColumn.setProperty).not.toHaveBeenCalled();
    });

    it('positions a float column immediately on registration from the last frame', () => {
      const registry = new SceneActorRegistryService();
      const floatColumn = probeElement();

      registry.writePlayers([player('p', 0.4, 0.6, false)]);
      registry.registerFloat('p', floatColumn.element);

      expect(floatColumn.translateWrites()).toBe(1);
    });

    it('stops writing a float column once it is unregistered', () => {
      const registry = new SceneActorRegistryService();
      const floatColumn = probeElement();

      registry.registerFloat('p', floatColumn.element);
      registry.unregisterFloat('p');
      registry.writePlayers([player('p', 0.6, 0.6, false)]);

      expect(floatColumn.translateWrites()).toBe(0);
    });
  });
});
