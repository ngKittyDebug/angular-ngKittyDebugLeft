import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TamagotchiAnalyticsService } from './tamagotchi-analytics.service';

describe('TamagotchiAnalyticsService', () => {
  it('tracks action counts for interaction patterns', () => {
    const service = TestBed.inject(TamagotchiAnalyticsService);

    service.track('feed');
    service.track('feed');
    service.track('click');

    expect(service.getActionCounts()).toEqual({
      click: 1,
      feed: 2,
    });
    expect(service.getTotalEvents()).toBe(3);
    expect(service.getLastEventAt()).not.toBeNull();
  });
});
