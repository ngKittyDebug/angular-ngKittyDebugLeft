import type { PokemonListItemApiData } from '@shared/models/pokemon-list-api-data-interface';

export interface PokemonTypeApiData {
  id: number;
  pokemon: PokemonSlotApiData[];
}

export interface PokemonSlotApiData {
  slot: number;
  pokemon: PokemonListItemApiData;
}

export interface PokemonGenerationApiData {
  id: number;
  pokemon_species: PokemonListItemApiData[];
}
