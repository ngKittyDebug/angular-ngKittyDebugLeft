import { inject, Injectable } from '@angular/core';

import { profileToGarbageCollectLimits } from '../helpers/memory-management.helper';
import { TamagotchiStore } from '../store/tamagotchi.store';
import { PerformanceService } from './performance.service';

@Injectable({ providedIn: 'root' })
export class MemoryManagementService {
  private readonly performanceService = inject(PerformanceService);
  private readonly store = inject(TamagotchiStore);

  public runGarbageCollection(): void {
    const limits = profileToGarbageCollectLimits(this.performanceService.getProfile());

    this.store.garbageCollect(limits);
  }
}
