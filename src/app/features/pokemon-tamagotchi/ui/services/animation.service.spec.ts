import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ANIMATION_PERFORMANCE } from '../../data/constants/animation-performance.constants';
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
    it('должен предоставлять константы таргета 60fps', () => {
      const service = TestBed.inject(AnimationService);

      expect(service.targetFps).toBe(ANIMATION_PERFORMANCE.TARGET_FPS);
      expect(service.targetFrameMs).toBe(ANIMATION_PERFORMANCE.TARGET_FRAME_MS);
    });

    it('должен переключать gpu compositing класс на элементах', () => {
      const service = TestBed.inject(AnimationService);
      const element = document.createElement('div');

      service.enableGpuCompositing(element);
      expect(element.classList.contains('tamagotchi-gpu-layer')).toBe(true);

      service.releaseGpuCompositing(element);
      expect(element.classList.contains('tamagotchi-gpu-layer')).toBe(false);
    });
  });
});
