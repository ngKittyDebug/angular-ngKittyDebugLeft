import { Directive, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

@Directive({
  selector: '[leftPawResponsiveRender]',
})
export class ResponsiveRenderDirective {
  private breakpointObserver = inject(BreakpointObserver);
  private viewContainerRef = inject(ViewContainerRef);
  private templateRef = inject(TemplateRef<unknown>);

  public readonly breakpointName = input.required<string>({
    alias: 'leftPawResponsiveRender',
  });

  constructor() {
    toObservable(this.breakpointName)
      .pipe(
        switchMap((bp) => this.breakpointObserver.observe(bp)),
        map((r) => r.matches),
        takeUntilDestroyed(),
      )
      .subscribe((matches) => {
        if (matches) {
          this.viewContainerRef.clear();
          this.viewContainerRef.createEmbeddedView(this.templateRef);
        } else {
          this.viewContainerRef.clear();
        }
      });
  }
}
