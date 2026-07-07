import { inject, Injectable } from '@angular/core';
import { normalizePokemonStatus } from '../helpers/status-bounds.helper';
import { ensurePokemonSpriteVariations } from '../helpers/sprite-variation.helper';
import type { NotificationModel, NotificationText } from '../models/notification.model';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';
import {
  createInitialDailyRoutine,
  createInitialPokemonStatus,
  createInitialTamagotchiState,
} from '../store/tamagotchi-initial';
import { syncEvolutionProgressWithPokemon } from '../store/tamagotchi-state-transitions';
import { TamagotchiStorageService } from './tamagotchi-storage.service';

export const TAMAGOTCHI_STORAGE_KEY = 'pokemon-tamagotchi-state';
export const TAMAGOTCHI_BACKUP_KEY = 'pokemon-tamagotchi-state-backup';
export const TAMAGOTCHI_STATE_VERSION = 7;

const TAMAGOTCHI_TRAINING_STATE_VERSION = 5;
const TAMAGOTCHI_NOTIFICATION_TEXT_STATE_VERSION = 7;
const LEGACY_NOTIFICATION_KEY_PREFIXES = ['alerts.', 'evolution.'] as const;

export interface PersistedTamagotchiPayload {
  version: number;
  state: TamagotchiStateModel;
}

export interface TamagotchiLoadResult {
  recoveredFromBackup: boolean;
  state: TamagotchiStateModel;
}

type LegacyNotificationText = NotificationText | string;

interface LegacyNotificationModel extends Omit<NotificationModel, 'message' | 'title'> {
  message: LegacyNotificationText;
  title: LegacyNotificationText;
}

function isNotificationText(value: LegacyNotificationText): value is NotificationText {
  return typeof value === 'object' && value !== null && 'kind' in value;
}

function migrateNotificationText(value: LegacyNotificationText): NotificationText {
  if (isNotificationText(value)) {
    return value;
  }

  if (LEGACY_NOTIFICATION_KEY_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return { key: value, kind: 'translationKey' };
  }

  return { kind: 'plainText', text: value };
}

function migrateNotificationList(
  notifications: readonly LegacyNotificationModel[],
): NotificationModel[] {
  return notifications.map((notification) => ({
    ...notification,
    message: migrateNotificationText(notification.message),
    title: migrateNotificationText(notification.title),
  }));
}

@Injectable({ providedIn: 'root' })
export class TamagotchiPersistenceService {
  private readonly storage = inject(TamagotchiStorageService);

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

  public save(state: TamagotchiStateModel): void {
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

  private readPayload(key: string): TamagotchiStateModel | null {
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

  private parsePayload(raw: string): TamagotchiStateModel {
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

  private migrateState(state: TamagotchiStateModel, version: number): TamagotchiStateModel {
    const legacy = state as TamagotchiStateModel & {
      achievements?: TamagotchiStateModel['achievementList'];
      notificationList?: LegacyNotificationModel[];
      notifications?: LegacyNotificationModel[];
    };
    const legacyNotifications = legacy.notificationList ?? legacy.notifications ?? [];
    const migrated: TamagotchiStateModel = {
      ...createInitialTamagotchiState(),
      ...state,
      achievementList: state.achievementList ?? legacy.achievements ?? [],
      dailyRoutine: {
        ...createInitialDailyRoutine(),
        ...(state.dailyRoutine ?? {}),
      },
      evolutionProgress:
        state.evolutionProgress ?? createInitialTamagotchiState().evolutionProgress,
      interactionHistory: state.interactionHistory ?? [],
      notificationList:
        version >= TAMAGOTCHI_NOTIFICATION_TEXT_STATE_VERSION
          ? (state.notificationList ?? [])
          : migrateNotificationList(legacyNotifications),
      pokemon: state.pokemon ? ensurePokemonSpriteVariations(state.pokemon) : null,
      status: {
        ...createInitialPokemonStatus(),
        ...state.status,
      },
      trainingExperienceReward:
        version >= TAMAGOTCHI_TRAINING_STATE_VERSION
          ? (state.trainingExperienceReward ?? null)
          : null,
      trainingStartedAt:
        version >= TAMAGOTCHI_TRAINING_STATE_VERSION ? (state.trainingStartedAt ?? null) : null,
    };

    if (!migrated.pokemon) {
      return migrated;
    }

    return syncEvolutionProgressWithPokemon(migrated);
  }

  private validateState(state: TamagotchiStateModel): TamagotchiStateModel {
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
      achievementList: state.achievementList ?? [],
      interactionHistory: state.interactionHistory ?? [],
      notificationList: state.notificationList ?? [],
      pokemon: state.pokemon ? ensurePokemonSpriteVariations(state.pokemon) : null,
      status: normalizePokemonStatus(state.status),
    };
  }

  private readRaw(key: string): string | null {
    return this.storage.getItem(key);
  }

  private writeRaw(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  private remove(key: string): void {
    this.storage.removeItem(key);
  }
}
