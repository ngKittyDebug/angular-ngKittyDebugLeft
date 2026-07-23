import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiAccordion } from '@taiga-ui/kit';
import { TranslocoDirective } from '@jsverse/transloco';
import { ACCORDION_LIST } from './constants/accordion-constants';

@Component({
  selector: 'left-paw-about-page',
  imports: [NgOptimizedImage, TranslocoDirective, TuiAccordion],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  protected readonly accordionList = ACCORDION_LIST;
}
