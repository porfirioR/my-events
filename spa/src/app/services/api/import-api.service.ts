import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MyMoneyPreviewApiModel } from '../../models/api/imports/mymoney-preview-api.model';
import {
  MyMoneyCategoryMappingApiModel,
  MyMoneyCategorySyncApiModel,
  MyMoneyDescriptionRuleApiModel,
  UpdateMyMoneyCategoryMappingApiRequest,
  UpsertMyMoneyDescriptionRuleApiRequest,
} from '../../models/api/imports/mymoney-mapping-api.model';

@Injectable({ providedIn: 'root' })
export class ImportApiService {
  private readonly section = 'imports';

  constructor(private readonly httpClient: HttpClient) {}

  // Sube el export de MyMoney y devuelve el resumen; no guarda nada (#230)
  previewMyMoney = (file: File): Observable<MyMoneyPreviewApiModel> =>
    this.httpClient.post<MyMoneyPreviewApiModel>(`${this.section}/mymoney/preview`, this.toFormData(file));

  // ==================== MAPEO (#231) ====================

  getCategoryMappings = (): Observable<MyMoneyCategoryMappingApiModel[]> =>
    this.httpClient.get<MyMoneyCategoryMappingApiModel[]>(`${this.section}/mymoney/category-mappings`);

  // Agrega las categorías nuevas del export y actualiza los nombres
  syncCategoryMappings = (file: File): Observable<MyMoneyCategorySyncApiModel> =>
    this.httpClient.post<MyMoneyCategorySyncApiModel>(`${this.section}/mymoney/category-mappings/sync`, this.toFormData(file));

  updateCategoryMapping = (id: number, request: UpdateMyMoneyCategoryMappingApiRequest): Observable<MyMoneyCategoryMappingApiModel> =>
    this.httpClient.put<MyMoneyCategoryMappingApiModel>(`${this.section}/mymoney/category-mappings/${id}`, request);

  getDescriptionRules = (): Observable<MyMoneyDescriptionRuleApiModel[]> =>
    this.httpClient.get<MyMoneyDescriptionRuleApiModel[]>(`${this.section}/mymoney/description-rules`);

  createDescriptionRule = (request: UpsertMyMoneyDescriptionRuleApiRequest): Observable<MyMoneyDescriptionRuleApiModel> =>
    this.httpClient.post<MyMoneyDescriptionRuleApiModel>(`${this.section}/mymoney/description-rules`, request);

  updateDescriptionRule = (id: number, request: UpsertMyMoneyDescriptionRuleApiRequest): Observable<MyMoneyDescriptionRuleApiModel> =>
    this.httpClient.put<MyMoneyDescriptionRuleApiModel>(`${this.section}/mymoney/description-rules/${id}`, request);

  deleteDescriptionRule = (id: number): Observable<unknown> =>
    this.httpClient.delete(`${this.section}/mymoney/description-rules/${id}`);

  private toFormData(file: File): FormData {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return formData;
  }
}
