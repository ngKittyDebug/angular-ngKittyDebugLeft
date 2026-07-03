import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';
import type { EvolutionChainApiResponse } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';
import type { PokemonModel, PokemonSpriteUrlsModel } from '../models/pokemon.model';
import { createTamagotchiStorageMock } from '../fixtures/tamagotchi-storage.mock';
import { TamagotchiStorageService } from './tamagotchi-storage.service';
import {
  PokemonProfileIntegrationService,
  TAMAGOTCHI_SELECTED_POKEMON_KEY,
} from './pokemon-profile-integration.service';

function buildPokemon(spriteUrls: PokemonSpriteUrlsModel): PokemonModel {
  return {
    baseStats: {
      energyRestorationRate: 1,
      experienceMultiplier: 1,
      hungerDecayRate: 1,
      moodDecayRate: 1,
    },
    evolutionChain: { currentStage: 1, totalStages: 3 },
    id: '4',
    isFirstStage: true,
    name: 'charmander',
    species: 'charmander',
    spriteUrls,
    spriteVariations: {
      default: spriteUrls,
      retro: spriteUrls,
      shiny: spriteUrls,
    },
  };
}

describe('PokemonProfileIntegrationService', () => {
  let service: PokemonProfileIntegrationService;
  let httpMock: HttpTestingController;
  let storageMock: ReturnType<typeof createTamagotchiStorageMock>;

  const charmanderDetail = {
    abilities: [],
    base_experience: 62,
    cries: { latest: '', legacy: '' },
    forms: [],
    game_indices: [],
    height: 6,
    held_items: [],
    id: 4,
    is_default: true,
    location_area_encounters: '',
    moves: [],
    name: 'charmander',
    order: 5,
    past_abilities: [],
    past_stats: [],
    past_types: [],
    species: { name: 'charmander', url: `${POKEMON_BASE_API}pokemon-species/4/` },
    sprites: {
      back_default: null,
      back_female: null,
      back_shiny: null,
      back_shiny_female: null,
      front_default: '/charmander.png',
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
        'official-artwork': { front_default: '/charmander-art.png', front_shiny: null },
      },
    },
    stats: [],
    types: [],
    weight: 85,
  } as unknown as PokemonDetailApiData;

  const charmanderSpecies = {
    base_happiness: 70,
    capture_rate: 45,
    color: { name: 'red', url: '' },
    egg_groups: [],
    evolution_chain: { url: `${POKEMON_BASE_API}evolution-chain/10/` },
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
    name: 'charmander',
    names: [],
    order: 5,
    pal_park_encounters: [],
    pokedex_numbers: [],
    shape: { name: 'upright', url: '' },
    varieties: [],
  } as PokemonSpeciesApiData;

  const charmanderEvolution: EvolutionChainApiResponse = {
    baby_trigger_item: null,
    chain: {
      evolution_details: [],
      evolves_to: [
        {
          evolution_details: [{ trigger: { name: 'level', url: '' } } as never],
          evolves_to: [],
          is_baby: false,
          species: { name: 'charmeleon', url: '' },
        },
      ],
      is_baby: false,
      species: { name: 'charmander', url: '' },
    },
    id: 10,
  };

  const charmeleonDetail = {
    ...charmanderDetail,
    id: 5,
    name: 'charmeleon',
    species: { name: 'charmeleon', url: `${POKEMON_BASE_API}pokemon-species/5/` },
  } as unknown as PokemonDetailApiData;

  beforeEach(() => {
    storageMock = createTamagotchiStorageMock();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TamagotchiStorageService, useValue: storageMock },
      ],
    });
    service = TestBed.inject(PokemonProfileIntegrationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Happy Path', () => {
    it('должен сохранять и читать ссылку на выбранного покемона', () => {
      service.saveSelectedPokemon(
        buildPokemon({
          eating: '',
          evolving: '',
          happy: '',
          normal: '',
          sad: '',
          sleeping: '',
        }),
      );

      expect(service.getSelectedPokemonReference()).toEqual({
        id: '4',
        name: 'charmander',
        species: 'charmander',
      });
      expect(storageMock.getItem(TAMAGOTCHI_SELECTED_POKEMON_KEY)).not.toBeNull();
    });
  });

  describe('Negative Cases', () => {
    it('должен отклонять выбор эволюционировавшего покемона', () => {
      let validation: unknown;

      service.loadPokemonByName('charmeleon').subscribe((pokemon) => {
        validation = service.validatePokemonSelection(pokemon);
      });

      const detailRequest = httpMock.expectOne(`${POKEMON_BASE_API}pokemon/charmeleon`);

      detailRequest.flush(charmeleonDetail);

      const speciesRequest = httpMock.expectOne(`${POKEMON_BASE_API}pokemon-species/charmeleon`);

      speciesRequest.flush({
        ...charmanderSpecies,
        evolution_chain: charmanderSpecies.evolution_chain,
        id: 5,
        name: 'charmeleon',
      });

      const chainRequest = httpMock.expectOne(`${POKEMON_BASE_API}evolution-chain/10`);

      chainRequest.flush(charmanderEvolution);

      expect(validation).toEqual({
        error: 'evolvedPokemon',
        valid: false,
      });
    });

    it('должен сообщать об отсутствии выбора, когда хранилище пусто', () => {
      let validation: unknown;

      service.validateSelectedPokemon().subscribe((result) => {
        validation = result;
      });

      expect(validation).toEqual({
        error: 'noSelection',
        valid: false,
      });
    });
  });
});
