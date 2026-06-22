import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PlayerPersistenceService } from './player-persistence.service';

describe('PlayerPersistenceService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [PlayerPersistenceService] });
  });

  it('generates and persists a session token on first call', () => {
    const service = TestBed.inject(PlayerPersistenceService);
    const token = service.getOrCreateToken();

    expect(token).toMatch(/^[0-9a-f-]{36}$/i);
    expect(sessionStorage.getItem('frenzy-session')).toBe(token);
  });

  it('returns the same token on subsequent calls', () => {
    const service = TestBed.inject(PlayerPersistenceService);
    const first = service.getOrCreateToken();
    const second = service.getOrCreateToken();

    expect(second).toBe(first);
  });

  it('rotateToken replaces the per-tab token and persists the fresh one', () => {
    const service = TestBed.inject(PlayerPersistenceService);
    const original = service.getOrCreateToken();
    const rotated = service.rotateToken();

    expect(rotated).not.toBe(original);
    expect(rotated).toMatch(/^[0-9a-f-]{36}$/i);
    expect(sessionStorage.getItem('frenzy-session')).toBe(rotated);
    expect(service.getOrCreateToken()).toBe(rotated);
  });

  it('persists and reads player name from localStorage', () => {
    const service = TestBed.inject(PlayerPersistenceService);

    expect(service.getName()).toBe('');
    service.saveName('Ash');
    expect(service.getName()).toBe('Ash');
  });

  it('persists name and appearance together under one key', () => {
    const service = TestBed.inject(PlayerPersistenceService);

    service.saveName('Misty');
    service.saveAppearance('squirtle');

    expect(localStorage.getItem('frenzy-session')).toBe(
      JSON.stringify({ name: 'Misty', appearance: 'squirtle' }),
    );
    expect(service.getName()).toBe('Misty');
    expect(service.getAppearance()).toBe('squirtle');
  });
});
