import { inject, Service, signal } from '@angular/core';

import {
  DEFAULT_PERFORMANCE_MODE,
  PERFORMANCE_MODE_STORAGE_KEY,
  PERFORMANCE_PROFILES,
} from '../constants/performance-mode.constants';
import type { PerformanceMode, PerformanceProfileModel } from '../models/performance-mode.model';
import { TamagotchiStorageService } from './tamagotchi-storage.service';

@Service({ autoProvided: false })
export class PerformanceService {
  private readonly storage = inject(TamagotchiStorageService);
  private readonly selectedMode = signal<PerformanceMode>(this.readStoredMode());

  public readonly mode = this.selectedMode.asReadonly();

  public setMode(mode: PerformanceMode): void {
    this.selectedMode.set(mode);
    this.storage.setItem(PERFORMANCE_MODE_STORAGE_KEY, mode);
  }

  public getProfile(): PerformanceProfileModel {
    return PERFORMANCE_PROFILES[this.selectedMode()];
  }

  private readStoredMode(): PerformanceMode {
    const stored = this.storage.getItem(PERFORMANCE_MODE_STORAGE_KEY);

    if (stored === 'balanced' || stored === 'high' || stored === 'low') {
      return stored;
    }

    return DEFAULT_PERFORMANCE_MODE;
  }
}
