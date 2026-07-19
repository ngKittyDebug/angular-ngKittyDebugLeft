import { TestBed } from '@angular/core/testing';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { createInitialPokemonStatus } from '../store/tamagotchi-initial';
import { StatusDecayService } from './status-decay.service';

const ONE_HOUR_MS = 60 * 60 * 1000;

describe('StatusDecayService', () => {
  let service: StatusDecayService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [StatusDecayService] });
    service = TestBed.inject(StatusDecayService);
  });

  describe('Happy Path', () => {
    describe('calculateDecay', () => {
      it('должен уменьшать потребности пропорционально прошедшему времени в бодрствовании', () => {
        const status = createInitialPokemonStatus();
        const decay = service.calculateDecay(ONE_HOUR_MS, status, false, 1_000);

        expect(decay.hunger).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.HUNGER);
        expect(decay.mood).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.MOOD);
        expect(decay.hydration).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.HYDRATION);
        expect(decay.energy).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.ENERGY);
        expect(decay.timestamp).toBe(1_000);
      });

      it('должен восстанавливать энергию во сне и продолжать уменьшать голод и настроение', () => {
        const status = createInitialPokemonStatus();
        const decay = service.calculateDecay(ONE_HOUR_MS, status, true, 1_000);

        expect(decay.hunger).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.HUNGER);
        expect(decay.mood).toBeCloseTo(GAME_BALANCE.STATUS_DECAY.MOOD);
        expect(decay.energy).toBeCloseTo(-GAME_BALANCE.ACTION_EFFECTS.SLEEP.energyRestore);
      });
    });

    describe('processDecayTick', () => {
      it('должен алертить при offline decay, который пересекает warning-порог за один тик', () => {
        const fixedNow = 1_700_000_000_000;
        const beforeHunger = STATUS_THRESHOLDS.hungerWarning + 5;
        const targetHunger = STATUS_THRESHOLDS.hungerWarning - 1;
        const elapsedMs =
          ((beforeHunger - targetHunger) / GAME_BALANCE.STATUS_DECAY.HUNGER) * ONE_HOUR_MS;

        const result = service.processDecayTick({
          isSleeping: false,
          lastActionTime: null,
          lastDecayTime: fixedNow - elapsedMs,
          now: fixedNow,
          status: {
            ...createInitialPokemonStatus(),
            hunger: beforeHunger,
          },
        });

        expect(result.alerts).toContain('hungerLow');
      });
    });
  });

  describe('Edge Cases', () => {
    describe('calculateDecay', () => {
      it('должен давать монотонно возрастающее уменьшение при более длинных интервалах', () => {
        const status = createInitialPokemonStatus();
        const shortDecay = service.calculateDecay(ONE_HOUR_MS / 2, status, false);
        const longDecay = service.calculateDecay(ONE_HOUR_MS, status, false);

        expect(longDecay.hunger).toBeGreaterThan(shortDecay.hunger);
        expect(longDecay.mood).toBeGreaterThan(shortDecay.mood);
      });
    });
  });
});
