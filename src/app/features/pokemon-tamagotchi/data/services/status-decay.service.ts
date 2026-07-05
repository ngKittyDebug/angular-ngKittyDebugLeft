import { Injectable } from '@angular/core';
import {
  applyDecayToStatus,
  calculateDecay,
  detectStatusAlerts,
  getElapsedDecayMs,
} from '../helpers/status-decay.helper';
import type { StatusAlertType } from '../models/notification.model';
import type { PokemonStatusModel, StatusDecayModel } from '../models/pokemon-status.model';

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
}
