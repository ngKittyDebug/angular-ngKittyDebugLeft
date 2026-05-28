import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Breakpoints } from '@angular/cdk/layout';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';

@Directive({
  selector: '[leftPawWindowsSizeContent]',
})
export class WindowsSizeContentDirective {
  private breakpointObserver = inject(BreakpointObserver);
  private viewContainerRef = inject(ViewContainerRef);
  private templateRef = inject(TemplateRef<unknown>);

  public readonly breakpointName = input.required<keyof typeof Breakpoints>({
    alias: 'leftPawWindowsSizeContent',
  });

  readonly #breakpointState = toSignal(
    this.breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium,
      Breakpoints.Large,
      Breakpoints.XLarge,

      Breakpoints.Handset,
      Breakpoints.Tablet,
      Breakpoints.Web,

      Breakpoints.HandsetPortrait,
      Breakpoints.TabletPortrait,
      Breakpoints.WebPortrait,

      Breakpoints.HandsetLandscape,
      Breakpoints.TabletLandscape,
      Breakpoints.WebLandscape,
    ]),
  );

  constructor() {
    effect(() => {
      const name = this.breakpointName();

      if (this.#breakpointState() && this.breakpointObserver.isMatched(Breakpoints[name])) {
        this.viewContainerRef.clear();

        this.viewContainerRef.createEmbeddedView(this.templateRef);
      } else {
        this.viewContainerRef.clear();
      }
    });
  }
}
