import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WordCountService } from '../../../services/word-count.service';

@Component({
  selector: 'app-word-counter',
  templateUrl: './word-counter.component.html',
  styleUrls: ['./word-counter.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class WordCounterComponent {
  @Input() value = '';
  @Input() maxWords?: number;
  @Input() minWords?: number;
  @Input() showMin = false;
  @Input() showMax = true;
  @Input() size: 'small' | 'normal' = 'normal';

  private wordCountService = inject(WordCountService);

  get count(): number {
    return this.wordCountService.getWordCount(this.value);
  }

  get color(): string {
    if (this.count === 0) return '#8D9299';
    if (this.maxWords && this.count > this.maxWords) return '#CF0808';
    if (this.minWords && this.count < this.minWords) return '#8D9299';
    return '#358540';
  }
}
