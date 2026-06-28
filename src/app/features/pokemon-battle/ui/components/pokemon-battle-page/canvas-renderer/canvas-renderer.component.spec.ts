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
  });
});
