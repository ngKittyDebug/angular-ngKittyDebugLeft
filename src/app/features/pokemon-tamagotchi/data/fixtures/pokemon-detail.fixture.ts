import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';

export interface PokemonDetailFixtureOptions {
  artworkSprite?: string | null;
  baseExperience?: number;
  frontDefault?: string | null;
  height?: number;
  id: number;
  name: string;
  order?: number;
  showdownSprite?: string | null;
  speciesUrl?: string;
  weight?: number;
}

export function createPokemonDetailFixture(
  options: PokemonDetailFixtureOptions,
): PokemonDetailApiData {
  const {
    artworkSprite = '/sprite-art.png',
    baseExperience = 50,
    frontDefault = '/sprite.png',
    height = 7,
    id,
    name,
    order = id,
    showdownSprite = null,
    speciesUrl = '',
    weight = 90,
  } = options;

  const detail: PokemonDetailApiData = {
    abilities: [],
    base_experience: baseExperience,
    cries: { latest: '', legacy: '' },
    forms: [],
    game_indices: [],
    height,
    held_items: [],
    id,
    is_default: true,
    location_area_encounters: '',
    moves: [],
    name,
    order,
    past_abilities: [],
    past_stats: [],
    past_types: [],
    species: { name, url: speciesUrl },
    sprites: {
      back_default: null,
      back_female: null,
      back_shiny: null,
      back_shiny_female: null,
      front_default: frontDefault,
      front_female: null,
      front_shiny: null,
      front_shiny_female: null,
      other: {
        dream_world: { front_default: null, front_female: null },
        home: {
          front_default: null,
          front_female: null,
          front_shiny: null,
          front_shiny_female: null,
        },
        'official-artwork': { front_default: artworkSprite, front_shiny: null },
        showdown: {
          back_default: null,
          back_female: null,
          back_shiny: null,
          back_shiny_female: null,
          front_default: showdownSprite,
          front_female: null,
          front_shiny: null,
          front_shiny_female: null,
        },
      },
      versions: {},
    },
    stats: [],
    types: [],
    weight,
  };

  return detail;
}

export const CHARMELEON_DETAIL = createPokemonDetailFixture({
  artworkSprite: '/charmander-art.png',
  baseExperience: 62,
  frontDefault: '/charmander.png',
  height: 6,
  id: 5,
  name: 'charmeleon',
  order: 5,
  speciesUrl: `${POKEMON_BASE_API}pokemon-species/5/`,
  weight: 85,
});

export const CHARMANDER_SPECIES = {
  base_happiness: 70,
  capture_rate: 45,
  color: { name: 'red', url: '' },
  egg_groups: [],
  evolution_chain: { url: `${POKEMON_BASE_API}evolution-chain/10/` },
  evolves_from_species: null,
  flavor_text_entries: [],
  form_descriptions: [],
  forms_switchable: false,
  gender_rate: 1,
  generation: { name: 'generation-i', url: '' },
  genera: [],
  growth_rate: { name: 'medium-slow', url: '' },
  habitat: null,
  has_gender_differences: false,
  hatch_counter: 20,
  id: 4,
  is_baby: false,
  is_legendary: false,
  is_mythical: false,
  name: 'charmander',
  names: [],
  order: 5,
  pal_park_encounters: [],
  pokedex_numbers: [],
  shape: { name: 'upright', url: '' },
  varieties: [],
} satisfies PokemonSpeciesApiData;
