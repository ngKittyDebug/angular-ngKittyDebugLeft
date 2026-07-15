import { TestBed } from '@angular/core/testing';
import type { PokemonModel, PokemonSpriteUrlsModel } from '../models/pokemon.model';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import { TAMAGOTCHI_STORAGE_KEY } from '../helpers/tamagotchi-progress-storage.helper';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import { selectPokemonState } from '../store/tamagotchi-state-transitions';
import { createTamagotchiStorageMock } from '../fixtures/tamagotchi-storage.mock';
import { TamagotchiStorageService } from './tamagotchi-storage.service';
import {
  TAMAGOTCHI_SELECTED_POKEMON_KEY,
  TamagotchiSelectionStorageService,
} from './tamagotchi-selection-storage.service';

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

describe('TamagotchiSelectionStorageService', () => {
  let service: TamagotchiSelectionStorageService;
  let storageMock: ReturnType<typeof createTamagotchiStorageMock>;

  beforeEach(() => {
    storageMock = createTamagotchiStorageMock();
    TestBed.configureTestingModule({
      providers: [{ provide: TamagotchiStorageService, useValue: storageMock }],
    });
    service = TestBed.inject(TamagotchiSelectionStorageService);
  });

  describe('Happy Path', () => {
    it('должен сохранять и читать ссылку на выбранного покемона', () => {
      service.save(
        buildPokemon({
          eating: '',
          evolving: '',
          happy: '',
          normal: '',
          sad: '',
          sleeping: '',
        }),
      );

      expect(service.getReference()).toEqual({
        id: '4',
        name: 'charmander',
        species: 'charmander',
      });
      expect(storageMock.getItem(TAMAGOTCHI_SELECTED_POKEMON_KEY)).not.toBeNull();
    });

    it('должен очищать сохранённый прогресс тамагочи при смене выбранного покемона', () => {
      const charmander = buildPokemon({
        eating: '',
        evolving: '',
        happy: '',
        normal: '',
        sad: '',
        sleeping: '',
      });

      storageMock.setItem(
        TAMAGOTCHI_STORAGE_KEY,
        JSON.stringify({
          state: selectPokemonState(createInitialTamagotchiState(), {
            ...TEST_POKEMON,
            id: '1',
            name: 'bulbasaur',
            species: 'bulbasaur',
          }),
        }),
      );

      service.save(charmander);

      expect(storageMock.getItem(TAMAGOTCHI_STORAGE_KEY)).toBeNull();
      expect(service.getReference()).toEqual({
        id: '4',
        name: 'charmander',
        species: 'charmander',
      });
    });

    it('не должен очищать прогресс при сохранении не-first-stage ссылки с другим id', () => {
      storageMock.setItem(
        TAMAGOTCHI_STORAGE_KEY,
        JSON.stringify({
          state: selectPokemonState(createInitialTamagotchiState(), {
            ...TEST_POKEMON,
            id: '1',
            name: 'bulbasaur',
            species: 'bulbasaur',
          }),
        }),
      );

      service.save({
        id: '2',
        isFirstStage: false,
        name: 'ivysaur',
        species: 'ivysaur',
      });

      expect(storageMock.getItem(TAMAGOTCHI_STORAGE_KEY)).not.toBeNull();
      expect(service.getReference()).toEqual({
        id: '2',
        name: 'ivysaur',
        species: 'ivysaur',
      });
    });
  });
});
