import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { PokemonApiService } from './pokemon-api.service';
import { POKEMON_DATA_FIXTURE } from '@shared/fixtures/eevee.fixture';

describe('PokemonApiService', () => {
  let service: PokemonApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PokemonApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PokemonApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('должен инициализироваться', () => {
    expect(service).toBeTruthy();
  });

  describe('Метод getPokemonDetail', () => {
    describe('Happy Path', () => {
      it('должен переиспользовать кэш для повторных подписчиков', async () => {
        const first$ = service.getPokemonDetail('eevee');
        const second$ = service.getPokemonDetail('eevee');

        const firstPromise = firstValueFrom(first$);
        const secondPromise = firstValueFrom(second$);

        const request = httpMock.expectOne((r) => r.url.includes('/pokemon/eevee'));

        request.flush(POKEMON_DATA_FIXTURE);

        const [first, second] = await Promise.all([firstPromise, secondPromise]);

        expect(first).toEqual(POKEMON_DATA_FIXTURE);
        expect(second).toEqual(POKEMON_DATA_FIXTURE);
        httpMock.expectNone((r) => r.url.includes('/pokemon/eevee'));
      });
    });
  });

  describe('Метод checkPokemonExists', () => {
    describe('Happy Path', () => {
      it('должен вернуть true для существующего покемона', async () => {
        const existsPromise = firstValueFrom(service.checkPokemonExists('eevee'));

        const request = httpMock.expectOne((r) => r.url.includes('/pokemon/eevee'));

        request.flush(POKEMON_DATA_FIXTURE);

        await expect(existsPromise).resolves.toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('должен вернуть false при 404', async () => {
        const existsPromise = firstValueFrom(service.checkPokemonExists('missing'));

        const request = httpMock.expectOne((r) => r.url.includes('/pokemon/missing'));

        request.flush('Not Found', { status: 404, statusText: 'Not Found' });

        await expect(existsPromise).resolves.toBe(false);
      });

      it('должен вернуть true при 500 (fail-open)', async () => {
        const existsPromise = firstValueFrom(service.checkPokemonExists('eevee'));

        const request = httpMock.expectOne((r) => r.url.includes('/pokemon/eevee'));

        request.flush('Server Error', { status: 500, statusText: 'Server Error' });

        await expect(existsPromise).resolves.toBe(true);
      });
    });
  });
});
