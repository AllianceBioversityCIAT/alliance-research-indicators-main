import { readFileSync } from 'fs';
import { join } from 'path';

// @akili-spec institutional-performance/strategy-framework T-22 F-5.
// jsdom cannot evaluate a focused field's painted outline (KZ-017). This reads the
// shared rule the find field and both panels include. Putting an offset outline back in
// ods-field-focus.scss fails the border assertion below.

const odsAdmin = __dirname;
const partial = readFileSync(join(odsAdmin, 'ods-field-focus.scss'), 'utf8');
const mixinBody = partial.slice(partial.indexOf('@mixin ods-field-focus'), partial.indexOf('@mixin ods-panel-field-focus'));

const fieldHosts = [
  'ods-field.scss',
  'ods-find-field/ods-find-field.component.scss',
  'framework/components/element-panel/element-panel.component.scss',
  'framework/components/staff-picker/staff-picker.component.scss',
  'framework/framework.component.scss',
  'institutional-objectives/components/objective-panel/objective-panel.component.scss',
  'institutional-objectives/institutional-objectives.component.scss'
];

describe('ods-field-focus', () => {
  it('recolours the field border and does not draw an offset outline', () => {
    expect(mixinBody).toContain('border-color: var(--p-form-field-focus-border-color)');
    expect(mixinBody).toContain('outline: none');
    expect(mixinBody).toContain('outline-offset: 0');
    expect(mixinBody).not.toMatch(/outline-offset:\s*[1-9]/);
  });

  it('is included by the shared field sheet, which every ODS field host uses', () => {
    const sheet = readFileSync(join(odsAdmin, 'ods-field.scss'), 'utf8');
    expect(sheet).toContain("@use './ods-field-focus' as fieldFocus");
    expect(sheet).toMatch(/@include fieldFocus\.ods-panel-field-focus/);
    for (const file of fieldHosts) {
      const source = readFileSync(join(odsAdmin, file), 'utf8');
      expect(source).toContain('ods-field');
    }
  });
});
