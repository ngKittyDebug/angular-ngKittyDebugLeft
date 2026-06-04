import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

@Injectable()
export class ExplosionSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    // Punchy descending boom: a sawtooth body drops fast, a deeper square tail rings under it.
    this.engine.playTone({
      frequency: 200,
      endFrequency: 40,
      durationMs: 280,
      type: 'sawtooth',
      gain: 0.3,
    });
    this.engine.playTone({
      frequency: 90,
      endFrequency: 30,
      durationMs: 420,
      type: 'square',
      gain: 0.22,
      delayMs: 40,
    });
  }
}
