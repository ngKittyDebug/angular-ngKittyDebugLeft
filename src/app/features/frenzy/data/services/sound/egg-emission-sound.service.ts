import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

// A short, bright rising blip — a festive "ta-da!" spark played per item sprayed under the easter-egg `laying`
// aura. Kept very short and quiet on purpose: emissions fire ~1/s per layer, so it reads as a sparkly stream
// rather than a single fanfare.
@Injectable()
export class EggEmissionSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    this.engine.playTone({
      frequency: 880,
      endFrequency: 1175,
      durationMs: 70,
      type: 'triangle',
      gain: 0.05,
    });
  }
}
