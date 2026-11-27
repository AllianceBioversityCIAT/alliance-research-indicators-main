import { readFileSync } from 'fs';
import { join } from 'path';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OdsFindFieldComponent } from './ods-find-field.component';

// @akili-spec institutional-performance/strategy-framework T-23 — D-STF-40.
// KZ-015: the query is typed and cleared through DOM events, not by setting the signal.
// The field is controlled: the host binds the value it receives.

@Component({
  standalone: true,
  imports: [OdsFindFieldComponent],
  template: `<app-ods-find-field [value]="query()" (queryChange)="onQuery($event)" />`
})
class FindFieldHost {
  readonly query = signal('');

  onQuery(value: string): void {
    this.query.set(value);
  }
}

describe('OdsFindFieldComponent', () => {
  let fixture: ComponentFixture<FindFieldHost>;

  const root = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FindFieldHost] }).compileComponents();
    fixture = TestBed.createComponent(FindFieldHost);
    fixture.detectChanges();
  });

  it('emits the typed query, then an empty string when cleared', () => {
    const input = root().querySelector('[data-testid="ods-find-field"]') as HTMLInputElement;
    const label = root().querySelector('label');
    expect(label?.classList.contains('label')).toBe(true);
    expect(label?.textContent?.trim()).toBe('Find by code or name');
    expect(input.classList.contains('p-inputtext')).toBe(true);
    expect(root().querySelector('[data-testid="ods-find-clear"]')).toBeNull();

    input.value = 'IOB-1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('IOB-1');
    expect(input.value).toBe('IOB-1');

    const clear = root().querySelector('[data-testid="ods-find-clear"]') as HTMLButtonElement;
    expect(clear.getAttribute('aria-label')).toBe('Clear search');
    clear.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('');
    expect((root().querySelector('[data-testid="ods-find-field"]') as HTMLInputElement).value).toBe('');
    expect(root().querySelector('[data-testid="ods-find-clear"]')).toBeNull();
  });

  it('lets the search grow and wraps a projected toolbar under it', () => {
    const scss = readFileSync(join(__dirname, 'ods-find-field.component.scss'), 'utf8');
    const start = scss.indexOf('.ods-find-line {');
    const line = scss.slice(start, scss.indexOf('}', start) + 1);
    const searchStart = scss.indexOf('.ods-find-line__search {');
    const search = scss.slice(searchStart, scss.indexOf('}', searchStart) + 1);

    expect(line).toContain('flex-wrap: wrap');
    expect(line).toContain('align-items: flex-end');
    expect(line).not.toContain('position: sticky');
    expect(search).toContain('flex: 1 1 16rem');
    expect(search.endsWith('}')).toBe(true);
  });

  it('shows a value the parent already holds, with the clear button', () => {
    fixture.componentInstance.query.set('zzz');
    fixture.detectChanges();

    expect((root().querySelector('[data-testid="ods-find-field"]') as HTMLInputElement).value).toBe('zzz');
    expect(root().querySelector('[data-testid="ods-find-clear"]')).not.toBeNull();
  });
});
