import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { profileToGarbageCollectLimits } from '../helpers/memory-management.helper';
import * as TamagotchiActions from '../store/tamagotchi.actions';
import { PerformanceService } from './performance.service';

@Injectable({ providedIn: 'root' })
export class MemoryManagementService {
  private readonly performanceService = inject(PerformanceService);
  private readonly store = inject(Store);

  public runGarbageCollection(): void {
    const limits = profileToGarbageCollectLimits(this.performanceService.getProfile());

    this.store.dispatch(TamagotchiActions.garbageCollect({ limits }));
  }
}
