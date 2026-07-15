import { describe, expect, it } from 'vitest';
import { extractFavoritePokemonList } from './extract-favorite-pokemon-list';

describe('extractFavoritePokemonList', () => {
  it('должен вернуть pokemonNameFavorite, если он есть в ответе', () => {
    const result = extractFavoritePokemonList({
      pokemonNameFavorite: ['pikachu'],
    });

    expect(result).toEqual(['pikachu']);
  });

  it('должен вернуть pokemonNameFavoriteList, если pokemonNameFavorite отсутствует', () => {
    const result = extractFavoritePokemonList({
      pokemonNameFavoriteList: ['bulbasaur'],
    });

    expect(result).toEqual(['bulbasaur']);
  });

  it('должен вернуть пустой массив, если список отсутствует', () => {
    const result = extractFavoritePokemonList({});

    expect(result).toEqual([]);
  });
});
