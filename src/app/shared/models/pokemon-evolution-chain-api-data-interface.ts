export interface EvolutionChainResponse {
  id: number;
  baby_trigger_item: NamedAPIResource | null;
  chain: EvolutionChainItem;
}

export interface EvolutionChainItem {
  is_baby: boolean;
  species: NamedAPIResource;
  evolution_details: EvolutionDetail[];
  evolves_to: EvolutionChainItem[];
}

export interface EvolutionDetail {
  base_form: NamedAPIResource | null;
  held_item: NamedAPIResource | null;
  min_damage_taken: number | null;
  min_move_count: number | null;
  min_steps: number | null;
  needs_multiplayer: boolean;
  region: string | null;
  used_move: NamedAPIResource | null;
  trigger: NamedAPIResource;
  min_level: number | null;
  item: NamedAPIResource | null;
  gender: number | null;
  time_of_day: string | null;
  min_happiness: number | null;
  min_affection: number | null;
  min_beauty: number | null;
  known_move: NamedAPIResource | null;
  known_move_type: NamedAPIResource | null;
  location: NamedAPIResource | null;
  needs_overworld_rain: boolean;
  party_species: NamedAPIResource | null;
  party_type: NamedAPIResource | null;
  relative_physical_stats: number | null;
  trade_species: NamedAPIResource | null;
  turn_upside_down: boolean;
}

export interface NamedAPIResource {
  name: string;
  url: string;
}
