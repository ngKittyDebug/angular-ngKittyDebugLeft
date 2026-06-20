import type { PokemonListItemApiData } from '@shared/models/pokemon-list-api-data-interface';

export interface PokemonTypes {
  id: number;
  pokemon: PokemonSlotElement[];
}

export interface PokemonSlotElement {
  slot: number;
  pokemon: PokemonListItemApiData;
}

export interface PokemonGeneration {
  id: number;
  pokemon_species: PokemonListItemApiData[];
}
