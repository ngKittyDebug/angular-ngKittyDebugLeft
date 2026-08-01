import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PerformanceService } from '../../data/services/performance.service';
import { AnimationService } from './animation.service';

describe('AnimationService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnimationService,
        {
          provide: PerformanceService,
          useValue: {
            mode: () => 'high',
            profile: () => ({ complexAnimations: true }),
          },
        },
      ],
    });
  });

  describe('Happy Path', () => {
    it('должен включать gpu compositing класс на элементе', () => {
      const service = TestBed.inject(AnimationService);
      const element = document.createElement('div');

      service.enableGpuCompositing(element);

      expect(element.classList.contains('tamagotchi-gpu-layer')).toBe(true);
    });

    it('должен снимать gpu compositing класс с элемента', () => {
      const service = TestBed.inject(AnimationService);
      const element = document.createElement('div');

      service.enableGpuCompositing(element);
      service.releaseGpuCompositing(element);

      expect(element.classList.contains('tamagotchi-gpu-layer')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('не должен добавлять класс при release без предшествующего enable', () => {
      const service = TestBed.inject(AnimationService);
      const element = document.createElement('div');

      service.releaseGpuCompositing(element);

      expect(element.classList.contains('tamagotchi-gpu-layer')).toBe(false);
    });
  });
});
