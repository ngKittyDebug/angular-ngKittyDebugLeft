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
import { mascotStep } from './helpers/mascot-step';
import type { MascotState } from './helpers/mascot-step';

const DANCE_GIF_SOURCE = 'images/mascot/pokemonDance.gif';
const WALK_GIF_SOURCE = 'images/mascot/pokemonWalkToLeft.gif';
const WAIT_GIF_SOURCE = 'images/mascot/pokemonWait.gif';

// A background tab suspends rAF; without a cap the first frame after coming back would teleport the mascot.
const MAX_FRAME_SECONDS = 0.1;

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
  // Only a chasing frame moves this forward — both entering and leaving Idle hang off the chase alone.
  private lastChaseTime = 0;

  protected readonly isReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected readonly state = signal<MascotState>('standing');
  protected readonly gifSource = computed(() => {
    switch (this.state()) {
      case 'standing':
        return DANCE_GIF_SOURCE;

      case 'idle':
        return WAIT_GIF_SOURCE;

      default:
        return WALK_GIF_SOURCE;
    }
  });
  // The walk gif faces left; walking right shows it mirrored.
  protected readonly isMirrored = computed(() => this.state() === 'walkingRight');
  protected readonly isIdle = computed(() => this.state() === 'idle');

  constructor() {
    if (!this.isReducedMotion) {
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

    document.addEventListener('mousemove', onMouseMove, { passive: true });

    let lastTime = performance.now();
    let frameId = 0;

    this.lastChaseTime = lastTime;

    const tick = (time: number): void => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, MAX_FRAME_SECONDS);

      lastTime = time;
      this.step(deltaSeconds, width, time);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('mousemove', onMouseMove);
    });
  }

  private step(deltaSeconds: number, width: number, time: number): void {
    const result = mascotStep({
      positionX: this.positionX,
      cursorX: this.cursorX,
      width,
      viewportWidth: window.innerWidth,
      lastChaseTime: this.lastChaseTime,
      time,
      deltaSeconds,
    });

    this.positionX = result.positionX;
    this.lastChaseTime = result.lastChaseTime;

    // The idle box is wider than the standing one the geometry anchors to — clamp only the
    // rendered position, so the wide scene never sticks out of the viewport at the edges.
    const element = this.host.nativeElement;
    const renderX = Math.min(this.positionX, window.innerWidth - element.offsetWidth);

    element.style.transform = `translateX(${Math.max(renderX, 0)}px)`;
    this.state.set(result.state);
  }
}
