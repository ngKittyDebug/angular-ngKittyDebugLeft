import { Directive, effect, ElementRef, inject, input } from '@angular/core';

// Fallback tone colours used when the Taiga status tokens aren't resolvable (e.g. jsdom in unit tests). In the
// app the live `--tui-status-*` values win.
const FALLBACK_POSITIVE = '#4caf50';
const FALLBACK_NEGATIVE = '#f44336';
const FLASH_DURATION_MS = 2600;

type FlashDirection = 'up' | 'down';

/**
 * Briefly flashes the host's text (the HP readout) green on a big gain / red on a big loss: a one-shot pulse of
 * colour + glow via the Web Animations API, then it reverts to the inherited colour on its own (no fill). Only a
 * jump larger than `flashThreshold` triggers it, so the steady decay drip (−2) and the first render stay silent.
 * Self-contained — keeps the previous value in a field and compares, no external service.
 */
@Directive({
  selector: '[leftPawHpFlash]',
})
export class HpFlashDirective {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private previous: number | null = null;
  private animation: Animation | undefined;

  public readonly hp = input.required<number>({ alias: 'leftPawHpFlash' });
  public readonly flashThreshold = input(10);

  public constructor() {
    effect(() => {
      const hp = this.hp();
      const previous = this.previous;

      this.previous = hp;

      if (previous === null || Math.abs(hp - previous) <= this.flashThreshold()) {
        return;
      }

      this.flash(hp > previous ? 'up' : 'down');
    });
  }

  private flash(direction: FlashDirection): void {
    const element = this.elementRef.nativeElement;

    if (typeof element.animate !== 'function') {
      return;
    }

    const tone = this.toneColor(direction);
    const reduceMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // A fresh flash supersedes one still playing (rapid consecutive changes shouldn't stack).
    this.animation?.cancel();

    const keyframes = reduceMotion
      ? // Reduced motion: a plain colour hold, no glow pulse.
        [{ color: tone, offset: 0 }, { color: tone, offset: 0.85 }, {}]
      : // Snap to the tone at once, hold it while the glow pulses a few times, then fade back to the inherited
        // colour over only the final fifth — so the flash clearly lingers for the whole duration.
        [
          { color: tone, textShadow: `0 0 12px ${tone}`, offset: 0 },
          { color: tone, textShadow: `0 0 4px ${tone}`, offset: 0.2 },
          { color: tone, textShadow: `0 0 12px ${tone}`, offset: 0.4 },
          { color: tone, textShadow: `0 0 4px ${tone}`, offset: 0.6 },
          { color: tone, textShadow: `0 0 12px ${tone}`, offset: 0.8 },
          {},
        ];

    this.animation = element.animate(keyframes, {
      duration: FLASH_DURATION_MS,
      easing: 'ease-in-out',
    });
  }

  /** Resolves the tone colour from the Taiga status token on the host, falling back to a fixed colour. */
  private toneColor(direction: FlashDirection): string {
    const token = direction === 'up' ? '--tui-status-positive' : '--tui-status-negative';
    const resolved = getComputedStyle(this.elementRef.nativeElement).getPropertyValue(token).trim();

    if (resolved !== '') {
      return resolved;
    }

    return direction === 'up' ? FALLBACK_POSITIVE : FALLBACK_NEGATIVE;
  }
}
