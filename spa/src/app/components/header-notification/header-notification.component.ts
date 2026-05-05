import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-header-notification',
  templateUrl: './header-notification.component.html',
  styleUrls: ['./header-notification.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, TranslateModule],
})
export class HeaderNotificationComponent implements OnInit {
  private notificationService = inject(NotificationService);

  protected readonly notifications = this.notificationService.notifications;
  protected readonly pendingCount = this.notificationService.pendingCount;
  protected showDropdown = false;

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
