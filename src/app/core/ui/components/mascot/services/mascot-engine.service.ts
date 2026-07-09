import { DestroyRef, ElementRef, inject, Injectable, NgZone, signal } from '@angular/core';
import { mascotStep } from '../helpers/mascot-step';
import type { MascotState } from '../helpers/mascot-step';

const MAX_FRAME_SECONDS = 0.1;

@Injectable()
export class MascotEngineService {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private positionX = 0;
  private cursorX: number | null = null;
  private lastChaseTime = 0;

  public readonly state = signal<MascotState>('standing');

  public start(): void {
    this.zone.runOutsideAngular(() => this.startChase());
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

    const element = this.host.nativeElement;
    const renderX = Math.min(this.positionX, window.innerWidth - element.offsetWidth);

    element.style.transform = `translateX(${Math.max(renderX, 0)}px)`;
    this.state.set(result.state);
  }
}
