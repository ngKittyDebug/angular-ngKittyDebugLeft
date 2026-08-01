import * as fc from 'fast-check';
import { applyDecayToStatus, calculateDecay, decayAmountForElapsed } from './status-decay.helper';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { arbitraryPokemonStatus } from '../fixtures/tamagotchi-arbitraries';

const PROPERTY_RUNS = 100;
const RATE_EPSILON = 1e-9;

function ratesMatch(
  first: number,
  firstElapsed: number,
  second: number,
  secondElapsed: number,
): boolean {
  if (firstElapsed <= 0 || secondElapsed <= 0) {
    return first === 0 && second === 0;
  }

  return Math.abs(first / firstElapsed - second / secondElapsed) <= RATE_EPSILON;
}

describe('status-decay.helper', () => {
  describe('Property 2: монотонность уменьшения статуса', () => {
    // Feature: pokemon-tamagotchi, Property 2: Status Decay Monotonicity
    describe('Happy Path', () => {
      it('должен масштабировать уменьшение линейно с прошедшим временем', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.integer({ max: 7 * 24 * 60 * 60 * 1000, min: 1 }),
            fc.integer({ max: 7 * 24 * 60 * 60 * 1000, min: 1 }),
            fc.boolean(),
            (status, elapsedA, elapsedB, isSleeping) => {
              const decayA = calculateDecay(elapsedA, status, isSleeping);
              const decayB = calculateDecay(elapsedB, status, isSleeping);

              return (
                ratesMatch(decayA.hunger, elapsedA, decayB.hunger, elapsedB) &&
                ratesMatch(decayA.mood, elapsedA, decayB.mood, elapsedB) &&
                ratesMatch(decayA.hydration, elapsedA, decayB.hydration, elapsedB) &&
                ratesMatch(Math.abs(decayA.energy), elapsedA, Math.abs(decayB.energy), elapsedB)
              );
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен сохранять монотонность величин уменьшения при увеличении интервалов', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.integer({ max: 3 * 24 * 60 * 60 * 1000, min: 1 }),
            fc.integer({ max: 3 * 24 * 60 * 60 * 1000, min: 1 }),
            fc.boolean(),
            (status, shorterElapsed, longerDelta, isSleeping) => {
              const longerElapsed = shorterElapsed + longerDelta;
              const shorterDecay = calculateDecay(shorterElapsed, status, isSleeping);
              const longerDecay = calculateDecay(longerElapsed, status, isSleeping);

              return (
                longerDecay.hunger >= shorterDecay.hunger &&
                longerDecay.mood >= shorterDecay.mood &&
                longerDecay.hydration >= shorterDecay.hydration &&
                Math.abs(longerDecay.energy) >= Math.abs(shorterDecay.energy)
              );
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен удовлетворять аддитивности для разбитых временных интервалов', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.integer({ max: 24 * 60 * 60 * 1000, min: 1 }),
            fc.integer({ max: 24 * 60 * 60 * 1000, min: 1 }),
            fc.boolean(),
            (status, elapsedA, elapsedB, isSleeping) => {
              const decayA = calculateDecay(elapsedA, status, isSleeping);
              const decayB = calculateDecay(elapsedB, status, isSleeping);
              const combined = calculateDecay(elapsedA + elapsedB, status, isSleeping);

              return (
                Math.abs(combined.hunger - (decayA.hunger + decayB.hunger)) <= RATE_EPSILON &&
                Math.abs(combined.mood - (decayA.mood + decayB.mood)) <= RATE_EPSILON &&
                Math.abs(combined.hydration - (decayA.hydration + decayB.hydration)) <=
                  RATE_EPSILON &&
                Math.abs(combined.energy - (decayA.energy + decayB.energy)) <= RATE_EPSILON
              );
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });

    describe('Edge Cases', () => {
      it('не должен увеличивать потребности после уменьшения в бодрствовании и должен восстанавливать энергию во сне', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.integer({ max: 12 * 60 * 60 * 1000, min: 1 }),
            fc.boolean(),
            (status, elapsedMs, isSleeping) => {
              const decay = calculateDecay(elapsedMs, status, isSleeping);
              const after = applyDecayToStatus(status, decay);

              const needsDoNotIncrease =
                after.hunger <= status.hunger &&
                after.mood <= status.mood &&
                after.hydration <= status.hydration;

              if (!needsDoNotIncrease) {
                return false;
              }

              if (isSleeping) {
                const restored = decayAmountForElapsed(
                  GAME_BALANCE.ACTION_EFFECTS.SLEEP.energyRestore,
                  elapsedMs,
                );

                return after.energy >= status.energy || restored === 0 || status.energy === 100;
              }

              return after.energy <= status.energy;
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });
});
