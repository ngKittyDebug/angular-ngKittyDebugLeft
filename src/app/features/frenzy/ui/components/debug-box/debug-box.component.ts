import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type DebugBoxVariant = 'art' | 'body' | 'item';

/**
 * Presentational `?debug` outline box. The host element IS the box (no content) — the scene positions it via the
 * scene-position directive and sizes it through `width`/`height`; the `variant` picks the colour/role:
 *  - `art`  — yellow dashed full-art bounds, shifted by the centring `offsetX`/`offsetY` (px strings)
 *  - `body` — green solid collision hitbox (what the server collides), centred on the actor point
 *  - `item` — yellow dashed item bounds
 * Reused for every actor box so the overlay markup stays declarative; meant to grow with more debug variants.
 */
@Component({
  selector: 'left-paw-debug-box',
  template: '',
  styleUrl: './debug-box.component.scss',
  host: {
    'aria-hidden': 'true',
    '[class.debug-box--art]': "variant() === 'art'",
    '[class.debug-box--body]': "variant() === 'body'",
    '[class.debug-box--item]': "variant() === 'item'",
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.--debug-box-off-x]': 'offsetX()',
    '[style.--debug-box-off-y]': 'offsetY()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugBoxComponent {
  public readonly width = input.required<string>();
  public readonly height = input.required<string>();
  public readonly variant = input.required<DebugBoxVariant>();
  // Centring offset (px strings) for the `art` variant so it frames the visible sprite; 0 for body/item.
  public readonly offsetX = input('0');
  public readonly offsetY = input('0');
}
