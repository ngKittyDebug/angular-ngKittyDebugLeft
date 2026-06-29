import type { BattlePokemon } from '@game/pokemon-battle/types';

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
