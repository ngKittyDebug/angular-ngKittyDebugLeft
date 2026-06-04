import { Directive, input, signal } from '@angular/core';

@Directive({
  selector: '[leftPawHideContent]',
  host: {
    '(window:scroll)': 'scrollLogic()',
    '[class]': 'isCurrentClassHide() ? classDirective() : ""',
  },
})
export class HideContentDirective {
  private previousScrollTop = 0;
  public readonly isHideWithScrollDown = input<boolean>(true);
  public readonly isCurrentClassHide = signal(false);
  public readonly classDirective = input.required<string>();

  protected scrollLogic() {
    if (typeof window === 'undefined') {
      return;
    }
    const scrollTop = window.scrollY;

    this.isCurrentClassHide.set(scrollTop > this.previousScrollTop === this.isHideWithScrollDown());
    this.previousScrollTop = scrollTop;
  }
}
