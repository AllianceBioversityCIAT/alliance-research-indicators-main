/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ControlListCacheService {
  private readonly cache = new Map<string, any>();

  set(key: string, data: any) {
    this.cache.set(key, data);
  }

  get(key: string) {
    return this.cache.get(key) ?? null;
  }

  getAll() {
    return this.cache;
  }

  has(key: string) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }
}
