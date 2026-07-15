import { signal } from '@angular/core';
import { vi } from 'vitest';
import type { ProfileFacade } from '@features/profile/data/facades/profile.facade';

interface ProfileFacadeMockOptions {
  favorites?: string[];
  isLoading?: boolean;
}

export function createProfileFacadeMock(options: ProfileFacadeMockOptions = {}) {
  const favoritePokemonList = signal(options.favorites ?? []);
  const isLoading = signal(options.isLoading ?? false);

  return {
    favoritePokemonList,
    isLoading,
    loadFavorites: vi.fn(),
    toggleFavorite: vi.fn(),
  } satisfies Partial<Record<keyof ProfileFacade, unknown>>;
}

export type ProfileFacadeMock = ReturnType<typeof createProfileFacadeMock>;
