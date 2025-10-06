import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginNotificationsModel } from '../models/api';
import { CollaboratorMatchRequestApiService } from './api/collaborator-match-request-api.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private matchRequestApiService = inject(CollaboratorMatchRequestApiService)
  private notificationsSubject = new BehaviorSubject<LoginNotificationsModel>({
    pendingMatchRequests: 0,
    matchRequests: []
  });
  public notifications$: Observable<LoginNotificationsModel> = this.notificationsSubject.asObservable();

  constructor() {}

  // Cargar notificaciones (llamar al hacer login o al iniciar la app)
  public loadNotifications(): void {
    this.matchRequestApiService.getLoginNotifications().subscribe({
      next: (notifications) => {
        this.notificationsSubject.next(notifications);
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
      }
    });
  }

  // Obtener el contador de notificaciones pendientes
  public getPendingCount(): Observable<number> {
    return new Observable(observer => {
      this.notifications$.subscribe(notifications => {
        observer.next(notifications.pendingMatchRequests);
      });
    });
  }

  // Limpiar notificaciones
  public clearNotifications(): void {
    this.notificationsSubject.next({
      pendingMatchRequests: 0,
      matchRequests: []
    });
  }

  // Refrescar notificaciones (útil después de aceptar una invitación)
  public refreshNotifications(): void {
    this.loadNotifications();
  }
}