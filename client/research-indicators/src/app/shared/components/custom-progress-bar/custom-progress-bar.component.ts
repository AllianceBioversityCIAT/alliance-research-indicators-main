import { Component } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-custom-progress-bar',
  imports: [ProgressBarModule],
  templateUrl: './custom-progress-bar.component.html'
})
export class CustomProgressBarComponent {}
