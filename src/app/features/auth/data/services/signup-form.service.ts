import { Injectable, signal } from '@angular/core';
import type { SignUpData } from '../models/signup-form.model';
import { form, validate } from '@angular/forms/signals';

@Injectable({
  providedIn: 'root',
})
export class SignupFormService {
  public readonly signupModel = signal<SignUpData>({
    userName: '',
    email: '',
    password: '',
    repeatPassword: '',
  });

  public readonly signupForm = form(this.signupModel, (schemaPath) => {
    // 1. Валидация Имени пользователя
    validate(schemaPath.userName, (context) => {
      // Чтобы прочитать состояние touched поля внутри конфигуратора,
      // мы обращаемся к уже готовому внешнему стейту формы (ЗДЕСЬ скобки нужны!)
      if (!this.signupForm.userName().touched()) {
        return null;
      }

      const value = context.value();

      return !value || value.trim() === ''
        ? { kind: 'required', message: 'Username is required' }
        : null;
    });

    // 2. Валидация Email
    validate(schemaPath.email, (context) => {
      if (!this.signupForm.email().touched()) {
        return null;
      }

      const value = context.value();

      return !value || value.trim() === ''
        ? { kind: 'required', message: 'Email is required' }
        : null;
    });

    // 3. Валидация Пароля
    validate(schemaPath.password, (context) => {
      if (!this.signupForm.password().touched()) {
        return null;
      }

      const value = context.value();

      return !value || value.trim() === ''
        ? { kind: 'required', message: 'Password is required' }
        : null;
    });

    // 4. Валидация Повтора пароля + проверка совпадения
    validate(schemaPath.repeatPassword, (context) => {
      if (!this.signupForm.repeatPassword().touched()) {
        return null;
      }

      const repeatPass = context.value();

      if (!repeatPass || repeatPass.trim() === '') {
        return { kind: 'required', message: 'Repeat password is required' };
      }

      // Безопасно извлекаем значение из соседнего поля password без вызова скобок у пути
      const pass = context.valueOf(schemaPath.password);

      if (pass !== repeatPass) {
        return { kind: 'mismatch', message: 'Passwords do not match' };
      }

      return null;
    });
  });

  public handleForSubmit(event: Event): void {
    event.preventDefault();

    const data = this.signupModel();

    localStorage.setItem('loginFormDataSignal', JSON.stringify(data));
  }
}
