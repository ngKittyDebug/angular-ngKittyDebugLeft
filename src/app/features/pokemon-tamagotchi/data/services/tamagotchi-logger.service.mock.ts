import { type MockedObject, vi } from 'vitest';
import type { TamagotchiLoggerService } from './tamagotchi-logger.service';

export type TamagotchiLoggerMock = MockedObject<Pick<TamagotchiLoggerService, 'logError'>>;

export function createTamagotchiLoggerMock(
  overrides: Partial<TamagotchiLoggerMock> = {},
): TamagotchiLoggerMock {
  return {
    logError: vi.fn(),
    ...overrides,
  } as const satisfies TamagotchiLoggerMock;
}
