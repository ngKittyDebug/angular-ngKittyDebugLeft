import type { BattlePokemon } from '../models/battle.model';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';

export const BULBASAUR_FIXTURE = {
  id: 1,
  name: 'bulbasaur',
  maxHp: 45,
  hp: 45,
  stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
  types: ['grass', 'poison'],
  sprites: {
    front: 'frenzy/pokemon/sprites/bulbasaur.gif',
    back: 'frenzy/pokemon/sprites/bulbasaur.gif',
  },
  moves: [
    { name: 'tackle', type: 'normal', power: 40 },
    { name: 'vine-whip', type: 'grass', power: 45 },
  ],
} as const satisfies BattlePokemon;

export const CHARMANDER_FIXTURE = {
  id: 4,
  name: 'charmander',
  maxHp: 39,
  hp: 39,
  stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
  types: ['fire'],
  sprites: {
    front: 'frenzy/pokemon/sprites/charmander.gif',
    back: 'frenzy/pokemon/sprites/charmander.gif',
  },
  moves: [
    { name: 'scratch', type: 'normal', power: 40 },
    { name: 'ember', type: 'fire', power: 40 },
  ],
} as const satisfies BattlePokemon;

export const SQUIRTLE_FIXTURE = {
  id: 7,
  name: 'squirtle',
  maxHp: 44,
  hp: 44,
  stats: { hp: 44, attack: 48, defense: 65, speed: 43 },
  types: ['water'],
  sprites: {
    front: 'frenzy/pokemon/sprites/squirtle.gif',
    back: 'frenzy/pokemon/sprites/squirtle.gif',
  },
  moves: [
    { name: 'tackle', type: 'normal', power: 40 },
    { name: 'water-gun', type: 'water', power: 40 },
  ],
} as const satisfies BattlePokemon;

export const IVYSAUR_FIXTURE = {
  id: 2,
  name: 'ivysaur',
  maxHp: 60,
  hp: 60,
  stats: { hp: 60, attack: 62, defense: 63, speed: 60 },
  types: ['grass', 'poison'],
  sprites: {
    front: 'frenzy/pokemon/sprites/ivysaur.gif',
    back: 'frenzy/pokemon/sprites/ivysaur.gif',
  },
  moves: [
    { name: 'tackle', type: 'normal', power: 40 },
    { name: 'vine-whip', type: 'grass', power: 45 },
  ],
} as const satisfies BattlePokemon;

export const MOCK_RAW_POKEMON = {
  id: 25,
  name: 'pikachu',
  base_experience: 112,
  height: 4,
  weight: 60,
  is_default: true,
  order: 1,
  abilities: [],
  forms: [],
  game_indices: [],
  held_items: [],
  location_area_encounters: '',
  past_abilities: [],
  past_stats: [],
  past_types: [],
  species: { name: 'pikachu', url: '' },
  cries: { latest: '', legacy: '' },
  stats: [
    { base_stat: 35, effort: 0, stat: { name: 'hp', url: '' } },
    { base_stat: 55, effort: 0, stat: { name: 'attack', url: '' } },
    { base_stat: 40, effort: 0, stat: { name: 'defense', url: '' } },
    { base_stat: 90, effort: 0, stat: { name: 'speed', url: '' } },
  ],
  types: [{ slot: 1, type: { name: 'electric', url: '' } }],
  sprites: {
    front_default: 'front.png',
    back_default: 'back.png',
    front_shiny: null,
    front_female: null,
    front_shiny_female: null,
    back_shiny: null,
    back_female: null,
    back_shiny_female: null,
    other: {
      dream_world: { front_default: null, front_female: null },
      home: {
        front_default: null,
        front_shiny: null,
        front_female: null,
        front_shiny_female: null,
      },
      'official-artwork': { front_default: null, front_shiny: null },
      showdown: {
        front_default: 'animated_front.gif',
        back_default: 'animated_back.gif',
        front_shiny: null,
        front_female: null,
        front_shiny_female: null,
        back_shiny: null,
        back_female: null,
        back_shiny_female: null,
      },
    },
    versions: {},
  },
  moves: [
    {
      move: { name: 'thunderbolt', url: '' },
      version_group_details: [],
    },
    {
      move: { name: 'tackle', url: '' },
      version_group_details: [],
    },
  ],
} as const satisfies PokemonDetailApiData;
