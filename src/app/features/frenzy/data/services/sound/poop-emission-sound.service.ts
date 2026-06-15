import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

// A short low buzzy down-glide — the "pfft" fart played per item sprayed under the poop `pooping` aura. Short and
// quiet like the egg blip (emissions fire ~1/s per pooper), so a stream reads as a string of farts, not a drone.
@Injectable()
export class PoopEmissionSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    this.engine.playTone({
      frequency: 150,
      endFrequency: 70,
      durationMs: 90,
      type: 'sawtooth',
      gain: 0.06,
    });
  }
}
