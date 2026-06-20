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

export function findCommonNamesOfPokemons(array1: string[], array2: string[]) {
  const set2 = new Set(array2);

  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    return [];
  }

  return array1.filter((name) => set2.has(name));
}

export function intersectNonEmpty(arrays: PokemonListItemApiData[][]): PokemonListItemApiData[] {
  const active = arrays.filter((array) => array.length > 0);

  if (active.length === 0) {
    return [];
  }

  if (active.length === 1) {
    return active[0];
  }

  return active.reduce((acc, current) => {
    const set = new Set(current);

    return acc.filter((name) => set.has(name));
  });
}
