import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MascotEngineService } from './services/mascot-engine.service';

const DANCE_GIF_SOURCE = 'images/mascot/pokemonDance.gif';
const WALK_GIF_SOURCE = 'images/mascot/pokemonWalkToLeft.gif';
const WAIT_GIF_SOURCE = 'images/mascot/pokemonWait.gif';

@Component({
  selector: 'left-paw-mascot',
  templateUrl: './mascot.component.html',
  styleUrl: './mascot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MascotEngineService],
  host: {
    'aria-hidden': 'true',
  },
})
export class MascotComponent {
  private readonly engine = inject(MascotEngineService);

  protected readonly isReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected readonly gifSource = computed(() => {
    switch (this.engine.state()) {
      case 'standing':
        return DANCE_GIF_SOURCE;

      case 'idle':
        return WAIT_GIF_SOURCE;

      default:
        return WALK_GIF_SOURCE;
    }
  });
  protected readonly isMirrored = computed(() => this.engine.state() === 'walkingRight');
  protected readonly isIdle = computed(() => this.engine.state() === 'idle');

  constructor() {
    if (!this.isReducedMotion) {
      afterNextRender(() => this.engine.start());
    }
  }
}
