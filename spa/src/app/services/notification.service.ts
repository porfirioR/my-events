import { inject, Injectable, signal, computed } from '@angular/core';
import { LoginNotificationsModel } from '../models/api';
import { CollaboratorMatchRequestApiService } from './api/collaborator-match-request-api.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private matchRequestApiService = inject(CollaboratorMatchRequestApiService);

  private readonly _notifications = signal<LoginNotificationsModel>({
    pendingMatchRequests: 0,
    matchRequests: []
  });

  public readonly notifications = this._notifications.asReadonly();
  public readonly pendingCount = computed(() => this._notifications().pendingMatchRequests);

  public loadNotifications(): void {
    this.matchRequestApiService.getLoginNotifications().subscribe({
      next: (notifications) => this._notifications.set(notifications),
    });
  }

  public clearNotifications(): void {
    this._notifications.set({ pendingMatchRequests: 0, matchRequests: [] });
  }

  public refreshNotifications(): void {
    this.loadNotifications();
  }
}
