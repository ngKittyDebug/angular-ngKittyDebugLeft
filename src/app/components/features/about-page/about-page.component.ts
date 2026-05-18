import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { TuiAccordion } from '@taiga-ui/kit';

@Component({
  selector: 'left-paw-about-page',
  imports: [KeyValuePipe, TuiAccordion],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  protected readonly AccordionData = {
    Технологии: `
В качестве основного framework использовался Angular v21 со standalone architecture и современным подходом к построению приложения. 
Для управления состоянием применялся NgRx (@ngrx/store), что позволило централизованно хранить данные и упростить работу с состоянием приложения. 
Пользовательский интерфейс был реализован с использованием Taiga UI v5, что ускорило разработку и обеспечило единый дизайн компонентов. 
Основным языком разработки стал TypeScript ~5.9 с использованием строгой типизации. 
Для реактивного подхода к обработке данных и событий использовался RxJS.
`,

    Тестирование: `
Для тестирования использовался Vitest. 
Он применялся для проверки логики компонентов, сервисов и отдельных utility-функций.
`,

    'Code Quality': `
Для поддержки качества кода использовались ESLint, Prettier и Stylelint. 
ESLint помогал находить потенциальные ошибки и поддерживать единый стиль TypeScript-кода, 
Prettier отвечал за автоматическое форматирование проекта, 
а Stylelint использовался для проверки SCSS/CSS стилей.
`,

    'Git-процесс': `
В проекте использовались Husky, commitlint и lint-staged для автоматизации Git workflow. 
Husky запускал git hooks перед commit, commitlint проверял соответствие Conventional Commits, 
а lint-staged позволял запускать проверки только для изменённых файлов.
`,

    Правила: `
В команде использовался стандарт Conventional Commits для единообразного оформления истории коммитов. 
Также была настроена валидация названий веток и автоматические проверки перед commit, 
что помогало поддерживать стабильность и качество проекта.
`,
  };
}
