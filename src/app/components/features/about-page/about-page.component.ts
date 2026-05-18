import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { TuiAccordion } from '@taiga-ui/kit';
import { accordionData } from './constants/accordion-canstants';

@Component({
  selector: 'left-paw-about-page',
  imports: [KeyValuePipe, TuiAccordion],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  protected readonly AccordionData = accordionData;
}
