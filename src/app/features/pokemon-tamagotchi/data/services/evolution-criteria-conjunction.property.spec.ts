import * as fc from 'fast-check';
import type { EvolutionRequirementModel } from '../models/evolution.model';
import {
  checkEvolutionCriteria,
  evaluateEvolutionRequirements,
  getRequirementCompletionRatio,
} from '../helpers/evolution-checker.helper';
import {
  arbitraryEvolutionRequirements,
  arbitraryPokemonStatus,
  arbitraryTrainingAchievements,
} from '../fixtures/tamagotchi-arbitraries';

const PROPERTY_RUNS = 100;

function isRequirementSatisfied(
  requirements: EvolutionRequirementModel[],
  progress: Record<string, number>,
): boolean {
  return requirements.every(
    (requirement) => (progress[requirement.type] ?? 0) >= requirement.value,
  );
}

describe('evolution-checker.helper', () => {
  describe('Property 4: конъюнкция критериев эволюции', () => {
    // Feature: pokemon-tamagotchi, Property 4: Evolution Criteria Conjunction
    describe('Happy Path', () => {
      it('должен быть готов только когда каждое требование выполнено одновременно', () => {
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

      it('должен отслеживать пропорциональные коэффициенты выполнения от 0 до 1', () => {
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

      it('должен согласовывать интегрированные проверки эволюции с семантикой конъюнкции', () => {
        fc.assert(
          fc.property(
            arbitraryEvolutionRequirements(),
            arbitraryPokemonStatus(),
            arbitraryTrainingAchievements(),
            fc.nat({ max: 365 }),
            (requirements, status, achievementList, consecutiveDays) => {
              const result = checkEvolutionCriteria(
                requirements,
                status,
                achievementList,
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
});
