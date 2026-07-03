import { GAME_BALANCE } from '../constants/game-balance.constants';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import {
  addNotificationState,
  dismissNotificationState,
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

    it('должен помечать уведомление прочитанным при закрытии', () => {
      const notification = {
        id: 'alert-1',
        message: 'test',
        priority: 'warning' as const,
        read: false,
        timestamp: 1,
        title: 'test',
      };
      const withNotification = addNotificationState(initialTamagotchiState, notification);
      const dismissed = dismissNotificationState(withNotification, 'alert-1');

      expect(dismissed.notificationList).toHaveLength(1);
      expect(dismissed.notificationList[0]?.read).toBe(true);
    });
  });
});
