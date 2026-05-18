import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TuiRootComponentMock } from '@shared/mocks/tui-root.component.mock/tui-root.component.mock';
import { TuiRoot } from '@taiga-ui/core';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    TestBed.overrideComponent(AppComponent, {
      add: {
        imports: [TuiRootComponentMock],
      },
      remove: {
        imports: [TuiRoot],
      },
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('должен инициализироваться', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
