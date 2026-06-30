import * as fc from 'fast-check';
import { TestBed } from '@angular/core/testing';
import { MINI_GAME_CONFIGS } from '../constants/mini-game.constants';
import type { GameResult, MiniGameType } from '../../models/mini-game.model';
import { TamagotchiService } from './tamagotchi.service';

const PROPERTY_RUNS = 100;

const miniGameTypes = Object.keys(MINI_GAME_CONFIGS) as MiniGameType[];

const arbitraryPerformance = fc.float({
  max: 1,
  min: 0,
  noDefaultInfinity: true,
  noNaN: true,
});

const arbitraryPositivePerformance = fc.float({
  max: 1,
  min: Math.fround(1e-6),
  noDefaultInfinity: true,
  noNaN: true,
});

function buildPerformanceResult(gameType: MiniGameType, performance: number): GameResult {
  return {
    experienceEarned: 0,
    gameType,
    maxScore: 100,
    performance,
    score: Math.round(performance * 100),
    timeTaken: 1_000,
  };
}

describe('Tamagotchi property tests', () => {
  describe('Property 8: Mini-Game Performance Scaling', () => {
    let service: TamagotchiService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(TamagotchiService);
    });

    // Feature: pokemon-tamagotchi, Property 8: Mini-Game Performance Scaling
    it('should award zero experience when performance is zero or negative', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...miniGameTypes),
          fc.integer({ max: 50, min: 1 }),
          fc.float({ max: 0, min: -1, noNaN: true }),
          (gameType, level, performance) => {
            const gain = service.calculateExperienceGain(
              {
                experienceEarned: 0,
                gameType,
                maxScore: 100,
                performance,
                score: 0,
                timeTaken: 1_000,
              },
              level,
            );

            return gain === 0;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should scale experience monotonically with performance for every game type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...miniGameTypes),
          fc.integer({ max: 30, min: 1 }),
          arbitraryPerformance,
          arbitraryPerformance,
          (gameType, level, performanceA, performanceB) => {
            const lowPerformance = Math.min(performanceA, performanceB);
            const highPerformance = Math.max(performanceA, performanceB);
            const lowGain = service.calculateExperienceGain(
              {
                experienceEarned: 0,
                gameType,
                maxScore: 100,
                performance: lowPerformance,
                score: Math.round(lowPerformance * 100),
                timeTaken: 1_000,
              },
              level,
            );
            const highGain = service.calculateExperienceGain(
              {
                experienceEarned: 0,
                gameType,
                maxScore: 100,
                performance: highPerformance,
                score: Math.round(highPerformance * 100),
                timeTaken: 1_000,
              },
              level,
            );

            return lowGain <= highGain;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should follow the configured reward formula for each mini-game type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...miniGameTypes),
          fc.integer({ max: 30, min: 1 }),
          arbitraryPositivePerformance,
          (gameType, level, performance) => {
            const config = MINI_GAME_CONFIGS[gameType];
            const { base, multiplier } = config.experienceReward;
            const rawReward = Math.round(base * performance * multiplier);
            const levelFactor = 1 + Math.max(0, level - 1) * 0.05;
            const expected = Math.max(0, Math.round(rawReward / levelFactor));
            const actual = service.calculateExperienceGain(
              {
                experienceEarned: 0,
                gameType,
                maxScore: 100,
                performance,
                score: Math.round(performance * 100),
                timeTaken: 1_000,
              },
              level,
            );

            return actual === expected;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should keep experience non-decreasing when level increases at fixed performance', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...miniGameTypes),
          fc.integer({ max: 25, min: 1 }),
          fc.integer({ max: 25, min: 1 }),
          arbitraryPositivePerformance,
          (gameType, lowerLevel, levelDelta, performance) => {
            const higherLevel = lowerLevel + levelDelta;
            const lowerGain = service.calculateExperienceGain(
              buildPerformanceResult(gameType, performance),
              lowerLevel,
            );
            const higherGain = service.calculateExperienceGain(
              buildPerformanceResult(gameType, performance),
              higherLevel,
            );

            return higherGain <= lowerGain;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should embed the same scaled experience in buildGameResult', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...miniGameTypes),
          fc.integer({ max: 30, min: 1 }),
          fc.integer({ max: 1_000, min: 0 }),
          fc.integer({ max: 1_000, min: 1 }),
          fc.nat({ max: 120_000 }),
          (gameType, level, score, maxScore, timeTaken) => {
            const result = service.buildGameResult(gameType, score, maxScore, timeTaken, level);
            const expected = service.calculateExperienceGain(result, level);

            return result.experienceEarned === expected;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });
});
