import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    const linkEl: HTMLLinkElement | null = document.querySelector('link[rel="icon"]');
    if (linkEl) {
      const base = environment.s3Folder?.replace(/\/$/, '') || '';
      linkEl.href = `${base}/favicon.ico`;
    }
  })
  .catch((err) => console.error(err));
