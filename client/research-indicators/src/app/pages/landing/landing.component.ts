import { Component, inject, OnInit } from '@angular/core';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { HeaderComponent } from './components/header/header.component';
import { HeroComponent } from './components/hero/hero.component';
import { IndicatorsInfoComponent } from './components/indicators-info/indicators-info.component';
import { CognitoService } from '../../shared/services/cognito.service';
import { FooterComponent } from './components/footer/footer.component';
import { FaqComponent } from './components/faq/faq.component';
import { VersionNumberComponent } from '../../oages/landing/components/version-number/version-number.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [ToolbarComponent, HeaderComponent, HeroComponent, IndicatorsInfoComponent, FaqComponent, FooterComponent, VersionNumberComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export default class LandingComponent implements OnInit {
  cognito = inject(CognitoService);
  ngOnInit(): void {
    this.cognito.validateCognitoCode();
  }
}
