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
  private originalValue = '';

  public readonly label = input.required<string>();
  public readonly displayValue = input('');
  public readonly control = input.required<FormControl<string>>();
  public readonly inputType = input('text');
  public readonly passwordControl = input<FormControl<string> | null>(null);
  public readonly passwordPlaceholder = input('');

  public readonly save = output<void>();

  protected readonly editing = signal(false);

  protected startEdit(): void {
    this.originalValue = this.control().value;
    this.editing.set(true);
  }

  protected onSave(): void {
    this.control().markAsTouched();
    this.passwordControl()?.markAsTouched();

    if (this.control().invalid || this.passwordControl()?.invalid) {
      return;
    }

    this.save.emit();
    this.editing.set(false);
  }

  protected onCancel(): void {
    this.control().setValue(this.originalValue, { emitEvent: false });
    this.control().markAsUntouched();
    this.passwordControl()?.setValue('', { emitEvent: false });
    this.passwordControl()?.markAsUntouched();
    this.editing.set(false);
  }
}
