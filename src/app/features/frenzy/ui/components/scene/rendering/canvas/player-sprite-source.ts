import { DestroyRef, inject, Injectable } from '@angular/core';

// Texture-source for the canvas players-pass: hands the canvas a CanvasImageSource for a sprite URL so `drawImage`
// can blit the player's sprite. The sprites are animated GIFs, fed via a hidden off-screen `<img>` (the only way to
// give `drawImage` an `<img>` without a visible duplicate), one per URL and shared across every player on the same
// line/stage.
//
// KNOWN LIMITATION — the sprite is STATIC on canvas. Chrome does not advance an off-screen GIF's animation, so
// `drawImage` samples a frozen first frame (proven on-device 2026-06-21: off-screen AND in-viewport `<img>` both
// froze under an honest clear+draw, while DOM mode — a painted `<img>` — animates). This is acceptable only because
// the players-on-canvas mode is debug-gated (`playerSpritesMode`, default 'dom'); real players use the DOM renderer,
// which animates. The fix — decode each GIF to frames (WebCodecs `ImageDecoder`) and cycle them by wall-clock — is
// DEFERRED to its own issue (04-canvas-player-sprite-animation).
@Injectable()
export class PlayerSpriteSource {
  private readonly destroyRef = inject(DestroyRef);
  private readonly images = new Map<string, HTMLImageElement>();
  // Off-viewport, attached host the `<img>` elements live inside; created lazily on first use.
  private host: HTMLElement | null = null;

  // The drawable for a sprite URL, or null while it is still loading (the caller skips that sprite for the few
  // startup frames, keeping its chrome). Returns a frozen frame once loaded — see the class note above.
  public getDrawable(url: string): CanvasImageSource | null {
    let image = this.images.get(url);

    if (image === undefined) {
      image = new Image();
      image.src = url;
      image.setAttribute('aria-hidden', 'true');
      this.ensureHost().append(image);
      this.images.set(url, image);
    }

    return image.complete && image.naturalWidth > 0 ? image : null;
  }

  // The attached, off-screen container the sprites live in (a fixed negative offset, not display:none); torn down
  // with the scene's injection scope so it never leaks.
  private ensureHost(): HTMLElement {
    if (this.host !== null) {
      return this.host;
    }

    const host = document.createElement('div');

    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-99999px;top:0;pointer-events:none;';
    document.body.append(host);
    this.host = host;
    this.destroyRef.onDestroy(() => {
      host.remove();
      this.host = null;
      this.images.clear();
    });

    return host;
  }
}
