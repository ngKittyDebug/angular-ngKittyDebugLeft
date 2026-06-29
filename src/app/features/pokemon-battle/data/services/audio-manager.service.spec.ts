import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { AudioManagerService } from './audio-manager.service';

describe('AudioManagerService', () => {
  let service: AudioManagerService;
  let ngZone: NgZone;
  let playSpy: Mock<() => Promise<void>>;
  let audioInstances: { volume: number; play: Mock<() => Promise<void>> }[];

  beforeEach(() => {
    // Clear storage first to prevent persistent side-effects between tests
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    playSpy = vi.fn().mockResolvedValue(undefined);
    audioInstances = [];

    // Mock global and window Audio constructor and track instances
    const MockAudio = class {
      public volume = 1;
      public play = playSpy;
      constructor() {
        audioInstances.push(this);
      }
    };

    vi.stubGlobal('Audio', MockAudio);

    TestBed.configureTestingModule({
      providers: [AudioManagerService],
    });

    service = TestBed.inject(AudioManagerService);
    ngZone = TestBed.inject(NgZone);
  });

  describe('Happy Path', () => {
    describe('Воспроизведение звука', () => {
      it('должен проигрывать крик покемона вне зоны Angular', () => {
        const runOutsideAngularSpy = vi.spyOn(ngZone, 'runOutsideAngular');

        service.playCry(1);

        expect(runOutsideAngularSpy).toHaveBeenCalledTimes(1);
        expect(playSpy).toHaveBeenCalledTimes(1);
        expect(audioInstances.length).toBe(1);
      });

      it('не должен проигрывать звук, если он отключен', () => {
        service.setEnabled(false);

        service.playCry(1);

        expect(playSpy).toHaveBeenCalledTimes(0);
      });

      it('должен устанавливать правильную громкость звука', () => {
        service.setVolume(0.55);

        service.playCry(1);

        expect(audioInstances.length).toBe(1);
        expect(audioInstances[0].volume).toBe(0.55);
      });

      it('должен переключать включение/выключение звука', () => {
        expect(service.enabled()).toBe(true);

        service.toggle();
        expect(service.enabled()).toBe(false);

        service.toggle();
        expect(service.enabled()).toBe(true);
      });
    });
  });
});
