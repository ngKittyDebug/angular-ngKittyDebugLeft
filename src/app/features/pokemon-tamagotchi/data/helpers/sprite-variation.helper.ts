import type { SpriteVariation, TamagotchiCustomization } from '../../models/customization.model';
import type { Pokemon, PokemonSpriteUrls } from '../../models/pokemon.model';
import type { PokemonStatus } from '../../models/pokemon-status.model';

export type StatusSpriteKey = keyof PokemonSpriteUrls;

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
  customization: TamagotchiCustomization,
  statusKey: StatusSpriteKey,
): string {
  const normalized = ensurePokemonSpriteVariations(pokemon);
  const spriteSet = spriteSetForVariation(normalized, customization.spriteVariation);

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

export function spriteVariationClass(variation: SpriteVariation): string {
  return `pokemon-sprite__image--variation-${variation}`;
}
