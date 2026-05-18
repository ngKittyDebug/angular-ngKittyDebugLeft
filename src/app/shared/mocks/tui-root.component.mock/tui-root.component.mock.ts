import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tui-root',
  imports: [],
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TuiRootComponentMock {}
