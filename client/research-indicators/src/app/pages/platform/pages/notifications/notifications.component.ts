import { Component } from '@angular/core';
import { NotificationItemComponent } from '@shared/components/notification-item/notification-item.component';
import { TabViewModule } from 'primeng/tabview';

@Component({
    selector: 'app-notifications',
    imports: [TabViewModule, NotificationItemComponent],
    templateUrl: './notifications.component.html',
    styleUrl: './notifications.component.scss'
})
export default class NotificationsComponent {
  selectedFilter = 'unread';

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
  }
}
