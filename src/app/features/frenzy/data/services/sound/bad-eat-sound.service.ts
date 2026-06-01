import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

@Injectable()
export class BadEatSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    this.engine.playTone({
      frequency: 220,
      endFrequency: 150,
      durationMs: 200,
      type: 'sawtooth',
      gain: 0.12,
    });
  }
}
