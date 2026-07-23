import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DynamicComponentSelectorService {
  fields: any[] = [
    {
      id: 1,
      type: 'section',
      fields: [
        { type: 'title', id: 10 },
        { type: 'input', attr: 'nombree', id: 11, validations: { required: true } },
        {
          type: 'block',
          id: 100,
          fields: [
            { type: 'title', id: 101 },
            { type: 'input', attr: 'edad', id: 102, validations: { required: false, min: 18 } }
          ]
        }
      ]
    },
    {
      type: 'title',
      id: 2
    }
  ];
}
