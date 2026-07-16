import type {
  EvolutionChainApiResponse,
  EvolutionChainItemApiData,
} from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type {
  PokemonDetailApiData,
  PokemonSpritesApiData,
} from '@shared/models/pokemon-detail-api-data-interface';
import { getEvolutionRequirementsForFromStage } from '../../../constants/evolution-criteria.constants';
import type { EvolutionChainModel, EvolutionStepModel } from '../../../models/evolution.model';
import type {
  PokemonModel,
  PokemonSpriteUrlsModel,
  SpriteVariation,
} from '../../../models/pokemon.model';

const POKEMON_SPRITE_FALLBACK_URL = '/images/svg/pokeball.svg';

/**
 * First playable tamagotchi stage = first non-baby species on the primary
 * linear path (root → evolves_to[0] → …). Baby forms are not selectable.
 */
export function isFirstStageInEvolutionChain(
  speciesName: string,
  chainRoot: EvolutionChainItemApiData,
): boolean {
  const firstPlayable = findFirstNonBabySpeciesName(chainRoot);

  return firstPlayable.toLowerCase() === speciesName.toLowerCase();
}

function findFirstNonBabySpeciesName(node: EvolutionChainItemApiData): string {
  let current: EvolutionChainItemApiData = node;

  while (current.is_baby) {
    const next = current.evolves_to?.[0];

    if (!next) {
      return current.species.name;
    }

    current = next;
  }

  return current.species.name;
}

function findEvolutionChainNode(
  node: EvolutionChainItemApiData,
  speciesName: string,
): EvolutionChainItemApiData | null {
  if (node.species.name.toLowerCase() === speciesName.toLowerCase()) {
    return node;
  }

  for (const child of node.evolves_to ?? []) {
    const match = findEvolutionChainNode(child, speciesName);

    if (match) {
      return match;
    }
  }

  return null;
}

function countEvolutionStages(node: EvolutionChainItemApiData): number {
  if (!node.evolves_to?.length) {
    return 1;
  }

  return 1 + Math.max(...node.evolves_to.map((child) => countEvolutionStages(child)));
}

function findEvolutionStageIndex(
  node: EvolutionChainItemApiData,
  speciesName: string,
  depth = 1,
): number | null {
  if (node.species.name.toLowerCase() === speciesName.toLowerCase()) {
    return depth;
  }

  for (const child of node.evolves_to ?? []) {
    const found = findEvolutionStageIndex(child, speciesName, depth + 1);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

function buildSpriteSet(primary: string): PokemonSpriteUrlsModel {
  return {
    eating: primary,
    evolving: primary,
    happy: primary,
    normal: primary,
    sad: primary,
    sleeping: primary,
  };
}

function firstNonEmptySprite(...candidates: (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return POKEMON_SPRITE_FALLBACK_URL;
}

function resolveDefaultSpriteUrl(sprites: PokemonSpritesApiData): string {
  return firstNonEmptySprite(
    sprites.other?.showdown?.front_default,
    sprites.other?.['official-artwork']?.front_default,
    sprites.front_default,
  );
}

function resolveShinySpriteUrl(sprites: PokemonSpritesApiData, fallback: string): string {
  return firstNonEmptySprite(
    sprites.other?.showdown?.front_shiny,
    sprites.other?.['official-artwork']?.front_shiny,
    sprites.front_shiny,
    fallback,
  );
}

function resolveRetroSpriteUrl(
  sprites: PokemonSpritesApiData,
  primary: string,
  pixelFront: string,
  artwork: string | null | undefined,
): string {
  if (pixelFront && pixelFront !== primary) {
    return pixelFront;
  }

  return firstNonEmptySprite(sprites.back_default, artwork, pixelFront, primary);
}

function convertApiSpritesToSpriteVariations(
  sprites: PokemonSpritesApiData,
): Record<SpriteVariation, PokemonSpriteUrlsModel> {
  const pixelFront = sprites.front_default ?? '';
  const artwork = sprites.other?.['official-artwork']?.front_default;
  const primary = resolveDefaultSpriteUrl(sprites);
  const shinyPrimary = resolveShinySpriteUrl(sprites, primary);
  const retroPrimary = resolveRetroSpriteUrl(sprites, primary, pixelFront, artwork);

  return {
    default: buildSpriteSet(primary),
    retro: buildSpriteSet(retroPrimary),
    shiny: buildSpriteSet(shinyPrimary),
  };
}

/**
 * Tamagotchi uses only the primary API branch (`evolves_to[0]`).
 * Other branches (Eevee, Wurmple, …) are an accepted trade-off — see #255.
 */
export function buildNextEvolutionStep(
  chainNode: EvolutionChainItemApiData,
  fromStage = 1,
): EvolutionStepModel | undefined {
  const child = chainNode.evolves_to?.[0];

  if (!child) {
    return undefined;
  }

  return {
    pokemonId: child.species.name,
    requirements: getEvolutionRequirementsForFromStage(fromStage),
    childNextEvolution: buildNextEvolutionStep(child, fromStage + 1),
  };
}

function buildEvolutionChain(
  detail: PokemonDetailApiData,
  evolutionResponse: EvolutionChainApiResponse,
  chainNode: EvolutionChainItemApiData,
): EvolutionChainModel {
  const speciesName = detail.species.name;
  const currentStage = findEvolutionStageIndex(evolutionResponse.chain, speciesName) ?? 1;

  return {
    currentStage,
    nextEvolution: buildNextEvolutionStep(chainNode, currentStage),
    totalStages: countEvolutionStages(evolutionResponse.chain),
  };
}

export function convertPokemonDetailApiDataToTamagotchiPokemon(
  detail: PokemonDetailApiData,
  evolutionResponse: EvolutionChainApiResponse,
): PokemonModel {
  const chainNode =
    findEvolutionChainNode(evolutionResponse.chain, detail.species.name) ?? evolutionResponse.chain;
  const speciesName = detail.species.name;

  const spriteVariations = convertApiSpritesToSpriteVariations(detail.sprites);

  return {
    evolutionChain: buildEvolutionChain(detail, evolutionResponse, chainNode),
    id: String(detail.id),
    isFirstStage: isFirstStageInEvolutionChain(speciesName, evolutionResponse.chain),
    name: detail.name,
    species: speciesName,
    spriteUrls: spriteVariations.default,
    spriteVariations,
  };
}
