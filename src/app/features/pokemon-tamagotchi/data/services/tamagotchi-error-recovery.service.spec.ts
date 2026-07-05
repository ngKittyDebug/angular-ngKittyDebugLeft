import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import { TamagotchiErrorRecoveryService } from './tamagotchi-error-recovery.service';

describe('TamagotchiErrorRecoveryService', () => {
  let service: TamagotchiErrorRecoveryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TamagotchiErrorRecoveryService);
  });

  describe('repairState', () => {
    it('должен синхронизировать evolution requirements с chain покемона', () => {
      const pokemon: PokemonModel = {
        ...TEST_POKEMON,
        evolutionChain: {
          currentStage: 2,
          nextEvolution: {
            pokemonId: 'venusaur',
            requirements: [
              {
                type: 'level',
                value: 99,
                description: 'Reach level 99',
              },
            ],
          },
          totalStages: 3,
        },
      };
      const state = {
        ...createInitialTamagotchiState(),
        evolutionProgress: {
          currentProgress: { level: 50 },
          isReady: false,
          requirements: [
            {
              type: 'level' as const,
              value: 1,
              description: 'Stale threshold',
            },
          ],
        },
        initialized: true,
        pokemon,
        status: createInitialTamagotchiState().status,
      };

      const repaired = service.repairState(state);

      expect(repaired?.evolutionProgress.requirements[0]?.value).toBe(99);
    });
  });
});
