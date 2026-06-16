import { describe, expect, it } from 'vitest';

import {
  cameraScale,
  centerCameraAxis,
  clampCameraAxis,
  deadZoneCameraAxis,
  wrapParallaxPhase,
} from './camera-math';

describe('cameraScale', () => {
  it('uses the cover floor (height term × vertical-fill) when comfort would letterbox a tall viewport', () => {
    // comfort = clamp(800/1700, .55, .85) = .55; cover = max(800/1700, 600/1000 × 1.25 = .75) = .75 → cover wins.
    expect(cameraScale(800, 600, 1700, 1000)).toBeCloseTo(0.75);
  });

  it('over-zooms past native size via the vertical-fill cover so the camera can scroll down', () => {
    // comfort = clamp(1700/1700, .55, .85) = .85; cover = max(1, 1 × 1.25) = 1.25 → cover (1.25) wins.
    expect(cameraScale(1700, 1000, 1700, 1000)).toBeCloseTo(1.25);
  });

  it('grows past native size to cover a very large viewport', () => {
    // cover = max(3400/1700 = 2, 2000/1000 × 1.25 = 2.5) = 2.5 → the height term (with vertical-fill) wins.
    expect(cameraScale(3400, 2000, 1700, 1000)).toBeCloseTo(2.5);
  });
});

describe('clampCameraAxis', () => {
  it('centres the world when it is smaller than the viewport', () => {
    expect(clampCameraAxis(0, 1000, 500)).toBe(250);
  });

  it('keeps an in-range offset untouched', () => {
    expect(clampCameraAxis(-300, 1000, 2000)).toBe(-300);
  });

  it('clamps a positive offset to 0 (never reveal before the left/top edge)', () => {
    expect(clampCameraAxis(50, 1000, 2000)).toBe(0);
  });

  it('clamps past the far edge to viewport - world', () => {
    expect(clampCameraAxis(-1500, 1000, 2000)).toBe(-1000);
  });
});

describe('centerCameraAxis', () => {
  it('centres the focus point', () => {
    expect(centerCameraAxis(0.5, 1000, 2000)).toBe(-500);
  });

  it('letterbox-centres a world smaller than the viewport', () => {
    // world (500) < viewport (1000) → clamp centres it: (1000 - 500) / 2 = 250.
    expect(centerCameraAxis(0.5, 1000, 500)).toBe(250);
  });
});

describe('deadZoneCameraAxis', () => {
  it('holds the current offset while the focus stays inside the band', () => {
    // screen = 0.3*2000 + (-100) = 500, inside [350, 650] → unchanged.
    expect(deadZoneCameraAxis(-100, 0.3, 1000, 2000, 0.35, 0.65)).toBe(-100);
  });

  it('pins the focus to the low edge once it crosses it', () => {
    // screen = 0.2*2000 + (-300) = 100 < 350 → offset = 350 - 400 = -50.
    expect(deadZoneCameraAxis(-300, 0.2, 1000, 2000, 0.35, 0.65)).toBe(-50);
  });

  it('pins the focus to the high edge once it crosses it', () => {
    // screen = 0.7*2000 + 0 = 1400 > 650 → offset = 650 - 1400 = -750.
    expect(deadZoneCameraAxis(0, 0.7, 1000, 2000, 0.35, 0.65)).toBe(-750);
  });

  it('a tighter (vertical) band starts following sooner than a wider (horizontal) one', () => {
    // Same focus/offset: screen = 0.5*2000 + (-400) = 600. The wide X band [350,650] still holds it (600 inside),
    // while the tighter Y band [420,580] has already been crossed (600 > 580) → it pins to the high edge:
    // offset = 580 - 0.5*2000 = -420 (scrolled 20px further to keep the focus framed).
    expect(deadZoneCameraAxis(-400, 0.5, 1000, 2000, 0.35, 0.65)).toBe(-400);
    expect(deadZoneCameraAxis(-400, 0.5, 1000, 2000, 0.42, 0.58)).toBe(-420);
  });
});

describe('wrapParallaxPhase', () => {
  it('keeps an offset already within one tile period', () => {
    expect(wrapParallaxPhase(-50, 200)).toBe(-50);
  });

  it('wraps a deep negative offset by whole tile periods', () => {
    // -450 = -2×200 - 50 → same pattern phase as -50.
    expect(wrapParallaxPhase(-450, 200)).toBe(-50);
  });

  it('maps an exact period multiple to zero', () => {
    expect(wrapParallaxPhase(-400, 200)).toBeCloseTo(0);
  });

  it('wraps a positive offset into the same (-tile, 0] range', () => {
    // +50 ≡ -150 (mod 200): the same phase expressed inside the inner sheet's one-tile margin.
    expect(wrapParallaxPhase(50, 200)).toBe(-150);
  });

  it('never leaves the one-tile margin the inner sheet provides', () => {
    for (const offset of [-1234.5, -125, -0.01, 0, 0.01, 321.7]) {
      const phase = wrapParallaxPhase(offset, 125);

      expect(phase).toBeGreaterThan(-125);
      expect(phase).toBeLessThanOrEqual(0);
    }
  });
});
