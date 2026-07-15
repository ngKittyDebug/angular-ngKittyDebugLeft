import { inject } from '@angular/core';
import type { CanMatchFn, UrlSegment } from '@angular/router';
import { PokemonApiService } from '@core/api/pokemon-api.service';

const POKEMON_ROUTE_PREFIX = 'pokemon';

function getPokemonEndpointFromSegments(segments: UrlSegment[]): string | null {
  const prefixIndex = segments.findIndex((segment) => segment.path === POKEMON_ROUTE_PREFIX);

  if (prefixIndex === -1) {
    return null;
  }

  const endpoint = segments[prefixIndex + 1]?.path;

  return endpoint ? endpoint.toLowerCase() : null;
}

export const pokemonExistsCanMatch: CanMatchFn = (_route, segments) => {
  const pokemonEndpoint = getPokemonEndpointFromSegments(segments);

  if (!pokemonEndpoint) {
    return false;
  }

  const pokemonApiService = inject(PokemonApiService);

  return pokemonApiService.checkPokemonExists(pokemonEndpoint);
};
