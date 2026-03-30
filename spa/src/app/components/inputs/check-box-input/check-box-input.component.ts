import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input, Self } from '@angular/core'
import { ControlValueAccessor, NgControl, ReactiveFormsModule } from '@angular/forms'

@Component({
  selector: 'app-check-box-input',
  templateUrl: './check-box-input.component.html',
  styleUrls: ['./check-box-input.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckBoxInputComponent implements ControlValueAccessor {
  @Input({required: true}) label: string = ''

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this
  }

  writeValue(obj: any): void { }
  registerOnChange(fn: any): void { }
  registerOnTouched(fn: any): void { }
  setDisabledState?(isDisabled: boolean): void { }

}
