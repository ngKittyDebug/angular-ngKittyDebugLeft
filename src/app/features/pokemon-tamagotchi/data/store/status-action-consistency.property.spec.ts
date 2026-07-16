import * as fc from 'fast-check';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import {
  applyCareAction,
  arbitraryCareAction,
  arbitraryPokemonStatus,
  stateWithPokemon,
} from '../fixtures/tamagotchi-arbitraries';
import type { PokemonStatusModel } from '../models/pokemon-status.model';

const PROPERTY_RUNS = 100;

function isBoundedStatus(status: PokemonStatusModel): boolean {
  const { MAXIMUM, MINIMUM } = GAME_BALANCE.THRESHOLDS;

  return (
    status.health >= MINIMUM &&
    status.health <= MAXIMUM &&
    status.hunger >= MINIMUM &&
    status.hunger <= MAXIMUM &&
    status.mood >= MINIMUM &&
    status.mood <= MAXIMUM &&
    status.energy >= MINIMUM &&
    status.energy <= MAXIMUM &&
    status.hydration >= MINIMUM &&
    status.hydration <= MAXIMUM
  );
}

describe('tamagotchi-state-transitions', () => {
  describe('Property 1: согласованность действий со статусом', () => {
    // Feature: pokemon-tamagotchi, Property 1: Status Action Consistency
    describe('Happy Path', () => {
      it('должен сохранять ограниченные значения статуса после любого действия ухода', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.boolean(),
            arbitraryCareAction(),
            (status, isSleeping, action) => {
              const state = stateWithPokemon(status, isSleeping);
              const next = applyCareAction(state, action);

              return isBoundedStatus(next.status);
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен сохранять ограниченные значения статуса после последовательности действий ухода', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.boolean(),
            fc.array(arbitraryCareAction(), { maxLength: 8, minLength: 1 }),
            (status, isSleeping, actions) => {
              let state = stateWithPokemon(status, isSleeping);

              for (const action of actions) {
                state = applyCareAction(state, action);

                if (!isBoundedStatus(state.status)) {
                  return false;
                }
              }

              return true;
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });
});
