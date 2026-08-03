import { Component } from '@angular/core';

@Component({
  selector: 'app-version-number',
  imports: [],
  templateUrl: './version-number.component.html',
  styleUrl: './version-number.component.scss'
})
export class VersionNumberComponent {
  version = localStorage.getItem('lastVersionValidated') || '-';
}
