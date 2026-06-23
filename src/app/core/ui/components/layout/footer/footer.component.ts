import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { provideTranslocoScope, TranslocoDirective } from '@jsverse/transloco';
import { TuiLink } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-footer',
  imports: [TuiLink, RouterLink, TranslocoDirective],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideTranslocoScope('footer')],
})
export class FooterComponent {}
