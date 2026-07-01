import { TEST_POKEMON } from '../testing/tamagotchi-arbitraries';
import { feedPokemon, selectPokemon, updateStatus, waterPokemon } from './tamagotchi.actions';
import * as TamagotchiActions from './tamagotchi.actions';
import { tamagotchiReducer } from './tamagotchi.reducer';
import { initialTamagotchiState } from './tamagotchi.state';
import { GAME_BALANCE } from '../constants/game-balance.constants';

describe('tamagotchiReducer', () => {
  const pokemon = TEST_POKEMON;

  const stateWithPokemon = tamagotchiReducer(initialTamagotchiState, feedPokemon());

  it('should ignore feed when no pokemon is selected', () => {
    expect(stateWithPokemon).toEqual(initialTamagotchiState);
  });

  it('should apply feed effects within valid bounds', () => {
    const selected = tamagotchiReducer(initialTamagotchiState, selectPokemon({ pokemon }));
    const prepared = tamagotchiReducer(
      selected,
      updateStatus({ statusUpdate: { energy: -10, hunger: -50, mood: -50 } }),
    );
    const fed = tamagotchiReducer(prepared, feedPokemon());
    const { hungerIncrease, moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.FEED;

    expect(fed.status.hunger).toBe(prepared.status.hunger + hungerIncrease);
    expect(fed.status.mood).toBe(prepared.status.mood + moodIncrease);
    expect(fed.status.energy).toBe(prepared.status.energy - energyCost);
    expect(fed.status.hunger).toBeLessThanOrEqual(GAME_BALANCE.THRESHOLDS.MAXIMUM);
    expect(fed.status.energy).toBeGreaterThanOrEqual(GAME_BALANCE.THRESHOLDS.MINIMUM);
  });

  it('should apply water effects when pokemon is selected', () => {
    const selected = tamagotchiReducer(initialTamagotchiState, selectPokemon({ pokemon }));
    const prepared = tamagotchiReducer(
      selected,
      updateStatus({ statusUpdate: { energy: -10, hydration: -50 } }),
    );
    const watered = tamagotchiReducer(prepared, waterPokemon());
    const { hydrationIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.WATER;

    expect(watered.status.hydration).toBe(prepared.status.hydration + hydrationIncrease);
    expect(watered.status.energy).toBe(prepared.status.energy - energyCost);
  });

  it('should mark notification as read on dismiss', () => {
    const notification = {
      id: 'alert-1',
      message: 'test',
      priority: 'warning' as const,
      read: false,
      timestamp: 1,
      title: 'test',
    };
    const withNotification = tamagotchiReducer(
      initialTamagotchiState,
      TamagotchiActions.addNotification({ notification }),
    );

    const dismissed = tamagotchiReducer(
      withNotification,
      TamagotchiActions.dismissNotification({ id: 'alert-1' }),
    );

    expect(dismissed.notifications).toHaveLength(1);
    expect(dismissed.notifications[0]?.read).toBe(true);
  });
});
