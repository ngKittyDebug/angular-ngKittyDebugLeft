import * as fc from 'fast-check';
import { describe, it } from 'vitest';

import { PERFORMANCE_PROFILES } from '../constants/performance-mode.constants';
import { profileToGarbageCollectLimits } from '../helpers/memory-management.helper';
import {
  garbageCollectState,
  interactWithPokemonState,
  selectPokemonState,
} from '../store/tamagotchi-state-transitions';
import { initialTamagotchiState } from '../store/tamagotchi-initial';
import { arbitraryInteractionEvent, TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';

const PROPERTY_RUNS = 100;
const FIXED_NOW = 1_700_000_000_000;

function withPokemon(state: TamagotchiStateModel): TamagotchiStateModel {
  return selectPokemonState(state, TEST_POKEMON);
}

function isWithinProfileLimits(
  state: TamagotchiStateModel,
  profileKey: keyof typeof PERFORMANCE_PROFILES,
): boolean {
  const profile = PERFORMANCE_PROFILES[profileKey];

  return (
    state.interactionHistory.length <= profile.interactionHistoryLimit &&
    state.notificationList.length <= profile.notificationHistoryLimit
  );
}

describe('memory-management.helper', () => {
  describe('Property 17: ограниченность управления памятью', () => {
    // Feature: pokemon-tamagotchi, Property 17: Memory Management Boundedness
    describe('Happy Path', () => {
      it('должен удерживать историю взаимодействий в пределах профиля после повторных взаимодействий и сборки мусора', () => {
        fc.assert(
          fc.property(
            fc.array(arbitraryInteractionEvent(), { maxLength: 80, minLength: 1 }),
            fc.constantFrom('high' as const, 'balanced' as const, 'low' as const),
            (interactions, profileKey) => {
              let state = withPokemon(initialTamagotchiState);

              for (const interaction of interactions) {
                state = interactWithPokemonState(state, interaction, FIXED_NOW);
              }

              state = garbageCollectState(
                state,
                profileToGarbageCollectLimits(PERFORMANCE_PROFILES[profileKey]),
              );

              return isWithinProfileLimits(state, profileKey);
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });

    describe('Edge Cases', () => {
      it('не должен превышать абсолютные максимальные лимиты коллекций даже без сборки мусора', () => {
        fc.assert(
          fc.property(
            fc.array(arbitraryInteractionEvent(), { maxLength: 120, minLength: 1 }),
            (interactions) => {
              let state = withPokemon(initialTamagotchiState);

              for (const interaction of interactions) {
                state = interactWithPokemonState(state, interaction, FIXED_NOW);
              }

              return state.interactionHistory.length <= 50 && state.notificationList.length <= 20;
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });
});
