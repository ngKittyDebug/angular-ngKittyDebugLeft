import { signal } from '@angular/core';
import { vi } from 'vitest';

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
    addToFavorites: vi.fn(),
    removeFromFavorites: vi.fn(),
  };
}

export type ProfileFacadeMock = ReturnType<typeof createProfileFacadeMock>;
