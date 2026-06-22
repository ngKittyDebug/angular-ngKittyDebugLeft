import { Injectable, signal } from '@angular/core';

/**
 * Bakes a static first frame of an animated sprite (GIF) to a PNG data URL, so the scene can render players FROZEN —
 * killing the per-frame GIF decode/re-raster that pins the FPS floor on a weak tablet. Used only when the
 * `?debug=perf` "freeze sprites" toggle is on; the bake happens once per sprite URL and is cached. The cache is a
 * signal, so a consumer reading `frozenUrl` inside a `computed` re-renders when the bake lands. Scene-scoped, so the
 * cache is shared across all players in one scene (one bake per Pokémon line) and collected when the scene is.
 */
@Injectable()
export class SpriteFreezeService {
  // Sprite URL → its baked static-frame data URL. A signal so a `computed` reading it re-runs when a bake completes.
  private readonly baked = signal<ReadonlyMap<string, string>>(new Map());
  // URLs whose bake is in flight or done, so each sprite is loaded + drawn at most once.
  private readonly requested = new Set<string>();

  // The frozen (static first-frame) data URL for a sprite, or null until it's baked — the caller falls back to the
  // live (animated) URL meanwhile, so a sprite animates briefly on first sight then freezes. Kicks off the one-time
  // bake on first request.
  public frozenUrl(spriteUrl: string): string | null {
    const cached = this.baked().get(spriteUrl);

    if (cached !== undefined) {
      return cached;
    }

    this.bake(spriteUrl);

    return null;
  }

  private bake(spriteUrl: string): void {
    if (this.requested.has(spriteUrl)) {
      return;
    }

    this.requested.add(spriteUrl);

    const image = new Image();

    image.addEventListener('load', () => this.store(spriteUrl, image));
    image.src = spriteUrl;
  }

  // Draw the loaded sprite's current frame onto an offscreen canvas and cache it as a static PNG data URL. A
  // zero-sized source (e.g. an SVG with no intrinsic box) is skipped, so the caller stays on the live URL rather
  // than swap in a broken empty bitmap.
  private store(spriteUrl: string, image: HTMLImageElement): void {
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      return;
    }

    const canvas = document.createElement('canvas');

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');

    if (context === null) {
      return;
    }

    context.drawImage(image, 0, 0);
    this.baked.update((map) => new Map(map).set(spriteUrl, canvas.toDataURL('image/png')));
  }
}
