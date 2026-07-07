import { TestBed } from '@angular/core/testing';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { createInitialDailyRoutine } from '../store/tamagotchi-initial';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import { EvolutionService } from './evolution.service';

describe('EvolutionService', () => {
  let service: EvolutionService;

  const basePokemon: PokemonModel = {
    ...TEST_POKEMON,
    evolutionChain: {
      currentStage: 1,
      nextEvolution: {
        pokemonId: '26',
        requirements: EVOLUTION_REQUIREMENTS,
      },
      totalStages: 3,
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
    TestBed.configureTestingModule({});
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

    describe('triggerEvolution', () => {
      it('должен возвращать эволюционировавшего покемона, когда данные критериев совпадают с цепочкой', () => {
        const evolutionData = service.buildEvolutionData(basePokemon);

        expect(evolutionData).not.toBeNull();

        const result = service.triggerEvolution(basePokemon, evolutionData!);

        expect(result).not.toBeNull();
        expect(result?.evolvedPokemon.id).toBe('26');
        expect(result?.evolvedPokemon.isFirstStage).toBe(false);
        expect(result?.evolvedPokemon.evolutionChain.currentStage).toBe(2);
      });

      it('должен сохранять nextEvolution для второй ступени из childNextEvolution', () => {
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
        const evolutionData = service.buildEvolutionData(threeStagePokemon);

        expect(evolutionData).not.toBeNull();

        const result = service.triggerEvolution(threeStagePokemon, evolutionData!);

        expect(result?.evolvedPokemon.evolutionChain.nextEvolution?.pokemonId).toBe('venusaur');
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

    describe('triggerEvolution', () => {
      it('должен возвращать null, когда данные эволюции не совпадают с покемоном', () => {
        const evolutionData = service.buildEvolutionData(basePokemon)!;

        const result = service.triggerEvolution({ ...basePokemon, id: '999' }, evolutionData);

        expect(result).toBeNull();
      });
    });
  });
});
