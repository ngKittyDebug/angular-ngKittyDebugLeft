import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PokemonTeamSelectionFacade } from './pokemon-team-selection.facade';
import { PokemonBattleStore } from '../store/pokemon-battle.store';
import {
  BULBASAUR_FIXTURE,
  CHARMANDER_FIXTURE,
  IVYSAUR_FIXTURE,
  SQUIRTLE_FIXTURE,
} from '../fixtures/pokemon.fixture';

describe('PokemonTeamSelectionFacade', () => {
  let mockStore: any;
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
      loadPokemons: vi.fn(),
      selectPokemonForTeam: vi.fn(),
      clearSelectedTeam: vi.fn(),
      startBattle: vi.fn(),
      endBattle: vi.fn(),
    };

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
        mockStore.totalCount.set(15);
        mockStore.limit.set(10);
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
