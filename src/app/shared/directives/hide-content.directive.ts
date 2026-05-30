import { Directive, ElementRef, inject, input } from '@angular/core';

@Directive({
  selector: '[leftPawHideContent]',
  host: {
    '(window:scroll)': 'scrollLogic()',
  },
})
export class HideContentDirective {
  private previousScrollTop = 0;
  private navItem = inject(ElementRef<HTMLElement>);
  public readonly hideClass = input.required<string>();

  protected scrollLogic() {
    const scrollTop = window.scrollY;

    if (scrollTop > this.previousScrollTop) {
      this.navItem.nativeElement.classList.add(this.hideClass());
    } else {
      this.navItem.nativeElement.classList.remove(this.hideClass());
    }
    this.previousScrollTop = scrollTop;
  }
}
