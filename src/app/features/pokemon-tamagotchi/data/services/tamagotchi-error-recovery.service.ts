import { inject, Injectable } from '@angular/core';

import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import { clampStatusValue } from '../helpers/status-bounds.helper';
import { syncEvolutionProgressWithPokemon } from '../store/tamagotchi-state-transitions';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';
import { TamagotchiLoggerService } from './tamagotchi-logger.service';

export interface TamagotchiRecoveryResult {
  message: string;
  recovered: boolean;
  state: TamagotchiStateModel;
}

@Injectable({ providedIn: 'root' })
export class TamagotchiErrorRecoveryService {
  private readonly logger = inject(TamagotchiLoggerService);

  public attemptStateRecovery(state: TamagotchiStateModel): TamagotchiRecoveryResult {
    const repaired = this.repairState(state);

    if (repaired !== null) {
      this.logger.info('recovery', 'State repaired from corrupted payload');

      return {
        message: TAMAGOTCHI_SYSTEM_ERRORS.RECOVERED_FROM_BACKUP,
        recovered: true,
        state: repaired,
      };
    }

    return {
      message: TAMAGOTCHI_SYSTEM_ERRORS.LOAD_FAILED,
      recovered: false,
      state: createInitialTamagotchiState(),
    };
  }

  public logError(context: string, error: unknown): void {
    this.logger.logError(context, error);
  }

  public repairState(state: TamagotchiStateModel): TamagotchiStateModel | null {
    if (!state.status || typeof state.status !== 'object') {
      return null;
    }

    const numericFields = [
      'health',
      'hunger',
      'mood',
      'energy',
      'hydration',
      'experience',
      'level',
    ] as const;

    for (const field of numericFields) {
      const value = state.status[field];

      if (typeof value !== 'number' || Number.isNaN(value)) {
        return null;
      }
    }

    const repaired: TamagotchiStateModel = {
      ...createInitialTamagotchiState(),
      ...state,
      achievementList: state.achievementList ?? [],
      dailyRoutine: state.dailyRoutine ?? createInitialTamagotchiState().dailyRoutine,
      error: null,
      evolutionProgress:
        state.evolutionProgress ?? createInitialTamagotchiState().evolutionProgress,
      initialized: true,
      interactionHistory: state.interactionHistory ?? [],
      notificationList: state.notificationList ?? [],
      status: {
        ...state.status,
        energy: clampStatusValue(state.status.energy),
        experience: Math.max(0, Math.round(state.status.experience)),
        health: clampStatusValue(state.status.health),
        hunger: clampStatusValue(state.status.hunger),
        hydration: clampStatusValue(state.status.hydration),
        level: Math.max(1, Math.round(state.status.level)),
        mood: clampStatusValue(state.status.mood),
      },
    };

    return syncEvolutionProgressWithPokemon(repaired);
  }
}
