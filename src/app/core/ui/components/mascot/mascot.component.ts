import { ChangeDetectionStrategy, Component } from '@angular/core';

const DANCE_GIF_SOURCE = 'images/mascot/pokemonDance.gif';

@Component({
  selector: 'left-paw-mascot',
  templateUrl: './mascot.component.html',
  styleUrl: './mascot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
  },
})
export class MascotComponent {
  protected readonly danceGifSource = DANCE_GIF_SOURCE;

  // Decorative, endlessly animating overlay — honor reduced-motion by not rendering it at all.
  protected readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
}
