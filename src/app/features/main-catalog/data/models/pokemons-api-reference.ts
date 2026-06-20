import type { PokemonListItemApiData } from '@shared/models/pokemon-list-api-data-interface';

export interface PokemonTypes {
  id: string;
  pokemon: PokemonSlotElement[];
}

export interface PokemonSlotElement {
  slot: number;
  pokemon: PokemonListItemApiData;
}
