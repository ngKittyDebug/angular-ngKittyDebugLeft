import { Injectable } from '@angular/core';
import { TIMER_CONFIG } from '../constants/timer.constants';
import {
  applyDecayToStatus,
  calculateDecay,
  detectStatusAlerts,
  getElapsedDecayMs,
} from '../helpers/status-decay.helper';
import type { StatusAlertType } from '../models/notification.model';
import type { PokemonStatusModel, StatusDecayModel } from '../models/pokemon-status.model';

export interface DecayTimerHandle {
  intervalId: ReturnType<typeof setInterval>;
}

export interface StatusDecayContext {
  isSleeping: boolean;
  lastActionTime: number | null;
  lastDecayTime: number | null;
  now?: number;
  status: PokemonStatusModel;
}

export interface StatusDecayTickResult {
  alerts: StatusAlertType[];
  decay: StatusDecayModel;
  nextStatus: PokemonStatusModel;
}

const DEFAULT_DECAY_INTERVAL_MS = TIMER_CONFIG.DECAY_INTERVAL_MS;

@Injectable({ providedIn: 'root' })
export class StatusDecayService {
  public calculateDecay(
    elapsedMs: number,
    currentStatus: PokemonStatusModel,
    isSleeping: boolean,
    timestamp?: number,
  ): StatusDecayModel {
    return calculateDecay(elapsedMs, currentStatus, isSleeping, timestamp);
  }

  public calculateDecayFromContext(context: StatusDecayContext): StatusDecayModel {
    const now = context.now ?? Date.now();
    const elapsedMs = getElapsedDecayMs(context.lastDecayTime, context.lastActionTime, now);

    return this.calculateDecay(elapsedMs, context.status, context.isSleeping, now);
  }

  public processDecayTick(context: StatusDecayContext): StatusDecayTickResult {
    const decay = this.calculateDecayFromContext(context);
    const nextStatus = applyDecayToStatus(context.status, decay);

    return {
      alerts: detectStatusAlerts(context.status, nextStatus),
      decay,
      nextStatus,
    };
  }

  public detectCriticalAlerts(
    before: PokemonStatusModel,
    after: PokemonStatusModel,
  ): StatusAlertType[] {
    return detectStatusAlerts(before, after);
  }

  public startDecayTimer(
    contextProvider: () => StatusDecayContext,
    updateCallback: (result: StatusDecayTickResult) => void,
    intervalMs: number = DEFAULT_DECAY_INTERVAL_MS,
  ): DecayTimerHandle {
    const intervalId = setInterval(() => {
      const result = this.processDecayTick(contextProvider());

      if (
        result.decay.energy !== 0 ||
        result.decay.hunger !== 0 ||
        result.decay.hydration !== 0 ||
        result.decay.mood !== 0
      ) {
        updateCallback(result);
      }
    }, intervalMs);

    return { intervalId };
  }

  public stopDecayTimer(timerHandle: DecayTimerHandle): void {
    clearInterval(timerHandle.intervalId);
  }
}
