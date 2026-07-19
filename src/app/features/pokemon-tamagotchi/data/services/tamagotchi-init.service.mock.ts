import { of } from 'rxjs';
import { type MockedObject, vi } from 'vitest';
import type { TamagotchiInitService } from './tamagotchi-init.service';

export type TamagotchiInitMock = MockedObject<Pick<TamagotchiInitService, 'bootstrapFromProfile'>>;

export function createTamagotchiInitMock(
  overrides: Partial<TamagotchiInitMock> = {},
): TamagotchiInitMock {
  return {
    bootstrapFromProfile: vi.fn(() => of(undefined)),
    ...overrides,
  } as const satisfies TamagotchiInitMock;
}
