import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ComponentRef } from '@angular/core';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonDataService } from '@shared/services/pokemon-data.service';
import { POKEMON_DATA_FIXTURE } from '@shared/fixtures/eevee.fixture';
import type { MockedObject } from 'vitest';
import { vi } from 'vitest';

import { PokemonCardComponent } from './pokemon-card.component';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';

describe('PokemonCardComponent', () => {
  let component: PokemonCardComponent;
  let componentReference: ComponentRef<PokemonCardComponent>;
  let fixture: ComponentFixture<PokemonCardComponent>;

  const mockCardDataSignal = signal<PokemonDetailApiData | null>(null);

  const pokemonDataServiceMock = {
    createPokemonCardData: vi.fn().mockImplementation(() => ({
      cardData: mockCardDataSignal,
      cardDataError: signal(undefined),
    })),
  } as const satisfies Partial<MockedObject<PokemonDataService>>;

  beforeEach(() => {
    pokemonDataServiceMock.createPokemonCardData.mockClear();
    mockCardDataSignal.set(null);

    TestBed.configureTestingModule({
      imports: [PokemonCardComponent],
      providers: [
        { provide: PokemonDataService, useValue: pokemonDataServiceMock },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    fixture = TestBed.createComponent(PokemonCardComponent);

    component = fixture.componentInstance;
    componentReference = fixture.componentRef;
  });

  it('должен инициализироваться', () => {
    componentReference.setInput('pokemonName', POKEMON_DATA_FIXTURE.name);

    expect(component).toBeTruthy();
  });

  describe('Инициализация данных', () => {
    it('должен вызвать метод создания данных с именем покемона в нижнем регистре', () => {
      componentReference.setInput('pokemonName', POKEMON_DATA_FIXTURE.name.toUpperCase());

      const callback = pokemonDataServiceMock.createPokemonCardData.mock.calls[0][0];
      const resultName = callback();

      expect(pokemonDataServiceMock.createPokemonCardData).toHaveBeenCalledTimes(1);
      expect(resultName).toBe(POKEMON_DATA_FIXTURE.name);
    });
  });

  describe('Лимитирование характеристик (pokemonLimitedStats)', () => {
    it('должен возвращать пустой массив (не рендерить статы), если данные еще загружаются или отсутствуют', () => {
      componentReference.setInput('pokemonName', POKEMON_DATA_FIXTURE.name);
      mockCardDataSignal.set(null);
      fixture.detectChanges();

      const statRows = fixture.nativeElement.querySelectorAll('.card__line-stats');

      expect(statRows).toHaveLength(3);
    });

    it('должен возвращать максимум 3 характеристики, если их приходит больше', () => {
      componentReference.setInput('pokemonName', POKEMON_DATA_FIXTURE.name);
      mockCardDataSignal.set(POKEMON_DATA_FIXTURE);
      fixture.detectChanges();

      const statRows = fixture.nativeElement.querySelectorAll('.card__line-stats');

      expect(statRows).toHaveLength(3);
    });

    it('должен возвращать все характеристики, если их меньше лимита', () => {
      componentReference.setInput('pokemonName', POKEMON_DATA_FIXTURE.name);
      mockCardDataSignal.set({
        ...POKEMON_DATA_FIXTURE,
        stats: POKEMON_DATA_FIXTURE.stats.slice(0, 1),
      });
      fixture.detectChanges();

      const statRows = fixture.nativeElement.querySelectorAll('.card__line-stats');

      expect(statRows).toHaveLength(1);
    });
  });

  describe('Заглушки характеристик (skeletonStats)', () => {
    it('должен содержать массив из 3 элементов для рендеринга скелетонов', () => {
      componentReference.setInput('pokemonName', POKEMON_DATA_FIXTURE.name);
      mockCardDataSignal.set(null);
      fixture.detectChanges();

      const skeletonRows = fixture.nativeElement.querySelectorAll('.card__line-stats');

      expect(skeletonRows).toHaveLength(3);
    });
  });
});
