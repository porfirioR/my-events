import { Component, Input, Self } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ControlValueAccessor, NgControl } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  selector: 'app-form-errors',
  imports: [CommonModule, TranslateModule],
  templateUrl: './form-errors.component.html',
  styleUrl: './form-errors.component.css'
})
export class FormErrorsComponent implements ControlValueAccessor {
  @Input() label: string = ''

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this
  }

  writeValue(obj: any): void { }

  registerOnChange(fn: any): void { }

  registerOnTouched(fn: any): void { }

  setDisabledState?(isDisabled: boolean): void { }
}