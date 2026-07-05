import { GAME_BALANCE } from '../constants/game-balance.constants';
import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import {
  checkEvolutionState,
  completeEvolutionState,
  feedPokemonState,
  selectPokemonState,
  updateStatusState,
  waterPokemonState,
} from './tamagotchi-state-transitions';
import { initialTamagotchiState } from './tamagotchi-initial';

const FIXED_NOW = 1_700_000_000_000;

describe('tamagotchiStateTransitions', () => {
  const pokemon = TEST_POKEMON;

  describe('Edge Cases', () => {
    it('должен игнорировать кормление, когда покемон не выбран', () => {
      const result = feedPokemonState(initialTamagotchiState, FIXED_NOW);

      expect(result).toEqual(initialTamagotchiState);
    });
  });

  describe('Happy Path', () => {
    it('должен применять эффекты кормления в допустимых пределах', () => {
      const selected = selectPokemonState(initialTamagotchiState, pokemon);
      const prepared = updateStatusState(selected, { energy: -10, hunger: -50, mood: -50 });
      const fed = feedPokemonState(prepared, FIXED_NOW);
      const { hungerIncrease, moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.FEED;

      expect(fed.status.hunger).toBe(prepared.status.hunger + hungerIncrease);
      expect(fed.status.mood).toBe(prepared.status.mood + moodIncrease);
      expect(fed.status.energy).toBe(prepared.status.energy - energyCost);
      expect(fed.status.hunger).toBeLessThanOrEqual(GAME_BALANCE.THRESHOLDS.MAXIMUM);
      expect(fed.status.energy).toBeGreaterThanOrEqual(GAME_BALANCE.THRESHOLDS.MINIMUM);
    });

    it('должен применять эффекты поения, когда покемон выбран', () => {
      const selected = selectPokemonState(initialTamagotchiState, pokemon);
      const prepared = updateStatusState(selected, { energy: -10, hydration: -50 });
      const watered = waterPokemonState(prepared, FIXED_NOW);
      const { hydrationIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.WATER;

      expect(watered.status.hydration).toBe(prepared.status.hydration + hydrationIncrease);
      expect(watered.status.energy).toBe(prepared.status.energy - energyCost);
    });

    it('должен давать идентичные результаты кормления для одной и той же метки времени', () => {
      const selected = selectPokemonState(initialTamagotchiState, pokemon);
      const prepared = updateStatusState(selected, { energy: -10, hunger: -50, mood: -50 });
      const first = feedPokemonState(prepared, FIXED_NOW);
      const second = feedPokemonState(prepared, FIXED_NOW);

      expect(first).toEqual(second);
    });
  });

  describe('Эволюция', () => {
    const stage2Pokemon: PokemonModel = {
      ...TEST_POKEMON,
      evolutionChain: {
        currentStage: 2,
        nextEvolution: {
          pokemonId: '3',
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

    it('должен сверять готовность к эволюции с requirements текущего покемона', () => {
      const selected = selectPokemonState(initialTamagotchiState, stage2Pokemon);

      expect(selected.evolutionProgress.requirements[0]?.value).toBe(99);

      const meetsDefaultThreshold = updateStatusState(selected, {
        level: GAME_BALANCE.EVOLUTION.MIN_LEVEL,
      });
      const checkedDefault = checkEvolutionState(meetsDefaultThreshold);

      expect(checkedDefault.evolutionProgress.isReady).toBe(false);

      const meetsCustomThreshold = updateStatusState(selected, { level: 99 });
      const checkedCustom = checkEvolutionState(meetsCustomThreshold);

      expect(checkedCustom.evolutionProgress.isReady).toBe(true);
    });

    it('должен пересчитывать requirements после completeEvolution', () => {
      const stage1Pokemon: PokemonModel = {
        ...TEST_POKEMON,
        evolutionChain: {
          currentStage: 1,
          nextEvolution: {
            pokemonId: '26',
            requirements: EVOLUTION_REQUIREMENTS,
            childNextEvolution: {
              pokemonId: '3',
              requirements: [
                {
                  type: 'level',
                  value: 99,
                  description: 'Reach level 99',
                },
              ],
            },
          },
          totalStages: 3,
        },
      };
      const evolvedPokemon: PokemonModel = {
        ...TEST_POKEMON,
        evolutionChain: {
          currentStage: 2,
          nextEvolution: {
            pokemonId: '3',
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
        id: '26',
        isFirstStage: false,
      };

      const selected = selectPokemonState(initialTamagotchiState, stage1Pokemon);
      const completed = completeEvolutionState({ ...selected, isEvolving: true }, evolvedPokemon);

      expect(completed.evolutionProgress.requirements[0]?.value).toBe(99);
      expect(completed.evolutionProgress.isReady).toBe(false);
    });
  });
});
