import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

@Injectable()
export class RockSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    this.engine.playTone({
      frequency: 380,
      endFrequency: 200,
      durationMs: 60,
      type: 'square',
      gain: 0.16,
    });
    this.engine.playTone({
      frequency: 170,
      endFrequency: 80,
      durationMs: 160,
      type: 'square',
      gain: 0.24,
    });
  }
}
