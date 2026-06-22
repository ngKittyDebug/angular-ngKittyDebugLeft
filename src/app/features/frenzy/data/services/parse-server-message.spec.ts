import { describe, expect, it } from 'vitest';

import { parseServerMessage } from './parse-server-message';

describe('parseServerMessage', () => {
  it('passes a known stateless message through', () => {
    expect(parseServerMessage('{"type":"ping"}')).toEqual({ type: 'ping' });
  });

  it('passes a well-formed slim snapshot through', () => {
    const raw = JSON.stringify({
      type: 'slimSnapshot',
      state: { players: [], items: [], tick: 7 },
    });

    expect(parseServerMessage(raw)).toEqual({
      type: 'slimSnapshot',
      state: { players: [], items: [], tick: 7 },
    });
  });

  it('returns null for malformed JSON instead of throwing', () => {
    expect(parseServerMessage('{"type":"ping"')).toBeNull();
  });

  it('returns null for non-object frames', () => {
    expect(parseServerMessage('"ping"')).toBeNull();
    expect(parseServerMessage('42')).toBeNull();
    expect(parseServerMessage('null')).toBeNull();
  });

  it('drops an unknown message type (deploy skew) instead of feeding it to the reducer', () => {
    expect(parseServerMessage('{"type":"brandNewThing","payload":1}')).toBeNull();
  });

  it('drops a snapshot whose state spine is missing or truncated', () => {
    expect(parseServerMessage('{"type":"snapshot"}')).toBeNull();
    expect(parseServerMessage('{"type":"snapshot","state":{"players":[]}}')).toBeNull();
    expect(
      parseServerMessage('{"type":"slimSnapshot","state":{"players":{},"items":[],"tick":1}}'),
    ).toBeNull();
  });
});
