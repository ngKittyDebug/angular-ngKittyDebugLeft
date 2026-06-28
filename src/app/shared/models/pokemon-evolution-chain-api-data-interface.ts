import type { NamedApiResourceApiData } from './pokemon-detail-api-data-interface';

export interface EvolutionChainApiResponse {
  id: number;
  baby_trigger_item: NamedApiResourceApiData | null;
  chain: EvolutionChainItemApiData;
}

export interface EvolutionChainItemApiData {
  is_baby: boolean;
  species: NamedApiResourceApiData;
  evolution_details: EvolutionDetailApiData[];
  evolves_to: EvolutionChainItemApiData[];
}

export interface EvolutionDetailApiData {
  base_form: NamedApiResourceApiData | null;
  held_item: NamedApiResourceApiData | null;
  min_damage_taken: number | null;
  min_move_count: number | null;
  min_steps: number | null;
  needs_multiplayer: boolean;
  region: string | null;
  used_move: NamedApiResourceApiData | null;
  trigger: NamedApiResourceApiData;
  min_level: number | null;
  item: NamedApiResourceApiData | null;
  gender: number | null;
  time_of_day: string | null;
  min_happiness: number | null;
  min_affection: number | null;
  min_beauty: number | null;
  known_move: NamedApiResourceApiData | null;
  known_move_type: NamedApiResourceApiData | null;
  location: NamedApiResourceApiData | null;
  needs_overworld_rain: boolean;
  party_species: NamedApiResourceApiData | null;
  party_type: NamedApiResourceApiData | null;
  relative_physical_stats: number | null;
  trade_species: NamedApiResourceApiData | null;
  turn_upside_down: boolean;
}
