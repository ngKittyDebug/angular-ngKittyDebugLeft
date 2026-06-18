export interface PokemonDetailApiData {
  id: number;
  name: string;
  base_experience: number;
  height: number;
  weight: number;
  is_default: boolean;
  order: number;
  abilities: PokemonAbilityApiData[];
  forms: NamedApiResourceApiData[];
  game_indices: PokemonGameIndexApiData[];
  held_items: PokemonHeldItemApiData[];
  location_area_encounters: string;
  moves: PokemonMoveApiData[];
  past_abilities: PokemonPastAbilityApiData[];
  past_stats: PokemonPastStatApiData[];
  past_types: PokemonPastTypeApiData[];
  species: NamedApiResourceApiData;
  sprites: PokemonSpritesApiData;
  cries: PokemonCriesApiData;
  stats: PokemonStatApiData[];
  types: PokemonTypeApiData[];
}

export interface NamedApiResourceApiData {
  name: string;
  url: string;
}

export interface PokemonAbilityApiData {
  is_hidden: boolean;
  slot: number;
  ability: NamedApiResourceApiData | null;
}

export interface PokemonPastAbilityApiData {
  abilities: PokemonAbilityApiData[];
  generation: NamedApiResourceApiData;
}

export interface PokemonPastStatApiData {
  stats: PokemonStatApiData[];
  generation: NamedApiResourceApiData;
}

export interface PokemonGameIndexApiData {
  game_index: number;
  version: NamedApiResourceApiData;
}

export interface PokemonHeldItemApiData {
  item: NamedApiResourceApiData;
  version_details: PokemonHeldItemVersionApiData[];
}

export interface PokemonHeldItemVersionApiData {
  version: NamedApiResourceApiData;
  rarity: number;
}

export interface PokemonMoveApiData {
  move: NamedApiResourceApiData;
  version_group_details: PokemonMoveVersionApiData[];
}

export interface PokemonMoveVersionApiData {
  move_learn_method: NamedApiResourceApiData;
  version_group: NamedApiResourceApiData;
  level_learned_at: number;
  order: number | null;
}

export interface PokemonPastTypeApiData {
  generation: NamedApiResourceApiData;
  types: PokemonTypeApiData[];
}

export interface PokemonTypeApiData {
  slot: number;
  type: NamedApiResourceApiData;
}

export interface PokemonStatApiData {
  base_stat: number;
  effort: number;
  stat: NamedApiResourceApiData;
}

export interface PokemonSpritesApiData {
  front_default: string | null;
  front_shiny: string | null;
  front_female: string | null;
  front_shiny_female: string | null;
  back_default: string | null;
  back_shiny: string | null;
  back_female: string | null;
  back_shiny_female: string | null;
  other: PokemonSpritesOtherApiData;
  versions: PokemonVersionsApiData;
}

export interface PokemonSpritesOtherApiData {
  dream_world: PokemonDreamWorldSpritesApiData;
  home: PokemonHomeSpritesApiData;
  'official-artwork': PokemonOfficialArtworkSpritesApiData;
  showdown: PokemonShowdownSpritesApiData;
}

export interface PokemonDreamWorldSpritesApiData {
  front_default: string | null;
  front_female: string | null;
}

export interface PokemonOfficialArtworkSpritesApiData {
  front_default: string | null;
  front_shiny: string | null;
}

export interface PokemonHomeSpritesApiData {
  front_default: string | null;
  front_shiny: string | null;
  front_female: string | null;
  front_shiny_female: string | null;
}

export interface PokemonShowdownSpritesApiData {
  front_default: string | null;
  front_shiny: string | null;
  front_female: string | null;
  front_shiny_female: string | null;
  back_default: string | null;
  back_shiny: string | null;
  back_female: string | null;
  back_shiny_female: string | null;
}

export interface PokemonSpriteSetApiData {
  front_default?: string | null;
  front_shiny?: string | null;
  front_female?: string | null;
  front_shiny_female?: string | null;
  back_default?: string | null;
  back_shiny?: string | null;
  back_female?: string | null;
  back_shiny_female?: string | null;
  [key: string]: string | null | undefined;
}

export type PokemonVersionsApiData = Record<string, Record<string, PokemonVersionSpriteApiData>>;

export type PokemonVersionSpriteApiData = PokemonSpriteSetApiData | PokemonNestedSpriteSetApiData;

export type PokemonNestedSpriteSetApiData = Record<
  string,
  string | null | undefined | PokemonSpriteSetApiData
>;

export interface PokemonCriesApiData {
  latest: string;
  legacy: string;
}
