import { Injectable, effect, signal, WritableSignal, inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class VersionWatcherService {
  private readonly route = inject(ActivatedRoute);
  private readonly versionParamSignal = toSignal(this.route.queryParams, { initialValue: {} });
  private lastVersion: string | null = null;

  version: WritableSignal<string | null> = signal(null);

  constructor() {
    effect(() => {
      const queryParams = this.versionParamSignal() as Params;
      const version = queryParams['version'] ?? null;
      if (version !== this.lastVersion) {
        this.lastVersion = version;
        this.version.set(version);
      }
    });
  }

  onVersionChange(callback: (version: string | null) => void) {
    effect(() => {
      callback(this.version());
    });
  }
}
