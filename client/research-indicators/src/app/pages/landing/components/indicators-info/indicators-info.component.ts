import { Component, inject } from '@angular/core';
import { LandingTextsService } from '../../services/landing-texts.service';

@Component({
  selector: 'app-indicators-info',
  standalone: true,
  imports: [],
  templateUrl: './indicators-info.component.html',
  styleUrl: './indicators-info.component.scss'
})
export class IndicatorsInfoComponent {
  cardList = inject(LandingTextsService).cardList;
}
