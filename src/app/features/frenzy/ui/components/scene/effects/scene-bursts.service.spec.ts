import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SceneBurstsService } from './scene-bursts.service';

describe('SceneBurstsService', () => {
  let service: SceneBurstsService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [SceneBurstsService] });
    service = TestBed.inject(SceneBurstsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('spawns a burst at the press point and removes it after its lifetime', () => {
    service.spawn(0.25, 0.75);

    expect(service.burstList()).toHaveLength(1);
    expect(service.burstList()[0]).toMatchObject({ x: 0.25, y: 0.75 });

    vi.advanceTimersByTime(1000);
    expect(service.burstList()).toHaveLength(0);
  });

  it('gives each burst a unique id', () => {
    service.spawn(0.1, 0.1);
    service.spawn(0.2, 0.2);

    const [first, second] = service.burstList();

    expect(first.id).not.toBe(second.id);
  });
});
