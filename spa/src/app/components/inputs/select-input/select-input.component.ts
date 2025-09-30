import { CommonModule } from '@angular/common'
import { Component, Input, Self } from '@angular/core'
import { ControlValueAccessor, NgControl, ReactiveFormsModule } from '@angular/forms'
import { FormErrorsComponent } from '../../form-errors/form-errors.component'
import { KeyValueViewModel } from '../../../models/view/key-value-view-model'

@Component({
  selector: 'app-select-input',
  templateUrl: './select-input.component.html',
  styleUrls: ['./select-input.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormErrorsComponent,
  ]
})
export class SelectInputComponent implements ControlValueAccessor {
  @Input({required: true}) id: string = ''
  @Input({required: true}) label: string = ''
  @Input({required: true}) name: string = ''
  @Input() description?: string | null
  @Input({required: true}) list: KeyValueViewModel[] | undefined = []

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this
  }

  writeValue(obj: any): void { }

  registerOnChange(fn: any): void { }

  registerOnTouched(fn: any): void { }

  setDisabledState?(isDisabled: boolean): void { }

}
