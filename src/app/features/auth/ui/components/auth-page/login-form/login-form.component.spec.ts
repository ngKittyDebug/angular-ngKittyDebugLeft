import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { LoginFormComponent } from './login-form.component';
import { LoginFormService } from '@features/auth/data/services/login-form.service';
import { provideRouter } from '@angular/router';
import { TranslocoTestingMock } from '@shared/mocks/transloco.mock/transloco.mock';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginFormComponent, TranslocoTestingMock],
      providers: [
        LoginFormService,
        provideRouter([{ path: 'auth/login', component: LoginFormService }]),
      ],
    });

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  describe('Компонент должен инициализироваться', () => {
    it('должен инициализироваться', () => {
      expect(component).toBeTruthy();
    });
  });
});
