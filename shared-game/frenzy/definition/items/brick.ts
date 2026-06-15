import type { ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

/**
 * Brick: behaves like a rock — a no-op click that still removes it, collision damage on a bonk — but hits twice
 * as hard and falls faster. Outweighs the rock in the `poopEmit` spray.
 */
export const BRICK_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.22 },
  spawn: { world: 10, poopEmit: 20 },
  interactions: {
    onClick: { verb: 'eat', hpDelta: 0 },
    onCollide: { verb: 'eat', hpDelta: -30 },
  },
} as const satisfies ItemDefinition<EffectKey>;
