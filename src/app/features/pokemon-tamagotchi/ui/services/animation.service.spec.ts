import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ANIMATION_PERFORMANCE } from '../../data/constants/animation-performance.constants';
import { AnimationService } from './animation.service';

describe('AnimationService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('exposes 60fps target timing constants', () => {
    const service = TestBed.inject(AnimationService);

    expect(service.targetFps).toBe(ANIMATION_PERFORMANCE.TARGET_FPS);
    expect(service.targetFrameMs).toBe(ANIMATION_PERFORMANCE.TARGET_FRAME_MS);
  });

  it('toggles gpu compositing class on elements', () => {
    const service = TestBed.inject(AnimationService);
    const element = document.createElement('div');

    service.enableGpuCompositing(element);
    expect(element.classList.contains('tamagotchi-gpu-layer')).toBe(true);

    service.releaseGpuCompositing(element);
    expect(element.classList.contains('tamagotchi-gpu-layer')).toBe(false);
  });
});
