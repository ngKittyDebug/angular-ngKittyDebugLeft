import type { PokemonListItemApiData } from '@shared/models/pokemon-list-api-data-interface';
import type { PokemonSlotElement } from '../models/pokemons-api-reference';

export function filterCommonPokemons(
  arrayOfArraysOfPokemon: PokemonSlotElement[][],
): PokemonListItemApiData[] {
  if (!arrayOfArraysOfPokemon || arrayOfArraysOfPokemon.length === 0) {
    return [];
  }
  if (arrayOfArraysOfPokemon.length === 1) {
    return arrayOfArraysOfPokemon[0].map((item) => item.pokemon);
  }
  const firstArray = arrayOfArraysOfPokemon[0];

  const otherArraysSets = arrayOfArraysOfPokemon
    .slice(1)
    .map((subArray) => new Set(subArray.map((item) => item.pokemon.name)));

  return firstArray
    .filter((item) => otherArraysSets.every((nameSet) => nameSet.has(item.pokemon.name)))
    .map((item) => item.pokemon);
}
