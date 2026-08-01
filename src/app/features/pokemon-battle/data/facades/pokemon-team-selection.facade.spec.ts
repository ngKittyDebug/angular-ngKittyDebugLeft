import { TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it, type MockedObject } from 'vitest';
import { PokemonTeamSelectionFacade } from './pokemon-team-selection.facade';
import { PokemonBattleStore } from '../store/pokemon-battle.store';
import { BULBASAUR_FIXTURE } from '../fixtures/pokemon.fixture';
import { createPokemonBattleStoreMock, type StoreType } from '../mocks/pokemon-battle-store.mock';

describe('PokemonTeamSelectionFacade', () => {
  let mockStore: MockedObject<Partial<StoreType>>;
  let facade: PokemonTeamSelectionFacade;

  beforeEach(() => {
    mockStore = createPokemonBattleStoreMock({
      selectedTeam: signal([structuredClone(BULBASAUR_FIXTURE)]),
      opponentTeam: signal([]),
      battleStarted: signal(false),
    });

    TestBed.configureTestingModule({
      providers: [PokemonTeamSelectionFacade, { provide: PokemonBattleStore, useValue: mockStore }],
    });
  });

  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен вызывать loadPokemonList на старте, если список пуст', () => {
        (mockStore.pokemonList as unknown as WritableSignal<any[]>).set([]);

        facade = TestBed.inject(PokemonTeamSelectionFacade);

        expect(mockStore.loadPokemonList).toHaveBeenCalledWith({ page: 0, limit: 10 });
      });

      it('не должен вызывать loadPokemonList на старте, если список уже загружен', () => {
        (mockStore.pokemonList as unknown as WritableSignal<any[]>).set([BULBASAUR_FIXTURE]);

        facade = TestBed.inject(PokemonTeamSelectionFacade);

        expect(mockStore.loadPokemonList).not.toHaveBeenCalled();
      });
    });

    describe('Выбор покемонов', () => {
      beforeEach(() => {
        facade = TestBed.inject(PokemonTeamSelectionFacade);
      });

      it('должен вызывать selectPokemonForTeam в сторе при клике', () => {
        facade.selectPokemon(BULBASAUR_FIXTURE);

        expect(mockStore.selectPokemonForTeam).toHaveBeenNthCalledWith(1, BULBASAUR_FIXTURE);
      });
    });

    describe('Пагинация', () => {
      beforeEach(() => {
        facade = TestBed.inject(PokemonTeamSelectionFacade);
      });

      it('должен загружать следующую страницу если есть куда листать', () => {
        (mockStore.totalCount as unknown as WritableSignal<number>).set(15);
        (mockStore.limit as unknown as WritableSignal<number>).set(10);
        (mockStore.loadPokemonList as any).mockClear();

        facade.nextPage();
        expect(mockStore.loadPokemonList).toHaveBeenNthCalledWith(1, { page: 1, limit: 10 });
      });

      it('не должен перелистывать назад с первой страницы', () => {
        (mockStore.loadPokemonList as any).mockClear();
        facade.prevPage();
        expect(mockStore.loadPokemonList).not.toHaveBeenCalled();
      });

      it('должен повторять загрузку текущей страницы при вызове retry', () => {
        (mockStore.currentPage as unknown as WritableSignal<number>).set(2);
        (mockStore.loadPokemonList as any).mockClear();

        facade.retry();

        expect(mockStore.loadPokemonList).toHaveBeenNthCalledWith(1, { page: 2, limit: 10 });
      });
    });

    describe('Управление боем', () => {
      beforeEach(() => {
        facade = TestBed.inject(PokemonTeamSelectionFacade);
      });

      it('должен вызывать startBattle в сторе, если выбрано 2 покемона', () => {
        (mockStore.selectedTeam as unknown as WritableSignal<any[]>).set([
          structuredClone(BULBASAUR_FIXTURE),
          structuredClone(BULBASAUR_FIXTURE), // just needs to have length 2
        ]);
        facade.startBattle();
        expect(mockStore.startBattle).toHaveBeenCalledTimes(1);
      });
    });
  });
});
