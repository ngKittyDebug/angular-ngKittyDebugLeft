import { beforeEach, describe, expect, it } from 'vitest';

import { FrenzyStorageService } from './frenzy-storage.service';

describe('FrenzyStorageService', () => {
  let storage: FrenzyStorageService;

  beforeEach(() => {
    localStorage.clear();
    storage = new FrenzyStorageService();
  });

  it('round-trips a string and reads null for a missing key', () => {
    expect(storage.getString('missing')).toBeNull();

    storage.setString('greeting', 'hi');

    expect(storage.getString('greeting')).toBe('hi');
  });

  it('round-trips a JSON value', () => {
    storage.setJson('config', { a: 1, b: ['x'] });

    expect(storage.getJson<{ a: number; b: string[] }>('config')).toEqual({ a: 1, b: ['x'] });
  });

  it('reads null for a missing JSON key', () => {
    expect(storage.getJson('missing')).toBeNull();
  });

  it('reads null for a corrupt JSON blob instead of throwing', () => {
    localStorage.setItem('config', 'not json {');

    expect(storage.getJson('config')).toBeNull();
  });
});
