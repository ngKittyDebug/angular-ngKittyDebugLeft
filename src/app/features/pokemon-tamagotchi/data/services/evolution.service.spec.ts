import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PokemonTamagotchiApiService } from '../api/pokemon/services/pokemon-tamagotchi-api.service';
import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { EvolutionResultModel } from '../models/evolution.model';
import type { PokemonModel } from '../models/pokemon.model';
import { EvolutionService } from './evolution.service';

describe('EvolutionService', () => {
  let service: EvolutionService;
  let loadPokemonByName: ReturnType<typeof vi.fn>;

  const basePokemon: PokemonModel = {
    ...TEST_POKEMON,
    evolutionChain: {
      currentStage: 1,
      nextEvolution: {
        pokemonId: 'raichu',
        requirements: EVOLUTION_REQUIREMENTS,
      },
      totalStages: 3,
    },
  };

  const fetchedRaichu: PokemonModel = {
    ...TEST_POKEMON,
    evolutionChain: {
      currentStage: 2,
      totalStages: 3,
    },
    id: '26',
    isFirstStage: false,
    name: 'raichu',
    species: 'raichu',
    spriteUrls: {
      ...TEST_POKEMON.spriteUrls,
      evolving: '/sprites/raichu-evolving.png',
      normal: '/sprites/raichu-normal.png',
    },
  };

  beforeEach(() => {
    loadPokemonByName = vi.fn(() => of(fetchedRaichu));

    TestBed.configureTestingModule({
      providers: [
        EvolutionService,
        { provide: PokemonTamagotchiApiService, useValue: { loadPokemonByName } },
      ],
    });
    service = TestBed.inject(EvolutionService);
  });

  describe('Happy Path', () => {
    describe('prepareEvolution', () => {
      it('должен вернуть эволюционировавшего покемона с новыми name, sprites и numeric id', () => {
        service.prepareEvolution(basePokemon).subscribe((result) => {
          expect(loadPokemonByName).toHaveBeenNthCalledWith(1, 'raichu');
          expect(result).toEqual(
            expect.objectContaining({
              evolutionData: expect.objectContaining({ toPokemonId: 'raichu' }),
              evolvedPokemon: expect.objectContaining({
                id: '26',
                name: 'raichu',
                spriteUrls: expect.objectContaining({
                  normal: '/sprites/raichu-normal.png',
                }),
              }),
            }),
          );
          expect(result?.evolvedPokemon.spriteUrls.normal).not.toBe(basePokemon.spriteUrls.normal);
        });
      });

      it('должен сохранять nextEvolution для второй ступени из загруженной модели', () => {
        const threeStageFetched: PokemonModel = {
          ...fetchedRaichu,
          evolutionChain: {
            currentStage: 2,
            nextEvolution: {
              pokemonId: 'venusaur',
              requirements: EVOLUTION_REQUIREMENTS,
            },
            totalStages: 3,
          },
          name: 'ivysaur',
          species: 'ivysaur',
        };
        const threeStagePokemon: PokemonModel = {
          ...basePokemon,
          evolutionChain: {
            currentStage: 1,
            nextEvolution: {
              pokemonId: 'ivysaur',
              requirements: EVOLUTION_REQUIREMENTS,
              childNextEvolution: {
                pokemonId: 'venusaur',
                requirements: EVOLUTION_REQUIREMENTS,
              },
            },
            totalStages: 3,
          },
        };

        loadPokemonByName.mockReturnValue(of(threeStageFetched));

        let nextPokemonId: string | undefined;

        service.prepareEvolution(threeStagePokemon).subscribe((value) => {
          nextPokemonId = value?.evolvedPokemon.evolutionChain.nextEvolution?.pokemonId;
        });

        expect(nextPokemonId).toBe('venusaur');
      });
    });
  });

  describe('Negative Cases', () => {
    describe('prepareEvolution', () => {
      it('должен возвращать null, когда API не загрузил форму эволюции', () => {
        loadPokemonByName.mockReturnValue(throwError(() => new Error('network')));

        let result: EvolutionResultModel | null | 'unset' = 'unset';

        service.prepareEvolution(basePokemon).subscribe((value) => {
          result = value;
        });

        expect(result).toBeNull();
      });

      it('должен возвращать null, когда загруженный вид не совпадает с nextEvolution', () => {
        loadPokemonByName.mockReturnValue(
          of({
            ...fetchedRaichu,
            name: 'pikachu',
            species: 'pikachu',
          }),
        );

        let result: EvolutionResultModel | null | 'unset' = 'unset';

        service.prepareEvolution(basePokemon).subscribe((value) => {
          result = value;
        });

        expect(result).toBeNull();
      });

      it('должен возвращать null, когда у покемона нет nextEvolution', () => {
        let result: EvolutionResultModel | null | 'unset' = 'unset';

        service.prepareEvolution(TEST_POKEMON).subscribe((value) => {
          result = value;
        });

        expect(loadPokemonByName).toHaveBeenCalledTimes(0);
        expect(result).toBeNull();
      });
    });
  });
});
