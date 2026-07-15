import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, type MockedObject, vi } from 'vitest';
import { PokemonBattleStore } from './pokemon-battle.store';
import { PokemonBattleApiService } from '../api/pokemon/services/pokemon-battle-api.service';
import { MOCK_RAW_POKEMON } from '../fixtures/pokemon.fixture';
import { convertPokemonDetailApiDataToBattlePokemon } from '../api/pokemon/helpers/pokemon-converter';

describe('PokemonBattleStore', () => {
  let mockApiService: MockedObject<Partial<PokemonBattleApiService>>;

  beforeEach(() => {
    mockApiService = {
      getPokemonList: vi.fn(),
    } as const satisfies MockedObject<Partial<PokemonBattleApiService>>;

    TestBed.configureTestingModule({
      providers: [
        PokemonBattleStore,
        { provide: PokemonBattleApiService, useValue: mockApiService },
      ],
    });
  });

  it('should have initial state', () => {
    const store = TestBed.inject(PokemonBattleStore);

    expect(store.pokemonList()).toEqual([]);
    expect(store.selectedTeam()).toEqual([]);
    expect(store.opponentTeam()).toEqual([]);
    expect(store.battleStarted()).toBe(false);
    expect(store.isLoading()).toBe(false);
  });

  it('should load pokemons and map them successfully', () => {
    const store = TestBed.inject(PokemonBattleStore);

    vi.mocked(mockApiService.getPokemonList!).mockReturnValue(
      of({
        pokemonList: [MOCK_RAW_POKEMON],
        totalCount: 1,
      }),
    );

    store.loadPokemonList({ page: 0, limit: 10 });

    expect(mockApiService.getPokemonList).toHaveBeenNthCalledWith(1, 10, 0);

    expect(store.pokemonList().length).toBe(1);
    expect(store.pokemonList()[0].name).toBe('pikachu');
    expect(store.totalCount()).toBe(1);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should handle error when loading fails', () => {
    const store = TestBed.inject(PokemonBattleStore);

    vi.mocked(mockApiService.getPokemonList!).mockReturnValue(
      throwError(() => new Error('API Error')),
    );

    store.loadPokemonList({ page: 0, limit: 10 });

    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBe('loadFailed');
  });

  it('should add pokemon to team', () => {
    const store = TestBed.inject(PokemonBattleStore);
    const p1 = convertPokemonDetailApiDataToBattlePokemon(MOCK_RAW_POKEMON);

    store.selectPokemonForTeam(p1);

    expect(store.selectedTeam()).toEqual([p1]);
  });

  it('should toggle selection off if pokemon is already in team', () => {
    const store = TestBed.inject(PokemonBattleStore);
    const p1 = convertPokemonDetailApiDataToBattlePokemon(MOCK_RAW_POKEMON);

    store.selectPokemonForTeam(p1);

    store.selectPokemonForTeam(p1);

    expect(store.selectedTeam()).toEqual([]);
  });

  it('should respect maximum limit of 2 pokemons in team', () => {
    const store = TestBed.inject(PokemonBattleStore);
    const p1 = convertPokemonDetailApiDataToBattlePokemon(MOCK_RAW_POKEMON);
    const p2 = { ...p1, id: 26, name: 'raichu' };
    const p3 = { ...p1, id: 1, name: 'bulbasaur' };

    store.selectPokemonForTeam(p1);
    store.selectPokemonForTeam(p2);

    store.selectPokemonForTeam(p3);

    expect(store.selectedTeam()).toEqual([p1, p2]);
  });

  it('should clear selection', () => {
    const store = TestBed.inject(PokemonBattleStore);
    const p1 = convertPokemonDetailApiDataToBattlePokemon(MOCK_RAW_POKEMON);

    store.selectPokemonForTeam(p1);
    store.startBattle([p1]);
    expect(store.battleStarted()).toBe(true);

    store.clearSelectedTeam();
    expect(store.selectedTeam()).toEqual([]);
    expect(store.opponentTeam()).toEqual([]);
    expect(store.battleStarted()).toBe(false);
  });
});
