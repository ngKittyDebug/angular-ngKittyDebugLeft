import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import type { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import { vi } from 'vitest';

import { PokemonDataService } from './pokemon-data.service';

import { POKEMON_DATA_FIXTURE } from '@shared/fixtures/eevee.fixture';
import { POKEMON_SPECIES_FIXTURE } from '@shared/fixtures/eevee-species.fixture';
import { POKEMON_EVOLUTION_CHAIN_FIXTURE } from '@shared/fixtures/eevee-evolution-chain.fixture';

describe('PokemonDataService', () => {
  let service: PokemonDataService;
  let httpMock: HttpTestingController;
  let appReference: ApplicationRef;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PokemonDataService,
        PokemonApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PokemonDataService);
    httpMock = TestBed.inject(HttpTestingController);
    appReference = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('должен инициализироваться', () => {
    expect(service).toBeTruthy();
  });

  describe('Метод createPokemonCardData', () => {
    it('должен успешно вернуть данные карточки покемона', async () => {
      const result = TestBed.runInInjectionContext(() =>
        service.createPokemonCardData(() => 'eevee'),
      );

      appReference.tick();

      const request = httpMock.expectOne((request) => request.url.includes('eevee'));

      expect(request.request.method).toBe('GET');

      request.flush(POKEMON_DATA_FIXTURE);

      await vi.waitUntil(() => result.cardData() !== undefined);

      expect(result.cardData()).toEqual(POKEMON_DATA_FIXTURE);
      expect(result.cardDataError()).toBeUndefined();
    });

    it('должен вернуть ошибку в сигнале cardDataError, если запрос завершился неудачно', async () => {
      const result = TestBed.runInInjectionContext(() =>
        service.createPokemonCardData(() => 'missing-pokemon'),
      );

      appReference.tick();

      const request = httpMock.expectOne((request) => request.url.includes('missing-pokemon'));

      request.flush('Not Found', { status: 404, statusText: 'Not Found' });

      await vi.waitUntil(() => result.cardDataError() !== undefined);

      const errorResponse = result.cardDataError() as HttpErrorResponse;

      expect(errorResponse).toBeTruthy();
      expect(errorResponse.status).toBe(404);
    });
  });

  describe('Метод createPokemonProfileData', () => {
    it('должен последовательно загрузить данные профиля, species и зависимую цепочку эволюции', async () => {
      const chainUrl = POKEMON_SPECIES_FIXTURE.evolution_chain?.url || '';
      const expectedChainId = chainUrl.split('/').filter(Boolean).pop() || '67';

      const result = TestBed.runInInjectionContext(() =>
        service.createPokemonProfileData(() => 'eevee'),
      );

      appReference.tick();

      const requestData = httpMock.expectOne(
        (r) => r.url.includes('eevee') && !r.url.includes('species'),
      );
      const requestSpecies = httpMock.expectOne(
        (r) => r.url.includes('eevee') && r.url.includes('species'),
      );

      requestData.flush(POKEMON_DATA_FIXTURE);
      requestSpecies.flush(POKEMON_SPECIES_FIXTURE);

      await vi.waitUntil(() => result.profileSpecies() !== undefined);

      appReference.tick();

      const requestEvolution = httpMock.expectOne((r) =>
        r.url.includes(`/evolution-chain/${expectedChainId}`),
      );

      requestEvolution.flush(POKEMON_EVOLUTION_CHAIN_FIXTURE);

      await vi.waitUntil(() => result.profileEvolution() !== undefined);

      expect(result.profileData()).toEqual(POKEMON_DATA_FIXTURE);
      expect(result.profileSpecies()).toEqual(POKEMON_SPECIES_FIXTURE);
      expect(result.profileEvolution()).toEqual(POKEMON_EVOLUTION_CHAIN_FIXTURE);
    });

    it('не должен запрашивать эволюцию, если у species отсутствует ссылка url', async () => {
      const mockSpeciesWithoutChain = { ...POKEMON_SPECIES_FIXTURE, evolution_chain: null };

      const result = TestBed.runInInjectionContext(() =>
        service.createPokemonProfileData(() => 'eevee'),
      );

      appReference.tick();

      const requestData = httpMock.expectOne(
        (r) => r.url.includes('eevee') && !r.url.includes('species'),
      );
      const requestSpecies = httpMock.expectOne(
        (r) => r.url.includes('eevee') && r.url.includes('species'),
      );

      requestData.flush(POKEMON_DATA_FIXTURE);
      requestSpecies.flush(mockSpeciesWithoutChain);

      await vi.waitUntil(() => result.profileSpecies() !== undefined);
      appReference.tick();

      expect(result.profileEvolution()).toBeUndefined();
    });
  });
});
