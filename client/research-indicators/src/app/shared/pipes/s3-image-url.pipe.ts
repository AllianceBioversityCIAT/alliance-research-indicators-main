import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 's3ImageUrl',
  standalone: true
})
export class S3ImageUrlPipe implements PipeTransform {
  transform(relativePath: string | null | undefined): string {
    if (!relativePath) return '';
    const normalized = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return environment.s3Folder + normalized;
  }
}