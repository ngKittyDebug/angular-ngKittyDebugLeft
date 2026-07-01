import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TamagotchiLoggerService } from './tamagotchi-logger.service';

describe('TamagotchiLoggerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('stores bounded error log entries', () => {
    const service = TestBed.inject(TamagotchiLoggerService);

    for (let index = 0; index < 120; index += 1) {
      service.error('test', `message-${index}`);
    }

    expect(service.getRecentEntries()).toHaveLength(100);
    expect(service.getRecentEntries()[0]?.message).toBe('message-20');
  });
});
