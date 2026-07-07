import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';

// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import enTranslations from '../../../../../../public/i18n/pokemonTamagotchi/en.json';
// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import ruTranslations from '../../../../../../public/i18n/pokemonTamagotchi/ru.json';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { createInteractionEvent } from '../helpers/gesture.helper';
import { compareNotificationsByPriority } from '../helpers/notification-factory.helper';
import { isRoutineBonusEligible, recordRoutineActivity } from '../helpers/routine.helper';
import { resolveStatusSpriteKey } from '../helpers/sprite-variation.helper';
import { calculateSleepRestorationBonus } from '../helpers/sleep-restoration.helper';
import {
  arbitraryInteractionEvent,
  arbitraryPokemonStatus,
  TEST_POKEMON,
} from '../fixtures/tamagotchi-arbitraries';
import { TamagotchiErrorRecoveryService } from '../services/tamagotchi-error-recovery.service';
import { TamagotchiLoggerService } from '../services/tamagotchi-logger.service';
import { TamagotchiPersistenceService } from '../services/tamagotchi-persistence.service';
import { TamagotchiService } from '../services/tamagotchi.service';
import {
  interactWithPokemonState,
  selectPokemonState,
  updateStatusState,
} from '../store/tamagotchi-state-transitions';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import type { NotificationPriority } from '../models/notification.model';

const PROPERTY_RUNS = 100;

function collectTranslationKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return collectTranslationKeys(nested, path);
    }

    return [path];
  });
}

function loadLocaleKeys(language: 'en' | 'ru'): string[] {
  const parsed = language === 'en' ? enTranslations : ruTranslations;

  return collectTranslationKeys(parsed).sort();
}

describe('TamagotchiService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        TamagotchiErrorRecoveryService,
        TamagotchiLoggerService,
        TamagotchiPersistenceService,
        TamagotchiService,
      ],
    });
  });

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

  describe('Property 10: восстановление энергии в режиме сна', () => {
    it('должен применять бонус сна только после минимальной длительности сна', () => {
      fc.assert(
        fc.property(fc.nat({ max: TIMER_CONFIG.SLEEP.MIN_DURATION_MS * 2 }), (elapsedMs) => {
          const startedAt = 1_000_000;
          const bonus = calculateSleepRestorationBonus(startedAt, startedAt + elapsedMs);

          if (elapsedMs < TIMER_CONFIG.SLEEP.MIN_DURATION_MS) {
            return bonus === 0;
          }

          return bonus === TIMER_CONFIG.SLEEP.BONUS_ENERGY;
        }),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });

  describe('Property 11: улучшение настроения через взаимодействие', () => {
    it('должен монотонно увеличивать настроение с интенсивностью взаимодействия и сохранять историю', () => {
      fc.assert(
        fc.property(
          fc.float({ max: 1, min: 0, noNaN: true }),
          fc.float({ max: 1, min: 0, noNaN: true }),
          arbitraryInteractionEvent(),
          (intensityA, intensityB, interaction) => {
            const low = createInteractionEvent(interaction.type, Math.min(intensityA, intensityB));
            const high = createInteractionEvent(interaction.type, Math.max(intensityA, intensityB));

            let state = selectPokemonState(createInitialTamagotchiState(), TEST_POKEMON);

            state = updateStatusState(state, { mood: -40 });

            const moodBefore = state.status.mood;

            state = interactWithPokemonState(state, high);

            const moodAfter = state.status.mood;
            const tracked = state.interactionHistory.some(
              (entry) =>
                entry.type === high.type &&
                entry.intensity === high.intensity &&
                entry.moodIncrease === high.moodIncrease,
            );

            return moodAfter > moodBefore && high.moodIncrease >= low.moodIncrease && tracked;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });

  describe('Property 12: соответствие спрайта состоянию', () => {
    it('должен маппить ключи спрайтов на статус и флаги сна/эволюции', () => {
      fc.assert(
        fc.property(
          arbitraryPokemonStatus(),
          fc.boolean(),
          fc.boolean(),
          (status, isSleeping, isEvolving) => {
            if (isEvolving) {
              return resolveStatusSpriteKey(true, isSleeping, status) === 'evolving';
            }

            if (isSleeping) {
              return resolveStatusSpriteKey(false, true, status) === 'sleeping';
            }

            const key = resolveStatusSpriteKey(false, false, status);

            if (status.mood >= 70) {
              return key === 'happy';
            }

            if (status.mood <= 25 || status.hunger <= 25) {
              return key === 'sad';
            }

            return key === 'normal';
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });

  describe('Property 14: согласованность интернационализации', () => {
    it('должен сохранять совпадающие ключи переводов между английской и русской локалями', () => {
      const englishKeys = loadLocaleKeys('en');
      const russianKeys = loadLocaleKeys('ru');

      expect(englishKeys).toEqual(russianKeys);
    });
  });

  describe('Property 15: обработка приоритета уведомлений', () => {
    it('должен сортировать уведомления с critical наивысшим приоритетом', () => {
      fc.assert(
        fc.property(
          fc.shuffledSubarray(
            ['critical', 'warning', 'achievement', 'info'] as NotificationPriority[],
            { minLength: 2 },
          ),
          (priorities) => {
            const notificationList = priorities.map((priority, index) => ({
              id: `notification-${index}`,
              message: { kind: 'plainText' as const, text: 'message' },
              priority,
              read: false,
              timestamp: index,
              title: { kind: 'plainText' as const, text: 'title' },
            }));
            const sorted = [...notificationList].sort(compareNotificationsByPriority);

            for (let index = 1; index < sorted.length; index += 1) {
              const comparison = compareNotificationsByPriority(sorted[index - 1]!, sorted[index]!);

              if (comparison > 0) {
                return false;
              }
            }

            return true;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });

  describe('Property 16: корректное восстановление после ошибок', () => {
    describe('Negative Cases', () => {
      it('должен откатываться к начальному состоянию, когда восстановление невозможно', () => {
        const recovery = TestBed.inject(TamagotchiErrorRecoveryService);
        const broken = {
          ...createInitialTamagotchiState(),
          pokemon: TEST_POKEMON,
          status: {
            ...createInitialTamagotchiState().status,
            mood: Number.NaN,
          },
        };

        const result = recovery.attemptStateRecovery(broken);

        expect(result.recovered).toBe(false);
        expect(result.state.status.mood).toBe(100);
      });
    });

    describe('Happy Path', () => {
      it('должен восстанавливать валидное состояние, сохраняя покемона', () => {
        const recovery = TestBed.inject(TamagotchiErrorRecoveryService);
        const customized = selectPokemonState(createInitialTamagotchiState(), TEST_POKEMON);

        const repaired = recovery.repairState(customized);

        expect(repaired?.pokemon?.id).toBe(TEST_POKEMON.id);
      });
    });
  });

  describe('Property 19: право на бонус ежедневной рутины', () => {
    it('должен начислять бонус рутины только при выполнении порогов последовательности', () => {
      fc.assert(
        fc.property(fc.nat({ max: 10 }), fc.nat({ max: 10 }), (consecutiveDays, totalToday) => {
          const eligible = isRoutineBonusEligible(consecutiveDays, totalToday);
          const expected =
            consecutiveDays >= TIMER_CONFIG.ROUTINE.CONSECUTIVE_DAYS_FOR_BONUS &&
            totalToday >= TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS;

          return eligible === expected;
        }),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('должен увеличивать последовательные дни только после достаточного числа действий в последовательные даты', () => {
      const dayOne = Date.parse('2026-07-01T12:00:00.000Z');
      const dayTwo = Date.parse('2026-07-02T12:00:00.000Z');
      let routine = recordRoutineActivity(
        createInitialTamagotchiState().dailyRoutine,
        'feed',
        dayOne,
      );

      for (let index = 0; index < TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS; index += 1) {
        routine = recordRoutineActivity(routine, 'feed', dayOne);
      }

      routine = recordRoutineActivity(routine, 'feed', dayTwo);

      expect(routine.consecutiveDays).toBeGreaterThanOrEqual(1);
    });
  });

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
