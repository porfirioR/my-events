import { CommonModule } from '@angular/common'
import { Component, Input, OnInit, Self } from '@angular/core'
import { ControlValueAccessor, NgControl, ReactiveFormsModule } from '@angular/forms'
import { FormErrorsComponent } from '../../form-errors/form-errors.component'

@Component({
  selector: 'app-text-area-input',
  templateUrl: './text-area-input.component.html',
  styleUrls: ['./text-area-input.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormErrorsComponent,
  ]
})
export class TextAreaInputComponent implements ControlValueAccessor {
  @Input({required: true}) label: string = ''
  @Input({required: true}) id: string = ''
  @Input({required: true}) name: string = ''
  @Input() placeholder: string = ''

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this
  }

  writeValue(obj: any): void { }

  registerOnChange(fn: any): void { }

  registerOnTouched(fn: any): void { }

  setDisabledState?(isDisabled: boolean): void { }

}
