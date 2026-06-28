import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { PokemonBattlePageComponent } from './pokemon-battle-page.component';
import { BotPlayerService } from '../../../data/bot-player.service';

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
      it('должен проводить раунд боя при выборе атак и целей для обоих покемонов игрока', () => {
        TestBed.configureTestingModule({
          imports: [PokemonBattlePageComponent],
        });

        const botPlayerService = TestBed.inject(BotPlayerService);

        vi.spyOn(botPlayerService, 'getCommands').mockReturnValue([]);

        const fixture = TestBed.createComponent(PokemonBattlePageComponent);

        fixture.detectChanges();
        const component = fixture.componentInstance;

        expect(component.textLog()).toHaveLength(0);

        // Переопределяем playEvents на CanvasRendererComponent для мгновенного выполнения в тестах
        const canvasRenderer = component['canvasRenderer']();

        if (canvasRenderer) {
          vi.spyOn(canvasRenderer, 'playEvents').mockImplementation((events) => {
            events.forEach((event_) => component.onEventTriggered(event_));
            component.onAnimationFinished();
          });
        }

        // Игрок выбирает атаку для Bulbasaur (первый покемон)
        component.onSelectMove('tackle');

        expect(component.selectedMove()).not.toBeNull();
        expect(component.selectedMove()?.name).toBe('tackle');

        // Выбираем цель для Bulbasaur
        const target1 = component.activeAliveOpponentPokemons[0];

        component.onSelectTarget(target1);

        // Теперь ход переходит ко второму покемону (Squirtle)
        expect(component.currentSelectingPokemonIndex()).toBe(1);
        expect(component.selectedMove()).toBeNull();

        // Выбираем атаку для Squirtle
        component.onSelectMove('water-gun');

        expect(component.selectedMove()?.name).toBe('water-gun');

        // Выбираем цель для Squirtle
        const target2 = component.activeAliveOpponentPokemons[1];

        component.onSelectTarget(target2);

        // После выбора целей для обоих покемонов раунд завершается и лог заполняется
        const logs = component.textLog();

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0]).toBe('--- Раунд 1 ---');

        // Проверяем, что события содержат информацию о нанесении урона
        const hasDamageLog = logs.some((log) => log.includes('took') && log.includes('damage'));

        expect(hasDamageLog).toBe(true);

        // Проверяем изменение состояния боя
        const state = component.battleState();

        expect(state).not.toBeNull();
        expect(state?.turn).toBe(2); // Раунд увеличился
      });

      it('должен позволять сбрасывать текущий выбранный прием', () => {
        TestBed.configureTestingModule({
          imports: [PokemonBattlePageComponent],
        });

        const fixture = TestBed.createComponent(PokemonBattlePageComponent);

        fixture.detectChanges();
        const component = fixture.componentInstance;

        component.onSelectMove('tackle');
        expect(component.selectedMove()).not.toBeNull();

        component.cancelMoveSelection();
        expect(component.selectedMove()).toBeNull();
      });

      it('должен позволять сбрасывать весь выбор ходов раунда', () => {
        TestBed.configureTestingModule({
          imports: [PokemonBattlePageComponent],
        });

        const fixture = TestBed.createComponent(PokemonBattlePageComponent);

        fixture.detectChanges();
        const component = fixture.componentInstance;

        component.onSelectMove('tackle');
        component.onSelectTarget(component.activeAliveOpponentPokemons[0]);

        expect(component.currentSelectingPokemonIndex()).toBe(1);
        expect(component.pendingCommands()).toHaveLength(1);

        component.resetSelection();

        expect(component.currentSelectingPokemonIndex()).toBe(0);
        expect(component.pendingCommands()).toHaveLength(0);
        expect(component.selectedMove()).toBeNull();
      });
    });
  });
});
