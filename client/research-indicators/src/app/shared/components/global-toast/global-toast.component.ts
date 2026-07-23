import { Component, effect, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ActionsService } from '../../services/actions.service';

@Component({
  selector: 'app-global-toast',
  imports: [ToastModule],
  templateUrl: './global-toast.component.html',
  providers: [MessageService]
})
export class GlobalToastComponent {
  actions = inject(ActionsService);
  constructor(private readonly messageService: MessageService) {}
  show = effect(() => this.actions.toastMessage().summary && this.messageService.add(this.actions.toastMessage()));
}
