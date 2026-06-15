import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

@Injectable()
export class BrickSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  // Heavier and lower than a rock's thunk — a brick hits twice as hard, so it lands with a deeper, longer thud.
  public play(): void {
    this.engine.playTone({
      frequency: 300,
      endFrequency: 150,
      durationMs: 80,
      type: 'square',
      gain: 0.2,
    });
    this.engine.playTone({
      frequency: 110,
      endFrequency: 45,
      durationMs: 220,
      type: 'square',
      gain: 0.3,
    });
  }
}
