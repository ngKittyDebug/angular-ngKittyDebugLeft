import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PokemonBattleApiService } from './pokemon-battle-api.service';
import { POKEMON_BASE_API } from '@core/constants/pokemon-constants';

describe('PokemonBattleApiService', () => {
  let service: PokemonBattleApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PokemonBattleApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PokemonBattleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('должен возвращать пустой список, если результатов нет', () => {
    service.getPokemonList(10, 0).subscribe((result) => {
      expect(result.pokemonList).toEqual([]);
      expect(result.totalCount).toBe(500);
    });

    const listRequest = httpMock.expectOne(`${POKEMON_BASE_API}pokemon?limit=10&offset=0`);

    expect(listRequest.request.method).toBe('GET');
    listRequest.flush({ count: 500, results: [] });
  });

  it('должен скачивать детали покемонов через forkJoin', () => {
    service.getPokemonList(2, 0).subscribe((result) => {
      expect(result.pokemonList).toHaveLength(2);
      expect(result.pokemonList[0].name).toBe('bulbasaur');
      expect(result.pokemonList[1].name).toBe('ivysaur');
      expect(result.totalCount).toBe(2);
    });

    const listRequest = httpMock.expectOne(`${POKEMON_BASE_API}pokemon?limit=2&offset=0`);

    expect(listRequest.request.method).toBe('GET');
    listRequest.flush({
      count: 2,
      results: [
        { name: 'bulbasaur', url: `${POKEMON_BASE_API}pokemon/1/` },
        { name: 'ivysaur', url: `${POKEMON_BASE_API}pokemon/2/` },
      ],
    });

    const detailRequest1 = httpMock.expectOne(`${POKEMON_BASE_API}pokemon/1/`);

    expect(detailRequest1.request.method).toBe('GET');
    detailRequest1.flush({ id: 1, name: 'bulbasaur' });

    const detailRequest2 = httpMock.expectOne(`${POKEMON_BASE_API}pokemon/2/`);

    expect(detailRequest2.request.method).toBe('GET');
    detailRequest2.flush({ id: 2, name: 'ivysaur' });
  });
});
