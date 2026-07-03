import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GestureService } from './gesture.service';

describe('GestureService', () => {
  let service: GestureService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GestureService],
    });

    service = TestBed.inject(GestureService);
  });

  function pointerEvent(
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    pointerId: number,
    x: number,
    y: number,
  ): PointerEvent {
    return new PointerEvent(type, {
      clientX: x,
      clientY: y,
      pointerId,
    });
  }

  describe('Happy Path', () => {
    it('должен определять click-жесты при pointer up', () => {
      service.handlePointerDown(pointerEvent('pointerdown', 1, 10, 10));
      const result = service.handlePointerUp(pointerEvent('pointerup', 1, 12, 11));

      expect(result?.event.type).toBe('click');
      expect(result?.animationTrigger).toBe('sprite-pop');
    });

    it('должен определять drag-жесты при pointer up', () => {
      service.handlePointerDown(pointerEvent('pointerdown', 2, 0, 0));
      service.handlePointerMove(pointerEvent('pointermove', 2, 40, 0));
      const result = service.handlePointerUp(pointerEvent('pointerup', 2, 40, 0));

      expect(result?.event.type).toBe('drag');
      expect(result?.animationTrigger).toBe('sprite-wiggle');
    });

    it('должен определять multi-touch при втором активном указателе', () => {
      service.handlePointerDown(pointerEvent('pointerdown', 3, 0, 0));
      const result = service.handlePointerDown(pointerEvent('pointerdown', 4, 20, 20));

      expect(result?.event.type).toBe('multiTouch');
      expect(result?.animationTrigger).toBe('sprite-sparkle');
    });

    it('должен вычислять уровень связи из истории взаимодействий', () => {
      const level = service.calculateBondLevel([
        {
          intensity: 1,
          moodIncrease: 5,
          timestamp: Date.now(),
          type: 'multiTouch',
        },
      ]);

      expect(level).toBeGreaterThan(0);
    });
  });
});
