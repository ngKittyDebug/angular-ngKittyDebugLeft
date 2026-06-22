import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiHintDirective, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-offline-participants',
  imports: [TranslocoDirective, TuiHintDirective, TuiIcon],
  templateUrl: './offline-participants.component.html',
  styleUrl: './offline-participants.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineParticipantsComponent {
  // Mobile shows just icon + number (no label text) and drops the hover-only hint.
  public readonly compact = input<boolean>(false);
  public readonly count = input<number>(0);
}
