import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Transient burst of bubbles spawned at a press point on the scene.
 *
 * Purely decorative click feedback: `aria-hidden` and `pointer-events: none`,
 * positioned by the parent via `[leftPawScenePosition]`. The CSS animation
 * plays once; the parent (`SceneComponent`) removes the instance after it ends.
 * Per-dot spread/size/timing is defined entirely in CSS via `:nth-child()`.
 * Bubble tint reuses `--aq-bubble`, so it stays theme-aware.
 */
@Component({
  selector: 'left-paw-bubble-burst',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bubble-burst.component.html',
  styleUrl: './bubble-burst.component.scss',
})
export class BubbleBurstComponent {}
