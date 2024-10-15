import { Component, effect, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DynamicToastService } from '../../services/dynamic-toast.service';

@Component({
  selector: 'organism-dynamic-toast',
  standalone: true,
  imports: [ToastModule],
  templateUrl: './dynamic-toast.component.html',
  styleUrl: './dynamic-toast.component.scss',
  providers: [MessageService]
})
export class DynamicToastComponent {
  messageService = inject(MessageService);
  dynamicToast = inject(DynamicToastService);

  constructor() {
    effect(() => {
      const { severity, ...message } = this.dynamicToast.toastMessage();
      if (severity) {
        this.messageService.add({ severity, ...message });
      }
    });
  }
}
