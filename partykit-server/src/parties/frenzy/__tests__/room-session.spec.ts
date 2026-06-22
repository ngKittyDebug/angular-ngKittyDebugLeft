import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FRENZY } from '@game/frenzy/config';

import { RoomSession } from '../room-session';

const MAX = FRENZY.clickRateLimitMax;
const WINDOW = FRENZY.clickRateLimitWindowMs;
const GRACE = FRENZY.graceMs;

describe('RoomSession — click-rate budget', () => {
  it('allows clicks up to the per-window maximum, then blocks the overflow', () => {
    const session = new RoomSession('token-1');

    for (let i = 0; i < MAX; i += 1) {
      expect(session.recordClick(1000 + i)).toBe(true);
    }

    // The (MAX + 1)-th click inside the same window is over budget.
    expect(session.recordClick(1000 + MAX)).toBe(false);
  });

  it('allows again once older clicks slide out of the window', () => {
    const session = new RoomSession('token-1');

    for (let i = 0; i < MAX; i += 1) {
      session.recordClick(1000 + i);
    }

    expect(session.recordClick(1000 + MAX)).toBe(false);

    // After the whole burst ages out of the sliding window, the budget is fresh again.
    expect(session.recordClick(1000 + WINDOW + 1)).toBe(true);
  });

  it('shares one budget across multiple bound connections (extra tabs cannot multiply it)', () => {
    const session = new RoomSession('token-1');

    session.bindConnection('tab-a');
    session.bindConnection('tab-b');

    // Clicks from either tab draw on the same history — the cap is per session, not per connection.
    for (let i = 0; i < MAX; i += 1) {
      expect(session.recordClick(1000 + i)).toBe(true);
    }

    expect(session.recordClick(1000 + MAX)).toBe(false);
  });

  it('resets the budget when the last connection closes', () => {
    const session = new RoomSession('token-1');

    for (let i = 0; i < MAX; i += 1) {
      session.recordClick(1000 + i);
    }

    expect(session.recordClick(1000 + MAX)).toBe(false);

    // Last tab gone → a reconnecting socket starts from a clean budget within the same window.
    session.clearClicks();

    expect(session.recordClick(1000 + MAX)).toBe(true);
  });
});

describe('RoomSession — grace timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('fires the purge callback after the grace period elapses', () => {
    const session = new RoomSession('token-1');
    const purge = vi.fn();

    session.startGrace(purge, GRACE);

    vi.advanceTimersByTime(GRACE - 1);
    expect(purge).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(purge).toHaveBeenCalledTimes(1);
  });

  it('does not fire after the timer is cleared (reconnect within the window)', () => {
    const session = new RoomSession('token-1');
    const purge = vi.fn();

    session.startGrace(purge, GRACE);
    session.clearGrace();

    vi.advanceTimersByTime(GRACE + 1);
    expect(purge).not.toHaveBeenCalled();
  });

  it('re-arming the grace timer cancels the previous one (no double purge)', () => {
    const session = new RoomSession('token-1');
    const first = vi.fn();
    const second = vi.fn();

    session.startGrace(first, GRACE);
    // A second disconnect before the first window elapses must not stack two pending purges.
    session.startGrace(second, GRACE);

    vi.advanceTimersByTime(GRACE + 1);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('self-clears the handle after firing so a later clearGrace is a harmless no-op', () => {
    const session = new RoomSession('token-1');
    const purge = vi.fn();

    session.startGrace(purge, GRACE);
    vi.advanceTimersByTime(GRACE);

    expect(purge).toHaveBeenCalledTimes(1);

    // Clearing an already-fired timer must not throw or re-fire anything.
    expect(() => session.clearGrace()).not.toThrow();

    vi.advanceTimersByTime(GRACE);
    expect(purge).toHaveBeenCalledTimes(1);
  });
});
