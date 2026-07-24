import { Injectable } from '@angular/core';
import Hotjar from '@hotjar/browser';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class HotjarService {
  init() {
    Hotjar.init(environment.hotjarId, environment.hotjarVersion);
  }

  updateState(url: string) {
    try {
      Hotjar.stateChange(url);
    } catch (error) {
      console.error('Error updating Hotjar state:', error);
    }
  }
}
