import { Directive, input, signal } from '@angular/core';

@Directive({
  selector: '[leftPawHideContent]',
  host: {
    '(window:scroll)': 'scrollLogic()',
    '[class.hide]': 'isCurrentClassHide()',
  },
})
export class HideContentDirective {
  private previousScrollTop = 0;
  public readonly isHideWithScrollDown = input.required<boolean>();
  public readonly isCurrentClassHide = signal(false);

  protected scrollLogic() {
    const scrollTop = window.scrollY;

    this.isCurrentClassHide.set(scrollTop > this.previousScrollTop === this.isHideWithScrollDown());
    this.previousScrollTop = scrollTop;
  }
}
