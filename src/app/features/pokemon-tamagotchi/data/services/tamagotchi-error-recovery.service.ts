import { inject, Injectable } from '@angular/core';

import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import { clampStatusValue } from '../helpers/status-bounds.helper';
import { createInitialTamagotchiState } from '../store/tamagotchi.state';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';
import { TamagotchiLoggerService } from './tamagotchi-logger.service';

export interface TamagotchiRecoveryResult {
  message: string;
  recovered: boolean;
  state: TamagotchiState;
}

@Injectable({ providedIn: 'root' })
export class TamagotchiErrorRecoveryService {
  private readonly logger = inject(TamagotchiLoggerService);

  public attemptStateRecovery(state: TamagotchiState): TamagotchiRecoveryResult {
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

  public repairState(state: TamagotchiState): TamagotchiState | null {
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

    return {
      ...createInitialTamagotchiState(),
      ...state,
      achievements: state.achievements ?? [],
      dailyRoutine: state.dailyRoutine ?? createInitialTamagotchiState().dailyRoutine,
      error: null,
      evolutionProgress:
        state.evolutionProgress ?? createInitialTamagotchiState().evolutionProgress,
      initialized: true,
      interactionHistory: state.interactionHistory ?? [],
      notifications: state.notifications ?? [],
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
  }
}
