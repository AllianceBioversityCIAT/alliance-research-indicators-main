import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GetAnticipatedUsersService {
  list = signal<{ name: string; value: number }[]>([
    { name: 'This is yet to be determined', value: 1 },
    { name: 'Users have been determined', value: 2 }
  ]);
  loading = signal(false);
}
