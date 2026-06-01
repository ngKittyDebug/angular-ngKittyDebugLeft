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

  it('parses join with a valid line and trimmable name', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'join', name: '  Ash ', line: 'magikarp' })),
    ).toEqual({ type: 'join', name: '  Ash ', line: 'magikarp' });
  });

  it('rejects join with blank name or unknown line', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'join', name: '   ', line: 'magikarp' })),
    ).toBeNull();
    expect(
      parseClientMessage(JSON.stringify({ type: 'join', name: 'Ash', line: 'dragonite' })),
    ).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'join', name: 'Ash' }))).toBeNull();
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

  it('parses leave', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'leave' }))).toEqual({ type: 'leave' });
  });

  it('ignores extra client-supplied fields (e.g. spoofed clientTime)', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'click', itemId: 'i1', clientTime: 999 })),
    ).toEqual({ type: 'click', itemId: 'i1' });
  });
});
