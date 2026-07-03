import { inject, Injectable } from '@angular/core';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { routineBonusMood } from '../helpers/routine.helper';
import { calculateSleepRestorationBonus } from '../helpers/sleep-restoration.helper';
import type { StatusDecayContext, StatusDecayTickResult } from './status-decay.service';
import { StatusDecayService } from './status-decay.service';
import { applyStatusDelta } from '../helpers/status-bounds.helper';
import type { StatusAlertType } from '../models/notification.model';
import type { PokemonStatusModel, StatusDecayModel } from '../models/pokemon-status.model';
import type { DailyRoutine } from '../models/tamagotchi-state.model';

export interface TamagotchiTimerContext extends StatusDecayContext {
  dailyRoutine: DailyRoutine;
  sleepStartedAt: number | null;
}

export interface TimerTickResult {
  alerts: StatusAlertType[];
  dailyRoutine: DailyRoutine;
  decay: StatusDecayModel;
  nextStatus: PokemonStatusModel;
  routineBonusApplied: number;
  sleepBonusEnergy: number;
}

export interface TimerStartOptions {
  intervalMs?: number;
  pauseWhenHidden?: boolean;
}

export interface TimerHandle {
  cleanup: () => void;
}

@Injectable({ providedIn: 'root' })
export class TimerService {
  private readonly statusDecayService = inject(StatusDecayService);

  public processTick(context: TamagotchiTimerContext, now: number = Date.now()): TimerTickResult {
    const decayResult = this.statusDecayService.processDecayTick({ ...context, now });
    const routineBonus = routineBonusMood(context.dailyRoutine);
    const nextStatus =
      routineBonus > 0
        ? {
            ...decayResult.nextStatus,
            mood: applyStatusDelta(decayResult.nextStatus.mood, routineBonus),
          }
        : decayResult.nextStatus;

    return {
      alerts: decayResult.alerts,
      dailyRoutine: context.dailyRoutine,
      decay: decayResult.decay,
      nextStatus,
      routineBonusApplied: routineBonus,
      sleepBonusEnergy: this.calculateSleepRestorationBonus(context.sleepStartedAt, now),
    };
  }

  public calculateSleepRestorationBonus(
    sleepStartedAt: number | null,
    now: number = Date.now(),
  ): number {
    return calculateSleepRestorationBonus(sleepStartedAt, now);
  }

  public startTimer(
    contextProvider: () => TamagotchiTimerContext,
    updateCallback: (result: TimerTickResult) => void,
    options: TimerStartOptions = {},
  ): TimerHandle {
    const intervalMs = options.intervalMs ?? TIMER_CONFIG.DECAY_INTERVAL_MS;
    const pauseWhenHidden = options.pauseWhenHidden ?? true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const runTick = (): void => {
      const result = this.processTick(contextProvider());

      if (this.shouldEmitTick(result)) {
        updateCallback(result);
      }
    };

    const startInterval = (): void => {
      if (intervalId !== null) {
        return;
      }

      intervalId = setInterval(runTick, intervalMs);
    };

    const stopInterval = (): void => {
      if (intervalId === null) {
        return;
      }

      clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = (): void => {
      if (typeof document === 'undefined') {
        return;
      }

      if (document.visibilityState === 'hidden') {
        stopInterval();

        return;
      }

      runTick();
      startInterval();
    };

    startInterval();

    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return {
      cleanup: () => {
        stopInterval();

        if (pauseWhenHidden && typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
      },
    };
  }

  public stopTimer(timerHandle: TimerHandle): void {
    timerHandle.cleanup();
  }

  public createDecayContextFromTimer(context: TamagotchiTimerContext): StatusDecayContext {
    return {
      isSleeping: context.isSleeping,
      lastActionTime: context.lastActionTime,
      lastDecayTime: context.lastDecayTime,
      status: context.status,
    };
  }

  public processDecayOnly(context: TamagotchiTimerContext): StatusDecayTickResult {
    return this.statusDecayService.processDecayTick(this.createDecayContextFromTimer(context));
  }

  private shouldEmitTick(result: TimerTickResult): boolean {
    return (
      result.decay.energy !== 0 ||
      result.decay.hunger !== 0 ||
      result.decay.hydration !== 0 ||
      result.decay.mood !== 0 ||
      result.routineBonusApplied > 0
    );
  }
}
