import { feedPokemon, selectPokemon, updateStatus, waterPokemon } from './tamagotchi.actions';
import { tamagotchiReducer } from './tamagotchi.reducer';
import { initialTamagotchiState } from './tamagotchi.state';
import { GAME_BALANCE } from '../constants/game-balance.constants';

describe('tamagotchiReducer', () => {
  const pokemon = {
    baseStats: {
      energyRestorationRate: 1,
      experienceMultiplier: 1,
      hungerDecayRate: 1,
      moodDecayRate: 1,
    },
    evolutionChain: { currentStage: 1, totalStages: 3 },
    id: '25',
    isFirstStage: true,
    name: 'Pikachu',
    species: 'pikachu',
    spriteUrls: {
      eating: '',
      evolving: '',
      happy: '',
      normal: '',
      sad: '',
      sleeping: '',
    },
  };

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
});
