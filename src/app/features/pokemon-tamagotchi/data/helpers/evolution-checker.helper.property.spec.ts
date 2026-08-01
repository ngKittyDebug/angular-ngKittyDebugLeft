import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { EvolutionRequirementModel } from '../models/evolution.model';
import {
  buildEvolutionProgressValues,
  evaluateEvolutionRequirements,
} from './evolution-checker.helper';
import {
  arbitraryEvolutionRequirements,
  arbitraryPokemonStatus,
  arbitraryTrainingAchievements,
} from '../fixtures/tamagotchi-arbitraries';

const PROPERTY_RUNS = 100;

const LEVEL_AND_EXPERIENCE: EvolutionRequirementModel[] = [
  { description: 'level', type: 'level', value: 10 },
  { description: 'experience', type: 'experience', value: 100 },
];

describe('evolution-checker.helper', () => {
  describe('Property 4: конъюнкция критериев эволюции', () => {
    // Feature: pokemon-tamagotchi, Property 4: Evolution Criteria Conjunction
    describe('Happy Path', () => {
      it('должен быть ready когда progress покрывает все фиксированные требования', () => {
        const result = evaluateEvolutionRequirements(LEVEL_AND_EXPERIENCE, {
          experience: 100,
          level: 10,
        });

        expect(result.isReady).toBe(true);
        expect(result.missingRequirements).toEqual([]);
      });

      it('должен оставлять unmet требования в missingRequirements', () => {
        const result = evaluateEvolutionRequirements(LEVEL_AND_EXPERIENCE, {
          experience: 99,
          level: 10,
        });

        expect(result.isReady).toBe(false);
        expect(result.missingRequirements).toEqual([LEVEL_AND_EXPERIENCE[1]]);
      });

      it('должен согласовывать isReady с пустым missing и покрытием progress', () => {
        fc.assert(
          fc.property(
            arbitraryEvolutionRequirements(),
            fc.dictionary(fc.string(), fc.nat({ max: 3_000 })),
            (requirements, progress) => {
              const result = evaluateEvolutionRequirements(requirements, progress);
              const missingMatchRequirements = result.missingRequirements.every((requirement) =>
                requirements.some(
                  (candidate) =>
                    candidate.type === requirement.type && candidate.value === requirement.value,
                ),
              );
              const missingAreUnmet = result.missingRequirements.every(
                (requirement) => (progress[requirement.type] ?? 0) < requirement.value,
              );
              const keptAreMet = requirements
                .filter(
                  (requirement) =>
                    !result.missingRequirements.some(
                      (missing) =>
                        missing.type === requirement.type && missing.value === requirement.value,
                    ),
                )
                .every((requirement) => (progress[requirement.type] ?? 0) >= requirement.value);

              return (
                result.isReady === (result.missingRequirements.length === 0) &&
                missingMatchRequirements &&
                missingAreUnmet &&
                keptAreMet
              );
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен строить progress из статуса и согласовывать контракт missing/isReady', () => {
        fc.assert(
          fc.property(
            arbitraryEvolutionRequirements(),
            arbitraryPokemonStatus(),
            arbitraryTrainingAchievements(),
            fc.nat({ max: 365 }),
            (requirements, status, achievementList, consecutiveDays) => {
              const currentProgress = buildEvolutionProgressValues(
                status,
                achievementList,
                consecutiveDays,
              );
              const result = evaluateEvolutionRequirements(requirements, currentProgress);

              return (
                result.isReady === (result.missingRequirements.length === 0) &&
                result.missingRequirements.every(
                  (requirement) => (currentProgress[requirement.type] ?? 0) < requirement.value,
                )
              );
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });

    describe('Edge Cases', () => {
      it('должен быть ready для пустого списка требований', () => {
        const result = evaluateEvolutionRequirements([], {});

        expect(result.isReady).toBe(true);
        expect(result.missingRequirements).toEqual([]);
      });

      it('должен быть ready на точной границе значения требования', () => {
        const requirements: EvolutionRequirementModel[] = [
          { description: 'care', type: 'care', value: 5 },
        ];
        const result = evaluateEvolutionRequirements(requirements, { care: 5 });

        expect(result.isReady).toBe(true);
        expect(result.missingRequirements).toEqual([]);
      });
    });
  });
});
