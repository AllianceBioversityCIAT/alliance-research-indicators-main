import { readFileSync } from 'fs';
import { join } from 'path';

// @akili-spec institutional-performance/strategy-framework T-22 F-5.
// jsdom cannot evaluate a focused field's painted outline (KZ-017). This reads the
// shared rule the find field and both panels include. Putting an offset outline back in
// ods-field-focus.scss fails the border assertion below.

const odsAdmin = __dirname;
const partial = readFileSync(join(odsAdmin, 'ods-field-focus.scss'), 'utf8');
const mixinBody = partial.slice(partial.indexOf('@mixin ods-field-focus'), partial.indexOf('@mixin ods-panel-field-focus'));

const consumers = [
  { file: 'ods-find-field/ods-find-field.component.scss', use: "@use '../ods-field-focus' as fieldFocus" },
  { file: 'framework/components/element-panel/element-panel.component.scss', use: "@use '../../../ods-field-focus' as fieldFocus" },
  {
    file: 'institutional-objectives/components/objective-panel/objective-panel.component.scss',
    use: "@use '../../../ods-field-focus' as fieldFocus"
  }
];

describe('ods-field-focus', () => {
  it('recolours the field border and does not draw an offset outline', () => {
    expect(mixinBody).toContain('border-color: var(--p-form-field-focus-border-color)');
    expect(mixinBody).toContain('outline: none');
    expect(mixinBody).toContain('outline-offset: 0');
    expect(mixinBody).not.toMatch(/outline-offset:\s*[1-9]/);
  });

  it('is included by the find field and both detail panels', () => {
    for (const consumer of consumers) {
      const source = readFileSync(join(odsAdmin, consumer.file), 'utf8');
      expect(source).toContain(consumer.use);
      expect(source).toMatch(/@include fieldFocus\.ods-(field-focus|panel-field-focus)/);
    }
  });
});
