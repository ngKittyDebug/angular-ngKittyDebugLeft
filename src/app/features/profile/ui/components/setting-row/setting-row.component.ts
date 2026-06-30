import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-setting-row',
  imports: [ReactiveFormsModule, TranslocoDirective, TuiButton],
  templateUrl: './setting-row.component.html',
  styleUrl: './setting-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingRowComponent {
  public readonly label = input.required<string>();
  public readonly displayValue = input('');
  public readonly control = input.required<FormControl<string>>();
  public readonly inputType = input('text');

  public readonly save = output<void>();

  protected readonly editing = signal(false);

  protected startEdit(): void {
    this.editing.set(true);
  }

  protected onSave(): void {
    if (this.control().invalid) {
      this.control().markAsTouched();

      return;
    }

    this.save.emit();
    this.editing.set(false);
  }

  protected onCancel(): void {
    this.editing.set(false);
  }
}
