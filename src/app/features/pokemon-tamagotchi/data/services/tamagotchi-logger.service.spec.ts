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
    TestBed.configureTestingModule({ providers: [TamagotchiLoggerService] });
  });

  describe('Edge Cases', () => {
    it('должен писать предупреждения в console только вне production', () => {
      const service = TestBed.inject(TamagotchiLoggerService);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      service.warn('test', 'dev-only');

      expect(warnSpy).toHaveBeenCalledTimes(1);

      environment.production = true;
      warnSpy.mockClear();

      service.warn('test', 'silent in prod');

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('должен писать ошибки в console только вне production', () => {
      const service = TestBed.inject(TamagotchiLoggerService);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      service.error('test', 'dev-only');

      expect(errorSpy).toHaveBeenCalledTimes(1);

      environment.production = true;
      errorSpy.mockClear();

      service.error('test', 'silent in prod');

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
