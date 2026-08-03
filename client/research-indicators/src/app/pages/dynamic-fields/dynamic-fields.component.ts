import { Component, OnInit } from '@angular/core';
import { DynamicComponentSelectorComponent } from './components/dynamic-component-selector/dynamic-component-selector.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamic-fields',
  imports: [DynamicComponentSelectorComponent, ReactiveFormsModule, CommonModule],
  templateUrl: './dynamic-fields.component.html',
  styleUrl: './dynamic-fields.component.scss'
})
export default class DynamicFieldsComponent implements OnInit {
  form!: FormGroup;
  fields!: any[];
  data!: any;

  constructor(private readonly fb: FormBuilder) {}

  ngOnInit() {
    this.data = {
      name: 'John',
      age: 30,
      job: 'Developer',
      data: {
        label: 'Sample Label',
        details: {
          info: 'Additional Info'
        }
      }
    };

    this.fields = [
      {
        type: 'section',
        attribute: 'data',
        fields: [
          {
            type: 'title',
            text: 'Data Section'
          },
          {
            type: 'input',
            name: 'label',
            label: 'Label',
            validators: [Validators.required]
          },
          {
            type: 'block',
            attribute: 'details',
            fields: [
              {
                type: 'input',
                name: 'info',
                label: 'Info',
                validators: []
              }
            ]
          }
        ]
      },
      {
        type: 'input',
        name: 'job',
        label: 'Job',
        validators: []
      },
      {
        type: 'input',
        name: 'name',
        label: 'Name',
        validators: [Validators.required]
      },
      {
        type: 'input',
        name: 'age',
        label: 'Age',
        validators: [Validators.required, Validators.min(18)]
      }
    ];
    this.form = this.buildFormGroup(this.fields, this.data);
  }

  buildFormGroup(fields: any[], data: any): FormGroup {
    const group = this.fb.group({});
    fields.forEach(field => {
      switch (field.type) {
        case 'input':
          group.addControl(field.name, this.fb.control(data ? data[field.name] : '', { validators: field.validators ?? [], nonNullable: true }));
          break;

        case 'section':
        case 'block':
          {
            const nestedData = field.attribute && data ? data[field.attribute] : data;
            const nestedGroup = this.buildFormGroup(field.fields, nestedData);
            if (field.attribute) {
              group.addControl(field.attribute, nestedGroup);
            } else {
              Object.assign(group.controls, nestedGroup.controls);
            }
          }
          break;

        default:
          break;
      }
    });
    return group;
  }

  save() {
    if (this.form.valid) {
      // Here you can handle the form submission, e.g., send data to a server
    }
  }
}
