import type { PokemonListItemApiData } from '@shared/models/pokemon-list-api-data-interface';

export function filterCommonPokemons(
  arrayOfArraysOfPokemon: PokemonListItemApiData[][],
): PokemonListItemApiData[] {
  if (!arrayOfArraysOfPokemon || arrayOfArraysOfPokemon.length === 0) {
    return [];
  }
  if (arrayOfArraysOfPokemon.length === 1) {
    return arrayOfArraysOfPokemon[0].map((item) => item);
  }
  const firstArray = arrayOfArraysOfPokemon[0];

  const otherArraysSets = arrayOfArraysOfPokemon
    .slice(1)
    .map((subArray) => new Set(subArray.map((item) => item.name)));

  return firstArray
    .filter((item) => otherArraysSets.every((nameSet) => nameSet.has(item.name)))
    .map((item) => item);
}

export function intersectNonEmpty(
  pokemonsTypesArray: PokemonListItemApiData[],
  pokemonGenerationArray: PokemonListItemApiData[],
): PokemonListItemApiData[] {
  if (pokemonsTypesArray.length === 0) {
    return pokemonGenerationArray;
  }

  if (pokemonGenerationArray.length === 0) {
    return pokemonsTypesArray;
  }

  const namesSet = new Set(pokemonsTypesArray.map((p) => p.name.toLowerCase()));

  return pokemonGenerationArray.filter((p) => namesSet.has(p.name.toLowerCase()));
}
