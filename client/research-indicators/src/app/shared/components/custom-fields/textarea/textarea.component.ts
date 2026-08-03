/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, computed, inject, Input, signal, WritableSignal, HostListener } from '@angular/core';
import { TextareaModule } from 'primeng/textarea';
import { SaveOnWritingDirective } from '../../../directives/save-on-writing.directive';
import { FormsModule } from '@angular/forms';
import { SkeletonModule } from 'primeng/skeleton';
import { CacheService } from '../../../services/cache/cache.service';
import { WordCounterComponent } from '../word-counter/word-counter.component';
import { InputValueType } from '@shared/services/word-count.service';
import { TextareaValidationService } from '@shared/services/textarea-validation.service';
import { UtilsService } from '@shared/services/utils.service';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
  selector: 'app-textarea',
  imports: [FormsModule, TextareaModule, SaveOnWritingDirective, SkeletonModule, WordCounterComponent, S3ImageUrlPipe],
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss'
})
export class TextareaComponent {
  currentResultIsLoading = inject(CacheService).currentResultIsLoading;
  @Input() signal: WritableSignal<any> = signal({});
  @Input() optionValue = '';
  @Input() label = '';
  @Input() helperText = '';
  @Input() description = '';
  @Input() isRequired = false;
  @Input() disabled = false;
  @Input() rows = 10;
  @Input() styleClass = '';
  @Input() size = '';
  @Input() placeholder = '';
  @Input() maxLength = 40000;
  @Input() aiAssistantFunction?: () => void;
  @Input() isAiDisabled = false;
  @Input() isAiLoading = false;
  @Input() aiError = '';
  @Input() onRetry?: () => void;

  body = signal<{ value: string }>({ value: '' });
  showMaxReachedMessage = signal(false);
  textareaValidationService = inject(TextareaValidationService);
  utils = inject(UtilsService);

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    this.textareaValidationService.handlePasteText(event, this.signal, this.optionValue, this.body, this.showMaxReachedMessage);
  }

  shouldPreventInput(event: KeyboardEvent, currentValue: InputValueType): boolean {
    return this.textareaValidationService.shouldPreventInput(event, currentValue);
  }

  shouldPreventTextInput(event: KeyboardEvent): boolean {
    return this.textareaValidationService.shouldPreventTextInput(event, this.showMaxReachedMessage);
  }

  get value() {
    const nested = this.utils.getNestedPropertySignal(this.signal, this.optionValue);
    if (nested === undefined || nested === null) return '';
    return typeof nested === 'string' ? nested : String(nested);
  }

  set value(val: string) {
    this.setValue(val);
  }

  setValue(value: string) {
    if (value.length <= this.textareaValidationService.maxLength) {
      this.showMaxReachedMessage.set(false);
    }

    this.utils.setNestedPropertyWithReduceSignal(this.signal, this.optionValue, value);
  }

  isInvalid = computed(() => {
    const nested = this.utils.getNestedPropertySignal(this.signal, this.optionValue);
    if (!this.isRequired) return false;
    if (nested === undefined || nested === null) return true;
    const str = typeof nested === 'string' ? nested : String(nested);
    return str.length === 0;
  });
}
