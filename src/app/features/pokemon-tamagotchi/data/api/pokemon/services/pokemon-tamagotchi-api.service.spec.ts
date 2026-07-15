import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';
import type { EvolutionChainApiResponse } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';
import { PokemonTamagotchiApiService } from './pokemon-tamagotchi-api.service';

const DEFAULT_EVOLUTION_CHAIN_URL = `${POKEMON_BASE_API}evolution-chain/10/`;

function createPokemonDetail(
  options: {
    id?: number;
    name?: string;
    speciesName?: string;
  } = {},
): PokemonDetailApiData {
  const id = options.id ?? 4;
  const name = options.name ?? 'charmander';
  const speciesName = options.speciesName ?? name;

  return {
    abilities: [],
    base_experience: 62,
    cries: { latest: '', legacy: '' },
    forms: [],
    game_indices: [],
    height: 6,
    held_items: [],
    id,
    is_default: true,
    location_area_encounters: '',
    moves: [],
    name,
    order: id,
    past_abilities: [],
    past_stats: [],
    past_types: [],
    species: { name: speciesName, url: `${POKEMON_BASE_API}pokemon-species/${speciesName}/` },
    sprites: {
      back_default: null,
      back_female: null,
      back_shiny: null,
      back_shiny_female: null,
      front_default: `/${name}.png`,
      front_female: null,
      front_shiny: null,
      front_shiny_female: null,
      other: {
        dream_world: { front_default: null, front_female: null },
        home: {
          front_default: null,
          front_female: null,
          front_shiny: null,
          front_shiny_female: null,
        },
        'official-artwork': { front_default: `/${name}-art.png`, front_shiny: null },
        showdown: {
          back_default: null,
          back_female: null,
          back_shiny: null,
          back_shiny_female: null,
          front_default: null,
          front_female: null,
          front_shiny: null,
          front_shiny_female: null,
        },
      },
      versions: {},
    },
    stats: [],
    types: [],
    weight: 85,
  };
}

function createPokemonSpecies(name = 'charmander'): PokemonSpeciesApiData {
  return {
    base_happiness: 70,
    capture_rate: 45,
    color: { name: 'red', url: '' },
    egg_groups: [],
    evolution_chain: { url: DEFAULT_EVOLUTION_CHAIN_URL },
    evolves_from_species: null,
    flavor_text_entries: [],
    form_descriptions: [],
    forms_switchable: false,
    gender_rate: 1,
    generation: { name: 'generation-i', url: '' },
    genera: [],
    growth_rate: { name: 'medium-slow', url: '' },
    habitat: null,
    has_gender_differences: false,
    hatch_counter: 20,
    id: 4,
    is_baby: false,
    is_legendary: false,
    is_mythical: false,
    name,
    names: [],
    order: 5,
    pal_park_encounters: [],
    pokedex_numbers: [],
    shape: { name: 'upright', url: '' },
    varieties: [],
  };
}

function createEvolutionChain(rootSpeciesName = 'charmander'): EvolutionChainApiResponse {
  return {
    baby_trigger_item: null,
    chain: {
      evolution_details: [],
      evolves_to: [
        {
          evolution_details: [],
          evolves_to: [],
          is_baby: false,
          species: { name: `${rootSpeciesName}-evolved`, url: '' },
        },
      ],
      is_baby: false,
      species: { name: rootSpeciesName, url: '' },
    },
    id: 10,
  };
}

describe('PokemonTamagotchiApiService', () => {
  let httpMock: HttpTestingController;
  let service: PokemonTamagotchiApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PokemonTamagotchiApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Happy Path', () => {
    it('должен запрашивать species по имени вида для альтернативной формы', () => {
      let pokemonName: string | undefined;

      service.loadPokemonByName('deoxys-attack').subscribe((pokemon) => {
        pokemonName = pokemon.name;
      });

      httpMock
        .expectOne(`${POKEMON_BASE_API}pokemon/deoxys-attack`)
        .flush(createPokemonDetail({ id: 10001, name: 'deoxys-attack', speciesName: 'deoxys' }));
      httpMock
        .expectOne(`${POKEMON_BASE_API}pokemon-species/deoxys`)
        .flush(createPokemonSpecies('deoxys'));
      httpMock
        .expectOne(`${POKEMON_BASE_API}evolution-chain/10`)
        .flush(createEvolutionChain('deoxys'));

      expect(pokemonName).toBe('deoxys-attack');
    });
  });

  describe('Negative Cases', () => {
    it('должен возвращать покемона с fallback-цепочкой при ошибке species', () => {
      let totalStages: number | undefined;

      service.loadPokemonByName('charmander').subscribe((pokemon) => {
        totalStages = pokemon.evolutionChain.totalStages;
      });

      httpMock.expectOne(`${POKEMON_BASE_API}pokemon/charmander`).flush(createPokemonDetail());
      httpMock
        .expectOne(`${POKEMON_BASE_API}pokemon-species/charmander`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(totalStages).toBe(1);
    });

    it('должен возвращать покемона с fallback-цепочкой при ошибке evolution-chain', () => {
      let totalStages: number | undefined;

      service.loadPokemonByName('charmander').subscribe((pokemon) => {
        totalStages = pokemon.evolutionChain.totalStages;
      });

      httpMock.expectOne(`${POKEMON_BASE_API}pokemon/charmander`).flush(createPokemonDetail());
      httpMock
        .expectOne(`${POKEMON_BASE_API}pokemon-species/charmander`)
        .flush(createPokemonSpecies());
      httpMock
        .expectOne(`${POKEMON_BASE_API}evolution-chain/10`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(totalStages).toBe(1);
    });
  });
});
