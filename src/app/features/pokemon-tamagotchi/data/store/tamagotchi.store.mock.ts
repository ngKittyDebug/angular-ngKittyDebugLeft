import { signal } from '@angular/core';
import { type MockedObject, vi } from 'vitest';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import { createInitialPokemonStatus, createInitialTamagotchiState } from './tamagotchi-initial';
import type { TamagotchiStore } from './tamagotchi.store';

type TamagotchiStoreInstance = InstanceType<typeof TamagotchiStore>;

type TamagotchiStoreMethodsMock = MockedObject<
  Pick<
    TamagotchiStoreInstance,
    | 'applyStatusDecay'
    | 'care'
    | 'checkEvolution'
    | 'clearError'
    | 'clearEvolutionReadyNotified'
    | 'completeEvolution'
    | 'completeTraining'
    | 'feed'
    | 'healSelectionOriginId'
    | 'interactWithPokemon'
    | 'loadFromPersistence'
    | 'markEvolutionReadyNotified'
    | 'play'
    | 'putToSleep'
    | 'resetState'
    | 'restartTrainingTimer'
    | 'selectPokemon'
    | 'setError'
    | 'startEvolution'
    | 'startTraining'
    | 'updateStatus'
    | 'wakeUp'
    | 'water'
  >
>;

export interface TamagotchiStoreMockOverrides {
  error?: string | null;
  hasPokemon?: boolean;
  initialized?: boolean;
  isSleeping?: boolean;
  isTraining?: boolean;
  methodOverrides?: Partial<Record<keyof TamagotchiStoreMethodsMock, ReturnType<typeof vi.fn>>>;
  pokemon?: PokemonModel | null;
  selectionOriginId?: string | null;
  status?: PokemonStatusModel;
}

export function createTamagotchiStoreMock(overrides: TamagotchiStoreMockOverrides = {}) {
  const initial = createInitialTamagotchiState();
  const pokemon = 'pokemon' in overrides ? (overrides.pokemon ?? null) : TEST_POKEMON;

  const storeSignals = {
    achievementList: signal(initial.achievementList),
    canEvolve: signal(false),
    dailyRoutine: signal(initial.dailyRoutine),
    error: signal(overrides.error ?? initial.error),
    evolutionProgress: signal(initial.evolutionProgress),
    hasPokemon: signal(overrides.hasPokemon ?? pokemon !== null),
    initialized: signal(overrides.initialized ?? true),
    interactionHistoryList: signal(initial.interactionHistoryList),
    isEvolving: signal(false),
    isSleeping: signal(overrides.isSleeping ?? false),
    isTraining: signal(overrides.isTraining ?? false),
    lastActionTime: signal(initial.lastActionTime),
    lastDecayTime: signal(initial.lastDecayTime),
    lastSaveTime: signal(initial.lastSaveTime),
    notificationList: signal(initial.notificationList),
    pokemon: signal(pokemon),
    selectionOriginId: signal(
      overrides.selectionOriginId === undefined
        ? (pokemon?.id ?? null)
        : overrides.selectionOriginId,
    ),
    status: signal(overrides.status ?? createInitialPokemonStatus()),
    trainingExperienceReward: signal<number | null>(null),
    trainingStartedAt: signal<number | null>(null),
  };

  const methods = {
    applyStatusDecay: vi.fn(),
    care: vi.fn(),
    checkEvolution: vi.fn(),
    clearError: vi.fn(),
    clearEvolutionReadyNotified: vi.fn(() => {
      storeSignals.evolutionProgress.update((progress) => ({
        ...progress,
        readyNotifiedAt: null,
      }));
    }),
    completeEvolution: vi.fn(),
    completeTraining: vi.fn(),
    feed: vi.fn(),
    healSelectionOriginId: vi.fn((originId: string) => {
      storeSignals.selectionOriginId.set(originId);
    }),
    interactWithPokemon: vi.fn(),
    loadFromPersistence: vi.fn(() => {
      storeSignals.initialized.set(true);
    }),
    markEvolutionReadyNotified: vi.fn((notifiedAt: number) => {
      storeSignals.evolutionProgress.update((progress) => ({
        ...progress,
        readyNotifiedAt: notifiedAt,
      }));
    }),
    play: vi.fn(),
    putToSleep: vi.fn(),
    resetState: vi.fn(),
    restartTrainingTimer: vi.fn(),
    selectPokemon: vi.fn(),
    setError: vi.fn((error: string) => {
      storeSignals.error.set(error);
    }),
    startEvolution: vi.fn((() => {
      storeSignals.isEvolving.set(true);
      storeSignals.canEvolve.set(false);
    }) as () => void),
    startTraining: vi.fn(),
    updateStatus: vi.fn(),
    wakeUp: vi.fn(),
    water: vi.fn(),
  } as const satisfies TamagotchiStoreMethodsMock;

  return {
    ...storeSignals,
    ...methods,
    ...overrides.methodOverrides,
  };
}

export type TamagotchiStoreMock = ReturnType<typeof createTamagotchiStoreMock>;
