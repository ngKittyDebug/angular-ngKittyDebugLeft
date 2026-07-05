import type { PokemonFavoriteResponse } from '../models/profile.model';

export function extractFavoritePokemonList(response: PokemonFavoriteResponse): string[] {
  return response.pokemonNameFavorite ?? response.pokemonNameFavoriteList ?? [];
}
