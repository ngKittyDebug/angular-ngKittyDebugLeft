import type { NamedApiResourceApiData } from './pokemon-detail-api-data-interface.ts';

export interface PokemonSpeciesApiData {
  id: number;
  name: string;
  order: number;
  gender_rate: number;
  capture_rate: number;
  base_happiness: number;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  hatch_counter: number;
  has_gender_differences: boolean;
  forms_switchable: boolean;
  growth_rate: NamedApiResourceApiData;
  pokedex_numbers: PokemonPokedexNumberApiData[];
  egg_groups: NamedApiResourceApiData[];
  color: NamedApiResourceApiData;
  shape: NamedApiResourceApiData;
  evolves_from_species: NamedApiResourceApiData | null;
  evolution_chain: EvolutionChainUrlApiData;
  habitat: NamedApiResourceApiData | null;
  generation: NamedApiResourceApiData;
  names: PokemonNameApiData[];
  flavor_text_entries: PokemonFlavorTextApiData[];
  form_descriptions: PokemonFormDescriptionApiData[];
  genera: PokemonGenusApiData[];
  pal_park_encounters: PokemonPalParkEncounterApiData[];
  varieties: PokemonVarietyApiData[];
}

export interface PokemonPokedexNumberApiData {
  entry_number: number;
  pokedex: NamedApiResourceApiData;
}

export interface EvolutionChainUrlApiData {
  url: string;
}

export interface PokemonNameApiData {
  name: string;
  language: NamedApiResourceApiData;
}

export interface PokemonFlavorTextApiData {
  flavor_text: string;
  language: NamedApiResourceApiData;
  version: NamedApiResourceApiData;
}

export interface PokemonFormDescriptionApiData {
  description: string;
  language: NamedApiResourceApiData;
}

export interface PokemonGenusApiData {
  genus: string;
  language: NamedApiResourceApiData;
}

export interface PokemonPalParkEncounterApiData {
  area: NamedApiResourceApiData;
  base_score: number;
  rate: number;
}

export interface PokemonVarietyApiData {
  is_default: boolean;
  pokemon: NamedApiResourceApiData;
}
