import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MainCatalogPageComponent } from './main-catalog-page.component';
import { MainCatalogFacade } from '@features/main-catalog/data/facades/main-catalog.facade';
import { mainCatalogFacadeMock } from '@features/main-catalog/data/facades/main-catalog.facade.mock';
import { TranslocoTestingModule } from '@jsverse/transloco';

describe('MainCatalogPageComponent', () => {
  let component: MainCatalogPageComponent;
  let fixture: ComponentFixture<MainCatalogPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MainCatalogPageComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, ru: {} },
          translocoConfig: {
            availableLangs: ['ru', 'en'],
            defaultLang: 'ru',
          },
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MainCatalogFacade, useValue: mainCatalogFacadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainCatalogPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('должен инициализироваться', () => {
    expect(component).toBeTruthy();
  });
});
