import { TestBed } from '@angular/core/testing';
import { environment } from '@environments/environment';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TamagotchiLoggerService } from './tamagotchi-logger.service';

describe('TamagotchiLoggerService', () => {
  afterEach(() => {
    environment.production = false;
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('stores bounded error log entries', () => {
    const service = TestBed.inject(TamagotchiLoggerService);

    for (let index = 0; index < 120; index += 1) {
      service.error('test', `message-${index}`);
    }

    expect(service.getRecentEntries()).toHaveLength(100);
    expect(service.getRecentEntries()[0]?.message).toBe('message-20');
  });

  it('writes warnings to console only outside production', () => {
    const service = TestBed.inject(TamagotchiLoggerService);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    service.warn('test', 'dev-only');

    expect(warnSpy).toHaveBeenCalledTimes(1);

    environment.production = true;
    warnSpy.mockClear();

    service.warn('test', 'silent in prod');

    expect(warnSpy).not.toHaveBeenCalled();
    expect(service.getRecentEntries().at(-1)?.message).toBe('silent in prod');
  });

  it('writes errors to console only outside production', () => {
    const service = TestBed.inject(TamagotchiLoggerService);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    service.error('test', 'dev-only');

    expect(errorSpy).toHaveBeenCalledTimes(1);

    environment.production = true;
    errorSpy.mockClear();

    service.error('test', 'silent in prod');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(service.getRecentEntries().at(-1)?.message).toBe('silent in prod');
  });
});
