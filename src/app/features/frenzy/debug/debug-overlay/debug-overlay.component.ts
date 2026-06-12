import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ScenePositionDirective } from '../../ui/directives/scene-position.directive';
import type { RenderedItem, RenderedPlayer } from '../../ui/components/scene/scene-view-models';
import { DebugBoxComponent } from '../debug-box/debug-box.component';
import type { DebugFlags } from '../debug-options';
import { DebugReadoutComponent } from '../debug-readout/debug-readout.component';

/**
 * `?debug` overlay: draws each actor's physical box centred on its position — the source of the server AABB — so
 * authored sprite sizes can be eyeballed against the silhouette. Lives in `debug/` so all debug rendering is one
 * unit, off the boss scene template. Each `flags` category draws independently (boxes / item boxes / speed pill).
 * Presentational: takes the already-extrapolated render VMs from the scene; host is `display:contents` so its
 * children position absolutely against `.scene__world` exactly as if inlined in the scene.
 */
@Component({
  selector: 'left-paw-debug-overlay',
  imports: [DebugBoxComponent, DebugReadoutComponent, ScenePositionDirective],
  templateUrl: './debug-overlay.component.html',
  styleUrl: './debug-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugOverlayComponent {
  public readonly flags = input.required<DebugFlags>();
  public readonly players = input.required<readonly RenderedPlayer[]>();
  public readonly items = input.required<readonly RenderedItem[]>();
  // Item box side (px string) from the shared contract — same value the scene feeds the item sprites.
  public readonly itemSize = input.required<string>();
  // The bomb's larger collidable side (px string) — its sensor-horn reach, so its box frames the real trigger area.
  public readonly bombSize = input.required<string>();
}
