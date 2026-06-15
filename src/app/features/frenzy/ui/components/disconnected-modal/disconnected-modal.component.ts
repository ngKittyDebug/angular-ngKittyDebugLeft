import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiIcon, TuiLoader } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-disconnected-modal',
  imports: [TranslocoDirective, TuiIcon, TuiLoader],
  templateUrl: './disconnected-modal.component.html',
  styleUrl: './disconnected-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisconnectedModalComponent {}
