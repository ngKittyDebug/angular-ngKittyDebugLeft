import { inject, Injectable, NgZone, signal } from '@angular/core';

const ENABLED_KEY = 'pokemon-sound-enabled';
const VOLUME_KEY = 'pokemon-sound-volume';
const DEFAULT_VOLUME = 0.3;

@Injectable()
export class AudioManagerService {
  private readonly ngZone = inject(NgZone);

  private readonly _enabled = signal(this.readEnabled());
  private readonly _volume = signal(this.readVolume());

  public readonly enabled = this._enabled.asReadonly();
  public readonly volume = this._volume.asReadonly();

  public playCry(pokemonId: number): void {
    if (!this._enabled()) {
      return;
    }

    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      try {
        const url = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemonId}.ogg`;
        const audio = new Audio(url);

        audio.volume = this._volume();

        audio.play().catch((error) => {
          // Playback might be prevented by browser autoplay policies before user interaction
          console.warn(`Failed to play Pokemon cry for ID ${pokemonId}:`, error);
        });
      } catch (error) {
        console.error(`Error playing Pokemon cry for ID ${pokemonId}:`, error);
      }
    });
  }

  public setEnabled(value: boolean): void {
    this._enabled.set(value);
    this.persist(ENABLED_KEY, String(value));
  }

  public setVolume(value: number): void {
    const clamped = Math.min(1, Math.max(0, value));

    this._volume.set(clamped);
    this.persist(VOLUME_KEY, String(clamped));
  }

  public toggle(): void {
    this.setEnabled(!this._enabled());
  }

  private persist(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  private readEnabled(): boolean {
    if (typeof localStorage === 'undefined') {
      return true;
    }

    return localStorage.getItem(ENABLED_KEY) !== 'false';
  }

  private readVolume(): number {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_VOLUME;
    }

    const stored = Number.parseFloat(localStorage.getItem(VOLUME_KEY) ?? '');

    if (Number.isNaN(stored)) {
      return DEFAULT_VOLUME;
    }

    return Math.min(1, Math.max(0, stored));
  }
}
