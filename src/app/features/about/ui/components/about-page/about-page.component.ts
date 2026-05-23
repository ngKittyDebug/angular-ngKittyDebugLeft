import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiAccordion } from '@taiga-ui/kit';
import { accordionData } from './constants/accordion-constants';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'left-paw-about-page',
  imports: [TuiAccordion, TranslocoDirective],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  protected readonly AccordionData = accordionData;
}
