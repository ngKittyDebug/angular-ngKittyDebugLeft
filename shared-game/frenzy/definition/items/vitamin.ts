import type { CoreInteractionSpec, ItemDefinition } from '../../../engine/definition';
import type { EffectKey } from '../effects';

const GRANT = {
  verb: 'grantEffect',
  effectId: 'wellFed',
  durationMs: 60_000,
  hpDelta: 20,
} as const satisfies CoreInteractionSpec<EffectKey>;

/** Vitamin: heals at once and grants `wellFed` — pausing only the natural hp decay for a long window. */
export const VITAMIN_ITEM = {
  enabled: true,
  physics: { fallSpeed: 0.15 },
  spawn: { world: 8, eggEmit: 8 },
  interactions: { onClick: GRANT, onCollide: GRANT },
} as const satisfies ItemDefinition<EffectKey>;
