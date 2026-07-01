import * as fc from 'fast-check';
import { describe, it } from 'vitest';

import { PERFORMANCE_PROFILES } from '../constants/performance-mode.constants';
import { profileToGarbageCollectLimits } from '../helpers/memory-management.helper';
import { garbageCollect, interactWithPokemon, selectPokemon } from '../store/tamagotchi.actions';
import { tamagotchiReducer } from '../store/tamagotchi.reducer';
import { initialTamagotchiState } from '../store/tamagotchi.state';
import { arbitraryInteractionEvent, TEST_POKEMON } from '../testing/tamagotchi-arbitraries';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';

const PROPERTY_RUNS = 100;

function withPokemon(state: TamagotchiState): TamagotchiState {
  return tamagotchiReducer(state, selectPokemon({ pokemon: TEST_POKEMON }));
}

function isWithinProfileLimits(
  state: TamagotchiState,
  profileKey: keyof typeof PERFORMANCE_PROFILES,
): boolean {
  const profile = PERFORMANCE_PROFILES[profileKey];

  return (
    state.interactionHistory.length <= profile.interactionHistoryLimit &&
    state.notifications.length <= profile.notificationHistoryLimit
  );
}

describe('Tamagotchi Property Tests', () => {
  describe('Property 17: Memory Management Boundedness', () => {
    // Feature: pokemon-tamagotchi, Property 17: Memory Management Boundedness
    it('should keep interaction history within profile limits after repeated interactions and garbage collection', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryInteractionEvent(), { maxLength: 80, minLength: 1 }),
          fc.constantFrom('high' as const, 'balanced' as const, 'low' as const),
          (interactions, profileKey) => {
            let state = withPokemon(initialTamagotchiState);

            for (const interaction of interactions) {
              state = tamagotchiReducer(
                state,
                interactWithPokemon({
                  interaction,
                }),
              );
            }

            state = tamagotchiReducer(
              state,
              garbageCollect({
                limits: profileToGarbageCollectLimits(PERFORMANCE_PROFILES[profileKey]),
              }),
            );

            return isWithinProfileLimits(state, profileKey);
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should never grow collections beyond absolute max caps even without garbage collection', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryInteractionEvent(), { maxLength: 120, minLength: 1 }),
          (interactions) => {
            let state = withPokemon(initialTamagotchiState);

            for (const interaction of interactions) {
              state = tamagotchiReducer(
                state,
                interactWithPokemon({
                  interaction,
                }),
              );
            }

            return state.interactionHistory.length <= 50 && state.notifications.length <= 20;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });
});
