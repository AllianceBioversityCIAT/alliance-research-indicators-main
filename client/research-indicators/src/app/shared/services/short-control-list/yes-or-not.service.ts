import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class YesOrNotService {
  list = signal<{ name: string; value: number }[]>([
    { name: 'Yes', value: 1 },
    { name: 'No', value: 0 }
  ]);
  loading = signal(false);
}
