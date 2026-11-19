import { TestBed } from '@angular/core/testing';
import { PfmSyncedByTypeCardComponent } from './pfm-synced-by-type-card.component';
import { PfmSyncedType } from '../../pfm.interfaces';

function render(types: PfmSyncedType[]) {
  TestBed.configureTestingModule({ imports: [PfmSyncedByTypeCardComponent] });
  const fixture = TestBed.createComponent(PfmSyncedByTypeCardComponent);
  fixture.componentRef.setInput('types', types);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const all = (id: string) => Array.from(el.querySelectorAll(`[data-testid="${id}"]`)) as HTMLElement[];
  return { el, all, fixture };
}

describe('PfmSyncedByTypeCardComponent', () => {
  it('lists each type with its count, in the order the server sends (most first)', () => {
    const { all } = render([
      { id: 5, name: 'Knowledge Product', synced: 15 },
      { id: 2, name: 'Innovation Development', synced: 12 },
      { id: 4, name: 'Policy Change', synced: 4 }
    ]);
    expect(all('pfm-type-label').map(e => e.textContent?.trim())).toEqual(['Knowledge Product', 'Innovation Development', 'Policy Change']);
    expect(all('pfm-type-count').map(e => e.textContent?.trim())).toEqual(['15', '12', '4']);
  });

  it('the type with the most results fills its bar; the rest are sized against it', () => {
    const { all } = render([
      { id: 5, name: 'Knowledge Product', synced: 15 },
      { id: 4, name: 'Policy Change', synced: 3 }
    ]);
    expect(all('pfm-type-bar').map(e => e.style.width)).toEqual(['100%', '20%']);
  });

  it('explains that OICRs are not synced', () => {
    const { el } = render([{ id: 5, name: 'Knowledge Product', synced: 1 }]);
    expect(el.querySelector('[data-testid="pfm-type-sub"]')?.textContent).toContain('OICRs) stay in STAR and are not synced');
  });

  it('with nothing in PRMS shows the shared "Nothing yet" state', () => {
    const { el, all } = render([{ id: 5, name: 'Knowledge Product', synced: 0 }]);
    expect(all('pfm-type-label')).toHaveLength(0);
    expect(el.querySelector('[data-testid="pfm-empty-state"]')?.textContent?.trim()).toBe('Nothing yet');
  });

  it('each type is a button that opens the queue on that type (DD-PFM-45)', () => {
    const { el, fixture } = render([
      { id: 6, name: 'Innovation Use', synced: 6 },
      { id: 2, name: 'Innovation Development', synced: 5 }
    ]);
    const opened: number[] = [];
    fixture.componentInstance.openType.subscribe(id => opened.push(id));
    const row = el.querySelector('[data-testid="pfm-type-row-2"]') as HTMLButtonElement;
    expect(row.tagName).toBe('BUTTON');
    expect(row.getAttribute('aria-label')).toBe('Open Innovation Development: 5 results in PRMS');
    row.click();
    expect(opened).toEqual([2]);
  });
});
