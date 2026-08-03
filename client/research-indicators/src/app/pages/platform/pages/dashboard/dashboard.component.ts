import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { POWERBI_CONSTANTS } from '@shared/constants/powerbi.constants';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html'
})
export default class DashboardComponent {
  readonly dashboardUrl: SafeResourceUrl;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.dashboardUrl = this.sanitizer.bypassSecurityTrustResourceUrl(POWERBI_CONSTANTS.DASHBOARD_URL);
  }
}
