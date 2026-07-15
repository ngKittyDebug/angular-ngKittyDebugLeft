import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';

import type { BattleState } from '../../../../data/models/battle.model';
import { CanvasRendererComponent } from './canvas-renderer.component';
import { AudioManagerService } from '../../../../data/services/audio-manager.service';
import { BULBASAUR_FIXTURE, CHARMANDER_FIXTURE } from '../../../../data/fixtures/pokemon.fixture';

describe('CanvasRendererComponent', () => {
  let audioManagerMock: MockedObject<Partial<AudioManagerService>>;

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      drawImage: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      arc: vi.fn(),
    } as unknown as CanvasRenderingContext2D);

    audioManagerMock = {
      playCry: vi.fn(),
    } as unknown as MockedObject<Partial<AudioManagerService>>;

    TestBed.configureTestingModule({
      imports: [CanvasRendererComponent],
      providers: [{ provide: AudioManagerService, useValue: audioManagerMock }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен правильно инициализироваться и запускать цикл анимации вне Zone.js', () => {
        vi.useFakeTimers();
        const ngZone = TestBed.inject(NgZone);
        const runOutsideAngularSpy = vi.spyOn(ngZone, 'runOutsideAngular');
        const fixture = TestBed.createComponent(CanvasRendererComponent);
        const stateMock: BattleState = {
          playerSide: {
            playerType: 'player',
            pokemons: [structuredClone(BULBASAUR_FIXTURE)],
            activePokemonIds: [1],
          },
          opponentSide: {
            playerType: 'bot',
            pokemons: [structuredClone(CHARMANDER_FIXTURE)],
            activePokemonIds: [4],
          },
          status: 'waiting-for-commands',
          winner: null,
          turn: 1,
        };

        fixture.componentRef.setInput('state', stateMock);
        fixture.detectChanges();

        expect(fixture.componentInstance).toBeDefined();
        expect(runOutsideAngularSpy).toHaveBeenCalledTimes(4);

        vi.advanceTimersByTime(1000);

        expect(audioManagerMock.playCry).toHaveBeenCalledTimes(2);
        expect(audioManagerMock.playCry).toHaveBeenNthCalledWith(1, 1);
        expect(audioManagerMock.playCry).toHaveBeenNthCalledWith(2, 4);
      });
    });

    describe('Последовательная очередь анимаций и события', () => {
      it('должен последовательно проигрывать события, вызывать eventTriggered и завершаться с animationFinished', () => {
        vi.useFakeTimers({
          toFake: ['requestAnimationFrame', 'setTimeout', 'clearTimeout', 'Date'],
        });
        const fixture = TestBed.createComponent(CanvasRendererComponent);
        const component = fixture.componentInstance;
        const stateMock: BattleState = {
          playerSide: {
            playerType: 'player',
            pokemons: [structuredClone(BULBASAUR_FIXTURE)],
            activePokemonIds: [1],
          },
          opponentSide: {
            playerType: 'bot',
            pokemons: [structuredClone(CHARMANDER_FIXTURE)],
            activePokemonIds: [4],
          },
          status: 'waiting-for-commands',
          winner: null,
          turn: 1,
        };

        fixture.componentRef.setInput('state', stateMock);
        fixture.detectChanges();

        const eventTriggeredSpy = vi.spyOn(component.eventTriggered, 'emit');
        const animationFinishedSpy = vi.spyOn(component.animationFinished, 'emit');
        const moveEvent = {
          type: 'use-move' as const,
          message: 'Bulbasaur used tackle!',
          payload: { attackerId: 1, moveName: 'tackle', targetId: 4 },
        };
        const damageEvent = {
          type: 'damage' as const,
          message: 'Charmander took 10 damage!',
          payload: { targetId: 4, damage: 10, hpBefore: 39, hpAfter: 29 },
        };

        component.playEvents([moveEvent, damageEvent]);
        vi.advanceTimersByTime(50);

        expect(eventTriggeredSpy).toHaveBeenCalledTimes(1);
        expect(eventTriggeredSpy).toHaveBeenLastCalledWith(moveEvent);
        expect(animationFinishedSpy).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1100);

        expect(eventTriggeredSpy).toHaveBeenCalledTimes(2);
        expect(eventTriggeredSpy).toHaveBeenLastCalledWith(damageEvent);
        expect(animationFinishedSpy).not.toHaveBeenCalled();
        expect(audioManagerMock.playCry).toHaveBeenNthCalledWith(1, 1);
        expect(audioManagerMock.playCry).toHaveBeenNthCalledWith(2, 4);

        vi.advanceTimersByTime(1100);

        expect(animationFinishedSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
