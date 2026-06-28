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
  });
});
