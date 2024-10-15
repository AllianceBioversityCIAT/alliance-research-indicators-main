import { Component, inject } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { LandingTextsService } from '../../services/landing-texts.service';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [AccordionModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {
  faqList = inject(LandingTextsService).faqList;
}
