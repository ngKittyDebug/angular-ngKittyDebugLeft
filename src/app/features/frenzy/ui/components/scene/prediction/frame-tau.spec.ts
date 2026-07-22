import { describe, expect, it } from 'vitest';

import { frameAwareTau, OFFSET_DECAY_TAU_MS } from './drift-math';
import { FRAME_DT_CAP_MS, FrameTauTracker } from './frame-tau';

// Feed the tracker a steady cadence of `count` frames spaced `frameMs` apart, starting at a non-zero timestamp
// (a `now` of 0 is the tracker's "no previous tick" sentinel, like the first rAF timestamp never being 0).
function warm(tracker: FrameTauTracker, frameMs: number, count: number): number {
  let now = 1000;

  for (let frame = 0; frame < count; frame += 1) {
    now += frameMs;
    tracker.measure(now);
  }

  return now;
}

describe('FrameTauTracker', () => {
  it('starts at the base τ before any frame is measured', () => {
    const tracker = new FrameTauTracker();

    expect(tracker.tauMs).toBe(OFFSET_DECAY_TAU_MS);
  });

  it('keeps the base τ on a fast client (60fps frames)', () => {
    const tracker = new FrameTauTracker();

    warm(tracker, 1000 / 60, 12);

    expect(tracker.tauMs).toBe(OFFSET_DECAY_TAU_MS);
  });

  it('raises τ per frameAwareTau once slow (60ms) frames are measured', () => {
    const tracker = new FrameTauTracker();
    const slowFrameMs = 60; // ~17fps

    warm(tracker, slowFrameMs, 12);

    // A steady cadence converges the EMA to the exact interval, so τ lands on the frameAwareTau floor for it.
    expect(tracker.tauMs).toBeGreaterThan(OFFSET_DECAY_TAU_MS);
    expect(tracker.tauMs).toBeCloseTo(frameAwareTau(OFFSET_DECAY_TAU_MS, slowFrameMs), 6);
  });

  it('ignores a stall longer than the frame-delta cap so a backgrounded tab cannot bloat τ', () => {
    const tracker = new FrameTauTracker();
    const lastNow = warm(tracker, 60, 12);
    const tauBefore = tracker.tauMs;

    tracker.measure(lastNow + FRAME_DT_CAP_MS + 1);

    expect(tracker.tauMs).toBe(tauBefore);
  });
});
