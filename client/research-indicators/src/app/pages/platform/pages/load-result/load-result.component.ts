import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-load-result',
    imports: [],
    templateUrl: './load-result.component.html',
    styleUrls: ['./load-result.component.scss']
})
export default class LoadResultComponent implements OnInit, OnDestroy {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  private redirectTimeout: any = null;

  constructor(private router: Router) {}

  ngOnInit() {
    this.redirectTimeout = setTimeout(() => {
      this.router.navigate(['/']);
    }, 1000);
  }

  ngOnDestroy() {
    if (this.redirectTimeout) clearTimeout(this.redirectTimeout);
  }
}
