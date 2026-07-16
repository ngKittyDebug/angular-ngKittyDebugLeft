import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbitraryInteractionEvent, TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import {
  interactWithPokemonState,
  selectPokemonState,
  updateStatusState,
} from '../store/tamagotchi-state-transitions';
import { createInteractionEvent } from './gesture.helper';

const PROPERTY_RUNS = 100;

describe('gesture.helper', () => {
  describe('Happy Path', () => {
    describe('Property 11: улучшение настроения через взаимодействие', () => {
      it('должен монотонно увеличивать настроение с интенсивностью взаимодействия и сохранять историю', () => {
        fc.assert(
          fc.property(
            fc.float({ max: 1, min: 0, noNaN: true }),
            fc.float({ max: 1, min: 0, noNaN: true }),
            arbitraryInteractionEvent(),
            (intensityA, intensityB, interaction) => {
              const low = createInteractionEvent(
                interaction.type,
                Math.min(intensityA, intensityB),
              );
              const high = createInteractionEvent(
                interaction.type,
                Math.max(intensityA, intensityB),
              );

              let state = selectPokemonState(createInitialTamagotchiState(), TEST_POKEMON);

              state = updateStatusState(state, { mood: -40 });

              const moodBefore = state.status.mood;

              state = interactWithPokemonState(state, high);

              const moodAfter = state.status.mood;
              const tracked = state.interactionHistoryList.some(
                (entry) =>
                  entry.type === high.type &&
                  entry.intensity === high.intensity &&
                  entry.moodIncrease === high.moodIncrease,
              );

              return moodAfter > moodBefore && high.moodIncrease >= low.moodIncrease && tracked;
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Property 11: улучшение настроения через взаимодействие', () => {
      it('должен давать одинаковый рост настроения при одинаковой интенсивности', () => {
        const first = createInteractionEvent('click', 0.5);
        const second = createInteractionEvent('click', 0.5);

        expect(first.moodIncrease).toBe(second.moodIncrease);
      });
    });
  });
});
