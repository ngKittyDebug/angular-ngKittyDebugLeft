import { Directive, effect, ElementRef, inject, input } from '@angular/core';

// Fallback tone colours used when the Taiga status tokens aren't resolvable (e.g. jsdom in unit tests). In the
// app the live `--tui-status-*` values win.
const FALLBACK_POSITIVE = '#4caf50';
const FALLBACK_NEGATIVE = '#f44336';

type FlashDirection = 'up' | 'down';

// The host (HP badge) keeps this resting drop-shadow; the flash adds a coloured glow ring on top of it, then
// reverts. Mirrors the value in current-pokemon-status.scss so the base shadow is preserved during the animation.
const BASE_SHADOW = '0 3px 10px -2px rgba(0, 0, 0, 0.5)';
const FLASH_DURATION_MS = 2600;

/**
 * Briefly pulses the host (the HP badge) with a coloured GLOW RING — green on a big gain / red on a big loss — plus
 * a small scale bump, via the Web Animations API, then reverts on its own (no fill). It does NOT recolour the text:
 * the badge fill already carries the HP tone, so a green/red text flash would vanish on a same-tone fill (green on
 * green / red on red, reading as a blank badge). The glow ring sits outside the badge, against the card, so it stays
 * visible whatever the fill. Only a jump larger than `flashThreshold` triggers it, so the steady decay drip (−2) and
 * the first render stay silent. Self-contained — keeps the previous value in a field and compares, no external service.
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

    const keyframes =
      direction === 'up'
        ? this.healKeyframes(tone, reduceMotion)
        : this.damageKeyframes(tone, reduceMotion);

    this.animation = element.animate(keyframes, {
      duration: FLASH_DURATION_MS,
      easing: 'ease-in-out',
    });
  }

  /**
   * Heal: a GROW pulse + green glow ring on top of the resting shadow. No fill swap — the badge fill already trends
   * green as HP rises, and the white text stays readable throughout.
   */
  private healKeyframes(tone: string, reduceMotion: boolean): Keyframe[] {
    if (reduceMotion) {
      return [
        { boxShadow: `${BASE_SHADOW}, 0 0 10px 2px ${tone}`, offset: 0 },
        { boxShadow: `${BASE_SHADOW}, 0 0 10px 2px ${tone}`, offset: 0.85 },
        {},
      ];
    }

    return [
      { boxShadow: `${BASE_SHADOW}, 0 0 0 0 ${tone}`, transform: 'scale(1)', offset: 0 },
      { boxShadow: `${BASE_SHADOW}, 0 0 13px 3px ${tone}`, transform: 'scale(1.14)', offset: 0.18 },
      { boxShadow: `${BASE_SHADOW}, 0 0 6px 1px ${tone}`, transform: 'scale(1)', offset: 0.4 },
      { boxShadow: `${BASE_SHADOW}, 0 0 13px 3px ${tone}`, transform: 'scale(1.1)', offset: 0.62 },
      { boxShadow: `${BASE_SHADOW}, 0 0 6px 1px ${tone}`, transform: 'scale(1)', offset: 0.82 },
      {},
    ];
  }

  /**
   * Damage: a SHRINK pulse with a temporary red fill (the negative tone), then it reverts to the inherited HP-tone
   * background on its own (no fill). The downward scale reads as "taking a hit"; the white text stays legible on red.
   */
  private damageKeyframes(tone: string, reduceMotion: boolean): Keyframe[] {
    if (reduceMotion) {
      return [{ backgroundColor: tone, offset: 0 }, { backgroundColor: tone, offset: 0.85 }, {}];
    }

    return [
      { backgroundColor: tone, transform: 'scale(1)', offset: 0 },
      { backgroundColor: tone, transform: 'scale(0.84)', offset: 0.18 },
      { backgroundColor: tone, transform: 'scale(1)', offset: 0.4 },
      { backgroundColor: tone, transform: 'scale(0.9)', offset: 0.62 },
      { backgroundColor: tone, transform: 'scale(1)', offset: 0.82 },
      {},
    ];
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
