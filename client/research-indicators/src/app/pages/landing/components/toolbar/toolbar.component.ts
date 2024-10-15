import { Component, inject } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { CognitoService } from '../../../../shared/services/cognito.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss'
})
export class ToolbarComponent {
  redirectToCognito = inject(CognitoService).redirectToCognito;
}
