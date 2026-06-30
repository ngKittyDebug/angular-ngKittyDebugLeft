import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';

@Injectable({ providedIn: 'root' })
export class TamagotchiCloudSyncService {
  public sync(state: TamagotchiState): Observable<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return throwError(() => new Error('Cloud sync unavailable while offline'));
    }

    if (!state.pokemon) {
      return throwError(() => new Error('Cloud sync skipped without selected pokemon'));
    }

    return of(undefined);
  }
}
