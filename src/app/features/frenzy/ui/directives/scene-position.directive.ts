import {
  afterNextRender,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
} from '@angular/core';

export interface ScenePosition {
  x: number;
  y: number;
}

/**
 * Clamps the center-x (in %) so a box of `elementWidth` stays fully inside `parentWidth`.
 * Returns the raw percent when the parent width is unknown (0). Pure — unit-tested directly.
 */
export function clampXPercent(x: number, elementWidth: number, parentWidth: number): number {
  if (parentWidth <= 0) {
    return x * 100;
  }

  const halfWidthPercent = (elementWidth / 2 / parentWidth) * 100;

  return Math.min(Math.max(x * 100, halfWidthPercent), 100 - halfWidthPercent);
}

/**
 * Positions a scene child by normalized (0..1) coordinates, writing `left`/`top` only.
 * Centering and animation stay in CSS (`transform: translate(...)`), so they never clash.
 * Coordinates are snapped to whole device pixels (using the measured parent size): pixel-art sprites
 * shimmer/jitter at sub-pixel offsets during slow drift, so rounding keeps them crisp frame-to-frame.
 * Falls back to `%` only when the parent size is unknown (0).
 * With `scenePositionClampX` the `x` is clamped (after first render, when layout is ready) by the
 * measured element width so a wide box — e.g. floating text near the edge — stays fully inside the
 * scene instead of being cut off by `overflow: hidden`. Shared by falling items and floating text.
 * `scenePositionTopOffsetPx` lifts `top` by N px (e.g. half a sprite height) so a status float anchors
 * to the top edge of a sprite whose `y` marks its centre.
 */
@Directive({
  selector: '[leftPawScenePosition]',
})
export class ScenePositionDirective {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  public readonly position = input.required<ScenePosition>({ alias: 'leftPawScenePosition' });
  public readonly scenePositionClampX = input(false);
  // When floor-anchored, vertical placement is handled in CSS (`bottom`), so skip writing `top`.
  public readonly scenePositionFloor = input(false);
  public readonly scenePositionTopOffsetPx = input(0);

  public constructor() {
    effect(() => {
      const element = this.elementRef.nativeElement;
      const { x, y } = this.position();
      const parent = element.offsetParent as HTMLElement | null;
      const parentWidth = parent?.clientWidth ?? 0;
      const parentHeight = parent?.clientHeight ?? 0;

      this.renderer.setStyle(
        element,
        'left',
        parentWidth > 0 ? `${Math.round(x * parentWidth)}px` : `${x * 100}%`,
      );

      if (!this.scenePositionFloor()) {
        const offset = this.scenePositionTopOffsetPx();

        if (parentHeight > 0) {
          this.renderer.setStyle(element, 'top', `${Math.round(y * parentHeight - offset)}px`);
        } else {
          this.renderer.setStyle(
            element,
            'top',
            offset === 0 ? `${y * 100}%` : `calc(${y * 100}% - ${offset}px)`,
          );
        }
      }
    });

    afterNextRender(() => {
      if (!this.scenePositionClampX()) {
        return;
      }

      const element = this.elementRef.nativeElement;
      const parent = element.offsetParent as HTMLElement | null;
      const clamped = clampXPercent(
        this.position().x,
        element.offsetWidth,
        parent?.clientWidth ?? 0,
      );

      this.renderer.setStyle(element, 'left', `${clamped}%`);
    });
  }
}
