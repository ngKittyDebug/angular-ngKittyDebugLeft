import { vi } from 'vitest';
import type { TamagotchiStorageService } from '../services/tamagotchi-storage.service';

export interface TamagotchiStorageMock extends TamagotchiStorageService {
  store: Map<string, string>;
}

export function createTamagotchiStorageMock(): TamagotchiStorageMock {
  const store = new Map<string, string>();

  return {
    store,
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  };
}
