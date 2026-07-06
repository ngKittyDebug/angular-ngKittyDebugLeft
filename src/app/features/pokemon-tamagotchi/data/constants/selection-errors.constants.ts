export const TAMAGOTCHI_SELECTION_ERRORS = new Set(['evolvedPokemon', 'loadFailed', 'noSelection']);

export function isTamagotchiSelectionError(error: string | null): boolean {
  return error !== null && TAMAGOTCHI_SELECTION_ERRORS.has(error);
}
