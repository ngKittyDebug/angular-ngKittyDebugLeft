import type { ServerMessage } from '@game/frenzy/types';

import type { EffectContext } from './effect-context';

/**
 * A message-driven effect: reacts to the server message types it declares in `messageTypes`, emitting
 * transient visual/audio effects. The router routes only those types to it and supplies the read-only
 * `EffectContext` so the handler stays a pure adapter (no `FrenzyStore` access).
 */
export interface FrenzyEffect {
  readonly messageTypes: readonly ServerMessage['type'][];
  handle(message: ServerMessage, context: EffectContext): void;
}
