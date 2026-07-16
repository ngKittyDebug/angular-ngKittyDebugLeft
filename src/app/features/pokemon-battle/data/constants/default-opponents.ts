import { POKEMON_SPRITE_BASE } from './pokemon-battle.constants';
import type { BattlePokemon } from '../models/battle.model';

/**
 * Default team for opponents when not enough random pokemons are available.
 * Uses neutral PokeAPI sprite URLs to avoid cross-feature coupling with frenzy assets.
 */
export const DEFAULT_OPPONENT_TEAM: BattlePokemon[] = [
  {
    id: 4,
    name: 'charmander',
    maxHp: 39,
    hp: 39,
    stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
    types: ['fire'],
    sprites: {
      front: `${POKEMON_SPRITE_BASE}/4.png`,
      back: `${POKEMON_SPRITE_BASE}/back/4.png`,
    },
    moves: [
      { name: 'scratch', type: 'normal', power: 40 },
      { name: 'ember', type: 'fire', power: 40 },
    ],
  },
  {
    id: 2,
    name: 'ivysaur',
    maxHp: 60,
    hp: 60,
    stats: { hp: 60, attack: 62, defense: 63, speed: 60 },
    types: ['grass', 'poison'],
    sprites: {
      front: `${POKEMON_SPRITE_BASE}/2.png`,
      back: `${POKEMON_SPRITE_BASE}/back/2.png`,
    },
    moves: [
      { name: 'tackle', type: 'normal', power: 40 },
      { name: 'vine-whip', type: 'grass', power: 45 },
    ],
  },
];
