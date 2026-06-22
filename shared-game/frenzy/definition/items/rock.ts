import type { ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

/**
 * Rock: heavier, falls a bit faster. Clicking it does nothing (hp delta 0) but removes it; a falling rock that
 * bonks a player deals collision damage. Also part of the nasty `poopEmit` spray.
 */
export const ROCK_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.2 },
  spawn: { world: 20, poopEmit: 10 },
  interactions: {
    onClick: { verb: 'eat', hpDelta: 0 },
    onCollide: { verb: 'eat', hpDelta: -15 },
  },
} as const satisfies ItemDefinition<EffectKey>;
