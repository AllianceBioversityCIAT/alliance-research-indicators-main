import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { environment } from '../environments/environment';
import { jWtInterceptor } from './shared/interceptors/jwt.interceptor';
import { httpErrorInterceptor } from './shared/interceptors/http-error.interceptor';
const config: SocketIoConfig = { url: environment.webSocketServerUrl, options: {} };

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes, withViewTransitions()), provideHttpClient(withInterceptors([jWtInterceptor, httpErrorInterceptor])), importProvidersFrom(BrowserAnimationsModule, SocketIoModule.forRoot(config))]
};
