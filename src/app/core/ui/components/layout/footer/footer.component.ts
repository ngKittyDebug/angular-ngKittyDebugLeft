import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { TuiLink } from '@taiga-ui/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'left-paw-footer',
  imports: [TuiLink, RouterLink, TranslocoDirective],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideTranslocoScope('footer')],
})
export class FooterComponent {}
