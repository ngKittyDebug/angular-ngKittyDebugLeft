import * as fc from 'fast-check';
import type { EvolutionRequirementModel } from '../models/evolution.model';
import {
  buildEvolutionProgressValues,
  evaluateEvolutionRequirements,
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

      it('должен согласовывать прогресс эволюции с семантикой конъюнкции', () => {
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

              return result.isReady === isRequirementSatisfied(requirements, currentProgress);
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });
});
