# 🐾 PokeDex (ngKittyDebugLeftPaw)

## 📖 Описание проекта

<!-- TODO: Заполнить описание проекта -->

[Здесь будет подробное описание проекта PokeDex, его целей и основного функционала]

---

## 👥 Деплой проекта

[![Netlify Status](https://api.netlify.com/api/v1/badges/2776e1f4-4a75-4121-8dd9-6a63800e367b/deploy-status)](https://ngkittydebugleftpaw.netlify.app)

---

## 👥 Команда

Наша команда состоит из трех человек:

1. **[AlexGorSer](https://github.com/AlexGorSer)** — ~~Мимо-крокодил~~ Backend developer / Team Lead
2. **[pavelkuvsh1noff](https://github.com/pavelkuvsh1noff)** — Frontend developer
3. **[Oksi2510](https://github.com/Oksi2510)** — Design/ Frontend developer

---

## 🛠 Технологический стек

Проект использует современные технологии и инструменты для обеспечения высокой производительности и качества кода:

- **Фреймворк:** Angular (v21)
- **Стейт-менеджмент:** NgRx (@ngrx/store)
- **UI Библиотека:** Taiga UI (v5)
- **Язык программирования:** TypeScript (~5.9)
- **Тестирование:** Vitest
- **Реактивность:** RxJS
- **Линтеры и форматеры:** ESLint, Prettier, Stylelint
- **Git Hooks:** Husky, commitlint, lint-staged (используются строгие правила Conventional Commits и валидация имен веток)

---

## 📋 Требования к окружению

Для успешного запуска проекта локально, убедитесь, что у вас установлены:

- **Node.js:** v24.14.0 (указано в `.nvmrc`)
- **Менеджер пакетов:** pnpm v10.30.0

---

## 🚀 Как запустить проект

1. **Клонируйте репозиторий:**

   ```bash
   git clone https://github.com/ngKittyDebug/angular-ngKittyDebugLeft
   cd angular-ngKittyDebugLeft
   ```

2. **Установите зависимости:**
   Используйте `pnpm` для установки всех необходимых пакетов:

   ```bash
   pnpm install --frozen-lockfile
   ```

3. **Запустите сервер для разработки:**
   ```bash
   pnpm start
   ```
   После этого приложение будет доступно в браузере по адресу `http://localhost:4200/`. Приложение будет автоматически перезагружаться при изменении исходных файлов кода.

---

## 📜 Основные команды (Скрипты)

В проекте настроены следующие полезные команды. Вы можете запускать их через `pnpm <команда>`:

| Команда           | Описание                                                                           |
| :---------------- | :--------------------------------------------------------------------------------- |
| `pnpm start`      | Запускает локальный dev-сервер (`ng serve`).                                       |
| `pnpm build`      | Собирает проект для production.                                                    |
| `pnpm watch`      | Запускает сборку в режиме отслеживания изменений (development).                    |
| `pnpm test`       | Запускает unit-тесты (через Vitest).                                               |
| `pnpm test:cov`   | Запускает тесты с генерацией отчета о покрытии кода (coverage).                    |
| `pnpm lint`       | Запускает проверку кода с помощью линтеров.                                        |
| `pnpm lint:fix`   | Автоматически исправляет ошибки, найденные ESLint.                                 |
| `pnpm format`     | Проверяет форматирование всех файлов с помощью Prettier.                           |
| `pnpm format:fix` | Автоматически форматирует код во всех файлах с помощью Prettier.                   |
| `pnpm typecheck`  | Выполняет строгую проверку типов TypeScript (`tsc -b --noEmit`).                   |
| `pnpm ci`         | Команда для установки зависимостей в CI/CD среде (использует `--frozen-lockfile`). |
