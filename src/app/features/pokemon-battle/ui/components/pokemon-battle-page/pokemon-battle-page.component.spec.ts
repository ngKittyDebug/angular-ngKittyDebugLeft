import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { PokemonBattlePageComponent } from './pokemon-battle-page.component';

describe('PokemonBattlePageComponent', () => {
  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен правильно инициализироваться и загружать начальное состояние боя', () => {
        TestBed.configureTestingModule({
          imports: [PokemonBattlePageComponent],
        });

        const fixture = TestBed.createComponent(PokemonBattlePageComponent);

        fixture.detectChanges();

        const component = fixture.componentInstance;

        expect(component).toBeDefined();

        const state = component.battleState();

        expect(state).not.toBeNull();
        expect(state?.playerSide.pokemons[0].name).toBe('bulbasaur');
        expect(state?.opponentSide.pokemons[0].name).toBe('charmander');
        expect(state?.status).toBe('waiting-for-commands');
        expect(state?.turn).toBe(1);
      });
    });

    describe('Взаимодействие', () => {
      it('должен проводить раунд боя при выборе атаки и логировать события', () => {
        TestBed.configureTestingModule({
          imports: [PokemonBattlePageComponent],
        });

        const fixture = TestBed.createComponent(PokemonBattlePageComponent);

        fixture.detectChanges();
        const component = fixture.componentInstance;

        expect(component.textLog()).toHaveLength(0);

        // Игрок выбирает атаку 'tackle'
        component.onSelectMove('tackle');

        // Лог должен заполниться записями о раунде и уроне
        const logs = component.textLog();

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0]).toBe('--- Раунд 1 ---');

        // Проверяем, что события содержат информацию о нанесении урона
        const hasDamageLog = logs.some((log) => log.includes('took') && log.includes('damage'));

        expect(hasDamageLog).toBe(true);

        // Проверяем изменение состояния боя
        const state = component.battleState();

        expect(state).not.toBeNull();
        expect(state?.turn).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
