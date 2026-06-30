import * as fc from 'fast-check';
import type { EvolutionRequirement } from '../../models/evolution.model';
import {
  checkEvolutionCriteria,
  evaluateEvolutionRequirements,
  getRequirementCompletionRatio,
} from '../helpers/evolution-checker.helper';
import {
  arbitraryEvolutionRequirements,
  arbitraryPokemonStatus,
  arbitraryTrainingAchievements,
} from '../testing/tamagotchi-arbitraries';

const PROPERTY_RUNS = 100;

function isRequirementSatisfied(
  requirements: EvolutionRequirement[],
  progress: Record<string, number>,
): boolean {
  return requirements.every(
    (requirement) => (progress[requirement.type] ?? 0) >= requirement.value,
  );
}

describe('Tamagotchi property tests', () => {
  describe('Property 4: Evolution Criteria Conjunction', () => {
    // Feature: pokemon-tamagotchi, Property 4: Evolution Criteria Conjunction
    it('should be ready only when every requirement is simultaneously satisfied', () => {
      fc.assert(
        fc.property(
          arbitraryEvolutionRequirements(),
          fc.dictionary(fc.string(), fc.nat({ max: 3_000 })),
          (requirements, progress) => {
            const result = evaluateEvolutionRequirements(requirements, progress);
            const expectedReady = isRequirementSatisfied(requirements, progress);

            if (result.isReady !== expectedReady) {
              return false;
            }

            if (result.isReady && result.missingRequirements.length > 0) {
              return false;
            }

            if (!result.isReady && result.missingRequirements.length === 0) {
              return false;
            }

            return result.missingRequirements.every(
              (requirement) => (progress[requirement.type] ?? 0) < requirement.value,
            );
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should track proportional completion ratios between 0 and 1', () => {
      fc.assert(
        fc.property(
          arbitraryEvolutionRequirements(),
          fc.dictionary(fc.string(), fc.nat({ max: 3_000 })),
          (requirements, progress) => {
            for (const requirement of requirements) {
              const ratio = getRequirementCompletionRatio(requirement, progress);

              if (ratio < 0 || ratio > 1) {
                return false;
              }

              const current = progress[requirement.type] ?? 0;

              if (current >= requirement.value && ratio !== 1) {
                return false;
              }

              if (current <= 0 && requirement.value > 0 && ratio !== 0) {
                return false;
              }
            }

            return true;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should align integrated evolution checks with conjunction semantics', () => {
      fc.assert(
        fc.property(
          arbitraryEvolutionRequirements(),
          arbitraryPokemonStatus(),
          arbitraryTrainingAchievements(),
          fc.nat({ max: 365 }),
          (requirements, status, achievements, consecutiveDays) => {
            const result = checkEvolutionCriteria(
              requirements,
              status,
              achievements,
              consecutiveDays,
            );

            return (
              result.isReady ===
              isRequirementSatisfied(requirements, result.progress.currentProgress)
            );
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });
});
