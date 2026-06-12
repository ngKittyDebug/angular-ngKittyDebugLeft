import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiHintDirective, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-online-participants',
  imports: [TranslocoDirective, TuiHintDirective, TuiIcon],
  templateUrl: './online-participants.component.html',
  styleUrl: './online-participants.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineParticipantsComponent {
  // Mobile shows just icon + number (no label text) and drops the hover-only hint.
  public readonly compact = input<boolean>(false);
  public readonly count = input.required<number>();
}
