import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BattleState } from '@game/pokemon-battle/types';
import { CanvasRendererComponent } from './canvas-renderer.component';

describe('CanvasRendererComponent', () => {
  beforeEach(() => {
    // Mock getContext of HTMLCanvasElement since jsdom doesn't implement it natively
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
  });

  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен правильно инициализироваться и запускать цикл анимации вне Zone.js', () => {
        TestBed.configureTestingModule({
          imports: [CanvasRendererComponent],
        });

        const ngZone = TestBed.inject(NgZone);
        const runOutsideAngularSpy = vi.spyOn(ngZone, 'runOutsideAngular');

        const fixture = TestBed.createComponent(CanvasRendererComponent);
        const stateMock: BattleState = {
          playerSide: {
            playerType: 'player',
            pokemons: [
              {
                id: 1,
                name: 'bulbasaur',
                maxHp: 45,
                hp: 45,
                stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
                types: ['grass', 'poison'],
                sprites: { front: 'bulbasaur.png', back: 'bulbasaur.png' },
                moves: [],
              },
            ],
            activePokemonIds: [1],
          },
          opponentSide: {
            playerType: 'bot',
            pokemons: [
              {
                id: 4,
                name: 'charmander',
                maxHp: 39,
                hp: 39,
                stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
                types: ['fire'],
                sprites: { front: 'charmander.png', back: 'charmander.png' },
                moves: [],
              },
            ],
            activePokemonIds: [4],
          },
          status: 'waiting-for-commands',
          winner: null,
          turn: 1,
        };

        fixture.componentRef.setInput('state', stateMock);
        fixture.detectChanges();

        expect(fixture.componentInstance).toBeDefined();
        expect(runOutsideAngularSpy).toHaveBeenCalled();
      });
    });

    describe('Последовательная очередь анимаций и события', () => {
      it('должен последовательно проигрывать события, вызывать eventTriggered и завершаться с animationFinished', () => {
        TestBed.configureTestingModule({
          imports: [CanvasRendererComponent],
        });

        const fixture = TestBed.createComponent(CanvasRendererComponent);
        const component = fixture.componentInstance;

        const stateMock: BattleState = {
          playerSide: {
            playerType: 'player',
            pokemons: [
              {
                id: 1,
                name: 'bulbasaur',
                maxHp: 45,
                hp: 45,
                stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
                types: ['grass', 'poison'],
                sprites: { front: 'bulbasaur.png', back: 'bulbasaur.png' },
                moves: [],
              },
            ],
            activePokemonIds: [1],
          },
          opponentSide: {
            playerType: 'bot',
            pokemons: [
              {
                id: 4,
                name: 'charmander',
                maxHp: 39,
                hp: 39,
                stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
                types: ['fire'],
                sprites: { front: 'charmander.png', back: 'charmander.png' },
                moves: [],
              },
            ],
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

        // Запускаем воспроизведение двух событий
        component.playEvents([moveEvent, damageEvent]);

        // Первый кадр в момент времени 100
        component['render'](100);

        // Должно запуститься первое событие ('use-move')
        expect(eventTriggeredSpy).toHaveBeenCalledTimes(1);
        expect(eventTriggeredSpy).toHaveBeenLastCalledWith(moveEvent);
        expect(animationFinishedSpy).not.toHaveBeenCalled();

        // Кадр через 1100 мс (100 + 1100 = 1200), завершает первое событие
        component['render'](1200);

        // Следующий кадр запускает второе событие ('damage')
        component['render'](1201);

        // Должно запуститься второе событие ('damage')
        expect(eventTriggeredSpy).toHaveBeenCalledTimes(2);
        expect(eventTriggeredSpy).toHaveBeenLastCalledWith(damageEvent);
        expect(animationFinishedSpy).not.toHaveBeenCalled();

        // Проверяем интерполяцию HP во время второго события (через 500 мс после начала)
        component['render'](1701); // 1201 + 500
        const animatedHp = component['animatedHps'].get(4);

        expect(animatedHp).toBeCloseTo(34, 0); // (29 - 39) * 0.5 + 39 = 34

        // Кадр через 1100 мс после старта второго события (1201 + 1100 = 2301) завершает событие
        component['render'](2301);

        // События должны закончиться, сработает animationFinished
        expect(animationFinishedSpy).toHaveBeenCalledTimes(1);
      });
    });
  });
});
