import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit, Self } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { CommonModule } from '@angular/common'
import { ControlValueAccessor, NgControl } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  selector: 'app-form-errors',
  imports: [CommonModule, TranslateModule],
  templateUrl: './form-errors.component.html',
  styleUrl: './form-errors.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormErrorsComponent implements ControlValueAccessor, OnInit {
  @Input() label: string = ''

  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly destroyRef = inject(DestroyRef)

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this
  }

  ngOnInit(): void {
    // Es OnPush y el control siempre es el mismo objeto: sin esto el mensaje
    // no se actualiza cuando cambian el valor, el estado o el touched del control
    this.ngControl.control?.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.changeDetectorRef.markForCheck())
  }

  writeValue(obj: any): void { }

  registerOnChange(fn: any): void { }

  registerOnTouched(fn: any): void { }

  setDisabledState?(isDisabled: boolean): void { }
}
