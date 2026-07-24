import { Component, Input } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-notification-item',
    imports: [AvatarModule, BadgeModule, ButtonModule],
    templateUrl: './notification-item.component.html',
    styleUrl: './notification-item.component.scss'
})
export class NotificationItemComponent {
  @Input() type: 'update' | 'request' = 'update';

  notifications = [
    {
      type: 'update',
      name: 'Adam Ziegler ',
      verb: 'has ',
      actionText: 'submitted ',
      result: '9821 - Sustainable Agriculture Innovation Hub (SAIH)',
      info: 'with new information.',
      time: '1 hour',
      initials: 'AZ',
      avatarColor: '#4285F4'
    },
    {
      type: 'update',
      name: 'Karen Collins ',
      verb: 'has ',
      actionText: 'updated ',
      result: '7425 - Water Resource Management Initiative (WRMI)',
      info: '',
      time: '3 hours',
      initials: 'KC',
      avatarColor: '#FB8C00'
    },
    {
      type: 'request',
      name: 'Emily Stevens ',
      result: 'from INIT-15 has requested to include INIT-09 as a contributor to result 2140 - Water-Smart Agriculture in Arid Regions, recently featured in the Global Sustainable Solutions Summit 2024.',
      time: '2 hour',
      initials: 'ES',
      avatarColor: '#4285F4'
    }
  ];

  get filterNotifications() {
    return this.notifications.filter(notification => notification.type === this.type);
  }
}
