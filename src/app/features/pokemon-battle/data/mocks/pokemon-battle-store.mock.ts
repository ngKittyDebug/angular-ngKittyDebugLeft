import { signal } from '@angular/core';
import { type MockedObject, vi } from 'vitest';
import type { PokemonBattleStore } from '../store/pokemon-battle.store';
import {
  BULBASAUR_FIXTURE,
  CHARMANDER_FIXTURE,
  IVYSAUR_FIXTURE,
  SQUIRTLE_FIXTURE,
} from '../fixtures/pokemon.fixture';

type Public<T> = { [K in keyof T as K extends string ? K : never]: T[K] };
export type StoreType = Public<InstanceType<typeof PokemonBattleStore>>;

export function createPokemonBattleStoreMock(
  overrides?: Partial<MockedObject<Partial<StoreType>>>,
): MockedObject<Partial<StoreType>> {
  const baseMock = {
    pokemonList: signal([
      structuredClone(BULBASAUR_FIXTURE),
      structuredClone(CHARMANDER_FIXTURE),
      structuredClone(SQUIRTLE_FIXTURE),
      structuredClone(IVYSAUR_FIXTURE),
    ]),
    selectedTeam: signal([structuredClone(BULBASAUR_FIXTURE), structuredClone(SQUIRTLE_FIXTURE)]),
    opponentTeam: signal([structuredClone(CHARMANDER_FIXTURE), structuredClone(IVYSAUR_FIXTURE)]),
    battleStarted: signal(true),
    currentPage: signal(0),
    totalCount: signal(4),
    limit: signal(10),
    isLoading: signal(false),
    error: signal(null),
    loadPokemonList: vi.fn(),
    selectPokemonForTeam: vi.fn(),
    clearSelectedTeam: vi.fn(),
    startBattle: vi.fn(),
    endBattle: vi.fn(),
  };

  return { ...baseMock, ...overrides } as unknown as MockedObject<Partial<StoreType>>;
}
