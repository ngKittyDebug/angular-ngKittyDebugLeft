import { of } from 'rxjs';
import { type MockedObject, vi } from 'vitest';
import type { TamagotchiSelectionPort } from '@shared/constants/tamagotchi-selection.token';
import type { TamagotchiSelectionPokemon } from '@shared/models/tamagotchi-selection.model';
import { PIKACHU_SELECTION_FIXTURE } from '@features/pokemon-profile/data/fixtures/tamagotchi-selection.fixture';

export function createTamagotchiSelectionPortMock(): MockedObject<
  Partial<TamagotchiSelectionPort>
> {
  return {
    getSelectedPokemonReference: vi.fn(() => null),
    loadPokemonByName: vi.fn(() => of(PIKACHU_SELECTION_FIXTURE)),
    saveSelectedPokemon: vi.fn(),
    validatePokemonSelection: vi.fn((pokemon: TamagotchiSelectionPokemon) => ({
      pokemon,
      valid: true,
    })),
  } as const satisfies MockedObject<Partial<TamagotchiSelectionPort>>;
}
