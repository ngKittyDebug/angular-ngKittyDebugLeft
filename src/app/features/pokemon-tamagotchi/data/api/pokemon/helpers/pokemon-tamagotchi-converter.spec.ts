import { describe, expect, it } from 'vitest';
import {
  EVOLUTION_REQUIREMENTS,
  EVOLUTION_REQUIREMENTS_STAGE_2,
} from '../../../constants/evolution-criteria.constants';
import { buildLinearEvolutionChain } from '../../../fixtures/tamagotchi-arbitraries';
import { buildNextEvolutionStep } from './pokemon-tamagotchi-converter';

describe('pokemonTamagotchiConverter', () => {
  describe('buildNextEvolutionStep', () => {
    it('должен строить цепочку следующих стадий из API-узла', () => {
      const chain = buildLinearEvolutionChain(3);

      const nextStep = buildNextEvolutionStep(chain);

      expect(nextStep).toEqual({
        pokemonId: 'species-1',
        requirements: EVOLUTION_REQUIREMENTS,
        childNextEvolution: {
          pokemonId: 'species-2',
          requirements: EVOLUTION_REQUIREMENTS_STAGE_2,
          childNextEvolution: undefined,
        },
      });
    });
  });
});
