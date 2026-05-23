import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MainCatalogPageComponent } from './main-catalog-page.component';

describe('MainCatalogPageComponent', () => {
  let component: MainCatalogPageComponent;
  let fixture: ComponentFixture<MainCatalogPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainCatalogPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MainCatalogPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
