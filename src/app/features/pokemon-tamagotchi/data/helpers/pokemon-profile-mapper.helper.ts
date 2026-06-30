import type {
  EvolutionChainApiResponse,
  EvolutionChainItemApiData,
} from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type {
  PokemonDetailApiData,
  PokemonSpritesApiData,
} from '@shared/models/pokemon-detail-api-data-interface';
import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import type { EvolutionChain } from '../../models/evolution.model';
import type { Pokemon, PokemonSpriteUrls } from '../../models/pokemon.model';

export function isFirstStageInEvolutionChain(
  speciesName: string,
  chainRoot: EvolutionChainItemApiData,
): boolean {
  return chainRoot.species.name.toLowerCase() === speciesName.toLowerCase();
}

export function findEvolutionChainNode(
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

export function countEvolutionStages(node: EvolutionChainItemApiData): number {
  if (!node.evolves_to?.length) {
    return 1;
  }

  return 1 + Math.max(...node.evolves_to.map((child) => countEvolutionStages(child)));
}

export function findEvolutionStageIndex(
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

export function mapSprites(sprites: PokemonSpritesApiData): PokemonSpriteUrls {
  const artwork = sprites.other?.['official-artwork']?.front_default;
  const primary = artwork ?? sprites.front_default ?? '';

  return {
    eating: primary,
    evolving: primary,
    happy: primary,
    normal: primary,
    sad: primary,
    sleeping: primary,
  };
}

export function buildEvolutionChain(
  detail: PokemonDetailApiData,
  evolutionResponse: EvolutionChainApiResponse,
  chainNode: EvolutionChainItemApiData,
): EvolutionChain {
  const speciesName = detail.species.name;
  const currentStage = findEvolutionStageIndex(evolutionResponse.chain, speciesName) ?? 1;
  const nextSpecies = chainNode.evolves_to?.[0]?.species;

  return {
    currentStage,
    nextEvolution: nextSpecies
      ? {
          pokemonId: nextSpecies.name,
          requirements: EVOLUTION_REQUIREMENTS,
        }
      : undefined,
    totalStages: countEvolutionStages(evolutionResponse.chain),
  };
}

export function mapApiToTamagotchiPokemon(
  detail: PokemonDetailApiData,
  evolutionResponse: EvolutionChainApiResponse,
): Pokemon {
  const chainNode =
    findEvolutionChainNode(evolutionResponse.chain, detail.species.name) ?? evolutionResponse.chain;
  const speciesName = detail.species.name;

  return {
    baseStats: {
      energyRestorationRate: 1,
      experienceMultiplier: 1,
      hungerDecayRate: 1,
      moodDecayRate: 1,
    },
    evolutionChain: buildEvolutionChain(detail, evolutionResponse, chainNode),
    id: String(detail.id),
    isFirstStage: isFirstStageInEvolutionChain(speciesName, evolutionResponse.chain),
    name: detail.name,
    species: speciesName,
    spriteUrls: mapSprites(detail.sprites),
  };
}
