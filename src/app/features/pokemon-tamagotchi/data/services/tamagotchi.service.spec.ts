import { TestBed } from '@angular/core/testing';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { createInitialPokemonStatus } from '../store/tamagotchi-initial';
import { TamagotchiService } from './tamagotchi.service';

describe('TamagotchiService', () => {
  let service: TamagotchiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TamagotchiService] });
    service = TestBed.inject(TamagotchiService);
  });

  describe('Happy Path', () => {
    describe('validateAction', () => {
      const now = 1_700_000_000_000;

      it('должен разрешать поение во сне', () => {
        const result = service.validateAction(
          {
            hasPokemon: true,
            isSleeping: true,
            isTraining: false,
            lastActionTime: null,
            status: createInitialPokemonStatus(),
            now,
          },
          'water',
        );

        expect(result.allowed).toBe(true);
      });

      it('должен разрешать care и train после других недавних действий', () => {
        const context = {
          hasPokemon: true,
          isSleeping: false,
          isTraining: false,
          lastActionTime: now - 1_000,
          status: createInitialPokemonStatus(),
          now,
        };

        const careResult = service.validateAction(context, 'care');
        const trainResult = service.validateAction(context, 'train');

        expect(careResult.allowed).toBe(true);
        expect(trainResult.allowed).toBe(true);
      });

      it('должен считать кулдауны care и train независимо', () => {
        const status = {
          ...createInitialPokemonStatus(),
          lastCareTime: now - 1_000,
        };

        const careResult = service.validateAction(
          {
            hasPokemon: true,
            isSleeping: false,
            isTraining: false,
            lastActionTime: null,
            status,
            now,
          },
          'care',
        );
        const trainResult = service.validateAction(
          {
            hasPokemon: true,
            isSleeping: false,
            isTraining: false,
            lastActionTime: null,
            status,
            now,
          },
          'train',
        );

        expect(careResult.reason).toBe('cooldown');
        expect(trainResult.allowed).toBe(true);
      });
    });
  });

  describe('Negative Cases', () => {
    describe('validateAction', () => {
      const now = 1_700_000_000_000;

      it('должен отклонять действия, когда покемон отсутствует', () => {
        const result = service.validateAction(
          {
            hasPokemon: false,
            isSleeping: false,
            isTraining: false,
            lastActionTime: null,
            status: createInitialPokemonStatus(),
            now,
          },
          'feed',
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('noPokemon');
      });

      it('должен отклонять действия только для бодрствования во время сна', () => {
        const result = service.validateAction(
          {
            hasPokemon: true,
            isSleeping: true,
            isTraining: false,
            lastActionTime: null,
            status: createInitialPokemonStatus(),
            now,
          },
          'play',
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('sleeping');
      });

      it('должен отклонять действия кроме play во время тренировки', () => {
        const context = {
          hasPokemon: true,
          isSleeping: false,
          isTraining: true,
          lastActionTime: now,
          status: createInitialPokemonStatus(),
          now,
        };

        const waterResult = service.validateAction(context, 'water');
        const playResult = service.validateAction(context, 'play');

        expect(waterResult.allowed).toBe(false);
        expect(waterResult.reason).toBe('training');
        expect(playResult.allowed).toBe(true);
      });

      it('должен отклонять игру и тренировку, когда энергия на уровне или ниже warning-порога', () => {
        const lowEnergyStatus = {
          ...createInitialPokemonStatus(),
          energy: STATUS_THRESHOLDS.energyWarning,
        };

        const playResult = service.validateAction(
          {
            hasPokemon: true,
            isSleeping: false,
            isTraining: false,
            lastActionTime: null,
            status: lowEnergyStatus,
            now,
          },
          'play',
        );

        expect(playResult.allowed).toBe(false);
        expect(playResult.reason).toBe('lowEnergy');
      });

      it('должен отклонять действия во время кулдауна', () => {
        const status = {
          ...createInitialPokemonStatus(),
          lastFeedTime: now - 1_000,
        };

        const result = service.validateAction(
          {
            hasPokemon: true,
            isSleeping: false,
            isTraining: false,
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
    });
  });
});
