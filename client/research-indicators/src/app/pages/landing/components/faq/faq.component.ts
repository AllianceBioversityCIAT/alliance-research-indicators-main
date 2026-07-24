import { Component, inject, signal } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { LandingTextsService } from '@pages/landing/services/landing-texts.service';

@Component({
  selector: 'app-faq',
  imports: [AccordionModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {
  activePanel = signal<number | null>(null);
  faqList = inject(LandingTextsService).faqList;
}
