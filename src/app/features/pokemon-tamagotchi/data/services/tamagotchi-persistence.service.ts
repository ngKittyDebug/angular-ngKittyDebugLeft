import { inject, Service } from '@angular/core';
import {
  clearTamagotchiProgressStorage,
  TAMAGOTCHI_BACKUP_KEY,
  TAMAGOTCHI_STORAGE_KEY,
} from '../helpers/tamagotchi-progress-storage.helper';
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
import { TamagotchiSelectionStorageService } from './tamagotchi-selection-storage.service';
import { TamagotchiStorageService } from './tamagotchi-storage.service';

export const TAMAGOTCHI_STATE_VERSION = 9;
export { TAMAGOTCHI_BACKUP_KEY, TAMAGOTCHI_STORAGE_KEY };

const TAMAGOTCHI_TRAINING_STATE_VERSION = 5;
const TAMAGOTCHI_NOTIFICATION_TEXT_STATE_VERSION = 7;
const TAMAGOTCHI_SELECTION_ORIGIN_STATE_VERSION = 8;
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
  notificationList: readonly LegacyNotificationModel[],
): NotificationModel[] {
  return notificationList.map((notification) => ({
    ...notification,
    message: migrateNotificationText(notification.message),
    title: migrateNotificationText(notification.title),
  }));
}

function omitLegacyStateKeys(
  state: TamagotchiStateModel & {
    achievements?: TamagotchiStateModel['achievementList'];
    interactionHistory?: TamagotchiStateModel['interactionHistoryList'];
    notifications?: LegacyNotificationModel[];
  },
): TamagotchiStateModel {
  const canonical = { ...state };

  delete canonical.achievements;
  delete canonical.interactionHistory;
  delete canonical.notifications;

  return canonical;
}

@Service({ autoProvided: false })
export class TamagotchiPersistenceService {
  private readonly selectionStorage = inject(TamagotchiSelectionStorageService);
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
    clearTamagotchiProgressStorage(this.storage);
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
      interactionHistory?: TamagotchiStateModel['interactionHistoryList'];
      notificationList?: LegacyNotificationModel[];
      notifications?: LegacyNotificationModel[];
    };
    const legacyNotificationList = legacy.notificationList ?? legacy.notifications ?? [];
    const stateWithoutLegacyKeys = omitLegacyStateKeys(legacy);
    const migrated: TamagotchiStateModel = {
      ...createInitialTamagotchiState(),
      ...stateWithoutLegacyKeys,
      achievementList: state.achievementList ?? legacy.achievements ?? [],
      dailyRoutine: {
        ...createInitialDailyRoutine(),
        ...(state.dailyRoutine ?? {}),
      },
      evolutionProgress:
        state.evolutionProgress === undefined
          ? createInitialTamagotchiState().evolutionProgress
          : {
              ...createInitialTamagotchiState().evolutionProgress,
              ...state.evolutionProgress,
              readyNotifiedAt: state.evolutionProgress.readyNotifiedAt ?? null,
            },
      interactionHistoryList: state.interactionHistoryList ?? legacy.interactionHistory ?? [],
      notificationList:
        version >= TAMAGOTCHI_NOTIFICATION_TEXT_STATE_VERSION
          ? (state.notificationList ?? [])
          : migrateNotificationList(legacyNotificationList),
      pokemon: state.pokemon ? ensurePokemonSpriteVariations(state.pokemon) : null,
      selectionOriginId: this.resolveSelectionOriginId(state, version),
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

  private resolveSelectionOriginId(state: TamagotchiStateModel, version: number): string | null {
    if (version >= TAMAGOTCHI_SELECTION_ORIGIN_STATE_VERSION) {
      return typeof state.selectionOriginId === 'string' ? state.selectionOriginId : null;
    }

    const selectionReference = this.selectionStorage.getReference();

    if (selectionReference?.id) {
      return selectionReference.id;
    }

    return state.pokemon?.id ?? null;
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
      ...omitLegacyStateKeys(
        state as TamagotchiStateModel & {
          achievements?: TamagotchiStateModel['achievementList'];
          interactionHistory?: TamagotchiStateModel['interactionHistoryList'];
          notifications?: LegacyNotificationModel[];
        },
      ),
      achievementList: state.achievementList ?? [],
      interactionHistoryList: state.interactionHistoryList ?? [],
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
}
