import { TestBed } from '@angular/core/testing';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { applyStatusUpdate } from '../helpers/status-calculator.helper';
import { createInitialPokemonStatus } from '../store/tamagotchi.state';
import { TamagotchiService } from './tamagotchi.service';

describe('TamagotchiService', () => {
  let service: TamagotchiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TamagotchiService);
  });

  describe('calculateStatusUpdate', () => {
    it('should calculate feed status changes from game balance', () => {
      const status = {
        ...createInitialPokemonStatus(),
        energy: 50,
        hunger: 40,
        mood: 40,
      };
      const update = service.calculateStatusUpdate(status, 'feed');
      const next = applyStatusUpdate(status, update);

      expect(next.hunger).toBe(status.hunger + GAME_BALANCE.ACTION_EFFECTS.FEED.hungerIncrease);
      expect(next.mood).toBe(status.mood + GAME_BALANCE.ACTION_EFFECTS.FEED.moodIncrease);
      expect(next.energy).toBe(status.energy - GAME_BALANCE.ACTION_EFFECTS.FEED.energyCost);
    });

    it('should calculate water and care status changes', () => {
      const status = {
        ...createInitialPokemonStatus(),
        energy: 50,
        health: 60,
        hydration: 40,
        mood: 40,
      };
      const waterNext = applyStatusUpdate(status, service.calculateStatusUpdate(status, 'water'));
      const careNext = applyStatusUpdate(status, service.calculateStatusUpdate(status, 'care'));

      expect(waterNext.hydration).toBe(
        status.hydration + GAME_BALANCE.ACTION_EFFECTS.WATER.hydrationIncrease,
      );
      expect(careNext.health).toBe(status.health + GAME_BALANCE.ACTION_EFFECTS.CARE.healthIncrease);
      expect(careNext.mood).toBe(status.mood + GAME_BALANCE.ACTION_EFFECTS.CARE.moodIncrease);
    });
  });

  describe('validateAction', () => {
    const now = 1_700_000_000_000;

    it('should reject actions when pokemon is missing', () => {
      const result = service.validateAction(
        {
          hasPokemon: false,
          isSleeping: false,
          lastActionTime: null,
          status: createInitialPokemonStatus(),
          now,
        },
        'feed',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('noPokemon');
    });

    it('should reject awake-only actions while sleeping', () => {
      const result = service.validateAction(
        {
          hasPokemon: true,
          isSleeping: true,
          lastActionTime: null,
          status: createInitialPokemonStatus(),
          now,
        },
        'play',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('sleeping');
    });

    it('should reject play and train when energy is at or below warning threshold', () => {
      const lowEnergyStatus = {
        ...createInitialPokemonStatus(),
        energy: STATUS_THRESHOLDS.energyWarning,
      };

      const playResult = service.validateAction(
        {
          hasPokemon: true,
          isSleeping: false,
          lastActionTime: null,
          status: lowEnergyStatus,
          now,
        },
        'play',
      );

      expect(playResult.allowed).toBe(false);
      expect(playResult.reason).toBe('lowEnergy');
    });

    it('should reject actions during cooldown', () => {
      const status = {
        ...createInitialPokemonStatus(),
        lastFeedTime: now - 1_000,
      };

      const result = service.validateAction(
        {
          hasPokemon: true,
          isSleeping: false,
          lastActionTime: null,
          status,
          now,
        },
        'feed',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('cooldown');
      expect(result.cooldownRemaining).toBeGreaterThan(0);
    });

    it('should allow water while sleeping', () => {
      const result = service.validateAction(
        {
          hasPokemon: true,
          isSleeping: true,
          lastActionTime: null,
          status: createInitialPokemonStatus(),
          now,
        },
        'water',
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('calculateExperienceGain', () => {
    it('should return zero experience for zero performance', () => {
      const gain = service.calculateExperienceGain(
        {
          experienceEarned: 0,
          gameType: 'reflex',
          maxScore: 100,
          performance: 0,
          score: 0,
          timeTaken: 30_000,
        },
        1,
      );

      expect(gain).toBe(0);
    });

    it('should scale experience monotonically with performance', () => {
      const low = service.calculateExperienceGain(
        {
          experienceEarned: 0,
          gameType: 'reflex',
          maxScore: 100,
          performance: 0.4,
          score: 40,
          timeTaken: 30_000,
        },
        1,
      );
      const high = service.calculateExperienceGain(
        {
          experienceEarned: 0,
          gameType: 'reflex',
          maxScore: 100,
          performance: 0.9,
          score: 90,
          timeTaken: 30_000,
        },
        1,
      );

      expect(high).toBeGreaterThan(low);
    });

    it('should build a game result with computed experience', () => {
      const result = service.buildGameResult('memory', 80, 100, 45_000, 3);

      expect(result.performance).toBe(0.8);
      expect(result.experienceEarned).toBeGreaterThan(0);
    });
  });
});
