import type { ServerMessage } from '@game/frenzy/types';

/** A message-driven effect: reacts to a single server message, emitting transient visual/audio effects. */
export interface FrenzyEffect {
  handle(message: ServerMessage): void;
}
