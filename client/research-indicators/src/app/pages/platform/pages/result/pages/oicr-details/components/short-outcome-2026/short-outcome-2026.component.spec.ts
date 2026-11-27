import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ShortOutcome2026Component } from './short-outcome-2026.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { PatchOicr } from '@shared/interfaces/oicr-creation.interface';
import { QuantificationItemData } from '@components/quantification-item/quantification-item.component';
import { QuantificationUnitCategory } from '@shared/interfaces/oicr-catalogs.interface';

const baseBody = (extra: Partial<PatchOicr> = {}): PatchOicr =>
  ({
    oicr_internal_code: '',
    tagging: { tag_id: 0 },
    outcome_impact_statement: '',
    short_outcome_impact_statement: '',
    sharepoint_link: '',
    maturity_level_id: 0,
    link_result: { external_oicr_id: 0 },
    for_external_use: false,
    for_external_use_description: '',
    ...extra
  }) as PatchOicr;

describe('ShortOutcome2026Component', () => {
  let fixture: ComponentFixture<ShortOutcome2026Component>;
  let component: ShortOutcome2026Component;
  let body: WritableSignal<PatchOicr>;

  const text = (sel: string) => (fixture.nativeElement as HTMLElement).querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
  const q4 = () => (fixture.nativeElement as HTMLElement).querySelector('#outcome-achieved') as HTMLTextAreaElement;
  const flush = () => {
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  };

  const setup = (initial: Partial<PatchOicr> = {}, quants: QuantificationItemData[] = [], disabled = false) => {
    TestBed.configureTestingModule({
      imports: [ShortOutcome2026Component, HttpClientTestingModule]
    });
    TestBed.inject(CacheService).currentResultIsLoading.set(false);
    body = signal(baseBody(initial));
    fixture = TestBed.createComponent(ShortOutcome2026Component);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('body', body);
    fixture.componentRef.setInput('quantifications', quants);
    fixture.componentRef.setInput('disabled', disabled);
    flush();
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders the helper paragraph, the four questions and the 25-word counters on Q1-Q3', () => {
    setup();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text('[data-testid="short-outcome-helper"]')).toContain('This summary appears on the first page of the OICR published on CGSpace');
    expect(html).toContain('What was the problem?');
    expect(html).toContain("What was the Alliance's solution?");
    expect(html).toContain('Who benefited from the reported change?');
    expect(html).toContain('What outcome or impact was achieved?');
    const counters = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-word-counter')).map(c => c.textContent?.replace(/\s+/g, ' ').trim());
    expect(counters.filter(c => c === 'Words used: 0/25').length).toBe(3);
    expect(counters).toContain('Words used: 0');
  });

  it('Q1 counter counts words, and turns red over 25', () => {
    setup({ problem_statement: 'one two three' });
    const counters = (fixture.nativeElement as HTMLElement).querySelectorAll('app-word-counter');
    expect(counters[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('Words used: 3/25');

    body.update(b => ({ ...b, problem_statement: Array.from({ length: 26 }, (_, i) => 'w' + i).join(' ') }));
    flush();
    const over = (fixture.nativeElement as HTMLElement).querySelectorAll('app-word-counter')[0];
    expect(over.textContent?.replace(/\s+/g, ' ').trim()).toBe('Words used: 26/25');
    expect((over.querySelector('span span:last-child') as HTMLElement).style.color).toMatch(/rgb\(207, 8, 8\)|#cf0808/i);
  });

  it('marks the questions required while empty', () => {
    setup();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('This field is required');
    expect(text('[data-testid="q4-required"]')).toContain('This field is required');
  });

  describe('Q4 is written from the Actual count rows', () => {
    const categories: QuantificationUnitCategory[] = [
      { id: 1, macro_category: 'Individuals', name: 'Community Members', is_percentage: false },
      { id: 2, macro_category: 'Organizations', name: 'Cooperatives', is_percentage: false },
      { id: 3, macro_category: 'Performance Metrics & Indicators', name: 'Adoption Rate', is_percentage: true }
    ];
    const quants: QuantificationItemData[] = [
      { number: 20, unit: 'Community Members', unit_macro_category: 'Individuals', comments: 'Trained in seed saving' },
      { number: null, unit: '', comments: '   ' },
      { number: 1500, unit: 'Cooperatives', unit_macro_category: 'Organizations', comments: '' },
      { number: 45, unit: 'Adoption Rate', unit_macro_category: 'Performance Metrics & Indicators', comments: 'Adopted the new variety' },
      { number: 15, unit: 'hectares restored', unit_macro_category: 'Other', comments: 'Degraded land recovered' }
    ];
    const expected = [
      '20 Individuals (Community Members): Trained in seed saving',
      '1,500 Organizations (Cooperatives)',
      '45% Adoption Rate: Adopted the new variety',
      '15 hectares restored: Degraded land recovered'
    ].join('\n');

    const setupQ4 = (initial: Partial<PatchOicr> = {}, rows = quants, disabled = false) => {
      setup(initial, rows, disabled);
      fixture.componentRef.setInput('unitCategories', categories);
      flush();
    };

    it('writes one line per measure: number, unit, category, then the narrative; empty rows are skipped', () => {
      setupQ4();
      expect(body().outcome_achieved).toBe(expected);
      expect(body().outcome_achieved_edited).toBe(false);
      expect(q4().value).toBe(expected);
      expect(text('[data-testid="q4-sources"]')).toContain('Taken from:');
      expect(text('[data-testid="q4-sources"]')).toContain('ACTUAL COUNT # 1 · Community Members');
      expect(text('[data-testid="q4-sources"]')).not.toContain('ACTUAL COUNT # 2');
      expect(text('[data-testid="q4-note"]')).toContain('Written from Quantification [Actual count]');
    });

    it('the field is disabled, so the user cannot type in it, and there is no Restore', () => {
      setupQ4();
      expect(q4().disabled).toBe(true);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="q4-restore"]')).toBeNull();
    });

    it('keeps following the rows (transition: starts empty, then measures arrive and change)', () => {
      setupQ4({}, []);
      expect(body().outcome_achieved ?? '').toBe('');
      expect(text('[data-testid="q4-note"]')).toContain('This answer fills in by itself');
      fixture.componentRef.setInput('quantifications', quants);
      flush();
      expect(body().outcome_achieved).toBe(expected);
      fixture.componentRef.setInput('quantifications', [{ number: 3, unit: '', comments: 'Only a number and a comment' }]);
      flush();
      expect(body().outcome_achieved).toBe('3: Only a number and a comment');
    });

    it('a saved hand-edited answer is replaced by the rows and the edited flag cleared', () => {
      setupQ4({ outcome_achieved: 'My own words', outcome_achieved_edited: true });
      expect(body().outcome_achieved).toBe(expected);
      expect(body().outcome_achieved_edited).toBe(false);
    });

    it('without the catalog a percentage category is written like any other', () => {
      setup({}, [quants[3]]);
      expect(body().outcome_achieved).toBe('45 Performance Metrics & Indicators (Adoption Rate): Adopted the new variety');
    });

    it('does not touch the body when disabled (external result / non-editable status)', () => {
      setupQ4({ outcome_achieved: 'saved' }, quants, true);
      expect(body().outcome_achieved).toBe('saved');
      expect(q4().value).toBe('saved');
    });
  });
});
