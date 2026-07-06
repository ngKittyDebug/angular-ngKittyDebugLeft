import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { GuardResult, UrlSegment } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom, isObservable } from 'rxjs';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import { pokemonExistsCanMatch } from './pokemon-exists.guard';
import { POKEMON_DATA_FIXTURE } from '@shared/fixtures/eevee.fixture';

async function resolveCanMatchResult(
  result: ReturnType<typeof pokemonExistsCanMatch>,
): Promise<GuardResult> {
  if (isObservable(result)) {
    return firstValueFrom(result);
  }

  return result;
}

describe('pokemonExistsCanMatch', () => {
  let httpMock: HttpTestingController;

  const pokemonSegments: UrlSegment[] = [
    { path: 'pokemon', parameters: {}, parameterMap: null as never },
    { path: 'eevee', parameters: {}, parameterMap: null as never },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PokemonApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('должен вернуть true когда покемон существует', async () => {
    const resultPromise = TestBed.runInInjectionContext(() => {
      const result = pokemonExistsCanMatch({} as never, pokemonSegments, {} as never);

      return resolveCanMatchResult(result);
    });

    const request = httpMock.expectOne((r) => r.url.includes('/pokemon/eevee'));

    request.flush(POKEMON_DATA_FIXTURE);

    await expect(resultPromise).resolves.toBe(true);
  });

  it('должен вернуть false когда покемон не найден', async () => {
    const resultPromise = TestBed.runInInjectionContext(() => {
      const result = pokemonExistsCanMatch({} as never, pokemonSegments, {} as never);

      return resolveCanMatchResult(result);
    });

    const request = httpMock.expectOne((r) => r.url.includes('/pokemon/eevee'));

    request.flush('Not Found', { status: 404, statusText: 'Not Found' });

    await expect(resultPromise).resolves.toBe(false);
  });
});
