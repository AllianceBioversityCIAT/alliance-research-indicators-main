import { Component } from '@angular/core';
import { BannerComponent } from './components/banner/banner.component';
import { FeaturesComponent } from './components/features/features.component';
import { DiscoverHeroComponent } from './components/discover-hero/discover-hero.component';
import { FooterComponent } from './components/footer/footer.component';
import { FaqComponent } from './components/faq/faq.component';
import { VersionNumberComponent } from './components/version-number/version-number.component';

@Component({
  selector: 'app-landing',
  imports: [BannerComponent, FeaturesComponent, DiscoverHeroComponent, FaqComponent, FooterComponent, VersionNumberComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export default class LandingComponent {}
