import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BugHerdService {
  private readonly bugHerdScriptId = 'bugherd-script';
  private readonly bugHerdApiKey = 'xjszm5izs5xh4u3vdnwqna';

  public init(environmentProduction: boolean = environment.production): void {
    if (!environmentProduction) {
      this.loadBugHerdScript();
    }
  }

  private loadBugHerdScript(): void {
    try {
      if (document.getElementById(this.bugHerdScriptId)) {
        return;
      }

      const script = document.createElement('script');
      if (!script) {
        console.warn('BugHerd: Could not create script element');
        return;
      }

      script.id = this.bugHerdScriptId;
      script.type = 'text/javascript';
      script.src = `https://www.bugherd.com/sidebarv2.js?apikey=${this.bugHerdApiKey}`;
      script.async = true;

      document.body.appendChild(script);
    } catch (error) {
      console.warn('BugHerd: Error loading script', error);
    }
  }
}
