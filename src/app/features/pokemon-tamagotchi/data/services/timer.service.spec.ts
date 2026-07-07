import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialPokemonStatus } from '../store/tamagotchi-initial';
import { createInitialDailyRoutine } from '../store/tamagotchi-initial';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { TimerService } from './timer.service';
import { StatusDecayService } from './status-decay.service';

describe('TimerService', () => {
  let service: TimerService;

  beforeEach(() => {
    vi.restoreAllMocks();
    TestBed.configureTestingModule({
      providers: [TimerService, StatusDecayService],
    });

    service = TestBed.inject(TimerService);
  });

  describe('Happy Path', () => {
    describe('processTick', () => {
      it('должен применять бонус настроения рутины при тике, когда доступен', () => {
        const fixedNow = Date.parse('2026-07-03T12:00:00.000Z');
        const result = service.processTick(
          {
            dailyRoutine: {
              activityCounts: { total: 3 },
              bonusAppliedDate: null,
              bonusEligible: true,
              consecutiveDays: 3,
              lastActivityDate: '2026-07-01',
            },
            isSleeping: false,
            lastActionTime: fixedNow - TIMER_CONFIG.DECAY_INTERVAL_MS - 1000,
            lastDecayTime: null,
            status: { ...createInitialPokemonStatus(), mood: 70 },
          },
          fixedNow,
        );

        expect(result.routineBonusApplied).toBe(TIMER_CONFIG.ROUTINE.BONUS_MOOD);
        expect(result.nextStatus.mood).toBeGreaterThan(70);
        expect(result.dailyRoutine.bonusAppliedDate).toBe('2026-07-03');
      });

      it('должен применять бонус настроения рутины только один раз в день при нескольких тиках', () => {
        const fixedNow = Date.parse('2026-07-03T12:00:00.000Z');
        const context = {
          dailyRoutine: {
            activityCounts: { total: 3 },
            bonusAppliedDate: null,
            bonusEligible: true,
            consecutiveDays: 3,
            lastActivityDate: '2026-07-01',
          },
          isSleeping: false,
          lastActionTime: fixedNow - TIMER_CONFIG.DECAY_INTERVAL_MS - 1000,
          lastDecayTime: null,
          status: { ...createInitialPokemonStatus(), mood: 70 },
        };

        const first = service.processTick(context, fixedNow);
        const second = service.processTick(
          {
            ...context,
            dailyRoutine: first.dailyRoutine,
            status: first.nextStatus,
          },
          fixedNow + TIMER_CONFIG.DECAY_INTERVAL_MS,
        );
        const third = service.processTick(
          {
            ...context,
            dailyRoutine: second.dailyRoutine,
            status: second.nextStatus,
          },
          fixedNow + TIMER_CONFIG.DECAY_INTERVAL_MS * 2,
        );

        const bonuses = [first, second, third].map((result) => result.routineBonusApplied);

        expect(bonuses.filter((bonus) => bonus > 0)).toHaveLength(1);
        expect(bonuses[0]).toBe(TIMER_CONFIG.ROUTINE.BONUS_MOOD);
        expect(third.dailyRoutine.bonusAppliedDate).toBe('2026-07-03');
      });
    });

    describe('startTimer / stopTimer', () => {
      it('должен запускать и останавливать колбэки таймера', () => {
        const callback = vi.fn();
        const intervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation((handler) => {
          (handler as () => void)();

          return 1 as unknown as ReturnType<typeof setInterval>;
        });
        const clearSpy = vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => undefined);
        const addListenerSpy = vi
          .spyOn(document, 'addEventListener')
          .mockImplementation(() => undefined);
        const removeListenerSpy = vi
          .spyOn(document, 'removeEventListener')
          .mockImplementation(() => undefined);

        const handle = service.startTimer(
          () => ({
            dailyRoutine: createInitialDailyRoutine(),
            isSleeping: false,
            lastActionTime: Date.now() - TIMER_CONFIG.DECAY_INTERVAL_MS - 1000,
            lastDecayTime: null,
            status: createInitialPokemonStatus(),
          }),
          callback,
          { intervalMs: 1000, pauseWhenHidden: true },
        );

        service.stopTimer(handle);

        expect(intervalSpy).toHaveBeenCalledTimes(1);
        expect(clearSpy).toHaveBeenNthCalledWith(1, 1);
        expect(addListenerSpy).toHaveBeenNthCalledWith(1, 'visibilitychange', expect.any(Function));
        expect(removeListenerSpy).toHaveBeenNthCalledWith(
          1,
          'visibilitychange',
          expect.any(Function),
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('должен приостанавливать таймер, пока документ скрыт, и догонять при возобновлении', () => {
      const callback = vi.fn();
      let visibilityState: DocumentVisibilityState = 'visible';
      const intervalSpy = vi.spyOn(globalThis, 'setInterval');
      const clearSpy = vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => undefined);

      vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);

      const listeners = new Map<string, EventListener>();

      vi.spyOn(document, 'addEventListener').mockImplementation((type, listener) => {
        listeners.set(type, listener as EventListener);
      });
      vi.spyOn(document, 'removeEventListener').mockImplementation((type) => {
        listeners.delete(type);
      });

      service.startTimer(
        () => ({
          dailyRoutine: createInitialDailyRoutine(),
          isSleeping: false,
          lastActionTime: Date.now() - TIMER_CONFIG.DECAY_INTERVAL_MS - 1000,
          lastDecayTime: null,
          status: createInitialPokemonStatus(),
        }),
        callback,
        { intervalMs: 1000, pauseWhenHidden: true },
      );

      visibilityState = 'hidden';
      listeners.get('visibilitychange')?.(new Event('visibilitychange'));

      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(intervalSpy).toHaveBeenCalledTimes(1);

      visibilityState = 'visible';
      listeners.get('visibilitychange')?.(new Event('visibilitychange'));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(intervalSpy).toHaveBeenCalledTimes(2);
    });
  });
});
