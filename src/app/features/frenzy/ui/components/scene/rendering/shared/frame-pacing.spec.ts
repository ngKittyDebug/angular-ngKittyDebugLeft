import { describe, expect, it } from 'vitest';

import { frameIntervalMs, paceFrame } from './frame-pacing';

describe('Frame interval', () => {
  it('maps an fps cap to its frame interval', () => {
    expect(frameIntervalMs(20)).toBeCloseTo(50);
    expect(frameIntervalMs(30)).toBeCloseTo(33.333, 2);
  });

  it('treats a non-positive cap as disabled (interval 0)', () => {
    expect(frameIntervalMs(0)).toBe(0);
    expect(frameIntervalMs(-30)).toBe(0);
  });
});

describe('Frame pacing', () => {
  it('renders every tick when the cap is disabled', () => {
    expect(paceFrame(4, 0)).toEqual({ render: true, carryMs: 0 });
    expect(paceFrame(999, 0)).toEqual({ render: true, carryMs: 0 });
  });

  it('holds the frame and keeps accumulating below the interval', () => {
    expect(paceFrame(20, 50)).toEqual({ render: false, carryMs: 20 });
  });

  it('renders and carries the overshoot once the interval is reached', () => {
    expect(paceFrame(60, 50)).toEqual({ render: true, carryMs: 10 });
  });

  it('clamps the carry after a long stall so it cannot burst catch-up renders', () => {
    // Two-plus intervals banked at once → render one frame and drop the backlog, not bank another whole frame.
    expect(paceFrame(130, 50)).toEqual({ render: true, carryMs: 0 });
  });
});
