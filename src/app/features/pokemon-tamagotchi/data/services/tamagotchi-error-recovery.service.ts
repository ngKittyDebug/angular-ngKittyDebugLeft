import { Injectable } from '@angular/core';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import { createInitialTamagotchiState } from '../store/tamagotchi.state';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';

export interface TamagotchiRecoveryResult {
  message: string;
  recovered: boolean;
  state: TamagotchiState;
}

@Injectable({ providedIn: 'root' })
export class TamagotchiErrorRecoveryService {
  public attemptStateRecovery(state: TamagotchiState): TamagotchiRecoveryResult {
    const repaired = this.repairState(state);

    if (repaired !== null) {
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
    const message = error instanceof Error ? error.message : String(error);

    console.error(`[Tamagotchi] ${context}: ${message}`);
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
        energy: this.clampStatus(state.status.energy),
        experience: Math.max(0, state.status.experience),
        health: this.clampStatus(state.status.health),
        hunger: this.clampStatus(state.status.hunger),
        hydration: this.clampStatus(state.status.hydration),
        level: Math.max(1, state.status.level),
        mood: this.clampStatus(state.status.mood),
      },
    };
  }

  private clampStatus(value: number): number {
    return Math.min(100, Math.max(0, value));
  }
}
