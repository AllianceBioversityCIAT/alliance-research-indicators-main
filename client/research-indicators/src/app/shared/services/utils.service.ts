import { Injectable, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  setNestedPropertyWithReduceSignal(signal: WritableSignal<any>, path: string, value: any): void {
    const keys = path.split('.');

    if (keys.length >= 2) {
      signal.update(obj => {
        keys.slice(0, -1).reduce((acc, key) => {
          // Create the subobject if it doesn't exist
          acc[key] ??= {};
          return acc[key];
        }, obj)[keys[keys.length - 1]] = value;
        return { ...obj };
      });
    } else {
      signal.update(obj => {
        obj[keys[0]] = value;
        return { ...obj };
      });
    }
  }
  setNestedPropertyWithReduce(obj: any, path: string, value: any): void {
    const keys = path.split('.');

    if (keys.length >= 2) {
      keys.slice(0, -1).reduce((acc, key) => {
        // Create the subobject if it doesn't exist
        acc[key] ??= {};
        return acc[key];
      }, obj)[keys[keys.length - 1]] = value;
    } else {
      obj[keys[0]] = value;
    }
  }

  getNestedProperty(obj: any, path: string): any {
    const splitted = path.split('.');
    if (splitted.length >= 2) return splitted.reduce((acc, key) => acc?.[key], obj);
    return obj[splitted[0]];
  }

  getNestedPropertySignal(signal: WritableSignal<any>, path: string): any {
    const splitted = path.split('.');
    if (splitted.length >= 2) return splitted.reduce((acc, key) => acc?.[key], signal());
    return signal()[splitted[0]];
  }
}
