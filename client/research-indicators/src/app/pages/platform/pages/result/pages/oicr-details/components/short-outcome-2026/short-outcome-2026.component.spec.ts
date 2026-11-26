import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ShortOutcome2026Component } from './short-outcome-2026.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { PatchOicr } from '@shared/interfaces/oicr-creation.interface';
import { QuantificationItemData } from '@components/quantification-item/quantification-item.component';

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

  describe('Q4 follows the Actual count narratives', () => {
    const quants: QuantificationItemData[] = [
      { number: 1, unit: 'Farmers', comments: 'Trained 200 farmers', unit_macro_category: 'Individuals' },
      { number: 2, unit: '', comments: '   ' },
      { number: 3, unit: 'Yield', comments: 'Yield went up' }
    ];

    it('prefills `<unit>: <comment>` per line, only rows with a comment, and shows the Taken from chips', () => {
      setup({}, quants);
      expect(body().outcome_achieved).toBe('Farmers: Trained 200 farmers\nYield: Yield went up');
      expect(body().outcome_achieved_edited).toBeFalsy();
      expect(q4().value).toBe('Farmers: Trained 200 farmers\nYield: Yield went up');
      expect(text('[data-testid="q4-sources"]')).toContain('ACTUAL COUNT # 1 · Farmers');
      expect(text('[data-testid="q4-sources"]')).toContain('Taken from:');
      expect(text('[data-testid="q4-sources"]')).toContain('ACTUAL COUNT # 3 · Yield');
      expect(text('[data-testid="q4-note"]')).toContain('Prefilled with the narratives from Quantification [Actual count]');
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="q4-restore"]')).toBeNull();
    });

    it('keeps following while the user has not edited (transition: starts empty, then narratives arrive)', () => {
      setup({}, []);
      expect(body().outcome_achieved ?? '').toBe('');
      expect(text('[data-testid="q4-note"]')).toContain('This answer fills in by itself');
      fixture.componentRef.setInput('quantifications', quants);
      flush();
      expect(body().outcome_achieved).toBe('Farmers: Trained 200 farmers\nYield: Yield went up');
      fixture.componentRef.setInput('quantifications', [{ number: 1, unit: '', comments: 'Only a comment' }]);
      flush();
      expect(body().outcome_achieved).toBe('Only a comment');
    });

    it('typing in Q4 marks it edited, stops following, hides the chips and offers Restore', () => {
      setup({}, quants);
      q4().value = 'My own words';
      q4().dispatchEvent(new Event('input'));
      flush();
      expect(body().outcome_achieved).toBe('My own words');
      expect(body().outcome_achieved_edited).toBe(true);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="q4-sources"]')).toBeNull();
      expect(text('[data-testid="q4-note"]')).toContain('Edited by hand');

      fixture.componentRef.setInput('quantifications', [{ number: 1, unit: 'Farmers', comments: 'Changed narrative' }]);
      flush();
      expect(body().outcome_achieved).toBe('My own words');
    });

    it('Restore from Quantification brings the narratives back and clears the edited flag', () => {
      setup({ outcome_achieved: 'My own words', outcome_achieved_edited: true }, quants);
      expect(body().outcome_achieved).toBe('My own words');
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="q4-restore"]')!.click();
      flush();
      expect(body().outcome_achieved_edited).toBe(false);
      expect(body().outcome_achieved).toBe('Farmers: Trained 200 farmers\nYield: Yield went up');
      expect(text('[data-testid="q4-sources"]')).toContain('ACTUAL COUNT # 1 · Farmers');
    });

    it('a saved result with edited=false is brought back in line with the narratives on load', () => {
      setup({ outcome_achieved: 'stale server text', outcome_achieved_edited: false }, quants);
      expect(body().outcome_achieved).toBe('Farmers: Trained 200 farmers\nYield: Yield went up');
    });

    it('does not touch the body when disabled (external result / non-editable status)', () => {
      setup({ outcome_achieved: 'saved' }, quants, true);
      expect(body().outcome_achieved).toBe('saved');
      q4().dispatchEvent(new Event('input'));
      expect(body().outcome_achieved_edited).toBeFalsy();
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="q4-restore"]')).toBeNull();
    });
  });
});
