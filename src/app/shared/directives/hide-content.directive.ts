import { afterNextRender, Directive, ElementRef, inject, type OnDestroy } from '@angular/core';

@Directive({
  selector: '[leftPawHideContent]',
})
export class HideContentDirective implements OnDestroy {
  private previousScrollTop = 0;
  private navItem = inject(ElementRef<HTMLElement>);
  protected navHeight = '';

  constructor() {
    afterNextRender(() => {
      this.navHeight = window.getComputedStyle(this.navItem.nativeElement).height;
    });
    document.addEventListener('scroll', this.scrollLogic);
  }

  public ngOnDestroy() {
    document.removeEventListener('scroll', this.scrollLogic);
  }

  private scrollLogic = () => {
    const scrollTop = window.scrollY;

    if (scrollTop > this.previousScrollTop) {
      this.navItem.nativeElement.style.height = '0';
    } else {
      this.navItem.nativeElement.style.height = this.navHeight;
    }

    this.previousScrollTop = scrollTop;
  };
}
