import { TestBed } from '@angular/core/testing';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { createInitialPokemonStatus } from '../store/tamagotchi-initial';
import { StatusDecayService } from './status-decay.service';

const ONE_HOUR_MS = 60 * 60 * 1000;

describe('StatusDecayService', () => {
  let service: StatusDecayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusDecayService);
  });

  describe('calculateDecay', () => {
    it('should decay needs proportionally to elapsed time when awake', () => {
      const status = createInitialPokemonStatus();
      const decay = service.calculateDecay(ONE_HOUR_MS, status, false, 1_000);

      expect(decay.hunger).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.HUNGER);
      expect(decay.mood).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.MOOD);
      expect(decay.hydration).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.HYDRATION);
      expect(decay.energy).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.ENERGY);
      expect(decay.timestamp).toBe(1_000);
    });

    it('should restore energy while sleeping and still decay hunger and mood', () => {
      const status = createInitialPokemonStatus();
      const decay = service.calculateDecay(ONE_HOUR_MS, status, true, 1_000);

      expect(decay.hunger).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.HUNGER);
      expect(decay.mood).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.MOOD);
      expect(decay.energy).toBeCloseTo(-GAME_BALANCE.ACTION_EFFECTS.SLEEP.energyRestore);
    });

    it('should produce monotonically increasing decay for longer intervals', () => {
      const status = createInitialPokemonStatus();
      const shortDecay = service.calculateDecay(ONE_HOUR_MS / 2, status, false);
      const longDecay = service.calculateDecay(ONE_HOUR_MS, status, false);

      expect(longDecay.hunger).toBeGreaterThan(shortDecay.hunger);
      expect(longDecay.mood).toBeGreaterThan(shortDecay.mood);
    });
  });

  describe('detectCriticalAlerts', () => {
    it('should alert when hunger crosses warning threshold', () => {
      const before = {
        ...createInitialPokemonStatus(),
        hunger: STATUS_THRESHOLDS.hungerWarning + 1,
      };
      const after = {
        ...before,
        hunger: STATUS_THRESHOLDS.hungerWarning,
      };

      expect(service.detectCriticalAlerts(before, after)).toContain('hungerLow');
    });

    it('should alert when hydration crosses critical threshold', () => {
      const before = {
        ...createInitialPokemonStatus(),
        hydration: STATUS_THRESHOLDS.hydrationCritical + 1,
      };
      const after = {
        ...before,
        hydration: STATUS_THRESHOLDS.hydrationCritical,
      };

      expect(service.detectCriticalAlerts(before, after)).toContain('hydrationCritical');
    });
  });
});
