import { inject, Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { DynamicComponentSelectorService } from './components/dynamic-component-selector/dynamic-component-selector.service';

@Injectable({
  providedIn: 'root'
})
export class DynamicFieldsService {
  fb = inject(FormBuilder);
  formGroup: FormGroup = new FormGroup({});
  flattenFieldsList: any = [];
  dynamicComponentSelectorSE = inject(DynamicComponentSelectorService);

  init(fields: any) {
    this.flattenFieldsList = this.flattenFields(this.dynamicComponentSelectorSE.fields, ['input', 'select']);
    const formControls: any = {};
    this.flattenFieldsList.forEach((campo: any) => {
      const validations: ValidatorFn[] = [];
      for (const key in campo.validations) {
        if (key == 'required' && campo.validations[key]) validations.push(Validators.required);
        if (key == 'min') validations.push(Validators.min(campo.validations[key]));
        if (key == 'max') validations.push(Validators.max(campo.validations[key]));
        if (key == 'maxLength') validations.push(Validators.maxLength(campo.validations[key]));
        if (key == 'patron') validations.push(Validators.pattern(campo.validations[key]));
      }
      formControls[campo.attr] = this.fb.control('', validations);
    });

    this.formGroup = this.fb.group(formControls);
  }

  flattenFields(fields: any[], types: string[]): any[] {
    let flattened: any[] = [];

    fields.forEach(field => {
      const { fields: innerFields, ...rest } = field;
      if (types.includes(rest.type)) {
        flattened.push(rest); // Add the current element only if its type matches
      }
      if (innerFields) {
        flattened = flattened.concat(this.flattenFields(innerFields, types));
      }
    });

    return flattened;
  }
}
