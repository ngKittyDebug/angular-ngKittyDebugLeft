import { describe, expect, it } from 'vitest';
import {
  convertPokemonDetailApiDataToBattlePokemon,
  convertPokemonDetailApiDataToPokemonMoveList,
} from './pokemon-converter';
import { MOCK_RAW_POKEMON } from '../../../fixtures/pokemon.fixture';

describe('Pokemon converter', () => {
  it('should correctly convert raw PokeAPI data to BattlePokemon', () => {
    const result = convertPokemonDetailApiDataToBattlePokemon(MOCK_RAW_POKEMON);

    expect(result.id).toBe(25);
    expect(result.name).toBe('pikachu');
    expect(result.maxHp).toBe(35);
    expect(result.hp).toBe(35);
    expect(result.stats).toEqual({
      hp: 35,
      attack: 55,
      defense: 40,
      speed: 90,
    });
    expect(result.types).toEqual(['electric']);
    expect(result.sprites.front).toBe('animated_front.gif');
    expect(result.sprites.back).toBe('animated_back.gif');

    expect(result.moves.length).toBeGreaterThanOrEqual(1);
    expect(result.moves[0].name).toBe('tackle');
  });

  it('should correctly infer moves from PokeAPI data (convertPokemonDetailApiDataToMoves)', () => {
    const moves = convertPokemonDetailApiDataToPokemonMoveList(MOCK_RAW_POKEMON);

    // First move is default 'tackle'
    expect(moves.length).toBeGreaterThanOrEqual(1);
    expect(moves[0].name).toBe('tackle');
    expect(moves[0].type).toBe('normal');
  });
});
