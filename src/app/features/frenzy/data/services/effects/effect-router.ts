import type { ServerMessage } from '@game/frenzy/types';

import type { EffectContext } from './effect-context';
import type { FrenzyEffect } from './frenzy-effect';

type MessageType = ServerMessage['type'];

/**
 * Routes each server message to the handlers that declared interest in its type, preserving the order of the
 * handler list it was built from. Dispatch is isolated: a throw in one handler is caught and logged so the
 * remaining handlers for that message still run (a broken `.play()`/`.find()` no longer freezes all later FX).
 */
export class EffectRouter {
  private readonly registry = new Map<MessageType, readonly FrenzyEffect[]>();

  // The ordered handler list IS the registration surface: each handler self-declares its `messageTypes`, so
  // adding an effect is one entry here and its position fixes its dispatch order. The per-type buckets below
  // are derived once from this single source.
  public constructor(handlers: readonly FrenzyEffect[]) {
    const buckets = new Map<MessageType, FrenzyEffect[]>();

    for (const handler of handlers) {
      for (const type of handler.messageTypes) {
        const bucket = buckets.get(type) ?? [];

        bucket.push(handler);
        buckets.set(type, bucket);
      }
    }

    this.registry = buckets;
  }

  public dispatch(message: ServerMessage, context: EffectContext): void {
    const handlers = this.registry.get(message.type);

    if (handlers === undefined) {
      return;
    }

    for (const handler of handlers) {
      try {
        handler.handle(message, context);
      } catch (error) {
        // One handler throwing must not suppress the rest — isolate, log, carry on.
        console.error('[frenzy] effect handler failed', error);
      }
    }
  }
}
