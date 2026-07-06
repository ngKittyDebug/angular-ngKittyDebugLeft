import { TestBed } from '@angular/core/testing';
import { LoginFormService } from './login-form.service';

describe('LoginFormService', () => {
  let service: LoginFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LoginFormService] });
    service = TestBed.inject(LoginFormService);
  });

  it('сервис должен инициализироваться', () => {
    expect(service).toBeTruthy();
  });

  describe('Валидация username, email, password форм', () => {
    it('должна быть невалидной когда поля пустые', () => {
      expect(service.loginForm.valid).toBe(false);
    });

    it('должна принять корректный username', () => {
      service.loginForm.setValue({
        nameOrEmail: 'Alex',
        password: 'StrongPass1!',
      });

      expect(service.loginForm.controls.nameOrEmail.valid).toBe(true);
    });

    it('должна принять корректный email', () => {
      service.loginForm.setValue({
        nameOrEmail: 'alex@gmail.com',
        password: 'StrongPass1!',
      });

      expect(service.loginForm.controls.nameOrEmail.valid).toBe(true);
    });

    it('должна быть ошибка при некорректном username', () => {
      service.loginForm.setValue({
        nameOrEmail: 'TeSt,1-*',
        password: 'StrongPass1!',
      });

      expect(service.loginForm.controls.nameOrEmail.valid).toBe(false);
    });

    it('должна быть ошибка при некорректном email', () => {
      service.loginForm.setValue({
        nameOrEmail: '123@1',
        password: 'StrongPass1!',
      });

      expect(service.loginForm.controls.nameOrEmail.valid).toBe(false);
    });

    it('должна быть ошибка при валидации password', () => {
      service.loginForm.setValue({
        nameOrEmail: 'NoPAss',
        password: 'no(',
      });

      expect(service.loginForm.controls.password.valid).toBe(false);
    });
  });
});
