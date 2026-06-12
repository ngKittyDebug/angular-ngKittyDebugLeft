import { describe, expect, it } from 'vitest';

import type { ServerMessage } from '@game/frenzy/types';

import { serializeServerMessage } from '../serialize-server-message';
import { TEST_BODY } from './test-body';

function roundTrip(message: ServerMessage): ServerMessage {
  return JSON.parse(serializeServerMessage(message)) as ServerMessage;
}

describe('serializeServerMessage', () => {
  it('rounds non-integer numbers to 4 decimals, including nested players and items', () => {
    const message: ServerMessage = {
      type: 'snapshot',
      state: {
        players: [
          {
            kind: 'human',
            id: 't1',
            name: 'Ash',
            appearance: 'caterpie',
            body: TEST_BODY,
            stage: 1,
            hp: 100,
            mana: 0,
            x: 0.456_789_012_345_67,
            y: 0.123_456_789,
            vx: -0.012_345_678_9,
            vy: 0.000_049, // rounds to 0 at 4 decimals — must stay a valid number, not vanish
            status: 'alive',
            disconnectedAt: null,
            joinedAt: 0,
            effects: [],
            scores: {},
          },
        ],
        items: [{ id: 'i1', type: 'food', x: 0.999_999_99, y: 0.5, vy: 0.151_515_15 }],
        tick: 42,
      },
    };

    const parsed = roundTrip(message);

    if (parsed.type !== 'snapshot') {
      throw new Error('expected a snapshot');
    }

    expect(parsed.state.players[0].x).toBe(0.4568);
    expect(parsed.state.players[0].y).toBe(0.1235);
    expect(parsed.state.players[0].vx).toBe(-0.0123);
    expect(parsed.state.players[0].vy).toBe(0);
    expect(parsed.state.items[0].x).toBe(1);
    expect(parsed.state.items[0].vy).toBe(0.1515);
  });

  it('keeps integers exact, including Date.now()-scale timestamps', () => {
    const joinedAt = 1_718_000_000_000;
    const expiresAt = 1_718_000_015_000;
    const message: ServerMessage = {
      type: 'effectGranted',
      playerId: 't1',
      effect: { kind: 'shield', expiresAt },
      itemId: 'v1',
      x: 0.3,
      y: 0.4,
      via: 'click',
    };

    const parsed = roundTrip(message);

    if (parsed.type !== 'effectGranted') {
      throw new Error('expected effectGranted');
    }

    expect(parsed.effect.expiresAt).toBe(expiresAt);
    expect(joinedAt * 10_000).toBeGreaterThan(Number.MAX_SAFE_INTEGER); // why the integer short-circuit matters
  });

  it('preserves strings, optional fields and negative deltas untouched', () => {
    const message: ServerMessage = {
      type: 'detonated',
      itemId: 'bomb-1',
      x: 0.5,
      y: 1,
      radius: 0.180_000_000_1,
      hits: [{ playerId: 't1', delta: -37 }],
      priority: 10,
    };

    const parsed = roundTrip(message);

    if (parsed.type !== 'detonated') {
      throw new Error('expected detonated');
    }

    expect(parsed.itemId).toBe('bomb-1');
    expect(parsed.radius).toBe(0.18);
    expect(parsed.hits).toEqual([{ playerId: 't1', delta: -37 }]);
    expect(parsed.priority).toBe(10);
  });

  it('shrinks the payload versus plain JSON.stringify on float-heavy state', () => {
    const message: ServerMessage = {
      type: 'steered',
      playerId: 't1',
      x: 0.456_789_012_345_67,
      y: 0.123_456_789_012_34,
      vx: 0.012_345_678_901_23,
      vy: -0.043_210_987_654_32,
    };

    expect(serializeServerMessage(message).length).toBeLessThan(JSON.stringify(message).length);
  });
});
