import { describe, expect, it, vi } from 'vitest';

import { SceneActorRegistryService } from './scene-actor-registry.service';
import type { RenderedItem, RenderedPlayer } from '../scene-view-models';

// A stand-in element that counts how often its `translate` is actually written and its facing custom property set,
// so the tests assert the registry's per-frame write GUARD (write only on change) — the FPS lever, not a value.
function probeElement(): {
  element: HTMLElement;
  translateWrites: () => number;
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

  it('writes a player facing only when the direction flips', () => {
    const registry = new SceneActorRegistryService();
    const probe = probeElement();

    registry.registerPlayer('p', probe.element);
    registry.writePlayers([player('p', 0.5, 0.5, false)]);
    registry.writePlayers([player('p', 0.5, 0.5, false)]);
    registry.writePlayers([player('p', 0.5, 0.5, true)]);

    expect(probe.setProperty).toHaveBeenCalledTimes(2);
  });
});
