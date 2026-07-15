import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PokemonTamagotchiApiService } from '../api/pokemon/services/pokemon-tamagotchi-api.service';
import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { EvolutionResultModel } from '../models/evolution.model';
import type { PokemonModel } from '../models/pokemon.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import { createInitialDailyRoutine } from '../store/tamagotchi-initial';
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

  const readyStatus: PokemonStatusModel = {
    energy: 80,
    experience: GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE,
    health: 90,
    hunger: 90,
    hydration: 90,
    lastCareTime: null,
    lastFeedTime: null,
    lastHydrationTime: null,
    lastPlayTime: null,
    lastSaveTime: null,
    lastSleepTime: null,
    lastTrainTime: null,
    level: GAME_BALANCE.EVOLUTION.MIN_LEVEL,
    mood: 90,
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
    describe('checkEvolutionCriteria', () => {
      it('должен быть готов, только когда все требования выполнены', () => {
        const result = service.checkEvolutionCriteria(
          basePokemon,
          readyStatus,
          [],
          createInitialDailyRoutine(),
        );

        expect(result.isReady).toBe(true);
        expect(result.missingRequirements).toEqual([]);
        expect(result.progress.currentProgress['level']).toBe(GAME_BALANCE.EVOLUTION.MIN_LEVEL);
        expect(result.progress.currentProgress['experience']).toBe(
          GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE,
        );
      });
    });

    describe('getRequirementCompletionRatio', () => {
      it('должен возвращать пропорциональный прогресс к требованию', () => {
        const ratio = service.getRequirementCompletionRatio(
          EVOLUTION_REQUIREMENTS[0],
          { ...readyStatus, level: 5 },
          [],
          createInitialDailyRoutine(),
        );

        expect(ratio).toBeCloseTo(5 / GAME_BALANCE.EVOLUTION.MIN_LEVEL);
      });
    });

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

    describe('getEvolutionChain', () => {
      it('должен возвращать цепочку эволюции из покемона', () => {
        expect(service.getEvolutionChain(basePokemon)).toEqual(basePokemon.evolutionChain);
      });
    });
  });

  describe('Negative Cases', () => {
    describe('checkEvolutionCriteria', () => {
      it('не должен быть готов, когда не выполнено хотя бы одно требование', () => {
        const result = service.checkEvolutionCriteria(
          basePokemon,
          { ...readyStatus, level: 1 },
          [],
          createInitialDailyRoutine(),
        );

        expect(result.isReady).toBe(false);
        expect(result.missingRequirements.length).toBeGreaterThan(0);
      });
    });

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

        expect(loadPokemonByName).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });
    });
  });
});
