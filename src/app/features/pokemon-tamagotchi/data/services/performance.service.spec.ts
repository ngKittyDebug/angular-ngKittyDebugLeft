import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERFORMANCE_MODE_STORAGE_KEY } from '../constants/performance-mode.constants';
import { createTamagotchiStorageMock } from '../fixtures/tamagotchi-storage.mock';
import { TamagotchiStorageService } from './tamagotchi-storage.service';
import { PerformanceService } from './performance.service';

describe('PerformanceService', () => {
  let service: PerformanceService;
  let storageMock: ReturnType<typeof createTamagotchiStorageMock>;

  beforeEach(() => {
    storageMock = createTamagotchiStorageMock();
    vi.restoreAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: TamagotchiStorageService, useValue: storageMock }],
    });
    service = TestBed.inject(PerformanceService);
  });

  it('persists selected performance mode', () => {
    service.setMode('low');

    expect(storageMock.getItem(PERFORMANCE_MODE_STORAGE_KEY)).toBe('low');
    expect(service.mode()).toBe('low');
    expect(service.getProfile().decayIntervalMs).toBe(30_000);
  });

  it('resolves explicit mode without auto detection', () => {
    service.setMode('high');

    expect(service.resolveEffectiveMode()).toBe('high');
    expect(service.getProfile().complexAnimations).toBe(true);
  });

  it('falls back to low profile when reduced motion is preferred', () => {
    const previous = globalThis.matchMedia;

    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList),
    });

    service.setMode('auto');

    expect(service.resolveEffectiveMode()).toBe('low');

    Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: previous });
  });
});
