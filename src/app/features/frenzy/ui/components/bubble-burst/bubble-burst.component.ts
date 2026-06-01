import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Transient burst of bubbles spawned at a press point on the scene.
 *
 * Purely decorative click feedback: `aria-hidden` and `pointer-events: none`,
 * positioned by the parent via `[leftPawScenePosition]`. The CSS animation
 * plays once; the parent (`SceneComponent`) removes the instance after it ends.
 * Each dot's spread/size/timing is computed deterministically from its index
 * and applied via inline CSS variables. Bubble tint reuses `--aq-bubble`, so it
 * stays theme-aware.
 */
interface BurstDot {
  size: number;
  offsetX: number;
  offsetY: number;
  delay: number;
}

@Component({
  selector: 'left-paw-bubble-burst',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bubble-burst.component.html',
  styleUrl: './bubble-burst.component.scss',
})
export class BubbleBurstComponent {
  protected readonly dots: readonly BurstDot[] = Array.from({ length: 7 }, (_, index) => {
    const i = index + 1;

    return {
      size: 6 + ((i * 5) % 9),
      offsetX: ((i % 5) - 2) * 18,
      offsetY: -20 - (i % 4) * 12,
      delay: index * 0.03,
    };
  });
}
