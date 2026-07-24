/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, computed, effect, inject, Input, signal, WritableSignal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SaveOnWritingDirective } from '../../../directives/save-on-writing.directive';
import { SkeletonModule } from 'primeng/skeleton';
import { CacheService } from '../../../services/cache/cache.service';
import { InputNumberModule } from 'primeng/inputnumber';
import { UtilsService } from '../../../services/utils.service';
import { WordCountService } from '../../../services/word-count.service';
import { WordCounterComponent } from '../word-counter/word-counter.component';

type InputValueType = string | number | null;

@Component({
  selector: 'app-input',
  imports: [FormsModule, InputTextModule, SaveOnWritingDirective, SkeletonModule, InputNumberModule, WordCounterComponent],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent {
  currentResultIsLoading = inject(CacheService).currentResultIsLoading;
  utils = inject(UtilsService);
  wordCountService = inject(WordCountService);
  @ViewChild('numberInput', { static: false }) numberInput!: ElementRef;
  @Input() signal: WritableSignal<any> = signal({});
  @Input() optionValue = '';
  @Input() pattern: 'email' | 'url' | 'handle-url' | '' = '';
  @Input() label = '';
  @Input() description = '';
  @Input() type: 'text' | 'number' = 'text';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() min = 0;
  @Input() validateEmpty = false;
  @Input() isRequired = false;
  @Input() onlyLowerCase = false;
  @Input() autoComplete: 'on' | 'off' = 'on';
  @Input() disabled = false;
  @Input() maxLength?: number;
  @Input() maxWords?: number;

  body = signal<{ value: InputValueType }>({ value: null });
  firstTime = signal(true);
  MAX_SAFE_INTEGER = 18;
  MAX_SAFE_TEXT = 40000;
  showMaxReachedMessage = signal(false);
  max = Number.MAX_SAFE_INTEGER;

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    if (this.type === 'text') {
      this.handlePasteText(event);
    }
  }

  handlePasteText(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text');
    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const cursorPosition = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || cursorPosition;

    const beforeCursor = currentValue.substring(0, cursorPosition);
    const afterCursor = currentValue.substring(selectionEnd);
    const newValue = beforeCursor + pastedText + afterCursor;

    if (newValue.length > this.MAX_SAFE_TEXT) {
      const availableSpace = this.MAX_SAFE_TEXT - beforeCursor.length - afterCursor.length;
      const truncatedPastedText = pastedText.substring(0, Math.max(0, availableSpace));
      const finalValue = beforeCursor + truncatedPastedText + afterCursor;

      this.body.set({ value: finalValue });
      this.utils.setNestedPropertyWithReduceSignal(this.signal, this.optionValue, finalValue);

      this.showMaxReachedMessage.set(true);

      setTimeout(() => {
        const newCursorPosition = cursorPosition + truncatedPastedText.length;
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      });
    } else {
      const finalValue = newValue;
      this.body.set({ value: finalValue });
      this.utils.setNestedPropertyWithReduceSignal(this.signal, this.optionValue, finalValue);
      this.showMaxReachedMessage.set(false);

      setTimeout(() => {
        const newCursorPosition = cursorPosition + pastedText.length;
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      });
    }
  }

  shouldPreventInput(event: KeyboardEvent, currentValue: InputValueType): boolean {
    if (!this.maxWords || !currentValue) return false;

    const wordCount = this.wordCountService.getWordCount(currentValue);
    if (wordCount < this.maxWords) return false;

    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', ' '].includes(event.key)) return false;
    if (event.ctrlKey || event.metaKey) return false;

    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart;
    if (cursorPosition === null) return true;

    const textBeforeCursor = currentValue.toString().substring(0, cursorPosition);
    const words = textBeforeCursor.trim().split(/\s+/);
    const currentWordIndex = words.length - 1;

    if (currentWordIndex < this.maxWords) return false;

    return true;
  }

  shouldPreventTextInput(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey) {
      return false;
    }

    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
      return false;
    }

    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const cursorPosition = input.selectionStart;
    if (cursorPosition === null) {
      return true;
    }

    const newValue = currentValue.substring(0, cursorPosition) + event.key + currentValue.substring(cursorPosition);
    if (newValue.length > this.MAX_SAFE_TEXT) {
      this.showMaxReachedMessage.set(true);
      return true;
    } else {
      this.showMaxReachedMessage.set(false);
    }

    return false;
  }

  onChange = effect(
    () => {
      const externalValue = this.utils.getNestedProperty(this.signal(), this.optionValue);
      if (this.body().value !== externalValue) {
        this.body.set({ value: externalValue });
      }
    },
    { allowSignalWrites: true }
  );

  updateMaxReachedMessage = effect(
    () => {
      const value = this.body().value;
      if (this.type === 'number' && value !== null && value !== undefined) {
        const valueString = value.toString();
        this.showMaxReachedMessage.set(valueString.length >= this.MAX_SAFE_INTEGER);
      } else if (this.type === 'text' && value !== null && value !== undefined) {
        const valueString = value.toString();
        this.showMaxReachedMessage.set(valueString.length >= this.MAX_SAFE_TEXT);
      } else {
        this.showMaxReachedMessage.set(false);
      }
    },
    { allowSignalWrites: true }
  );

  isInvalid = computed(() => {
    return this.isRequired && !this.body()?.value;
  });

  inputValid = computed(() => {
    const value = this.utils.getNestedProperty(this.signal(), this.optionValue);
    if (this.isRequired && (!value || value.length === 0)) {
      return { valid: false, class: 'ng-invalid ng-dirty', message: 'This field is required' };
    }
    if (this.validateEmpty && !value) {
      return { valid: false, class: 'ng-invalid ng-dirty', message: 'Field cannot be empty' };
    }
    if (this.maxWords && value) {
      const wordCount = this.wordCountService.getWordCount(value);

      if (wordCount > this.maxWords) {
        return { valid: false, class: 'ng-invalid ng-dirty', message: `Maximum ${this.maxWords} words allowed` };
      }
    }
    if (this.maxLength && value) {
      const maxLengthError = this.checkMaxLength(this.maxLength, value);
      if (maxLengthError) return maxLengthError;
    }
    if (this.pattern && value?.trim()) {
      const valid = new RegExp(this.getPattern().pattern).test(value);
      return { valid: valid, class: valid ? '' : 'ng-invalid ng-dirty', message: this.getPattern().message };
    }
    return { valid: true, class: '', message: '' };
  });

  checkMaxLength(maxLength: number, value: string): { valid: boolean; class: string; message: string } | null {
    const wordCount = this.wordCountService.getWordCount(value);
    if (wordCount > maxLength) {
      return { valid: false, class: 'ng-invalid ng-dirty', message: `Maximum ${maxLength} words allowed` };
    }
    return null;
  }

  setValue(value: any) {
    if (this.onlyLowerCase) value = value.toLowerCase();

    if (this.maxWords && typeof value === 'string') {
      const input = document.activeElement as HTMLInputElement;
      const cursorPosition = input?.selectionStart;

      const words = value
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0);

      if (words.length > this.maxWords) {
        value = words.slice(0, this.maxWords).join(' ');

        if (cursorPosition !== null && cursorPosition !== undefined) {
          const textBeforeCursor = value.substring(0, cursorPosition);
          const wordsBeforeCursor = textBeforeCursor.trim().split(/\s+/).length - 1;

          if (wordsBeforeCursor < this.maxWords) {
            setTimeout(() => {
              input.setSelectionRange(cursorPosition, cursorPosition);
            });
          }
        }
      }
    }

    this.body.set({ value: value });
    this.utils.setNestedPropertyWithReduceSignal(this.signal, this.optionValue, value);
  }

  getPattern() {
    switch (this.pattern) {
      case 'email':
        return { pattern: String.raw`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`, message: 'Please enter a valid email address.' };
      case 'url':
        return {
          pattern: String.raw`^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$`,
          message: 'Please enter a valid URL.'
        };
      case 'handle-url':
        return {
          pattern: String.raw`^https:\/\/hdl\.handle\.net\/.+`,
          message: 'URL must start with https://hdl.handle.net/'
        };
      default:
        return { pattern: '', message: '' };
    }
  }
}
