import { inject, Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core';
import { SweetAlertIcon, SweetAlertResult } from 'sweetalert2'

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private translate = inject(TranslateService);

  private async getSwal(): Promise<typeof Swal> {
    const { default: Swal } = await import('sweetalert2');
    return Swal;
  }

  public showQuestionModal = async (
    title: string,
    text: string = '',
    icon: SweetAlertIcon = 'warning',
    interpolateParams?: object | undefined,
    isHtml = false,
  ): Promise<SweetAlertResult<any>> => {
    const swal = await this.getSwal();
    const result = await swal.fire({
      title,
      text: !!text
        ? text //this.translateService.instant(text, interpolateParams)
        : text,
      icon: icon,
      showCancelButton: true,
      confirmButtonText: this.translate.instant('inputs.yes'),
      cancelButtonText: this.translate.instant('inputs.no'),
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        cancelButton: 'btn btn-outline btn-primary mx-1',
        confirmButton: 'btn btn-outline btn-primary',
        icon: icon == 'question' ? 'swal2-icon-question-custom': undefined,
      },
      buttonsStyling: false,
      html:
        isHtml && text
          ? text//todo use in translate: this.translateService.instant(text, interpolateParams)
          : undefined,
    })
    return result
  }

  public showSuccess = (title: string = 'Successful operation'): void => {
    const translateTitle = this.translate.instant(title);
    this.getSwal().then(x => x.mixin({
      title: translateTitle,
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      icon: 'success',
      didOpen: (toast: any) => {
        toast.addEventListener('mouseenter', x.stopTimer)
        toast.addEventListener('mouseleave', x.resumeTimer)
      }
    }).fire())
  }

  public showError = (text: string = ''): void => {
    const translateTitle = this.translate.instant('Unsuccessful operation');
    this.getSwal().then(x => x.fire({
      title: translateTitle,
      text,
      icon: 'error',
      confirmButtonText: 'Ok',
      customClass: {
        confirmButton: 'btn btn-outline btn-primary',
      },
      buttonsStyling: false,
    }))
  }

  public showInfo = (text: string = ''): void => {
    this.getSwal().then(x => x.fire({
      title: 'Information',
      text,
      icon: 'info',
      confirmButtonText: 'Ok',
      customClass: {
        confirmButton: 'btn btn-outline btn-primary',
      },
      buttonsStyling: false
    }))
  }
}
