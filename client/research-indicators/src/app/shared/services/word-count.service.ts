import { Injectable } from '@angular/core';

export type InputValueType = string | number | null | undefined;

@Injectable({
  providedIn: 'root'
})
export class WordCountService {
  getWordCount(value: InputValueType): number {
    if (!value) return 0;
    const str = value.toString().trim();
    return str.split(/\s+/).filter(word => word.length > 0).length;
  }
}
