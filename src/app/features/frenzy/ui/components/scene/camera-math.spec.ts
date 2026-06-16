import { describe, expect, it } from 'vitest';

import {
  cameraScale,
  centerCameraAxis,
  clampCameraAxis,
  deadZoneCameraAxis,
  visibleNormBounds,
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

describe('visibleNormBounds', () => {
  it('maps the viewport to the normalized world slice it shows (inverse of the camera projection)', () => {
    // camX=0, scale=1, viewport 1000×600 over a 2000×1000 world, no margin: the window shows the top-left
    // quadrant-ish — x up to 1000/2000 = 0.5, y up to 600/1000 = 0.6.
    const bounds = visibleNormBounds(0, 0, 1, 1000, 600, 2000, 1000, 0);

    expect(bounds.xMin).toBeCloseTo(0);
    expect(bounds.xMax).toBeCloseTo(0.5);
    expect(bounds.yMin).toBeCloseTo(0);
    expect(bounds.yMax).toBeCloseTo(0.6);
  });

  it('follows the camera offset: a world scrolled left reveals its right half', () => {
    // camX=-1000 (the world shifted 1000px left), scale=1, viewport 1000 over world 2000 → x ∈ [0.5, 1.0].
    const bounds = visibleNormBounds(-1000, 0, 1, 1000, 600, 2000, 1000, 0);

    expect(bounds.xMin).toBeCloseTo(0.5);
    expect(bounds.xMax).toBeCloseTo(1);
  });

  it('shrinks the visible slice as the camera zooms in (larger scale)', () => {
    // scale=2 → spanX = 4000; the same 1000px viewport now shows only a quarter of the world width.
    const bounds = visibleNormBounds(0, 0, 2, 1000, 600, 2000, 1000, 0);

    expect(bounds.xMax).toBeCloseTo(0.25);
  });

  it('expands the bounds outward by the screen-px margin on every side', () => {
    const noMargin = visibleNormBounds(0, 0, 1, 1000, 600, 2000, 1000, 0);
    const margin = visibleNormBounds(0, 0, 1, 1000, 600, 2000, 1000, 100);

    // 100px / (2000 world × 1 scale) = 0.05 added to each horizontal edge; 100/1000 = 0.1 to each vertical edge.
    expect(margin.xMin).toBeCloseTo(noMargin.xMin - 0.05);
    expect(margin.xMax).toBeCloseTo(noMargin.xMax + 0.05);
    expect(margin.yMin).toBeCloseTo(noMargin.yMin - 0.1);
    expect(margin.yMax).toBeCloseTo(noMargin.yMax + 0.1);
  });
});
