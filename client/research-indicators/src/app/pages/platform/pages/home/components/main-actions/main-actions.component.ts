import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
    selector: 'app-main-actions',
    imports: [RouterLink, S3ImageUrlPipe],
    templateUrl: './main-actions.component.html',
    styleUrl: './main-actions.component.scss'
})
export class MainActionsComponent {}
