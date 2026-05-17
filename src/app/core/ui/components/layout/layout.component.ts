import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'left-paw-layout',
  imports: [],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {}
