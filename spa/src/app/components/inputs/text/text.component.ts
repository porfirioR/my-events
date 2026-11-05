import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input, Self } from '@angular/core'
import { ControlValueAccessor, NgControl, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'
import { FormErrorsComponent } from '../../form-errors/form-errors.component'
import { InputType } from '../../../constants/input-type'
import { AutocompleteType } from '../../../constants/autocomplete-type'
import { NumberFormatDirective } from '../../../directives/number-format.directive'

@Component({
  selector: 'app-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormErrorsComponent,
    NumberFormatDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextComponent implements ControlValueAccessor {
  @Input({required: true}) label: string = ''
  @Input() placeholder?: string = ''
  @Input() description?: string = ''
  @Input({required: true}) type: InputType = 'text'
  @Input({required: true}) id: string = ''
  @Input({required: true}) name: string = ''
  @Input() autocomplete: AutocompleteType = 'off'
  @Input() disabled: boolean = false
  // Solo para type='number': false para cantidades enteras (cuotas, porcentajes enteros)
  @Input() allowDecimals: boolean = true
  // Texto fijo a la derecha del input (ej. '%')
  @Input() suffix?: string
  protected passwordFieldType: 'password' | 'text' = 'password';
  protected readonly inputClasses = `px-3 py-2 shadow-sm border
    placeholder-slate-300
    disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-200
    dark:disabled:bg-base-200 dark:disabled:text-base-content/40 dark:disabled:border-base-300
    focus:outline-none block w-full rounded-md sm:text-sm
    disabled:shadow-none
    transition-all duration-200`

  protected get stateClasses(): Record<string, boolean> {
    const showError = !!(this.ngControl.control?.invalid && this.ngControl.control?.touched)
    return {
      'pr-10': this.type === 'password' || !!this.suffix,
      'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-600 dark:border-red-400 dark:text-red-400 dark:focus:border-red-400 dark:focus:ring-red-400/20': showError,
      'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-400 dark:border-gray-600 dark:hover:border-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20': !showError,
    }
  }

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this
  }

  writeValue(obj: any): void { }

  registerOnChange(fn: any): void { }

  registerOnTouched(fn: any): void { }

  setDisabledState?(isDisabled: boolean): void { }

  protected togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }
}
