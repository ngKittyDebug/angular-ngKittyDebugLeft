import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { BotPlayerService } from './bot-player.service';
import type { BattlePokemon, BattleState } from '../models/battle.model';
import { BULBASAUR_FIXTURE, CHARMANDER_FIXTURE } from '../fixtures/pokemon.fixture';

describe('BotPlayerService', () => {
  let service: BotPlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BotPlayerService],
    });
    service = TestBed.inject(BotPlayerService);
  });

  it('должен быть создан', () => {
    expect(service).toBeTruthy();
  });

  describe('getCommandList', () => {
    it('должен возвращать валидную команду для активного покемона бота в 1 на 1', () => {
      const mockState: BattleState = {
        playerSide: {
          playerType: 'player',
          pokemons: [structuredClone(BULBASAUR_FIXTURE)],
          activePokemonIds: [1],
        },
        opponentSide: {
          playerType: 'bot',
          pokemons: [structuredClone(CHARMANDER_FIXTURE)],
          activePokemonIds: [4],
        },
        status: 'waiting-for-commands',
        winner: null,
        turn: 1,
      };

      const commandList = service.getCommandList(mockState);

      expect(commandList).toHaveLength(1);
      const cmd = commandList[0];

      expect(cmd.pokemonId).toBe(4);
      expect(['scratch', 'ember']).toContain(cmd.moveName);
      expect(cmd.targetId).toBe(1); // Bulbasaur is the only player active
    });

    it('не должен возвращать команду для потерявших сознание покемонов', () => {
      const faintedCharmander: BattlePokemon = {
        ...structuredClone(CHARMANDER_FIXTURE),
        hp: 0,
      };

      const mockState: BattleState = {
        playerSide: {
          playerType: 'player',
          pokemons: [structuredClone(BULBASAUR_FIXTURE)],
          activePokemonIds: [1],
        },
        opponentSide: {
          playerType: 'bot',
          pokemons: [faintedCharmander],
          activePokemonIds: [4],
        },
        status: 'waiting-for-commands',
        winner: null,
        turn: 1,
      };

      const commandList = service.getCommandList(mockState);

      expect(commandList).toHaveLength(0);
    });

    it('должен возвращать команды для всех активных живых покемонов бота в режиме 2 на 2', () => {
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
            {
              id: 2,
              name: 'ivysaur',
              maxHp: 60,
              hp: 60,
              stats: { hp: 60, attack: 62, defense: 63, speed: 60 },
              types: ['grass', 'poison'],
              sprites: { front: '', back: '' },
              moves: [{ name: 'tackle', type: 'normal', power: 40 }],
            },
          ],
          activePokemonIds: [1, 2],
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
              moves: [{ name: 'scratch', type: 'normal', power: 40 }],
            },
            {
              id: 5,
              name: 'charmeleon',
              maxHp: 58,
              hp: 58,
              stats: { hp: 58, attack: 64, defense: 58, speed: 80 },
              types: ['fire'],
              sprites: { front: '', back: '' },
              moves: [{ name: 'scratch', type: 'normal', power: 40 }],
            },
          ],
          activePokemonIds: [4, 5],
        },
        status: 'waiting-for-commands',
        winner: null,
        turn: 1,
      };

      const commandList = service.getCommandList(mockState);

      expect(commandList).toHaveLength(2);
      expect(commandList.map((c) => c.pokemonId)).toContain(4);
      expect(commandList.map((c) => c.pokemonId)).toContain(5);
      expect([1, 2]).toContain(commandList[0].targetId);
      expect([1, 2]).toContain(commandList[1].targetId);
    });
  });
});
