import type { PokemonFavoriteApiResponse } from '../models/profile.model';

export function extractFavoritePokemonList(response: PokemonFavoriteApiResponse): string[] {
  return response.pokemonNameFavorite ?? response.pokemonNameFavoriteList ?? [];
}
