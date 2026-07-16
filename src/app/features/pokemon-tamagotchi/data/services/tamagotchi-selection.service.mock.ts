import { of } from 'rxjs';
import { type MockedObject, vi } from 'vitest';
import type { TamagotchiSelectionService } from './tamagotchi-selection.service';

export type TamagotchiSelectionMock = MockedObject<
  Pick<
    TamagotchiSelectionService,
    | 'getSelectedPokemonReference'
    | 'loadPokemonByName'
    | 'saveSelectedPokemon'
    | 'validateSelectedPokemon'
  >
>;

export function createTamagotchiSelectionMock(
  overrides: Partial<TamagotchiSelectionMock> = {},
): TamagotchiSelectionMock {
  return {
    getSelectedPokemonReference: vi.fn(() => null),
    loadPokemonByName: vi.fn(),
    saveSelectedPokemon: vi.fn(),
    validateSelectedPokemon: vi.fn(() => of({ error: 'noSelection' as const, valid: false })),
    ...overrides,
  } as TamagotchiSelectionMock;
}
