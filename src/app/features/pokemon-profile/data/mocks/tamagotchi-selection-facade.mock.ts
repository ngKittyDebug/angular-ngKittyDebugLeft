import { signal } from '@angular/core';
import { vi } from 'vitest';
import type { TamagotchiSelectionFacade } from '@features/pokemon-profile/data/facades/tamagotchi-selection.facade';

interface TamagotchiSelectionFacadeMockOptions {
  selectedName?: string | null;
  isLoading?: boolean;
}

export function createTamagotchiSelectionFacadeMock(
  options: TamagotchiSelectionFacadeMockOptions = {},
) {
  const isSelectionLoading = signal(options.isLoading ?? false);
  const selectedPokemonName = signal<string | null>(options.selectedName ?? null);

  return {
    isSelectionLoading,
    selectedPokemonName,
    selectForTamagotchi: vi.fn(),
  } satisfies Partial<Record<keyof TamagotchiSelectionFacade, unknown>>;
}

export type TamagotchiSelectionFacadeMock = ReturnType<typeof createTamagotchiSelectionFacadeMock>;
