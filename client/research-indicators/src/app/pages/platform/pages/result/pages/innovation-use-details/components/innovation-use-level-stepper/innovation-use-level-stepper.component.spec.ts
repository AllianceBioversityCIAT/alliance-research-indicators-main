// @akili-spec docs/specs/innovation-use/details-page (T-04 — innovation use level stepper)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InnovationUseLevelStepperComponent } from './innovation-use-level-stepper.component';
import { InnovationUseLevel } from '@shared/interfaces/get-innovation-use-levels.interface';

/**
 * Fixture transcribed verbatim from requirements.md §6.3 "The catalog — all ten rows"
 * (seeded by migration 1787066437593; id = level + 1). Four adjacent pairs
 * share a `name` (Partners, Connected next-user, Unconnected next-user,
 * End-user / Beneficiaries) so c8's "never resolve by name" claim has a
 * fixture that would actually expose a name-keyed lookup.
 */
const CATALOG: InnovationUseLevel[] = [
  { id: 1, level: 0, name: 'No use', definition: 'Innovation is not used.' },
  {
    id: 2,
    level: 1,
    name: 'Project lead organization',
    definition: 'Innovation is used by organization(s) leading the innovation development.'
  },
  {
    id: 3,
    level: 2,
    name: 'Partners',
    definition: 'Innovation is used by some partners involved in initial innovation development.'
  },
  {
    id: 4,
    level: 3,
    name: 'Partners',
    definition: 'Innovation is commonly used by partners involved in initial innovation development.'
  },
  {
    id: 5,
    level: 4,
    name: 'Connected next-user',
    definition:
      'Innovation is used by some organizations connected to partners involved in the initial innovation development.'
  },
  {
    id: 6,
    level: 5,
    name: 'Connected next-user',
    definition:
      'Innovation is commonly used by organizations connected to partners involved in the initial innovation development.'
  },
  {
    id: 7,
    level: 6,
    name: 'Unconnected next-user',
    definition:
      'Innovation is used by organizations not connected to partners involved in the initial innovation development.'
  },
  {
    id: 8,
    level: 7,
    name: 'Unconnected next-user',
    definition:
      'Innovation is commonly used by organizations not connected to partners involved in the initial innovation development.'
  },
  {
    id: 9,
    level: 8,
    name: 'End-user / Beneficiaries',
    definition:
      'Innovation is used by some end-users or beneficiaries who were not involved in the initial innovation development.'
  },
  {
    id: 10,
    level: 9,
    name: 'End-user / Beneficiaries',
    definition:
      'Innovation is commonly used by end-users or beneficiaries who were not involved in the initial innovation development.'
  }
];

describe('InnovationUseLevelStepperComponent', () => {
  let component: InnovationUseLevelStepperComponent;
  let fixture: ComponentFixture<InnovationUseLevelStepperComponent>;

  const buttonLabels = (): string[] =>
    fixture.debugElement.queryAll(By.css('button')).map(btn => (btn.nativeElement.textContent || '').trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InnovationUseLevelStepperComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseLevelStepperComponent);
    component = fixture.componentInstance;
  });

  // c1 — Ten buttons render labelled 0…9 in ascending `level` order, in the order the input array supplies.
  // Disqualifier: asserts the rendered LABELS in order, not a bare button count.
  describe('c1 — rendered labels, in order', () => {
    it('renders exactly the labels 0..9, in the order the input array supplies', () => {
      component.levels = CATALOG;
      fixture.detectChanges();

      expect(buttonLabels()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    });

    it('applies no client-side sort (DD-6): an out-of-order input renders in that same order', () => {
      const shuffled = [CATALOG[2], CATALOG[0], CATALOG[9], CATALOG[1]];
      component.levels = shuffled;
      fixture.detectChanges();

      expect(buttonLabels()).toEqual(['2', '0', '9', '1']);
    });
  });

  // c2 — Selecting the button labelled `6` emits `7`. THE TRAP.
  describe('c2 — emits the catalog id, not the level (the off-by-one trap)', () => {
    it('selecting the button labelled 6 emits 7', () => {
      component.levels = CATALOG;
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.levelSelected, 'emit');

      const level6Button = fixture.debugElement.queryAll(By.css('button')).find(btn => btn.nativeElement.textContent.trim() === '6')!;
      level6Button.nativeElement.click();

      expect(emitSpy).toHaveBeenCalledWith(7);
      expect(emitSpy).not.toHaveBeenCalledWith(6);
    });
  });

  // c3 — selectedLevelId = 7 highlights the button labelled `6` and shows the level-6 callout.
  describe('c3 — resolves selection by id, then compares level (the inverse trap)', () => {
    it('selectedLevelId = 7 highlights the button labelled 6 and shows the level-6 callout', () => {
      component.levels = CATALOG;
      component.selectedLevelId = 7;
      fixture.detectChanges();

      const level6Button = fixture.debugElement.queryAll(By.css('button')).find(btn => btn.nativeElement.textContent.trim() === '6')!;
      expect(component.isSelected(CATALOG[6])).toBe(true); // CATALOG[6] = { id: 7, level: 6, ... }
      expect(component.isSelected(CATALOG[7])).toBe(false); // CATALOG[7] = { id: 8, level: 7, ... } — adjacent id must NOT match
      expect(level6Button.nativeElement.className).toContain('bg-[var(--ac-light-blue-300)]');

      const calloutText = fixture.nativeElement.textContent as string;
      expect(calloutText).toContain('6 - Unconnected next-user');
      expect(calloutText).toContain(
        'Innovation is used by organizations not connected to partners involved in the initial innovation development.'
      );
    });

    it('does not highlight any button when selectedLevelId is undefined', () => {
      component.levels = CATALOG;
      fixture.detectChanges();

      expect(component.selectedLevel).toBeUndefined();
      CATALOG.forEach(level => expect(component.isSelected(level)).toBe(false));
    });
  });

  // c4 — The callout renders level, name, definition and asserts the absence of additional_guidance.
  describe('c4 — callout renders level/name/definition, never additional_guidance', () => {
    it('renders the level, name and definition of the selected row', () => {
      component.levels = CATALOG;
      component.selectedLevelId = 1;
      fixture.detectChanges();

      const calloutText = fixture.nativeElement.textContent as string;
      expect(calloutText).toContain('0 - No use');
      expect(calloutText).toContain('Innovation is not used.');
    });

    it('never renders additional_guidance, even when the row happens to carry one', () => {
      // The column does not exist on InnovationUseLevel; attach it anyway to prove the
      // template has no binding path that would surface it if the field were present.
      const rowWithGuidance = { ...CATALOG[0], additional_guidance: 'GUIDANCE-MARKER-XYZ' } as InnovationUseLevel;
      component.levels = [rowWithGuidance, ...CATALOG.slice(1)];
      component.selectedLevelId = 1;
      fixture.detectChanges();

      const calloutText = fixture.nativeElement.textContent as string;
      expect(calloutText).not.toContain('GUIDANCE-MARKER-XYZ');
    });
  });

  // c5 — An empty levels array renders zero buttons and the required message.
  describe('c5 — empty catalog renders zero buttons, not ten dead buttons', () => {
    it('renders no buttons and the required message', () => {
      component.levels = [];
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.css('button')).length).toBe(0);
      expect((fixture.nativeElement.textContent as string)).toContain('This field is required');
    });
  });

  // Lexical pin (rework attempt 2): jsdom loads no CSS, so this cannot prove fs-[14]/fs-[16]
  // resolve visually — it only proves the malformed unbracketed forms (fs-14, fs-16, rs-gap-1)
  // cannot silently return. The real gate for visual resolution is T-13 c7's human review.
  describe('template token classes — bracketed form only (lexical pin, not visual proof)', () => {
    it('the required-message span uses fs-[14], never the malformed fs-14', () => {
      component.levels = [];
      fixture.detectChanges();

      const span = fixture.debugElement.query(By.css('span')).nativeElement as HTMLElement;
      expect(span.className).toContain('fs-[14]');
      expect(span.className).not.toMatch(/\bfs-14\b/);
    });

    it('every stepper button uses fs-[16], never the malformed fs-16', () => {
      component.levels = CATALOG;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons.length).toBe(10);
      buttons.forEach(btn => {
        const className = (btn.nativeElement as HTMLElement).className;
        expect(className).toContain('fs-[16]');
        expect(className).not.toMatch(/\bfs-16\b/);
      });
    });
  });

  // c6 — Every button exposes an English aria-label; no Spanish string in the file (grepped separately).
  describe('c6 — English accessible names', () => {
    it('every button carries an English "Innovation use level {level}" aria-label', () => {
      component.levels = CATALOG;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons.length).toBe(10);
      buttons.forEach((btn, i) => {
        expect(btn.nativeElement.getAttribute('aria-label')).toBe(`Innovation use level ${CATALOG[i].level}`);
      });
    });
  });

  // c7 — disabled makes every button non-interactive.
  describe('c7 — disabled makes every button non-interactive', () => {
    it('sets the disabled attribute on every button and suppresses emission', () => {
      component.levels = CATALOG;
      component.disabled = true;
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.levelSelected, 'emit');

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      buttons.forEach(btn => expect(btn.nativeElement.disabled).toBe(true));

      component.selectLevel(CATALOG[6]);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('emits normally when not disabled', () => {
      component.levels = CATALOG;
      component.disabled = false;
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.levelSelected, 'emit');

      component.selectLevel(CATALOG[6]);
      expect(emitSpy).toHaveBeenCalledWith(7);
    });
  });

  // c8 — no code path resolves a level from `name` (grep evidence lives in the completion report).
  describe('c8 — never resolves by name', () => {
    it('isSelected keeps two same-named adjacent levels distinct (level 2 vs level 3, both "Partners")', () => {
      component.levels = CATALOG;
      component.selectedLevelId = 3; // id 3 -> level 2, name "Partners"
      fixture.detectChanges();

      expect(component.isSelected(CATALOG[2])).toBe(true); // level 2, "Partners"
      expect(component.isSelected(CATALOG[3])).toBe(false); // level 3, also "Partners" — must NOT also match
    });
  });
});
