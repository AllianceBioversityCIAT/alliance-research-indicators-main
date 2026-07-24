/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamic-notion-block',
  imports: [FormsModule, CheckboxModule, CommonModule, DynamicNotionBlockComponent],
  templateUrl: './dynamic-notion-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicNotionBlockComponent {
  @Input() block: any;
  /** Optional 1-based index for numbered lists split across multiple `<ol>` elements. */
  @Input() listStart?: number;
  isExpanded = signal(false);

  /** Empty WebVTT placeholder when Notion does not provide caption/description files. */
  readonly emptyVideoTrackSrc = 'data:text/vtt;charset=utf-8,WEBVTT';

  private readonly router = inject(Router);

  navigateToChildPage(id: string): void {
    this.router.navigate(['/whats-new/details', id]);
  }

  toggleExpand(): void {
    this.isExpanded.update(current => !current);
  }

  getFileBlockUrl(block: any): string | null {
    const fileData = block?.file;
    return fileData?.file?.url ?? fileData?.external?.url ?? null;
  }

  getFileBlockName(block: any): string {
    return block?.file?.name ?? 'Download file';
  }

  getImageBlockUrl(block: any): string | null {
    const image = block?.image;
    return image?.file?.url ?? image?.external?.url ?? null;
  }

  isImageFileName(name: string): boolean {
    return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
  }

  joinPlainText(text: any[]): string {
    if (!text?.length) {
      return '';
    }

    return text.map(item => item.plain_text ?? '').join('');
  }

  joinText(text: any[]): string {
    if (!text?.length) {
      return '';
    }

    const processedText = text.map(item => {
      let formattedText = item.plain_text;

      if (item.annotations) {
        if (item.annotations.bold) {
          formattedText = `<span class="font-semibold">${formattedText}</span>`;
        }
        if (item.annotations.italic) {
          formattedText = `<em>${formattedText}</em>`;
        }
        if (item.annotations.underline) {
          formattedText = `<u>${formattedText}</u>`;
        }
        if (item.annotations.strikethrough) {
          formattedText = `<s>${formattedText}</s>`;
        }
        if (item.annotations.code) {
          formattedText = `<code class="rounded bg-[#f4f7f9] px-1 py-0.5">${formattedText}</code>`;
        }
      }

      if (item.href) {
        if (item.mention) {
          formattedText = `<a href="${item.href}" target="_blank" rel="noopener noreferrer" class="font-medium text-[#1689ca] underline-offset-2 hover:underline">${item.href}</a>`;
        } else {
          formattedText = `<a href="${item.href}" target="_blank" rel="noopener noreferrer" class="font-medium text-[#1689ca] underline-offset-2 hover:underline">${formattedText}</a>`;
        }
      }

      return formattedText;
    });

    return processedText.join('');
  }
}
