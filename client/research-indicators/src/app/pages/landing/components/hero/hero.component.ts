import { Component, inject } from '@angular/core';
import { CognitoService } from '../../../../shared/services/cognito.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent {
  redirectToCognito = inject(CognitoService).redirectToCognito;
}
