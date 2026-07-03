import { describe, expect, it } from 'vitest';
import {
  buildGestureResult,
  calculateBondLevel,
  calculateMoodIncrease,
  classifyPointerGesture,
  createInteractionEvent,
} from './gesture.helper';

describe('gesture.helper', () => {
  describe('Happy Path', () => {
    it('должен создавать click-взаимодействие с ограниченным ростом настроения', () => {
      const event = createInteractionEvent('click', 0.5);

      expect(event.type).toBe('click');
      expect(event.intensity).toBe(0.5);
      expect(event.moodIncrease).toBeGreaterThanOrEqual(1);
      expect(event.moodIncrease).toBeLessThanOrEqual(10);
    });

    it('должен собирать результат жеста с триггером анимации', () => {
      const result = buildGestureResult('multiTouch', 1);

      expect(result.animationTrigger).toBe('sprite-sparkle');
      expect(result.event.type).toBe('multiTouch');
      expect(calculateMoodIncrease('multiTouch', 1)).toBeGreaterThan(
        calculateMoodIncrease('click', 0.5),
      );
    });

    it('должен вычислять уровень привязанности по недавним взаимодействиям', () => {
      const now = Date.now();
      const history = [
        createInteractionEvent('click', 0.5, now - 1000),
        createInteractionEvent('multiTouch', 1, now - 2000),
      ];

      expect(calculateBondLevel(history, now)).toBeGreaterThan(0);
      expect(calculateBondLevel([], now)).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('должен классифицировать drag-жесты по дистанции', () => {
      expect(classifyPointerGesture(0, 0, 40, 0, 40, 120)).toBe('drag');
      expect(classifyPointerGesture(0, 0, 2, 0, 2, 400)).toBeNull();
    });

    it('должен классифицировать pet-жесты по длительности и малому смещению', () => {
      expect(classifyPointerGesture(0, 0, 4, 2, 12, 500)).toBe('pet');
    });

    it('должен классифицировать click-жесты для коротких касаний', () => {
      expect(classifyPointerGesture(0, 0, 2, 1, 2, 120)).toBe('click');
    });
  });
});
