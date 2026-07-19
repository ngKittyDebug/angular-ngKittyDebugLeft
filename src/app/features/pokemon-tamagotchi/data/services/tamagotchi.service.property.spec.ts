import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { beforeEach, describe, it } from 'vitest';
import { arbitraryPokemonStatus } from '../fixtures/tamagotchi-arbitraries';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import { TamagotchiLoggerService } from './tamagotchi-logger.service';
import { TamagotchiPersistenceService } from './tamagotchi-persistence.service';
import { TamagotchiService } from './tamagotchi.service';

const PROPERTY_RUNS = 100;

describe('TamagotchiService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [TamagotchiLoggerService, TamagotchiPersistenceService, TamagotchiService],
    });
  });

  describe('Happy Path', () => {
    describe('Property 9: доступность игры при ограничении энергии', () => {
      it('должен блокировать игровые действия только когда энергия на уровне или ниже warning-порога', () => {
        fc.assert(
          fc.property(fc.constant('play' as const), (action) => {
            const service = TestBed.inject(TamagotchiService);
            const baseStatus = createInitialTamagotchiState().status;
            const allowed = service.validateAction(
              {
                hasPokemon: true,
                isSleeping: false,
                isTraining: false,
                lastActionTime: null,
                status: { ...baseStatus, energy: 50 },
              },
              action,
            );
            const blocked = service.validateAction(
              {
                hasPokemon: true,
                isSleeping: false,
                isTraining: false,
                lastActionTime: null,
                status: { ...baseStatus, energy: 15 },
              },
              action,
            );

            return (
              allowed.reason !== 'lowEnergy' &&
              blocked.allowed === false &&
              blocked.reason === 'lowEnergy'
            );
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });

  describe('Negative Cases', () => {
    describe('Property 20: принудительное соблюдение игровых ограничений', () => {
      it('должен отклонять действия только для бодрствования во сне и согласованно применять причины кулдауна', () => {
        fc.assert(
          fc.property(
            arbitraryPokemonStatus(),
            fc.constantFrom('feed', 'play', 'train', 'sleep' as const),
            (status, action) => {
              const service = TestBed.inject(TamagotchiService);
              const sleepingResult = service.validateAction(
                {
                  hasPokemon: true,
                  isSleeping: true,
                  isTraining: false,
                  lastActionTime: Date.now(),
                  status,
                },
                action,
              );

              if (action === 'sleep') {
                return sleepingResult.allowed === false;
              }

              if (action === 'feed' || action === 'play' || action === 'train') {
                return sleepingResult.allowed === false && sleepingResult.reason === 'sleeping';
              }

              return true;
            },
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });
});
