import { TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { PokemonTeamSelectionFacade } from './pokemon-team-selection.facade';
import { PokemonBattleStore } from '../store/pokemon-battle.store';
import {
  BULBASAUR_FIXTURE,
  CHARMANDER_FIXTURE,
  IVYSAUR_FIXTURE,
  SQUIRTLE_FIXTURE,
} from '../fixtures/pokemon.fixture';

type Public<T> = { [K in keyof T as K extends string ? K : never]: T[K] };
type StoreType = Public<InstanceType<typeof PokemonBattleStore>>;

describe('PokemonTeamSelectionFacade', () => {
  let mockStore: MockedObject<Partial<StoreType>>;
  let facade: PokemonTeamSelectionFacade;

  beforeEach(() => {
    mockStore = {
      pokemonList: signal([
        BULBASAUR_FIXTURE,
        CHARMANDER_FIXTURE,
        SQUIRTLE_FIXTURE,
        IVYSAUR_FIXTURE,
      ]),
      selectedTeam: signal([BULBASAUR_FIXTURE]),
      opponentTeam: signal([]),
      battleStarted: signal(false),
      currentPage: signal(0),
      totalCount: signal(4),
      limit: signal(10),
      isLoading: signal(false),
      error: signal(null),
      loadPokemons: vi.fn() as unknown as StoreType['loadPokemons'],
      selectPokemonForTeam: vi.fn() as unknown as StoreType['selectPokemonForTeam'],
      clearSelectedTeam: vi.fn() as unknown as StoreType['clearSelectedTeam'],
      startBattle: vi.fn() as unknown as StoreType['startBattle'],
      endBattle: vi.fn() as unknown as StoreType['endBattle'],
    } as const satisfies MockedObject<Partial<StoreType>>;

    TestBed.configureTestingModule({
      providers: [PokemonTeamSelectionFacade, { provide: PokemonBattleStore, useValue: mockStore }],
    });

    facade = TestBed.inject(PokemonTeamSelectionFacade);
  });

  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен вызывать loadPokemons на старте', () => {
        expect(facade).toBeDefined();
        expect(mockStore.loadPokemons).toHaveBeenCalledTimes(1);
      });
    });

    describe('Выбор покемонов', () => {
      it('должен вызывать selectPokemonForTeam в сторе при клике', () => {
        facade.onSelectPokemon(BULBASAUR_FIXTURE);
        expect(mockStore.selectPokemonForTeam).toHaveBeenCalledWith(BULBASAUR_FIXTURE);
      });
    });

    describe('Пагинация', () => {
      it('должен загружать следующую страницу если есть куда листать', () => {
        (mockStore.totalCount as unknown as WritableSignal<number>).set(15);
        (mockStore.limit as unknown as WritableSignal<number>).set(10);
        facade.onNextPage();
        expect(mockStore.loadPokemons).toHaveBeenCalledWith({ page: 1, limit: 10 });
      });

      it('не должен перелистывать назад с первой страницы', () => {
        facade.onPrevPage();
        expect(mockStore.loadPokemons).not.toHaveBeenCalledWith({ page: -1, limit: 10 });
      });
    });
  });
});
