import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Presentational debug pill: a `label: value` chip the scene's `?debug` overlay positions over an actor. Kept
 * dumb and generic (label + preformatted value string) so it is reused for any per-Pokémon/per-item debug
 * readout — current speed now, more fields later. Positioning is the caller's job (scene-position directive).
 */
@Component({
  selector: 'left-paw-debug-readout',
  templateUrl: './debug-readout.component.html',
  styleUrl: './debug-readout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugReadoutComponent {
  public readonly label = input.required<string>();
  public readonly value = input.required<string>();
}
