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
  protected readonly data = {
    'Основные технологии': `Framework: Angular v21
      State Management: NgRx (@ngrx/store)
      UI Library: Taiga UI v5
      Language: TypeScript ~5.9
      Reactive Programming: RxJS`,
    Тестирование: `Vitest`,
    'Code Quality': `ESLint
        Prettier
       Stylelint`,
    'Git Workflow & Automation': `Husky
commitlint
lint-staged`,
    'В проекте используются строгие правила': `Conventional Commits
валидация названий веток
автоматические проверки перед commit`,
  };
}
