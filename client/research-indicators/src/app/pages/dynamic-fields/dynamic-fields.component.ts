import { Component, inject, OnInit } from '@angular/core';
import { DynamicComponentSelectorComponent } from './components/dynamic-component-selector/dynamic-component-selector.component';
import { ApiService } from '../../shared/services/api.service';
import { GetViewComponents } from '../../shared/interfaces/api.interface';
import { CacheService } from '../../shared/services/cache.service';
import { DynamicComponentSelectorService } from './components/dynamic-component-selector/dynamic-component-selector.service';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicFieldsService } from './dynamic-fields.service';
import { DynamicBlockComponent } from './components/dynamic-block/dynamic-block.component';

@Component({
  selector: 'app-dynamic-fields',
  standalone: true,
  imports: [DynamicComponentSelectorComponent, ReactiveFormsModule, DynamicBlockComponent],
  templateUrl: './dynamic-fields.component.html',
  styleUrl: './dynamic-fields.component.scss'
})
export default class DynamicFieldsComponent implements OnInit {
  componentList: GetViewComponents[] = [];
  api = inject(ApiService);
  cache = inject(CacheService);
  dynamicSelectorSE = inject(DynamicComponentSelectorService);
  dynamicFieldsSE = inject(DynamicFieldsService);

  ngOnInit(): void {
    this.dynamicFieldsSE.init(this.dynamicFieldsSE.flattenFieldsList);
  }

  getSectionInformation = async () => {
    this.componentList = (await this.api.GET_ViewComponents()).data;
  };
  save() {
    // console.log(this.dynamicFieldsSE.formGroup.value);
    // console.log(this.dynamicFieldsSE.formGroup.valid);
  }
}
