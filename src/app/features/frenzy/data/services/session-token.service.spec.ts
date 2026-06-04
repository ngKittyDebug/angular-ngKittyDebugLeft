import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SessionTokenService } from './session-token.service';

describe('SessionTokenService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [SessionTokenService] });
  });

  it('generates and persists a session token on first call', () => {
    const service = TestBed.inject(SessionTokenService);
    const token = service.getOrCreateToken();

    expect(token).toMatch(/^[0-9a-f-]{36}$/i);
    expect(sessionStorage.getItem('frenzy-session-token')).toBe(token);
  });

  it('returns the same token on subsequent calls', () => {
    const service = TestBed.inject(SessionTokenService);
    const first = service.getOrCreateToken();
    const second = service.getOrCreateToken();

    expect(second).toBe(first);
  });

  it('persists and reads player name from localStorage', () => {
    const service = TestBed.inject(SessionTokenService);

    expect(service.getName()).toBe('');
    service.saveName('Ash');
    expect(service.getName()).toBe('Ash');
  });
});
