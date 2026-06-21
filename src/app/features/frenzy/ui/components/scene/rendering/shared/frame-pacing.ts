// Frame-pacing cap for the scene rAF loop (slice 13): trade peak FPS for STEADY pacing on a weak device. Pure — the
// loop owns the clock and feeds elapsed time in, so the decision stays unit-testable. On a device that comfortably
// exceeds the cap it never binds (renders every tick → view unchanged, the desktop/Pixel path); on a tablet lurching
// 17↔30 the developer caps just under the floor to hold a flat rate, since an even 20 reads calmer than a jittery swing.

export interface FramePacingStep {
  // Whether this rAF tick runs the expensive render work, or skips it because the cap is holding the frame back.
  render: boolean;
  // Leftover accumulated time to carry into the next tick (the loop stores it and adds the next frame's dt).
  carryMs: number;
}

// Target frame interval (ms) for a frames-per-second cap. A non-positive cap disables it (interval 0) — the default,
// desktop-safe path where every tick renders.
export function frameIntervalMs(capFps: number): number {
  return capFps > 0 ? 1000 / capFps : 0;
}

// Decide whether the banked time is enough to render at the target interval, and what to carry forward. Returning the
// carry (rather than a bare boolean) keeps the anti-burst clamp here, where it's unit-tested, not in the loop.
export function paceFrame(accumulatedMs: number, targetIntervalMs: number): FramePacingStep {
  // Cap disabled → render every tick (no behaviour change; the normal-play and capable-device path).
  if (targetIntervalMs <= 0) {
    return { render: true, carryMs: 0 };
  }

  // Not enough time banked yet → hold this frame, keep accumulating.
  if (accumulatedMs < targetIntervalMs) {
    return { render: false, carryMs: accumulatedMs };
  }

  // Render, carrying the overshoot so pacing stays even. But never bank a whole extra interval: after a long stall
  // (tab hidden, GC pause) that would fire a burst of catch-up renders, so a 2+ interval backlog drops to zero.
  const carry = accumulatedMs - targetIntervalMs;

  return { render: true, carryMs: carry < targetIntervalMs ? carry : 0 };
}
