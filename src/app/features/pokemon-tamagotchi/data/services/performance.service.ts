import { inject, Injectable, signal } from '@angular/core';

import {
  DEFAULT_PERFORMANCE_MODE,
  PERFORMANCE_MODE_STORAGE_KEY,
  PERFORMANCE_PROFILES,
} from '../constants/performance-mode.constants';
import type {
  EffectivePerformanceMode,
  PerformanceMode,
  PerformanceProfileModel,
} from '../models/performance-mode.model';
import { TamagotchiStorageService } from './tamagotchi-storage.service';

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly storage = inject(TamagotchiStorageService);
  private readonly selectedMode = signal<PerformanceMode>(this.readStoredMode());

  public readonly mode = this.selectedMode.asReadonly();

  public setMode(mode: PerformanceMode): void {
    this.selectedMode.set(mode);
    this.storage.setItem(PERFORMANCE_MODE_STORAGE_KEY, mode);
  }

  public resolveEffectiveMode(): EffectivePerformanceMode {
    const selected = this.selectedMode();

    if (selected !== 'auto') {
      return selected;
    }

    return this.detectDeviceCapability();
  }

  public getProfile(): PerformanceProfileModel {
    return PERFORMANCE_PROFILES[this.resolveEffectiveMode()];
  }

  private readStoredMode(): PerformanceMode {
    const stored = this.storage.getItem(PERFORMANCE_MODE_STORAGE_KEY);

    if (stored === 'auto' || stored === 'balanced' || stored === 'high' || stored === 'low') {
      return stored;
    }

    return DEFAULT_PERFORMANCE_MODE;
  }

  private detectDeviceCapability(): EffectivePerformanceMode {
    if (this.prefersReducedMotion()) {
      return 'low';
    }

    const navigatorMemory = (globalThis.navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;

    if (navigatorMemory !== undefined && navigatorMemory <= 2) {
      return 'low';
    }

    const cores = globalThis.navigator.hardwareConcurrency;

    if (cores !== undefined && cores <= 2) {
      return 'low';
    }

    if (navigatorMemory !== undefined && navigatorMemory >= 8) {
      return 'high';
    }

    return 'balanced';
  }

  private prefersReducedMotion(): boolean {
    if (typeof globalThis.matchMedia !== 'function') {
      return false;
    }

    return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
