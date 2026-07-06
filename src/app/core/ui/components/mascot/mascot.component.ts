import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  signal,
} from '@angular/core';
import { MASCOT_CONFIG } from './constants/mascot-config';

const DANCE_GIF_SOURCE = 'images/mascot/pokemonDance.gif';
const WALK_GIF_SOURCE = 'images/mascot/pokemonWalkToLeft.gif';

// A background tab suspends rAF; without a cap the first frame after coming back would teleport the mascot.
const MAX_FRAME_SECONDS = 0.1;

type MascotState = 'standing' | 'walkingLeft' | 'walkingRight';

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
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Chase geometry stays out of signals: it changes every frame and must not trigger change detection.
  private positionX = 0;
  private cursorX: number | null = null;

  // Decorative, endlessly animating overlay — honor reduced-motion by not rendering it at all.
  protected readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected readonly state = signal<MascotState>('standing');
  protected readonly gifSource = computed(() => {
    return this.state() === 'standing' ? DANCE_GIF_SOURCE : WALK_GIF_SOURCE;
  });
  // The walk gif faces left; walking right shows it mirrored.
  protected readonly mirrored = computed(() => this.state() === 'walkingRight');

  constructor() {
    if (!this.reducedMotion) {
      afterNextRender(() => this.zone.runOutsideAngular(() => this.startChase()));
    }
  }

  private startChase(): void {
    const element = this.host.nativeElement;
    const width = element.offsetWidth;

    this.positionX = (window.innerWidth - width) / 2;
    element.style.transform = `translateX(${this.positionX}px)`;

    const onMouseMove = (event: MouseEvent): void => {
      this.cursorX = event.clientX;
    };

    document.addEventListener('mousemove', onMouseMove);

    let lastTime = performance.now();
    let frameId = 0;

    const tick = (time: number): void => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, MAX_FRAME_SECONDS);

      lastTime = time;
      this.step(deltaSeconds, width);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('mousemove', onMouseMove);
    });
  }

  // One rAF step: chase the cursor's X while it is farther than the threshold, stand otherwise.
  private step(deltaSeconds: number, width: number): void {
    if (this.cursorX === null) {
      return;
    }

    const distance = this.cursorX - (this.positionX + width / 2);

    if (Math.abs(distance) <= MASCOT_CONFIG.chaseThresholdPx) {
      this.state.set('standing');

      return;
    }

    // Never step past the threshold edge, so the mascot stops instead of jittering under the cursor.
    const stepLength = Math.min(
      MASCOT_CONFIG.walkSpeedPxPerSecond * deltaSeconds,
      Math.abs(distance) - MASCOT_CONFIG.chaseThresholdPx,
    );
    const direction = Math.sign(distance);

    this.positionX = Math.min(
      Math.max(this.positionX + direction * stepLength, 0),
      window.innerWidth - width,
    );
    this.host.nativeElement.style.transform = `translateX(${this.positionX}px)`;
    this.state.set(direction < 0 ? 'walkingLeft' : 'walkingRight');
  }
}
