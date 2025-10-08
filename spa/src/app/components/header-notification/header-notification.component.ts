import { Component, inject, OnInit } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header-notification',
  templateUrl: './header-notification.component.html',
  styleUrls: ['./header-notification.component.css'],
  imports: [
    AsyncPipe,
    DatePipe,
    RouterLink,
  ]
})
export class HeaderNotificationComponent implements OnInit {
  private notificationService = inject(NotificationService)
  notifications$ = this.notificationService.notifications$;
  pendingCount$ = this.notificationService.getPendingCount();
  showDropdown = false;

  constructor() {}

  ngOnInit(): void {
    this.notificationService.loadNotifications();
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

}
