import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiHintDirective, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-presence-counter',
  imports: [TranslocoDirective, TuiHintDirective, TuiIcon],
  templateUrl: './presence-counter.component.html',
  styleUrl: './presence-counter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresenceCounterComponent {
  // Mobile shows just icon + number (no label text) and drops the hover-only hint.
  public readonly compact = input<boolean>(false);
  public readonly disconnected = input<number>(0);
  public readonly online = input.required<number>();
}
