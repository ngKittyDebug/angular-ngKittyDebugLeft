import { inject, Service } from '@angular/core';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { applyRoutineBonusIfEligible } from '../helpers/routine.helper';
import type { StatusDecayContext } from './status-decay.service';
import { StatusDecayService } from './status-decay.service';
import { applyStatusDelta } from '../helpers/status-bounds.helper';
import type { StatusAlertType } from '../models/notification.model';
import type { PokemonStatusModel, StatusDecayModel } from '../models/pokemon-status.model';
import type { DailyRoutine } from '../models/tamagotchi-state.model';

export interface TamagotchiTimerContext extends StatusDecayContext {
  dailyRoutine: DailyRoutine;
}

export interface TimerTickResult {
  alerts: StatusAlertType[];
  dailyRoutine: DailyRoutine;
  decay: StatusDecayModel;
  nextStatus: PokemonStatusModel;
  routineBonusApplied: number;
}

export interface TimerStartOptions {
  intervalMs?: number;
  pauseWhenHidden?: boolean;
}

export interface TimerHandle {
  cleanup: () => void;
}

@Service({ autoProvided: false })
export class TimerService {
  private readonly statusDecayService = inject(StatusDecayService);

  public processTick(context: TamagotchiTimerContext, now: number = Date.now()): TimerTickResult {
    const decayResult = this.statusDecayService.processDecayTick({ ...context, now });
    const { bonus: routineBonus, dailyRoutine } = applyRoutineBonusIfEligible(
      context.dailyRoutine,
      now,
    );
    const nextStatus =
      routineBonus > 0
        ? {
            ...decayResult.nextStatus,
            mood: applyStatusDelta(decayResult.nextStatus.mood, routineBonus),
          }
        : decayResult.nextStatus;

    return {
      alerts: decayResult.alerts,
      dailyRoutine,
      decay: decayResult.decay,
      nextStatus,
      routineBonusApplied: routineBonus,
    };
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
