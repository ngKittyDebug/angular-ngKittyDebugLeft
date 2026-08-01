import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { PokemonBattleArenaComponent } from './pokemon-battle-arena.component';
import { PokemonBattleArenaFacade } from '../../../../data/facades/pokemon-battle-arena.facade';
import { BULBASAUR_FIXTURE } from '../../../../data/fixtures/pokemon.fixture';
import { of } from 'rxjs';

describe('PokemonBattleArenaComponent', () => {
  let mockFacade: MockedObject<Partial<PokemonBattleArenaFacade>>;

  beforeEach(() => {
    mockFacade = {
      turnResolved$: of([]),
      selectMove: vi.fn(),
      selectTarget: vi.fn(),
      cancelMoveSelection: vi.fn(),
      resetSelection: vi.fn(),
      resetBattle: vi.fn(),
      goBackToSelection: vi.fn(),
      triggerEvent: vi.fn(),
      finishAnimation: vi.fn(),
      activeAlivePlayerPokemonList: signal([]),
      activeAliveOpponentPokemonList: signal([]),
      selectedMove: signal(null),
      currentSelectingPokemon: signal(null),
      currentSelectingPokemonIndex: signal(0),
      pendingCommandList: signal([]),
      battleState: signal(null),
      textLogList: signal([]),
      isAnimating: signal(false),
      soundEnabled: signal(true),
      soundVolume: signal(0.5),
      soundVolumePercent: signal(50),
    } as unknown as MockedObject<Partial<PokemonBattleArenaFacade>>;

    TestBed.configureTestingModule({
      imports: [
        PokemonBattleArenaComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
    }).overrideComponent(PokemonBattleArenaComponent, {
      set: { providers: [{ provide: PokemonBattleArenaFacade, useValue: mockFacade }] },
    });
  });

  it('должен создаваться', () => {
    const fixture = TestBed.createComponent(PokemonBattleArenaComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('должен проксировать вызовы методов к фасаду', () => {
    const fixture = TestBed.createComponent(PokemonBattleArenaComponent);
    const component = fixture.componentInstance;

    const move = BULBASAUR_FIXTURE.moves[0];

    component.onSelectMove(move);
    expect(mockFacade.selectMove).toHaveBeenCalledWith(move);

    component.onSelectTarget(BULBASAUR_FIXTURE);
    expect(mockFacade.selectTarget).toHaveBeenCalledWith(BULBASAUR_FIXTURE);

    component.onCancelMoveSelection();
    expect(mockFacade.cancelMoveSelection).toHaveBeenCalled();

    component.onResetSelection();
    expect(mockFacade.resetSelection).toHaveBeenCalled();

    component.onResetBattle();
    expect(mockFacade.resetBattle).toHaveBeenCalled();

    component.onGoBackToSelection();
    expect(mockFacade.goBackToSelection).toHaveBeenCalled();

    component.onAnimationFinished();
    expect(mockFacade.finishAnimation).toHaveBeenCalled();
  });

  it('должен иметь атрибуты доступности для лога боя', () => {
    const fixture = TestBed.createComponent(PokemonBattleArenaComponent);

    fixture.detectChanges();

    const logBox = fixture.nativeElement.querySelector('.log-box');

    expect(logBox.getAttribute('role')).toBe('log');
    expect(logBox.getAttribute('aria-live')).toBe('polite');
  });
});
