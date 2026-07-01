import { describe, expect, it } from 'vitest';
import {
  buildGestureResult,
  calculateBondLevel,
  calculateMoodIncrease,
  classifyPointerGesture,
  createInteractionEvent,
} from './gesture.helper';

describe('gesture.helper', () => {
  it('creates click interaction with bounded mood increase', () => {
    const event = createInteractionEvent('click', 0.5);

    expect(event.type).toBe('click');
    expect(event.intensity).toBe(0.5);
    expect(event.moodIncrease).toBeGreaterThanOrEqual(1);
    expect(event.moodIncrease).toBeLessThanOrEqual(10);
  });

  it('classifies drag gestures by distance', () => {
    expect(classifyPointerGesture(0, 0, 40, 0, 40, 120)).toBe('drag');
    expect(classifyPointerGesture(0, 0, 2, 0, 2, 400)).toBeNull();
  });

  it('classifies pet gestures by duration and small movement', () => {
    expect(classifyPointerGesture(0, 0, 4, 2, 12, 500)).toBe('pet');
  });

  it('classifies click gestures for short taps', () => {
    expect(classifyPointerGesture(0, 0, 2, 1, 2, 120)).toBe('click');
  });

  it('builds gesture result with animation trigger', () => {
    const result = buildGestureResult('multiTouch', 1);

    expect(result.animationTrigger).toBe('sprite-sparkle');
    expect(result.event.type).toBe('multiTouch');
    expect(calculateMoodIncrease('multiTouch', 1)).toBeGreaterThan(
      calculateMoodIncrease('click', 0.5),
    );
  });

  it('calculates bond level from recent interactions', () => {
    const now = Date.now();
    const history = [
      createInteractionEvent('click', 0.5, now - 1000),
      createInteractionEvent('multiTouch', 1, now - 2000),
    ];

    expect(calculateBondLevel(history, now)).toBeGreaterThan(0);
    expect(calculateBondLevel([], now)).toBe(0);
  });
});
