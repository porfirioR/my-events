import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { Observable, of } from 'rxjs'
import { SavingApiService } from '../services'
import { SavingApiModel } from '../models/api'

export const savingResolver: ResolveFn<Observable<SavingApiModel> | Observable<null>> = (route, state) => {
  const apiService = inject(SavingApiService)
  const id = route.params['id']
  return id ? apiService.getMySaving(id) : of(null)
}