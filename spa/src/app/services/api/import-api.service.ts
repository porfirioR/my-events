import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MyMoneyPreviewApiModel } from '../../models/api/imports/mymoney-preview-api.model';

@Injectable({ providedIn: 'root' })
export class ImportApiService {
  private readonly section = 'imports';

  constructor(private readonly httpClient: HttpClient) {}

  // Sube el export de MyMoney y devuelve el resumen; no guarda nada (#230)
  previewMyMoney = (file: File): Observable<MyMoneyPreviewApiModel> => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.httpClient.post<MyMoneyPreviewApiModel>(`${this.section}/mymoney/preview`, formData);
  };
}
