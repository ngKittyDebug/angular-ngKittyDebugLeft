import { computed, Injectable, signal } from '@angular/core';
import type { SignUpData } from '../models/signup-form.model';
import { form, submit, validate } from '@angular/forms/signals';

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

  public readonly isSubmitDisabled = computed(() => {
    return (
      this.signupForm().invalid() ||
      Object.values(this.signupModel()).some((value) => !value.trim())
    );
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
        ? { kind: 'required', message: 'auth.signupErrorMessages.usernameRequired' }
        : null;
    });

    // 2. Валидация Email
    validate(schemaPath.email, (context) => {
      if (!this.signupForm.email().touched()) {
        return null;
      }

      const value = context.value();

      return !value || value.trim() === ''
        ? { kind: 'required', message: 'auth.signupErrorMessages.emailRequired' }
        : null;
    });

    // 3. Валидация Пароля
    validate(schemaPath.password, (context) => {
      if (!this.signupForm.password().touched()) {
        return null;
      }

      const value = context.value();

      return !value || value.trim() === ''
        ? { kind: 'required', message: 'auth.signupErrorMessages.passwordRequired' }
        : null;
    });

    // 4. Валидация Повтора пароля + проверка совпадения
    validate(schemaPath.repeatPassword, (context) => {
      if (!this.signupForm.repeatPassword().touched()) {
        return null;
      }

      const repeatPass = context.value();

      if (!repeatPass || repeatPass.trim() === '') {
        return { kind: 'required', message: 'auth.signupErrorMessages.repeatPasswordRequired' };
      }

      // Безопасно извлекаем значение из соседнего поля password без вызова скобок у пути
      const pass = context.valueOf(schemaPath.password);

      if (pass !== repeatPass) {
        return { kind: 'mismatch', message: 'auth.signupErrorMessages.matchPassword' };
      }

      return null;
    });
  });

  public handleForSubmit(event: Event): void {
    event.preventDefault();

    // Функция submit автоматически подсветит пустые поля ошибками, если форма невалидна
    submit(this.signupForm, async () => {
      const data = this.signupModel();

      localStorage.setItem('loginFormDataSignal', JSON.stringify(data));
      alert('Регистрация прошла успешно!');

      return null; // Успешное завершение отправки для Signal Forms
    });
  }
}
