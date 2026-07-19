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

  describe('Happy Path', () => {
    it('должен писать ошибки в console вне production', () => {
      const service = TestBed.inject(TamagotchiLoggerService);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      service.error('test', 'dev-only');

      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('должен логировать message из Error через logError', () => {
      const service = TestBed.inject(TamagotchiLoggerService);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      service.logError('saveState', new Error('disk full'));

      expect(errorSpy).toHaveBeenNthCalledWith(1, '[Tamagotchi:saveState]', 'disk full');
    });
  });

  describe('Edge Cases', () => {
    it('должен молчать в production', () => {
      environment.production = true;
      const service = TestBed.inject(TamagotchiLoggerService);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      service.error('test', 'silent in prod');

      expect(errorSpy).toHaveBeenCalledTimes(0);
    });
  });
});
