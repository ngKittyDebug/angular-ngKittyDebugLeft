import type {
  PokemonModel,
  PokemonSpriteUrlsModel,
  SpriteVariation,
} from '../models/pokemon.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';

export type StatusSpriteKey = keyof PokemonSpriteUrlsModel;

const DEFAULT_SPRITE_VARIATION: SpriteVariation = 'default';

export function resolveStatusSpriteKey(
  isEvolving: boolean,
  isSleeping: boolean,
  status: PokemonStatusModel,
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

function spriteSetForVariation(
  pokemon: PokemonModel,
  variation: SpriteVariation,
): PokemonSpriteUrlsModel {
  const variations = pokemon.spriteVariations;

  if (variations?.[variation]) {
    return variations[variation];
  }

  return pokemon.spriteUrls;
}

export function resolveSpriteUrl(
  pokemon: PokemonModel,
  statusKey: StatusSpriteKey,
  variation: SpriteVariation = DEFAULT_SPRITE_VARIATION,
): string {
  const normalized = ensurePokemonSpriteVariations(pokemon);
  const spriteSet = spriteSetForVariation(normalized, variation);

  return spriteSet[statusKey] || spriteSet.normal;
}

export function ensurePokemonSpriteVariations(pokemon: PokemonModel): PokemonModel {
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
