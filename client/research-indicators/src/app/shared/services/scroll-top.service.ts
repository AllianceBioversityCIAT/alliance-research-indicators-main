import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScrollToTopService {

  scrollContentToTop(id: string): void {
    const div = document.getElementById(id);
    if (div) {
      div.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.warn(`Element with id "${id}" not found`);
    }
  }
}