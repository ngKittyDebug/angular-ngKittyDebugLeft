import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServerMessage } from '@game/frenzy/types';

import type { EffectContext } from './effect-context';
import { EffectRouter } from './effect-router';
import type { FrenzyEffect } from './frenzy-effect';

// A test double that records the messages it received and can be told to throw on handle.
class RecordingEffect implements FrenzyEffect {
  public readonly received: ServerMessage[] = [];

  public constructor(
    public readonly messageTypes: readonly ServerMessage['type'][],
    private readonly throwOnHandle = false,
  ) {}

  public handle(message: ServerMessage): void {
    this.received.push(message);

    if (this.throwOnHandle) {
      throw new Error('boom');
    }
  }
}

const eaten: ServerMessage = {
  type: 'eaten',
  itemId: 'i1',
  itemType: 'food',
  playerId: 'me',
  newHp: 110,
  delta: 10,
  x: 0.5,
  y: 0.5,
  via: 'click',
};

const detonated: ServerMessage = {
  type: 'detonated',
  itemId: 'b1',
  x: 0.5,
  y: 0.5,
  radius: 0.2,
  hits: [],
};

const context: EffectContext = { myId: 'me', players: [], playerById: () => undefined };

describe('EffectRouter', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes a message only to the handlers that declared its type', () => {
    const eater = new RecordingEffect(['eaten']);
    const detonator = new RecordingEffect(['detonated']);
    const router = new EffectRouter([eater, detonator]);

    router.dispatch(eaten, context);

    expect(eater.received).toEqual([eaten]);
    expect(detonator.received).toEqual([]);
  });

  it('routes one message to every handler that declared its type, in registration order', () => {
    const order: string[] = [];
    const first: FrenzyEffect = {
      messageTypes: ['eaten'],
      handle: () => order.push('first'),
    };
    const second: FrenzyEffect = {
      messageTypes: ['eaten'],
      handle: () => order.push('second'),
    };
    const router = new EffectRouter([first, second]);

    router.dispatch(eaten, context);

    expect(order).toEqual(['first', 'second']);
  });

  it('passes the context through to the handler', () => {
    const handle = vi.fn();
    const router = new EffectRouter([{ messageTypes: ['eaten'], handle }]);

    router.dispatch(eaten, context);

    expect(handle).toHaveBeenNthCalledWith(1, eaten, context);
  });

  it('ignores a message type no handler declared', () => {
    const eater = new RecordingEffect(['eaten']);
    const router = new EffectRouter([eater]);

    expect(() => router.dispatch(detonated, context)).not.toThrow();
    expect(eater.received).toEqual([]);
  });

  it('isolates a throwing handler so the remaining handlers still run', () => {
    const before = new RecordingEffect(['eaten']);
    const boom = new RecordingEffect(['eaten'], true);
    const after = new RecordingEffect(['eaten']);
    const router = new EffectRouter([before, boom, after]);

    expect(() => router.dispatch(eaten, context)).not.toThrow();

    // The handler before the throw ran, the throw was swallowed, and the handler after it still ran.
    expect(before.received).toEqual([eaten]);
    expect(boom.received).toEqual([eaten]);
    expect(after.received).toEqual([eaten]);
    expect(console.error).toHaveBeenCalledOnce();
  });
});
