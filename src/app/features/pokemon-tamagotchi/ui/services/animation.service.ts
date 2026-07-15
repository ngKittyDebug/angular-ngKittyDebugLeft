import { inject, Service } from '@angular/core';

import { ANIMATION_PERFORMANCE } from '../../data/constants/animation-performance.constants';
import { PerformanceService } from '../../data/services/performance.service';

const GPU_COMPOSITING_CLASS = 'tamagotchi-gpu-layer';

@Service({ autoProvided: false })
export class AnimationService {
  private readonly performanceService = inject(PerformanceService);

  public readonly targetFrameMs = ANIMATION_PERFORMANCE.TARGET_FRAME_MS;
  public readonly targetFps = ANIMATION_PERFORMANCE.TARGET_FPS;

  public prefersReducedMotion(): boolean {
    if (typeof globalThis.matchMedia !== 'function') {
      return false;
    }

    return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  public shouldUseComplexAnimations(): boolean {
    return this.performanceService.profile().complexAnimations && !this.prefersReducedMotion();
  }

  public enableGpuCompositing(element: HTMLElement): void {
    element.classList.add(GPU_COMPOSITING_CLASS);
  }

  public releaseGpuCompositing(element: HTMLElement): void {
    element.classList.remove(GPU_COMPOSITING_CLASS);
  }
}
