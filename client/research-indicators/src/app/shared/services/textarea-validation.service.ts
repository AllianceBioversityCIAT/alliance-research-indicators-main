import { Injectable, inject, WritableSignal } from '@angular/core';
import { WordCountService, InputValueType } from '@shared/services/word-count.service';
import { UtilsService } from '@shared/services/utils.service';

@Injectable({
  providedIn: 'root'
})
export class TextareaValidationService {
  private readonly MAX_LENGTH = 40000;
  private wordCountService = inject(WordCountService);
  private utils = inject(UtilsService);

  handlePasteText(
    event: ClipboardEvent,
    signal: WritableSignal<Record<string, unknown>>,
    optionValue: string,
    bodySignal: WritableSignal<{ value: string }>,
    showMaxReachedMessageSignal: WritableSignal<boolean>
  ): void {
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

    if (newValue.length > this.MAX_LENGTH) {
      const availableSpace = this.MAX_LENGTH - beforeCursor.length - afterCursor.length;
      const truncatedPastedText = pastedText.substring(0, Math.max(0, availableSpace));
      const finalValue = beforeCursor + truncatedPastedText + afterCursor;

      bodySignal.set({ value: finalValue });
      this.utils.setNestedPropertyWithReduceSignal(signal, optionValue, finalValue);

      showMaxReachedMessageSignal.set(true);

      setTimeout(() => {
        const newCursorPosition = cursorPosition + truncatedPastedText.length;
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      });
    } else {
      const finalValue = newValue;
      bodySignal.set({ value: finalValue });
      this.utils.setNestedPropertyWithReduceSignal(signal, optionValue, finalValue);
      showMaxReachedMessageSignal.set(false);

      setTimeout(() => {
        const newCursorPosition = cursorPosition + pastedText.length;
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      });
    }
  }

  shouldPreventInput(event: KeyboardEvent, currentValue: InputValueType): boolean {
    if (!this.MAX_LENGTH || !currentValue) return false;

    const wordCount = this.wordCountService.getWordCount(currentValue);
    if (wordCount < this.MAX_LENGTH) return false;

    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', ' '].includes(event.key)) return false;
    if (event.ctrlKey || event.metaKey) return false;

    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart;
    if (cursorPosition === null) return true;

    const textBeforeCursor = currentValue.toString().substring(0, cursorPosition);
    const words = textBeforeCursor.trim().split(/\s+/);
    const currentWordIndex = words.length - 1;

    if (currentWordIndex < this.MAX_LENGTH) return false;

    return true;
  }

  shouldPreventTextInput(event: KeyboardEvent, showMaxReachedMessageSignal: WritableSignal<boolean>): boolean {
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
    if (newValue.length > this.MAX_LENGTH) {
      showMaxReachedMessageSignal.set(true);
      return true;
    } else {
      showMaxReachedMessageSignal.set(false);
    }

    return false;
  }

  get maxLength(): number {
    return this.MAX_LENGTH;
  }
}
