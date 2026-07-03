import { Injectable } from '@angular/core';
import { normalizePokemonStatus } from '../helpers/status-bounds.helper';
import { ensurePokemonSpriteVariations } from '../helpers/sprite-variation.helper';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';

export const TAMAGOTCHI_STORAGE_KEY = 'pokemon-tamagotchi-state';
export const TAMAGOTCHI_BACKUP_KEY = 'pokemon-tamagotchi-state-backup';
export const TAMAGOTCHI_STATE_VERSION = 4;

export interface PersistedTamagotchiPayload {
  version: number;
  state: TamagotchiState;
}

export interface TamagotchiLoadResult {
  recoveredFromBackup: boolean;
  state: TamagotchiState;
}

@Injectable({ providedIn: 'root' })
export class TamagotchiPersistenceService {
  public load(): TamagotchiLoadResult | null {
    const primary = this.readPayload(TAMAGOTCHI_STORAGE_KEY);

    if (primary) {
      return { recoveredFromBackup: false, state: primary };
    }

    const backup = this.readPayload(TAMAGOTCHI_BACKUP_KEY);

    if (backup) {
      return { recoveredFromBackup: true, state: backup };
    }

    return null;
  }

  public save(state: TamagotchiState): void {
    const existing = this.readRaw(TAMAGOTCHI_STORAGE_KEY);

    if (existing) {
      this.writeRaw(TAMAGOTCHI_BACKUP_KEY, existing);
    }

    const savedAt = Date.now();
    const payload: PersistedTamagotchiPayload = {
      state: {
        ...state,
        isEvolving: false,
        lastSaveTime: savedAt,
        status: {
          ...state.status,
          lastSaveTime: savedAt,
        },
      },
      version: TAMAGOTCHI_STATE_VERSION,
    };

    this.writeRaw(TAMAGOTCHI_STORAGE_KEY, JSON.stringify(payload));
  }

  public clear(): void {
    this.remove(TAMAGOTCHI_STORAGE_KEY);
    this.remove(TAMAGOTCHI_BACKUP_KEY);
  }

  private readPayload(key: string): TamagotchiState | null {
    const raw = this.readRaw(key);

    if (!raw) {
      return null;
    }

    try {
      return this.parsePayload(raw);
    } catch {
      return null;
    }
  }

  private parsePayload(raw: string): TamagotchiState {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid tamagotchi payload');
    }

    const payload = parsed as Partial<PersistedTamagotchiPayload>;

    if (!payload.state) {
      throw new Error('Missing tamagotchi state');
    }

    const version = payload.version ?? 0;
    const migrated = this.migrateState(payload.state, version);

    return this.validateState(migrated);
  }

  private migrateState(state: TamagotchiState, version: number): TamagotchiState {
    const legacy = state as TamagotchiState & { activeMiniGame?: unknown };
    const migrated: TamagotchiState = {
      ...createInitialTamagotchiState(),
      ...state,
      achievements: state.achievements ?? [],
      dailyRoutine: state.dailyRoutine ?? createInitialTamagotchiState().dailyRoutine,
      evolutionProgress:
        state.evolutionProgress ?? createInitialTamagotchiState().evolutionProgress,
      interactionHistory: state.interactionHistory ?? [],
      notifications: state.notifications ?? [],
      pokemon: state.pokemon ? ensurePokemonSpriteVariations(state.pokemon) : null,
      trainingExperienceReward:
        version >= TAMAGOTCHI_STATE_VERSION ? (state.trainingExperienceReward ?? null) : null,
      trainingStartedAt:
        version >= TAMAGOTCHI_STATE_VERSION ? (state.trainingStartedAt ?? null) : null,
    };

    void legacy.activeMiniGame;

    return migrated;
  }

  private validateState(state: TamagotchiState): TamagotchiState {
    if (!state.status || typeof state.status !== 'object') {
      throw new Error('Invalid tamagotchi status');
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
        throw new Error(`Invalid status field: ${field}`);
      }
    }

    return {
      ...state,
      achievements: state.achievements ?? [],
      interactionHistory: state.interactionHistory ?? [],
      notifications: state.notifications ?? [],
      pokemon: state.pokemon ? ensurePokemonSpriteVariations(state.pokemon) : null,
      status: normalizePokemonStatus(state.status),
    };
  }

  private readRaw(key: string): string | null {
    if (typeof globalThis.localStorage === 'undefined') {
      return null;
    }

    return globalThis.localStorage.getItem(key);
  }

  private writeRaw(key: string, value: string): void {
    if (typeof globalThis.localStorage === 'undefined') {
      return;
    }

    globalThis.localStorage.setItem(key, value);
  }

  private remove(key: string): void {
    if (typeof globalThis.localStorage === 'undefined') {
      return;
    }

    globalThis.localStorage.removeItem(key);
  }
}
