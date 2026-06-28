import { describe, expect, it } from 'vitest';

import { BattleEngine } from '@game/pokemon-battle/battle-engine';
import type { BattlePokemon } from '@game/pokemon-battle/types';

describe('BattleEngine', () => {
  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен правильно инициализировать состояние боя в режиме 1 на 1', () => {
        const playerPokemons: BattlePokemon[] = [
          {
            id: 1,
            name: 'bulbasaur',
            maxHp: 45,
            hp: 45,
            stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
            types: ['grass', 'poison'],
            sprites: { front: 'bulbasaur-front.png', back: 'bulbasaur-back.png' },
            moves: [{ name: 'tackle', type: 'normal', power: 40 }],
          },
        ];
        const opponentPokemons: BattlePokemon[] = [
          {
            id: 4,
            name: 'charmander',
            maxHp: 39,
            hp: 39,
            stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
            types: ['fire'],
            sprites: { front: 'charmander-front.png', back: 'charmander-back.png' },
            moves: [{ name: 'scratch', type: 'normal', power: 40 }],
          },
        ];

        const engine = new BattleEngine(playerPokemons, opponentPokemons);
        const state = engine.getState();

        expect(state.status).toBe('waiting-for-commands');
        expect(state.turn).toBe(1);
        expect(state.winner).toBeNull();
        expect(state.playerSide.pokemons[0].name).toBe('bulbasaur');
        expect(state.playerSide.activePokemonIds).toEqual([1]);
        expect(state.opponentSide.pokemons[0].name).toBe('charmander');
        expect(state.opponentSide.activePokemonIds).toEqual([4]);
      });

      it('должен правильно инициализировать состояние боя в режиме 2 на 2 (Doubles)', () => {
        const playerPokemons: BattlePokemon[] = [
          {
            id: 1,
            name: 'bulbasaur',
            maxHp: 45,
            hp: 45,
            stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
            types: ['grass', 'poison'],
            sprites: { front: 'bulbasaur-front.png', back: 'bulbasaur-back.png' },
            moves: [{ name: 'tackle', type: 'normal', power: 40 }],
          },
          {
            id: 2,
            name: 'ivysaur',
            maxHp: 60,
            hp: 60,
            stats: { hp: 60, attack: 62, defense: 63, speed: 60 },
            types: ['grass', 'poison'],
            sprites: { front: 'ivysaur-front.png', back: 'ivysaur-back.png' },
            moves: [{ name: 'tackle', type: 'normal', power: 40 }],
          },
        ];
        const opponentPokemons: BattlePokemon[] = [
          {
            id: 4,
            name: 'charmander',
            maxHp: 39,
            hp: 39,
            stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
            types: ['fire'],
            sprites: { front: 'charmander-front.png', back: 'charmander-back.png' },
            moves: [{ name: 'scratch', type: 'normal', power: 40 }],
          },
          {
            id: 5,
            name: 'charmeleon',
            maxHp: 58,
            hp: 58,
            stats: { hp: 58, attack: 64, defense: 58, speed: 80 },
            types: ['fire'],
            sprites: { front: 'charmeleon-front.png', back: 'charmeleon-back.png' },
            moves: [{ name: 'scratch', type: 'normal', power: 40 }],
          },
        ];

        const engine = new BattleEngine(playerPokemons, opponentPokemons, true);
        const state = engine.getState();

        expect(state.playerSide.activePokemonIds).toEqual([1, 2]);
        expect(state.opponentSide.activePokemonIds).toEqual([4, 5]);
      });
    });
  });
});
