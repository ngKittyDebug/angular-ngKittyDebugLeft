import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'left-paw-profile',
  imports: [TuiAvatar, TranslocoDirective],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  protected readonly sizes = ['xxl', 'xl', 'l', 'm', 's', 'xs'] as const;
}
