import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScalingService {
  list = signal<{ name: string; value: number }[]>([
    { name: '1', value: 1 },
    { name: '2', value: 2 },
    { name: '3', value: 3 },
    { name: '4', value: 4 },
    { name: '5', value: 5 }
  ]);
  loading = signal(false);
}
