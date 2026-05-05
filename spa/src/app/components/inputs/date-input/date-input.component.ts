import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input, Self } from '@angular/core'
import { ControlValueAccessor, NgControl, ReactiveFormsModule } from '@angular/forms'
import { FormErrorsComponent } from '../../form-errors/form-errors.component'

@Component({
  selector: 'app-date-input',
  templateUrl: './date-input.component.html',
  styleUrls: ['./date-input.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormErrorsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateInputComponent implements ControlValueAccessor {
  @Input({required: true}) label: string = ''
  @Input({required: true}) id: string = ''
  @Input({required: true}) name: string = ''

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this
  }

  writeValue(obj: any): void { }
  registerOnChange(fn: any): void { }
  registerOnTouched(fn: any): void { }
  setDisabledState?(isDisabled: boolean): void { }

}
