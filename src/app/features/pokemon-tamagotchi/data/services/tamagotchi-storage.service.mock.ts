import { type MockedObject, vi } from 'vitest';
import type { TamagotchiStorageService } from './tamagotchi-storage.service';

export type TamagotchiStorageMock = MockedObject<
  Pick<TamagotchiStorageService, 'getItem' | 'removeItem' | 'setItem'>
> & {
  store: Map<string, string>;
};

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
  } as const satisfies TamagotchiStorageMock;
}
