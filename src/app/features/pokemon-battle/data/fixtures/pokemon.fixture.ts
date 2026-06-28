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
