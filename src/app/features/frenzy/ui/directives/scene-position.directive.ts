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
 * Coordinates are written sub-pixel (no rounding): the camera also translates sub-pixel, and rounding both
 * the camera and each child made their fractional residuals beat into a low-frequency scroll stutter.
 * Falls back to `%` only when the parent size is unknown (0).
 * With `scenePositionClampX` the `x` is clamped (after first render, when layout is ready) by the
 * measured element width so a wide box — e.g. floating text near the edge — stays fully inside the
 * scene instead of being cut off by `overflow: hidden`. Shared by falling items and floating text.
 * With `scenePositionTransform` the position is written as the independent `translate` CSS property (px)
 * instead of `left/top`. It composes with the element's static `transform` anchor and updates on the
 * compositor with no per-frame layout/reflow (and, being separate from `transform`, never gets caught by a
 * `transform` transition). Used by the every-frame movers (items, players); the static elements
 * (burst/blast/orphan float) keep the plain `left/top` path.
 */
@Directive({
  selector: '[leftPawScenePosition]',
})
export class ScenePositionDirective {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  public readonly position = input.required<ScenePosition>({ alias: 'leftPawScenePosition' });
  public readonly scenePositionClampX = input(false);
  public readonly scenePositionTransform = input(false);

  public constructor() {
    effect(() => {
      const element = this.elementRef.nativeElement;
      const { x, y } = this.position();
      const parent = element.offsetParent as HTMLElement | null;
      const parentWidth = parent?.clientWidth ?? 0;
      const parentHeight = parent?.clientHeight ?? 0;

      if (this.scenePositionTransform()) {
        // Compositor path: write the `translate` CSS property (px) — composes with the element's static
        // `transform` anchor, no per-frame layout. Skip until the parent is measured (px-only).
        if (parentWidth > 0 && parentHeight > 0) {
          this.renderer.setStyle(
            element,
            'translate',
            `${x * parentWidth}px ${y * parentHeight}px`,
          );
        }

        return;
      }

      this.renderer.setStyle(
        element,
        'left',
        parentWidth > 0 ? `${x * parentWidth}px` : `${x * 100}%`,
      );

      this.renderer.setStyle(
        element,
        'top',
        parentHeight > 0 ? `${y * parentHeight}px` : `${y * 100}%`,
      );
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
