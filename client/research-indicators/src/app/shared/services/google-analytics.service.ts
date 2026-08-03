import { Injectable } from '@angular/core';
import { IBDGoogleAnalytics } from 'ibdevkit';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {
  init() {
    IBDGoogleAnalytics().initialize(environment.googleAnalyticsId);
  }
  updateState(url: string) {
    IBDGoogleAnalytics().trackPageView(url);
  }
}
