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

    facade = TestBed.inject(PokemonTeamSelectionFacade);
  });

  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен вызывать loadPokemonList на старте', () => {
        expect(facade).toBeDefined();
        expect(mockStore.loadPokemonList).toHaveBeenCalledTimes(1);
      });
    });

    describe('Выбор покемонов', () => {
      it('должен вызывать selectPokemonForTeam в сторе при клике', () => {
        facade.selectPokemon(BULBASAUR_FIXTURE);

        expect(mockStore.selectPokemonForTeam).toHaveBeenNthCalledWith(1, BULBASAUR_FIXTURE);
      });
    });

    describe('Пагинация', () => {
      it('должен загружать следующую страницу если есть куда листать', () => {
        (mockStore.totalCount as unknown as WritableSignal<number>).set(15);
        (mockStore.limit as unknown as WritableSignal<number>).set(10);
        facade.nextPage();
        expect(mockStore.loadPokemonList).toHaveBeenNthCalledWith(2, { page: 1, limit: 10 });
      });

      it('не должен перелистывать назад с первой страницы', () => {
        facade.prevPage();
        expect(mockStore.loadPokemonList).toHaveBeenCalledTimes(1);
      });
    });

    describe('Управление боем', () => {
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
