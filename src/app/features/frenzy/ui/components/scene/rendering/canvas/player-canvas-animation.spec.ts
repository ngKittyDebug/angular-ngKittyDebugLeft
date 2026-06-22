import { describe, expect, it } from 'vitest';

import {
  EVOLVE_MS,
  evolvePulseAt,
  facingScaleX,
  npcAngerFilter,
  SAD_FILTER,
} from './player-canvas-animation';

describe('player-canvas-animation', () => {
  describe('facingScaleX', () => {
    it('mirrors a right-facing sprite and leaves a left-facing one (matches --scene-facing)', () => {
      // The DOM writer sets `--scene-facing` to -1 when facingRight (mirrored) and 1 otherwise, fed straight into
      // scaleX(var(--scene-facing)). The canvas flip must reproduce that exactly.
      expect(facingScaleX(true)).toBe(-1);
      expect(facingScaleX(false)).toBe(1);
    });
  });

  describe('SAD_FILTER', () => {
    it('matches the .scene__sprite--sad desaturation', () => {
      expect(SAD_FILTER).toBe('saturate(0.6) brightness(0.85)');
    });
  });

  describe('npcAngerFilter', () => {
    it('is a no-op tint at rest (mirrors .scene__sprite--npc at anger 0)', () => {
      expect(npcAngerFilter(0)).toBe('saturate(1) drop-shadow(0 0 0px rgba(255, 40, 0, 0))');
    });

    it('reddens fully at max anger', () => {
      expect(npcAngerFilter(1)).toBe('saturate(2.6) drop-shadow(0 0 10px rgba(255, 40, 0, 1))');
    });
  });

  describe('evolvePulseAt', () => {
    it('is null before the pulse and once the 1.5s window closes', () => {
      expect(evolvePulseAt(-1)).toBeNull();
      expect(evolvePulseAt(EVOLVE_MS)).toBeNull();
      expect(evolvePulseAt(EVOLVE_MS + 100)).toBeNull();
    });

    it('peaks near the 35% mark (scale ~1.3, bright glow)', () => {
      const peak = evolvePulseAt(EVOLVE_MS * 0.35);

      expect(peak).not.toBeNull();
      expect(peak?.scale).toBeCloseTo(1.3, 2);
      expect(peak?.filter).toContain('brightness');
      expect(peak?.filter).toContain('drop-shadow');
    });

    it('stays within the keyframe bands across the window', () => {
      for (const t of [0, 0.2, 0.35, 0.6, 0.9, 0.99]) {
        const pulse = evolvePulseAt(EVOLVE_MS * t);

        expect(pulse).not.toBeNull();
        expect(pulse!.scale).toBeGreaterThanOrEqual(1);
        expect(pulse!.scale).toBeLessThanOrEqual(1.3 + 1e-6);
      }
    });

    it('opens and closes the window at scale 1 (no jump in/out)', () => {
      expect(evolvePulseAt(0)?.scale).toBeCloseTo(1, 5);
      expect(evolvePulseAt(EVOLVE_MS * 0.999)?.scale).toBeCloseTo(1, 1);
    });
  });
});
