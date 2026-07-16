import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';
import type { EvolutionChainApiResponse } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import { CHARMANDER_SPECIES, CHARMELEON_DETAIL } from '../fixtures/pokemon-detail.fixture';
import { createTamagotchiStorageMock } from './tamagotchi-storage.service.mock';
import { TamagotchiStorageService } from './tamagotchi-storage.service';
import { TamagotchiSelectionService } from './tamagotchi-selection.service';

describe('TamagotchiSelectionService', () => {
  let service: TamagotchiSelectionService;
  let httpMock: HttpTestingController;
  let storageMock: ReturnType<typeof createTamagotchiStorageMock>;

  const charmanderSpecies = CHARMANDER_SPECIES;
  const charmeleonDetail = CHARMELEON_DETAIL;

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

  beforeEach(() => {
    storageMock = createTamagotchiStorageMock();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TamagotchiStorageService, useValue: storageMock },
      ],
    });
    service = TestBed.inject(TamagotchiSelectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
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
