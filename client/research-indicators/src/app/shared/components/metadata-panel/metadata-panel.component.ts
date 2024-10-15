import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { WebsocketService } from '../../sockets/websocket.service';

@Component({
  selector: 'app-metadata-panel',
  standalone: true,
  imports: [DialogModule],
  templateUrl: './metadata-panel.component.html',
  styleUrl: './metadata-panel.component.scss'
})
export class MetadataPanelComponent {
  websocket = inject(WebsocketService);
  showModal = true;
}
