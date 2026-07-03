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

  it('applies routine mood bonus during tick when eligible', () => {
    const result = service.processTick(
      {
        dailyRoutine: {
          activityCounts: { total: 3 },
          bonusEligible: true,
          consecutiveDays: 3,
          lastActivityDate: '2026-07-01',
        },
        isSleeping: false,
        lastActionTime: Date.now() - TIMER_CONFIG.DECAY_INTERVAL_MS - 1000,
        lastDecayTime: null,
        sleepStartedAt: null,
        status: { ...createInitialPokemonStatus(), mood: 70 },
      },
      Date.now(),
    );

    expect(result.routineBonusApplied).toBe(TIMER_CONFIG.ROUTINE.BONUS_MOOD);
    expect(result.nextStatus.mood).toBeGreaterThan(70);
  });

  it('reports sleep restoration bonus for long sleep sessions', () => {
    const startedAt = Date.now() - TIMER_CONFIG.SLEEP.MIN_DURATION_MS - 1000;
    const result = service.processTick({
      dailyRoutine: createInitialDailyRoutine(),
      isSleeping: true,
      lastActionTime: startedAt,
      lastDecayTime: startedAt,
      sleepStartedAt: startedAt,
      status: { ...createInitialPokemonStatus(), energy: 20 },
    });

    expect(result.sleepBonusEnergy).toBe(TIMER_CONFIG.SLEEP.BONUS_ENERGY);
  });

  it('starts and stops timer callbacks', () => {
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
        sleepStartedAt: null,
        status: createInitialPokemonStatus(),
      }),
      callback,
      { intervalMs: 1000, pauseWhenHidden: true },
    );

    service.stopTimer(handle);

    expect(intervalSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalledWith(1);
    expect(addListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('pauses timer while document is hidden and catches up on resume', () => {
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
        sleepStartedAt: null,
        status: createInitialPokemonStatus(),
      }),
      callback,
      { intervalMs: 1000, pauseWhenHidden: true },
    );

    visibilityState = 'hidden';
    listeners.get('visibilitychange')?.(new Event('visibilitychange'));

    expect(clearSpy).toHaveBeenCalled();
    expect(intervalSpy).toHaveBeenCalledTimes(1);

    visibilityState = 'visible';
    listeners.get('visibilitychange')?.(new Event('visibilitychange'));

    expect(callback).toHaveBeenCalled();
    expect(intervalSpy).toHaveBeenCalledTimes(2);
  });
});
