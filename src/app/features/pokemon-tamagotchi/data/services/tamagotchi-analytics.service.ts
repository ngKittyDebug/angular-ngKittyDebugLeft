import { inject, Injectable } from '@angular/core';

import type { InteractionType } from '../models/interaction.model';
import type { ActionType } from '../models/tamagotchi-state.model';
import { TamagotchiLoggerService } from './tamagotchi-logger.service';

export type TamagotchiAnalyticsEvent = ActionType | InteractionType | 'pageView';

const MAX_TRACKED_KEYS = 32;

@Injectable({ providedIn: 'root' })
export class TamagotchiAnalyticsService {
  private readonly counts = new Map<TamagotchiAnalyticsEvent, number>();
  private readonly logger = inject(TamagotchiLoggerService);
  private lastEventAt: number | null = null;

  public track(event: TamagotchiAnalyticsEvent): void {
    const current = this.counts.get(event) ?? 0;

    this.counts.set(event, current + 1);
    this.lastEventAt = Date.now();
    this.trimIfNeeded();

    this.logger.debug('analytics', `Tracked ${event}`, {
      count: current + 1,
    });
  }

  public getActionCounts(): Record<string, number> {
    const summary: Record<string, number> = {};

    for (const [event, count] of this.counts.entries()) {
      summary[event] = count;
    }

    return summary;
  }

  public getLastEventAt(): number | null {
    return this.lastEventAt;
  }

  public getTotalEvents(): number {
    let total = 0;

    for (const count of this.counts.values()) {
      total += count;
    }

    return total;
  }

  private trimIfNeeded(): void {
    if (this.counts.size <= MAX_TRACKED_KEYS) {
      return;
    }

    const oldestKey = this.counts.keys().next().value;

    if (oldestKey !== undefined) {
      this.counts.delete(oldestKey);
    }
  }
}
