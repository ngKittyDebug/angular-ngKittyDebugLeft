import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, type MockedObject, vi } from 'vitest';
import { PokemonBattleStore } from './pokemon-battle.store';
import { PokemonBattleApiService } from '../api/pokemon/services/pokemon-battle-api.service';
import { mapToBattlePokemon } from '../api/pokemon/helpers/pokemon-mapper';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';

const MOCK_RAW_POKEMON: PokemonDetailApiData = {
  id: 25,
  name: 'pikachu',
  base_experience: 112,
  height: 4,
  weight: 60,
  is_default: true,
  order: 1,
  abilities: [],
  forms: [],
  game_indices: [],
  held_items: [],
  location_area_encounters: '',
  past_abilities: [],
  past_stats: [],
  past_types: [],
  species: { name: 'pikachu', url: '' },
  cries: { latest: '', legacy: '' },
  stats: [
    { base_stat: 35, effort: 0, stat: { name: 'hp', url: '' } },
    { base_stat: 55, effort: 0, stat: { name: 'attack', url: '' } },
    { base_stat: 40, effort: 0, stat: { name: 'defense', url: '' } },
    { base_stat: 90, effort: 0, stat: { name: 'speed', url: '' } },
  ],
  types: [{ slot: 1, type: { name: 'electric', url: '' } }],
  sprites: {
    front_default: 'front.png',
    back_default: 'back.png',
    front_shiny: null,
    front_female: null,
    front_shiny_female: null,
    back_shiny: null,
    back_female: null,
    back_shiny_female: null,
    other: {
      dream_world: { front_default: null, front_female: null },
      home: {
        front_default: null,
        front_shiny: null,
        front_female: null,
        front_shiny_female: null,
      },
      'official-artwork': { front_default: null, front_shiny: null },
      showdown: {
        front_default: 'animated_front.gif',
        back_default: 'animated_back.gif',
        front_shiny: null,
        front_female: null,
        front_shiny_female: null,
        back_shiny: null,
        back_female: null,
        back_shiny_female: null,
      },
    },
    versions: {},
  },
  moves: [
    {
      move: { name: 'thunderbolt', url: '' },
      version_group_details: [],
    },
    {
      move: { name: 'tackle', url: '' },
      version_group_details: [],
    },
  ],
};

describe('Pokemon mapper', () => {
  it('should correctly map raw PokeAPI data to BattlePokemon', () => {
    const result = mapToBattlePokemon(MOCK_RAW_POKEMON);

    expect(result.id).toBe(25);
    expect(result.name).toBe('pikachu');
    expect(result.maxHp).toBe(35);
    expect(result.hp).toBe(35);
    expect(result.stats).toEqual({
      hp: 35,
      attack: 55,
      defense: 40,
      speed: 90,
    });
    expect(result.types).toEqual(['electric']);
    expect(result.sprites.front).toBe('animated_front.gif');
    expect(result.sprites.back).toBe('animated_back.gif');

    expect(result.moves.length).toBeGreaterThanOrEqual(1);
    expect(result.moves[0].name).toBe('tackle');
  });
});

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
        results: [MOCK_RAW_POKEMON],
        total: 1,
      }),
    );

    store.loadPokemons({ page: 0, limit: 10 });

    expect(mockApiService.getPokemonList).toHaveBeenCalledWith(10, 0);

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

    store.loadPokemons({ page: 0, limit: 10 });

    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBe('API Error');
  });

  it('should toggle selection of pokemons and respect maximum limit of 2', () => {
    const store = TestBed.inject(PokemonBattleStore);
    const p1 = mapToBattlePokemon(MOCK_RAW_POKEMON);
    const p2 = { ...p1, id: 26, name: 'raichu' };
    const p3 = { ...p1, id: 1, name: 'bulbasaur' };

    store.selectPokemonForTeam(p1);
    expect(store.selectedTeam()).toEqual([p1]);

    store.selectPokemonForTeam(p2);
    expect(store.selectedTeam()).toEqual([p1, p2]);

    // Respect limit of 2: p3 should not be added
    store.selectPokemonForTeam(p3);
    expect(store.selectedTeam()).toEqual([p1, p2]);

    // Unselect p1
    store.selectPokemonForTeam(p1);
    expect(store.selectedTeam()).toEqual([p2]);
  });

  it('should clear selection', () => {
    const store = TestBed.inject(PokemonBattleStore);
    const p1 = mapToBattlePokemon(MOCK_RAW_POKEMON);

    store.selectPokemonForTeam(p1);
    store.startBattle([p1]);
    expect(store.battleStarted()).toBe(true);

    store.clearSelectedTeam();
    expect(store.selectedTeam()).toEqual([]);
    expect(store.opponentTeam()).toEqual([]);
    expect(store.battleStarted()).toBe(false);
  });
});
