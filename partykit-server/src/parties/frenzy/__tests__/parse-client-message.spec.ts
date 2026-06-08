import { describe, expect, it } from 'vitest';

import { parseClientMessage } from '../parse-client-message';

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

  it('parses join with an appearance id and trimmable name', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'join', name: '  Ash ', appearance: 'magikarp' })),
    ).toEqual({ type: 'join', name: '  Ash ', appearance: 'magikarp' });
  });

  it('accepts any non-empty bounded appearance string (server is roster-agnostic)', () => {
    // The server no longer knows the roster — an id it doesn't recognise still parses; the client maps it.
    expect(
      parseClientMessage(JSON.stringify({ type: 'join', name: 'Ash', appearance: 'dragonite' })),
    ).toEqual({ type: 'join', name: 'Ash', appearance: 'dragonite' });
  });

  it('rejects join with blank name or missing/oversized appearance', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'join', name: '   ', appearance: 'magikarp' })),
    ).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'join', name: 'Ash' }))).toBeNull();
    expect(
      parseClientMessage(JSON.stringify({ type: 'join', name: 'Ash', appearance: 'x'.repeat(33) })),
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

  it('parses click with a numeric nudgeX (bomb bat input)', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'click', itemId: 'i1', nudgeX: -0.12 })),
    ).toEqual({ type: 'click', itemId: 'i1', nudgeX: -0.12 });
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
