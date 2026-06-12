import { computed, Directive, input } from '@angular/core';

/**
 * Paints a glassy soap-bubble skin on its host: a top-left specular highlight, a translucent fill that
 * brightens toward the rim, a bright rim border and a volume shadow (outer glow + inset glow + inset
 * bottom-right). Only `background-image`/`border`/`box-shadow` are set inline, so the host keeps full control
 * of shape, size, `background-color` (e.g. a dark base for text contrast), position and animation.
 *
 * The tint is theme-aware: it resolves from the `leftPawBubbleSkin` input when given, else the host's
 * `--left-paw-bubble-tint` custom property (so a host can vary it in CSS — e.g. per message tone), else a
 * neutral glassy white. The specular highlight strength is the `--left-paw-bubble-highlight` property (alpha,
 * default 0.6) so a host can dim it to 0 — e.g. quips drop it, the shield keeps it. Reused by the shield ward,
 * floating quips, and any future bubble — each just supplies a tint. `color-mix` keeps every layer a
 * translucent shade of that one tint.
 */
@Directive({
  selector: '[leftPawBubbleSkin]',
  host: {
    '[style.background-image]': 'backgroundImage()',
    '[style.border]': 'border()',
    '[style.box-shadow]': 'boxShadow()',
  },
})
export class BubbleSkinDirective {
  private readonly resolvedTint = computed(
    () => this.tint() || 'var(--left-paw-bubble-tint, rgba(220, 236, 255, 0.92))',
  );

  public readonly tint = input('', { alias: 'leftPawBubbleSkin' });

  protected readonly backgroundImage = computed(() => {
    const tint = this.resolvedTint();

    return (
      `radial-gradient(circle at 30% 22%,` +
      ` rgba(255, 255, 255, var(--left-paw-bubble-highlight, 0.6)) 0%,` +
      ` rgba(255, 255, 255, 0) 26%),` +
      ` radial-gradient(135% 130% at 50% 42%,` +
      ` color-mix(in srgb, ${tint} 5%, transparent) 48%,` +
      ` color-mix(in srgb, ${tint} 26%, transparent) 85%,` +
      ` color-mix(in srgb, ${tint} 8%, transparent) 100%)`
    );
  });

  protected readonly border = computed(
    () => `1px solid color-mix(in srgb, ${this.resolvedTint()} 60%, transparent)`,
  );

  protected readonly boxShadow = computed(() => {
    const tint = this.resolvedTint();

    return (
      `0 0 12px color-mix(in srgb, ${tint} 45%, transparent),` +
      ` inset 0 0 14px color-mix(in srgb, ${tint} 26%, transparent),` +
      ` inset -4px -7px 14px color-mix(in srgb, ${tint} 20%, transparent)`
    );
  });
}
