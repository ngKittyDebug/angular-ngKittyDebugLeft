import { type MockedObject, vi } from 'vitest';
import type { TamagotchiPersistenceService } from './tamagotchi-persistence.service';

export type TamagotchiPersistenceMock = MockedObject<
  Pick<TamagotchiPersistenceService, 'clear' | 'load' | 'save'>
>;

export function createTamagotchiPersistenceMock(
  overrides: Partial<TamagotchiPersistenceMock> = {},
): TamagotchiPersistenceMock {
  return {
    clear: vi.fn(),
    load: vi.fn(() => null),
    save: vi.fn(),
    ...overrides,
  } as const satisfies TamagotchiPersistenceMock;
}
