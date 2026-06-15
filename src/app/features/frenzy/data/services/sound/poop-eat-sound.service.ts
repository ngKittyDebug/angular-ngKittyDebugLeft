import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

// A wet downward "plop-thud" — the squishy cue for eating a poop (the `pooping` debuff landing on you).
@Injectable()
export class PoopEatSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    this.engine.playTone({
      frequency: 220,
      endFrequency: 80,
      durationMs: 200,
      type: 'sawtooth',
      gain: 0.09,
    });
    this.engine.playTone({
      frequency: 130,
      endFrequency: 55,
      durationMs: 160,
      type: 'square',
      gain: 0.07,
      delayMs: 90,
    });
  }
}
