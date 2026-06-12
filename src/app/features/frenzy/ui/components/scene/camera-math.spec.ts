import { describe, expect, it } from 'vitest';

import { cameraScale, centerCameraAxis, clampCameraAxis, deadZoneCameraAxis } from './camera-math';

describe('cameraScale', () => {
  it('uses the cover floor when comfort would letterbox a tall viewport', () => {
    // comfort = clamp(800/1700, .55, .85) = .55; cover = max(800/1700, 600/1000) = .6 → cover wins.
    expect(cameraScale(800, 600, 1700, 1000)).toBeCloseTo(0.6);
  });

  it('caps the comfort zoom-out at MAX_SCALE when cover is not binding', () => {
    // comfort = clamp(1700/1700, .55, .85) = .85; cover = max(1, 1) = 1 → cover (1) wins here.
    expect(cameraScale(1700, 1000, 1700, 1000)).toBeCloseTo(1);
  });

  it('grows past native size to cover a very large viewport', () => {
    expect(cameraScale(3400, 2000, 1700, 1000)).toBeCloseTo(2);
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
});

describe('deadZoneCameraAxis', () => {
  it('holds the current offset while the focus stays inside the band', () => {
    // screen = 0.3*2000 + (-100) = 500, inside [250, 750] → unchanged.
    expect(deadZoneCameraAxis(-100, 0.3, 1000, 2000)).toBe(-100);
  });

  it('pins the focus to the low edge once it crosses it', () => {
    // screen = 0.2*2000 + (-300) = 100 < 250 → offset = 250 - 400 = -150.
    expect(deadZoneCameraAxis(-300, 0.2, 1000, 2000)).toBe(-150);
  });

  it('pins the focus to the high edge once it crosses it', () => {
    // screen = 0.7*2000 + 0 = 1400 > 750 → offset = 750 - 1400 = -650.
    expect(deadZoneCameraAxis(0, 0.7, 1000, 2000)).toBe(-650);
  });
});
