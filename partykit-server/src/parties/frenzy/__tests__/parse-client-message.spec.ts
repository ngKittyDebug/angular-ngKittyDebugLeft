import { describe, expect, it } from 'vitest';

import { parseClientMessage } from '../parse-client-message';
import { TEST_BODY } from '../../../engine/__tests__/test-body';

describe('parseClientMessage', () => {
  it('returns null for invalid JSON', () => {
    expect(parseClientMessage('{not json')).toBeNull();
  });

  it('returns null for non-object payloads', () => {
    expect(parseClientMessage('42')).toBeNull();
    expect(parseClientMessage('"hi"')).toBeNull();
    expect(parseClientMessage('null')).toBeNull();
  });

  it('returns null for unknown message type', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'nope' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ foo: 1 }))).toBeNull();
  });

  it('parses identify with a non-empty token', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'identify', sessionToken: 'abc' }))).toEqual({
      type: 'identify',
      sessionToken: 'abc',
    });
  });

  it('rejects identify with empty or missing token', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'identify', sessionToken: '' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'identify' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'identify', sessionToken: 5 }))).toBeNull();
  });

  it('parses join with an appearance id, body and trimmable name', () => {
    expect(
      parseClientMessage(
        JSON.stringify({ type: 'join', name: '  Ash ', appearance: 'magikarp', body: TEST_BODY }),
      ),
    ).toEqual({ type: 'join', name: '  Ash ', appearance: 'magikarp', body: TEST_BODY });
  });

  it('checks form only — name/appearance bounds are validate-join policy, not parse', () => {
    // parse guarantees shape/types; emptiness, length caps and body bounds are game policy in validate-join.
    expect(
      parseClientMessage(
        JSON.stringify({ type: 'join', name: '   ', appearance: 'x'.repeat(99), body: TEST_BODY }),
      ),
    ).toEqual({ type: 'join', name: '   ', appearance: 'x'.repeat(99), body: TEST_BODY });
  });

  it('rejects join with a non-string name/appearance or a missing/malformed body', () => {
    expect(
      parseClientMessage(
        JSON.stringify({ type: 'join', name: 5, appearance: 'magikarp', body: TEST_BODY }),
      ),
    ).toBeNull();
    expect(
      parseClientMessage(JSON.stringify({ type: 'join', name: 'Ash', appearance: 'magikarp' })),
    ).toBeNull();
    expect(
      parseClientMessage(
        JSON.stringify({ type: 'join', name: 'Ash', appearance: 'magikarp', body: {} }),
      ),
    ).toBeNull();
    const missingStage = { 1: TEST_BODY[1], 2: TEST_BODY[2] };
    expect(
      parseClientMessage(
        JSON.stringify({ type: 'join', name: 'Ash', appearance: 'magikarp', body: missingStage }),
      ),
    ).toBeNull();
    const nonNumeric = { ...TEST_BODY, 1: { ...TEST_BODY[1], width: 'big' } };
    expect(
      parseClientMessage(
        JSON.stringify({ type: 'join', name: 'Ash', appearance: 'magikarp', body: nonNumeric }),
      ),
    ).toBeNull();
  });

  it('parses click with a non-empty itemId', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'click', itemId: 'i1' }))).toEqual({
      type: 'click',
      itemId: 'i1',
    });
  });

  it('rejects click without itemId', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'click' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'click', itemId: '' }))).toBeNull();
  });

  it('parses click with a numeric nudgeX/nudgeY (bomb 2D shove input)', () => {
    expect(
      parseClientMessage(
        JSON.stringify({ type: 'click', itemId: 'i1', nudgeX: -0.12, nudgeY: 0.34 }),
      ),
    ).toEqual({ type: 'click', itemId: 'i1', nudgeX: -0.12, nudgeY: 0.34 });
  });

  it('drops a non-numeric nudgeX', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'click', itemId: 'i1', nudgeX: 'left' })),
    ).toEqual({ type: 'click', itemId: 'i1' });
  });

  it('parses steer with finite x and y', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'steer', x: 0.3, y: 0.8 }))).toEqual({
      type: 'steer',
      x: 0.3,
      y: 0.8,
    });
  });

  it('rejects steer with missing or non-finite coordinates', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'steer', x: 0.3 }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'steer', x: 'left', y: 0.8 }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'steer', x: 0.3, y: null }))).toBeNull();
  });

  it('parses leave', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'leave' }))).toEqual({ type: 'leave' });
  });

  it('ignores extra client-supplied fields (e.g. spoofed clientTime)', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'click', itemId: 'i1', clientTime: 999 })),
    ).toEqual({ type: 'click', itemId: 'i1' });
  });
});
