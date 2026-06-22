import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'left-paw-loader',
  imports: [],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoaderComponent {
  public readonly src = input<string>('/images/gif/loading.gif');
  public readonly size = input<'fullscreen' | 'inline'>('fullscreen');
}
