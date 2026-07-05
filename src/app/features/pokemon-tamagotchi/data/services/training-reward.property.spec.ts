import * as fc from 'fast-check';
import { TestBed } from '@angular/core/testing';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { rollTrainingExperienceGain } from '../helpers/training-reward.helper';
import { TamagotchiService } from './tamagotchi.service';

const PROPERTY_RUNS = 100;

describe('TamagotchiService', () => {
  describe('Property 8: награда опыта за тренировку', () => {
    let service: TamagotchiService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(TamagotchiService);
    });

    // Feature: pokemon-tamagotchi, Property 8: Training Experience Reward
    describe('Happy Path', () => {
      it('должен оставаться в пределах настроенных минимума и максимума', () => {
        const { min, max } = GAME_BALANCE.ACTION_EFFECTS.TRAIN.experienceReward;

        fc.assert(
          fc.property(fc.float({ max: 1, min: 0, noNaN: true }), (random) => {
            const gain = service.rollTrainingExperienceGain(random);

            return gain >= min && gain <= max;
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });

    describe('Edge Cases', () => {
      it('должен возвращать минимум при random равном нулю', () => {
        const { min } = GAME_BALANCE.ACTION_EFFECTS.TRAIN.experienceReward;

        expect(rollTrainingExperienceGain(0)).toBe(min);
        expect(service.rollTrainingExperienceGain(0)).toBe(min);
      });

      it('должен возвращать максимум, когда random приближается к единице', () => {
        const { max } = GAME_BALANCE.ACTION_EFFECTS.TRAIN.experienceReward;

        expect(rollTrainingExperienceGain(0.999_999)).toBe(max);
        expect(service.rollTrainingExperienceGain(0.999_999)).toBe(max);
      });
    });
  });
});
