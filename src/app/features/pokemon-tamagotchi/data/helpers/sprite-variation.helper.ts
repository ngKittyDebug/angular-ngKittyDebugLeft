import type { Pokemon, PokemonSpriteUrls, SpriteVariation } from '../../models/pokemon.model';
import type { PokemonStatus } from '../../models/pokemon-status.model';

export type StatusSpriteKey = keyof PokemonSpriteUrls;

export const DEFAULT_SPRITE_VARIATION: SpriteVariation = 'default';

export function resolveStatusSpriteKey(
  isEvolving: boolean,
  isSleeping: boolean,
  status: PokemonStatus,
): StatusSpriteKey {
  if (isEvolving) {
    return 'evolving';
  }

  if (isSleeping) {
    return 'sleeping';
  }

  if (status.mood >= 70) {
    return 'happy';
  }

  if (status.mood <= 25 || status.hunger <= 25) {
    return 'sad';
  }

  return 'normal';
}

export function spriteSetForVariation(
  pokemon: Pokemon,
  variation: SpriteVariation,
): PokemonSpriteUrls {
  const variations = pokemon.spriteVariations;

  if (variations?.[variation]) {
    return variations[variation];
  }

  return pokemon.spriteUrls;
}

export function resolveSpriteUrl(
  pokemon: Pokemon,
  statusKey: StatusSpriteKey,
  variation: SpriteVariation = DEFAULT_SPRITE_VARIATION,
): string {
  const normalized = ensurePokemonSpriteVariations(pokemon);
  const spriteSet = spriteSetForVariation(normalized, variation);

  return spriteSet[statusKey] || spriteSet.normal;
}

export function ensurePokemonSpriteVariations(pokemon: Pokemon): Pokemon {
  if (pokemon.spriteVariations?.default?.normal) {
    return pokemon;
  }

  const urls = pokemon.spriteUrls;

  return {
    ...pokemon,
    spriteVariations: {
      default: urls,
      retro: urls,
      shiny: urls,
    },
  };
}
