import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';

import { shouldForceReconnect, STALE_AFTER_MS } from './socket-liveness';

describe('shouldForceReconnect (inbound-liveness policy)', () => {
  it('forces a reconnect when an open socket has been silent past the threshold', () => {
    expect(shouldForceReconnect(true, false, STALE_AFTER_MS + 1)).toBe(true);
  });

  it('holds within the threshold (steady traffic keeps it fresh)', () => {
    expect(shouldForceReconnect(true, false, STALE_AFTER_MS)).toBe(false);
    expect(shouldForceReconnect(true, false, 0)).toBe(false);
  });

  it('does not pile on while a reconnect is already in flight', () => {
    expect(shouldForceReconnect(true, true, STALE_AFTER_MS + 5000)).toBe(false);
  });

  it('only guards a live-believed (open) socket, not one still connecting', () => {
    expect(shouldForceReconnect(false, false, STALE_AFTER_MS + 5000)).toBe(false);
  });

  it('keys the stale threshold off the server heartbeat cadence', () => {
    expect(STALE_AFTER_MS).toBe(FRENZY.heartbeatMs * 3);
  });
});
