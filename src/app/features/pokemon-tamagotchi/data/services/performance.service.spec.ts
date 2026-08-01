import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_PERFORMANCE_MODE,
  PERFORMANCE_MODE_STORAGE_KEY,
} from '../constants/performance-mode.constants';
import {
  createTamagotchiStorageMock,
  type TamagotchiStorageMock,
} from './tamagotchi-storage.service.mock';
import { TamagotchiStorageService } from './tamagotchi-storage.service';
import { PerformanceService } from './performance.service';

describe('PerformanceService', () => {
  let service: PerformanceService;
  let storageMock: TamagotchiStorageMock;

  beforeEach(() => {
    storageMock = createTamagotchiStorageMock();
    vi.restoreAllMocks();
    TestBed.configureTestingModule({
      providers: [PerformanceService, { provide: TamagotchiStorageService, useValue: storageMock }],
    });
    service = TestBed.inject(PerformanceService);
  });

  describe('Happy Path', () => {
    it('должен использовать high-профиль по умолчанию', () => {
      expect(service.mode()).toBe(DEFAULT_PERFORMANCE_MODE);
      expect(service.profile().complexAnimations).toBe(true);
    });

    it('должен сохранять выбранный режим производительности', () => {
      service.setMode('low');

      expect(storageMock.getItem(PERFORMANCE_MODE_STORAGE_KEY)).toBe('low');
      expect(service.mode()).toBe('low');
      expect(service.profile().decayIntervalMs).toBe(30_000);
    });

    it('должен возвращать профиль выбранного режима', () => {
      service.setMode('high');

      expect(service.profile().complexAnimations).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('должен игнорировать устаревшее значение auto в storage', () => {
      storageMock.setItem(PERFORMANCE_MODE_STORAGE_KEY, 'auto');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PerformanceService,
          { provide: TamagotchiStorageService, useValue: storageMock },
        ],
      });

      const reloadedService = TestBed.inject(PerformanceService);

      expect(reloadedService.mode()).toBe('high');
    });
  });
});
