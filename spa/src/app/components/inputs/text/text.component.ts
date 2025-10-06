import { CommonModule } from '@angular/common'
import { Component, Input, Self } from '@angular/core'
import { ControlValueAccessor, NgControl, ReactiveFormsModule } from '@angular/forms'
import { FormErrorsComponent } from '../../form-errors/form-errors.component'
import { InputType } from '../../../constants/input-type'
import { AutocompleteType } from '../../../constants/autocomplete-type'

@Component({
  selector: 'app-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormErrorsComponent,
  ]
})
export class TextComponent implements ControlValueAccessor {
  @Input({required: true}) label: string = ''
  @Input() placeholder?: string = ''
  @Input() description?: string = ''
  @Input({required: true}) type: InputType = 'text'
  @Input({required: true}) id: string = ''
  @Input({required: true}) name: string = ''
  @Input() autocomplete: AutocompleteType = 'off'
  @Input() disabled: boolean = true

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this
  }

  writeValue(obj: any): void { }

  registerOnChange(fn: any): void { }

  registerOnTouched(fn: any): void { }

  setDisabledState?(isDisabled: boolean): void { }

}
