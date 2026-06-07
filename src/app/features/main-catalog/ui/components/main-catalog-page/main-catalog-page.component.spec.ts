import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MainCatalogPageComponent } from './main-catalog-page.component';
import { MainCatalogFacade } from '@features/main-catalog/data/facades/main-catalog.facade';
import { mainCatalogFacadeMock } from '@features/main-catalog/data/facades/main-catalog.facade.mock';

describe('MainCatalogPageComponent', () => {
  let component: MainCatalogPageComponent;
  let fixture: ComponentFixture<MainCatalogPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainCatalogPageComponent],
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
