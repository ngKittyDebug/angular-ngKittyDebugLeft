export const TAMAGOTCHI_STORAGE_KEY = 'pokemon-tamagotchi-state';
export const TAMAGOTCHI_BACKUP_KEY = 'pokemon-tamagotchi-state-backup';

interface TamagotchiProgressStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

interface PersistedPokemonState {
  state?: {
    pokemon?: {
      id?: unknown;
    } | null;
  };
}

export function clearTamagotchiProgressStorage(storage: TamagotchiProgressStorage): void {
  storage.removeItem(TAMAGOTCHI_STORAGE_KEY);
  storage.removeItem(TAMAGOTCHI_BACKUP_KEY);
}

export function readPersistedPokemonId(storage: TamagotchiProgressStorage): string | null {
  const raw = storage.getItem(TAMAGOTCHI_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedPokemonState;
    const pokemonId = parsed.state?.pokemon?.id;

    return typeof pokemonId === 'string' ? pokemonId : null;
  } catch {
    return null;
  }
}
