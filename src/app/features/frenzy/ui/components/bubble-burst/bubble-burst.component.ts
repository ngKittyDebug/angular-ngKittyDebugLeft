import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** How the cluster behaves: a missed tap on empty water, a deliberate click pickup, or a drift-in collision pickup. */
export type BubbleBurstVariant = 'miss' | 'converge' | 'burst';

// Dot counts: the airy fan for a miss/burst, the fuller converging ring on someone else's click, and the densest
// (gold) one for my own click so I can tell my grabs apart.
const SPARSE_DOTS = [0, 1, 2, 3, 4, 5, 6];
const DENSE_DOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DENSEST_DOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

/**
 * Transient burst of bubbles spawned at a point on the scene.
 *
 * Purely decorative feedback: `aria-hidden` and `pointer-events: none`,
 * positioned by the parent via `[leftPawScenePosition]`. The CSS animation
 * plays once; the parent (`SceneComponent`) removes the instance after it ends.
 * Per-dot spread/size/timing is defined entirely in CSS via `:nth-child()`.
 * Bubble tint reuses `--aq-bubble`, so it stays theme-aware.
 *
 * `variant` picks the behaviour: `miss` (airy outward fan on empty water),
 * `converge` (a deliberate click pickup — more dots, imploding inward where the
 * item vanished, readable in the light theme) and `burst` (a drift-in collision
 * pickup — the airy fan, just bigger/brighter). `mine` is my own pickup: gold-
 * tinted (and, for `converge`, the densest dot set) to tell my grabs apart.
 */
@Component({
  selector: 'left-paw-bubble-burst',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bubble-burst.component.html',
  styleUrl: './bubble-burst.component.scss',
  host: {
    '[class.bubble-burst--converge]': "variant() === 'converge'",
    '[class.bubble-burst--burst]': "variant() === 'burst'",
    '[class.bubble-burst--mine]': 'mine()',
  },
})
export class BubbleBurstComponent {
  public readonly variant = input<BubbleBurstVariant>('miss');
  public readonly mine = input(false);

  protected readonly dots = computed(() => {
    if (this.variant() === 'converge') {
      return this.mine() ? DENSEST_DOTS : DENSE_DOTS;
    }

    // miss and burst both spray the airy fan outward; burst is just bigger/tinted (handled in the SCSS).
    return SPARSE_DOTS;
  });
}
