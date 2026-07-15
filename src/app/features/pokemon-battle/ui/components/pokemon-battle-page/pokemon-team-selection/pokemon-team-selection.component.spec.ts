import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { PokemonTeamSelectionComponent } from './pokemon-team-selection.component';
import { PokemonTeamSelectionFacade } from '../../../../data/facades/pokemon-team-selection.facade';
import { BULBASAUR_FIXTURE } from '../../../../data/fixtures/pokemon.fixture';

describe('PokemonTeamSelectionComponent', () => {
  let mockFacade: MockedObject<Partial<PokemonTeamSelectionFacade>>;

  beforeEach(() => {
    mockFacade = {
      selectPokemon: vi.fn(),
      retry: vi.fn(),
      prevPage: vi.fn(),
      nextPage: vi.fn(),
      startBattle: vi.fn(),
      pokemonList: signal([]),
      selectedTeam: signal([]),
      currentPage: signal(0),
      totalCount: signal(1),
      limit: signal(10),
      isLoading: signal(false),
      error: signal(null),
      TEAM_SIZE: 2,
      selectedIds: signal(new Set()),
      isTeamLimitReached: signal(false),
      isTeamComplete: signal(false),
      hasNextPage: signal(false),
      pageCount: signal(1),
    } as unknown as MockedObject<Partial<PokemonTeamSelectionFacade>>;

    TestBed.configureTestingModule({
      imports: [
        PokemonTeamSelectionComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
    }).overrideComponent(PokemonTeamSelectionComponent, {
      set: { providers: [{ provide: PokemonTeamSelectionFacade, useValue: mockFacade }] },
    });
  });

  it('должен создаваться', () => {
    const fixture = TestBed.createComponent(PokemonTeamSelectionComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('должен проксировать вызовы методов к фасаду', () => {
    const fixture = TestBed.createComponent(PokemonTeamSelectionComponent);
    const component = fixture.componentInstance;

    component.onPokemonClick(BULBASAUR_FIXTURE);
    expect(mockFacade.selectPokemon).toHaveBeenCalledWith(BULBASAUR_FIXTURE);

    component.onRetryClick();
    expect(mockFacade.retry).toHaveBeenCalled();

    component.onPrevClick();
    expect(mockFacade.prevPage).toHaveBeenCalled();

    component.onNextClick();
    expect(mockFacade.nextPage).toHaveBeenCalled();

    component.onStartBattleClick();
    expect(mockFacade.startBattle).toHaveBeenCalled();
  });

  it('должен иметь role="alert" у контейнера ошибки', () => {
    (mockFacade as any).error = signal('some-error');
    const fixture = TestBed.createComponent(PokemonTeamSelectionComponent);

    fixture.detectChanges();

    const errorContainer = fixture.nativeElement.querySelector('.error-container');

    expect(errorContainer.getAttribute('role')).toBe('alert');
  });
});
