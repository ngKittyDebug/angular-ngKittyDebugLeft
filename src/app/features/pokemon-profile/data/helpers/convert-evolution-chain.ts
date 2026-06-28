import type { EvolutionChainItemApiData } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type { EvolutionNodeModel } from '@shared/services/pokemon-data.service';

export function convertEvolutionChainToNodeModel(
  node: EvolutionChainItemApiData | null | undefined,
): EvolutionNodeModel | null {
  if (!node || !node.species) {
    return null;
  }

  const detail = node.evolution_details?.[0];
  const condition = detail?.min_level ? `Lv. ${detail.min_level}` : detail?.trigger?.name || null;

  const children: EvolutionNodeModel[] = (node.evolves_to || [])
    .map((child: EvolutionChainItemApiData) => convertEvolutionChainToNodeModel(child))
    .filter((c): c is EvolutionNodeModel => c !== null);

  return {
    name: node.species.name,
    condition,
    children,
  };
}
