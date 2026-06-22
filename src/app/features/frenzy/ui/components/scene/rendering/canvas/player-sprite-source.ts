import { DestroyRef, inject, Injectable } from '@angular/core';

import { frameIndexAt } from './sprite-frame-timeline';

// Texture-source for the canvas players-pass: hands the canvas a CanvasImageSource for a sprite URL so `drawImage`
// can blit the player's CURRENT animation frame. The sprites are animated GIFs, but a hidden off-screen `<img>` does
// NOT animate under `drawImage` — Chrome freezes an off-screen GIF on frame 0 (proven on-device 2026-06-21). So we
// decode each GIF to its frames once (WebCodecs `ImageDecoder`) and cycle them ourselves off the free-running draw
// clock — static frames animate regardless of whether the source is painted. Shared across every player on the same
// line/stage (keyed by URL); the decoded bitmaps are released with the scene's injection scope.

// Per-frame duration (ms) used when a GIF frame reports a 0 / null duration, so a malformed timeline still advances.
const DEFAULT_FRAME_MS = 100;

interface DecodedSprite {
  frames: readonly ImageBitmap[];
  // Cumulative frame-END times (ms), strictly increasing; the last entry is the full loop duration.
  ends: readonly number[];
}

@Injectable()
export class PlayerSpriteSource {
  private readonly destroyRef = inject(DestroyRef);
  // url → its decoded frames, or null once a decode has permanently failed (unsupported codec / fetch error) so it
  // is never retried (the player keeps its DOM chrome). Absent while still decoding.
  private readonly decoded = new Map<string, DecodedSprite | null>();
  // urls whose decode is in flight, so each sprite is fetched + decoded at most once.
  private readonly pending = new Set<string>();
  // Set on teardown so a decode that resolves AFTER the scene is gone closes its bitmaps instead of leaking GPU memory.
  private isDestroyed = false;

  public constructor() {
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;

      for (const sprite of this.decoded.values()) {
        sprite?.frames.forEach((frame) => frame.close());
      }

      this.decoded.clear();
    });
  }

  // The animation frame to blit for a sprite URL at draw-clock `now`, or null while it is still decoding / the codec
  // is unsupported (the caller then keeps the player's DOM chrome and skips this sprite for the few startup frames).
  // The frame is picked purely by wall-clock, so the GIF loops forever with no per-sprite playback state.
  public getDrawable(url: string, now: number): CanvasImageSource | null {
    const sprite = this.decoded.get(url);

    if (sprite === undefined) {
      this.decode(url);

      return null;
    }

    if (sprite === null || sprite.frames.length === 0) {
      return null;
    }

    return sprite.frames[frameIndexAt(sprite.ends, now)];
  }

  // Kick off a one-time decode for a URL; stores the result (or null on any failure) so `getDrawable` can read it.
  private decode(url: string): void {
    if (this.pending.has(url)) {
      return;
    }

    this.pending.add(url);

    void this.decodeFrames(url)
      .then((sprite) => this.store(url, sprite))
      .catch(() => this.store(url, null))
      .finally(() => this.pending.delete(url));
  }

  // Store a finished decode, or close its bitmaps and drop it if the scene was torn down mid-decode (no leak).
  private store(url: string, sprite: DecodedSprite | null): void {
    if (this.isDestroyed) {
      sprite?.frames.forEach((frame) => frame.close());

      return;
    }

    this.decoded.set(url, sprite);
  }

  // Decode a GIF to its frames via WebCodecs: each frame becomes an ImageBitmap (cheap to blit, explicit GPU release)
  // and its cumulative end time feeds the wall-clock frame-picker. Throws on unsupported / fetch / decode failure,
  // which `decode` turns into a permanent null entry.
  private async decodeFrames(url: string): Promise<DecodedSprite> {
    if (typeof ImageDecoder === 'undefined') {
      throw new Error('ImageDecoder unsupported');
    }

    const response = await fetch(url);
    const data = await response.arrayBuffer();
    const decoder = new ImageDecoder({ data, type: 'image/gif' });

    try {
      await decoder.completed;

      const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 1;
      const frames: ImageBitmap[] = [];
      const ends: number[] = [];
      let total = 0;

      for (let index = 0; index < frameCount; index += 1) {
        const { image } = await decoder.decode({ frameIndex: index });
        // `duration` is microseconds and nullable; fall back so a frame without timing still advances the loop.
        const durationMs =
          image.duration && image.duration > 0 ? image.duration / 1000 : DEFAULT_FRAME_MS;

        total += durationMs;
        ends.push(total);
        frames.push(await createImageBitmap(image));
        image.close();
      }

      return { frames, ends };
    } finally {
      decoder.close();
    }
  }
}
