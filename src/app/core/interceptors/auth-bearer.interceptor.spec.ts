import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';
import { AuthService } from '@core/services/auth.service';
import { authBearerInterceptor } from './auth-bearer.interceptor';

const TEST_TOKEN = 'test-access-token';

describe('authBearerInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authBearerInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: () => TEST_TOKEN } },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Happy Path', () => {
    it('должен прикреплять токен для запроса на origin auth-сервера', () => {
      httpClient.get(`${AUTH_SERVER_URL}auth/profile`).subscribe();

      const request = httpMock.expectOne(`${AUTH_SERVER_URL}auth/profile`);

      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`);
      request.flush({});
    });
  });

  describe('Edge Cases', () => {
    it('НЕ должен прикреплять токен, когда host auth-сервера присутствует лишь как подстрока пути на другом origin', () => {
      const craftedUrl = `https://pokeapi.co/api/v2/pokemon/${AUTH_SERVER_URL}x`;

      httpClient.get(craftedUrl).subscribe();

      const request = httpMock.expectOne(craftedUrl);

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });

    it('НЕ должен прикреплять токен для запроса на другой origin', () => {
      httpClient.get('https://pokeapi.co/api/v2/pokemon/eevee').subscribe();

      const request = httpMock.expectOne('https://pokeapi.co/api/v2/pokemon/eevee');

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });

    it('НЕ должен прикреплять токен для запроса auth/refresh', () => {
      httpClient.post(`${AUTH_SERVER_URL}auth/refresh`, null).subscribe();

      const request = httpMock.expectOne(`${AUTH_SERVER_URL}auth/refresh`);

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });
  });
});
