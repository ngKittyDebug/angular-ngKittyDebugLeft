import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { BotPlayerService } from './bot-player.service';
import type { BattleState } from '@game/pokemon-battle/types';

describe('BotPlayerService', () => {
  let service: BotPlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BotPlayerService],
    });
    service = TestBed.inject(BotPlayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCommands', () => {
    it('должен возвращать валидную команду для активного покемона бота в 1 на 1', () => {
      const mockState: BattleState = {
        playerSide: {
          playerType: 'player',
          pokemons: [
            {
              id: 1,
              name: 'bulbasaur',
              maxHp: 45,
              hp: 45,
              stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
              types: ['grass', 'poison'],
              sprites: { front: '', back: '' },
              moves: [{ name: 'tackle', type: 'normal', power: 40 }],
            },
          ],
          activePokemonIds: [1],
        },
        opponentSide: {
          playerType: 'bot',
          pokemons: [
            {
              id: 4,
              name: 'charmander',
              maxHp: 39,
              hp: 39,
              stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
              types: ['fire'],
              sprites: { front: '', back: '' },
              moves: [
                { name: 'scratch', type: 'normal', power: 40 },
                { name: 'ember', type: 'fire', power: 40 },
              ],
            },
          ],
          activePokemonIds: [4],
        },
        status: 'waiting-for-commands',
        winner: null,
        turn: 1,
      };

      const commands = service.getCommands(mockState);

      expect(commands).toHaveLength(1);
      const cmd = commands[0];

      expect(cmd.pokemonId).toBe(4);
      expect(['scratch', 'ember']).toContain(cmd.moveName);
      expect(cmd.targetId).toBe(1); // Bulbasaur is the only player active
    });

    it('не должен возвращать команду для потерявших сознание покемонов', () => {
      const mockState: BattleState = {
        playerSide: {
          playerType: 'player',
          pokemons: [
            {
              id: 1,
              name: 'bulbasaur',
              maxHp: 45,
              hp: 45,
              stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
              types: ['grass', 'poison'],
              sprites: { front: '', back: '' },
              moves: [{ name: 'tackle', type: 'normal', power: 40 }],
            },
          ],
          activePokemonIds: [1],
        },
        opponentSide: {
          playerType: 'bot',
          pokemons: [
            {
              id: 4,
              name: 'charmander',
              maxHp: 39,
              hp: 0, // Fainted!
              stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
              types: ['fire'],
              sprites: { front: '', back: '' },
              moves: [{ name: 'scratch', type: 'normal', power: 40 }],
            },
          ],
          activePokemonIds: [4],
        },
        status: 'waiting-for-commands',
        winner: null,
        turn: 1,
      };

      const commands = service.getCommands(mockState);

      expect(commands).toHaveLength(0);
    });
  });
});
