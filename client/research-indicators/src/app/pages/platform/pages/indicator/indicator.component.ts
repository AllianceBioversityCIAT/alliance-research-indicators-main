import { Component, inject, OnInit, signal } from '@angular/core';
import { IndicatorsService } from '@services/control-list/indicators.service';
import { ActivatedRoute } from '@angular/router';
import { Indicator } from '@interfaces/api.interface';
import { ApiService } from '@services/api.service';
import { CacheService } from '@services/cache/cache.service';

@Component({
    selector: 'app-indicator',
    imports: [],
    templateUrl: './indicator.component.html',
    styleUrl: './indicator.component.scss'
})
export default class IndicatorComponent implements OnInit {
  indicatorsSE = inject(IndicatorsService);
  route = inject(ActivatedRoute);
  api = inject(ApiService);
  cache = inject(CacheService);
  currentIndicator = signal<Indicator | undefined>(undefined);

  ngOnInit() {
    const indicatorId = this.route.snapshot.paramMap.get('id')!;
    this.getIndicatorById(Number(indicatorId));
  }

  async getIndicatorById(id: number) {
    const response = await this.api.GET_IndicatorById(id);
    this.currentIndicator.set(response.data);
    this.cache.setCurrentSectionHeaderName(this.currentIndicator()?.name ?? '');
  }
}
