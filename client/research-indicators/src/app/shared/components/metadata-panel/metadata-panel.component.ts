import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { WebsocketService } from '../../sockets/websocket.service';

@Component({
    selector: 'app-metadata-panel',
    imports: [DialogModule],
    templateUrl: './metadata-panel.component.html',
    styleUrl: './metadata-panel.component.scss'
})
export class MetadataPanelComponent {
  // Defensive: Socket (ngx-socket-io) has no provider registered app-wide, so
  // WebsocketService can't be constructed — a raw inject() here crashed the
  // @defer render. Shape check included: prod-mode DI returns the poisoned
  // `{}` sentinel (instead of throwing) on re-inject after a failed factory.
  websocket: WebsocketService | null = (() => {
    try {
      const service = inject(WebsocketService);
      return typeof service?.listen === 'function' ? service : null;
    } catch {
      return null;
    }
  })();
  showModal = true;
}
