import { GAME_BALANCE } from '../constants/game-balance.constants';
import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import {
  careForPokemonState,
  checkEvolutionState,
  clearEvolutionReadyNotifiedState,
  completeEvolutionState,
  completeTrainingState,
  feedPokemonState,
  healSelectionOriginIdState,
  interactWithPokemonState,
  markEvolutionReadyNotifiedState,
  putToSleepState,
  restartTrainingTimerState,
  selectPokemonState,
  startTrainingState,
  updateStatusState,
  wakeUpState,
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

    it('должен записывать отдельную метку времени ухода', () => {
      const selected = selectPokemonState(initialTamagotchiState, pokemon);
      const cared = careForPokemonState(selected, FIXED_NOW);

      expect(cared.status.lastCareTime).toBe(FIXED_NOW);
    });

    it('должен записывать отдельную метку времени тренировки после завершения', () => {
      const selected = selectPokemonState(initialTamagotchiState, pokemon);
      const started = startTrainingState(selected, FIXED_NOW, 25);
      const completed = completeTrainingState(started, FIXED_NOW + 1_000, 25);

      expect(completed.status.lastTrainTime).toBe(FIXED_NOW + 1_000);
    });

    it('не должен двигать общий якорь действий при взаимодействии со спрайтом', () => {
      const selected = {
        ...selectPokemonState(initialTamagotchiState, pokemon),
        lastActionTime: FIXED_NOW - 1_000,
      };
      const interacted = interactWithPokemonState(selected, {
        intensity: 1,
        moodIncrease: 5,
        timestamp: FIXED_NOW,
        type: 'click',
      });

      expect(interacted.lastActionTime).toBe(selected.lastActionTime);
    });

    it('должен применять бонус энергии при пробуждении в допустимых пределах', () => {
      const selected = selectPokemonState(initialTamagotchiState, pokemon);
      const prepared = updateStatusState(selected, { energy: -5 });
      const sleeping = putToSleepState(prepared, FIXED_NOW - 1_000);
      const awake = wakeUpState(sleeping, FIXED_NOW, 15);

      expect(awake.status.energy).toBe(GAME_BALANCE.THRESHOLDS.MAXIMUM);
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
      expect(completed.evolutionProgress.readyNotifiedAt).toBeNull();
    });

    it('должен сохранять timestamp уведомления о готовности к эволюции', () => {
      const selected = selectPokemonState(initialTamagotchiState, stage2Pokemon);
      const checked = checkEvolutionState(updateStatusState(selected, { level: 99 }));
      const notifiedAt = 1_700_000_000_000;
      const notified = markEvolutionReadyNotifiedState(checked, notifiedAt);

      expect(notified.evolutionProgress.readyNotifiedAt).toBe(notifiedAt);
    });

    it('должен сбрасывать readyNotifiedAt через clearEvolutionReadyNotifiedState', () => {
      const selected = selectPokemonState(initialTamagotchiState, stage2Pokemon);
      const checked = checkEvolutionState(updateStatusState(selected, { level: 99 }));
      const notified = markEvolutionReadyNotifiedState(checked, 1_700_000_000_000);
      const cleared = clearEvolutionReadyNotifiedState(notified);

      expect(cleared.evolutionProgress.readyNotifiedAt).toBeNull();
    });

    it('должен заполнять selectionOriginId через healSelectionOriginIdState', () => {
      const selected = {
        ...selectPokemonState(initialTamagotchiState, TEST_POKEMON),
        selectionOriginId: null,
      };
      const healed = healSelectionOriginIdState(selected, '25');

      expect(healed.selectionOriginId).toBe('25');
    });

    describe('детерминизм тренировки', () => {
      const fixedReward = 42;

      it('должен давать идентичное состояние тренировки для одинаковых входных данных', () => {
        const selected = selectPokemonState(initialTamagotchiState, pokemon);
        const first = startTrainingState(selected, FIXED_NOW, fixedReward);
        const second = startTrainingState(selected, FIXED_NOW, fixedReward);

        expect(first).toEqual(second);
        expect(first.trainingExperienceReward).toBe(fixedReward);
        expect(first.trainingStartedAt).toBe(FIXED_NOW);
      });

      it('должен перезапускать таймер тренировки без изменения награды', () => {
        const selected = selectPokemonState(initialTamagotchiState, pokemon);
        const training = startTrainingState(selected, FIXED_NOW, fixedReward);
        const restarted = restartTrainingTimerState(training, FIXED_NOW + 10_000);

        expect(restarted.trainingStartedAt).toBe(FIXED_NOW + 10_000);
        expect(restarted.trainingExperienceReward).toBe(fixedReward);
      });
    });
  });
});
