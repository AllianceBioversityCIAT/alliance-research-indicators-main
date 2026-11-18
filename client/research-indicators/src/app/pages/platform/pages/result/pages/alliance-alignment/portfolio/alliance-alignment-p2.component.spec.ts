import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { AllianceAlignmentP2Component } from './alliance-alignment-p2.component';

describe('AllianceAlignmentP2Component', () => {
  let fixture: ComponentFixture<AllianceAlignmentP2Component>;
  let component: AllianceAlignmentP2Component;
  let metadata = signal<Record<string, unknown>>({ indicator_id: 5 });

  beforeEach(async () => {
    metadata = signal<Record<string, unknown>>({ indicator_id: 5 });
    await TestBed.configureTestingModule({
      imports: [AllianceAlignmentP2Component],
      providers: [
        { provide: CacheService, useValue: { currentMetadata: () => metadata() } },
        { provide: SubmissionService, useValue: { isEditableStatus: jest.fn().mockReturnValue(true) } }
      ]
    })
      .overrideComponent(AllianceAlignmentP2Component, {
        set: {
          imports: [],
          template: `
            <span>Research Areas</span>
            <span>Strategic Objectives</span>
            @if (shouldShowImpactOutcomes()) {
              <span>Impact Outcomes</span>
            }
            @if (isOicrIndicator()) {
              <span>SDG Targets</span>
            }
            @if (!isOicrIndicator()) {
              <span>Contribution to SDG</span>
            }
          `
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AllianceAlignmentP2Component);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('body', signal({ contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] }));
    fixture.detectChanges();
  });

  it('should render P2 portfolio fields for OICR', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Research Areas');
    expect(text).toContain('Strategic Objectives');
    expect(text).toContain('Impact Outcomes');
    expect(text).toContain('SDG Targets');
  });

  it('should render impact outcomes for Policy Change and Investments', () => {
    metadata.set({ indicator_id: 4 });
    fixture.detectChanges();
    expect(component.shouldShowImpactOutcomes()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Impact Outcomes');
  });

  it('should render impact outcomes for Innovation Use', () => {
    metadata.set({ indicator_id: 6 });
    fixture.detectChanges();
    expect(component.shouldShowImpactOutcomes()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Impact Outcomes');
  });

  it('should hide impact outcomes for non-OICR and non-Policy Change indicators', () => {
    metadata.set({ indicator_id: 1 });
    fixture.detectChanges();
    expect(component.shouldShowImpactOutcomes()).toBe(false);
    expect(component.isOicrIndicator()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Impact Outcomes');
    expect(fixture.nativeElement.textContent).toContain('Contribution to SDG');
  });

  it('should hide SDGs for OICR and show impact outcomes', () => {
    metadata.set({ indicator_id: 5 });
    fixture.detectChanges();
    expect(component.isOicrIndicator()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Impact Outcomes');
    expect(fixture.nativeElement.textContent).toContain('SDG Targets');
    expect(fixture.nativeElement.textContent).not.toContain('Contribution to SDG');
  });

  describe('"Other" Research Area (18)', () => {
    const area = (lever_id: number, extra: Record<string, unknown> = {}) =>
      ({ id: lever_id, lever_id, full_name: `Area ${lever_id}`, ...extra }) as never;
    // The parent hands one body signal for the life of the section and writes into it (load, picks).
    const setAreas = (research_areas: unknown[]) => {
      const body = component.body as unknown as ReturnType<
        typeof signal<{ research_areas: { lever_id: number; custom_lever_name?: string }[] }>
      >;
      body.update(current => ({ ...current, research_areas: research_areas as never }));
      return body;
    };

    it('is no longer filtered out of the options, so it can be picked in this section', () => {
      expect((component as unknown as Record<string, unknown>)['researchAreaOptionFilter']).toBeUndefined();
      expect(component.isOtherResearchArea({ lever_id: 18 })).toBe(true);
      expect(component.isOtherResearchArea({ id: '18' })).toBe(true);
      expect(component.isOtherResearchArea({ lever_id: 12 })).toBe(false);
    });

    it('shows the team name saved in the OICR modal', () => {
      setAreas([area(18, { custom_lever_name: 'ImpactSF team' })]);
      fixture.detectChanges();

      expect(component.getCustomNameSignal(area(18))().custom_lever_name).toBe('ImpactSF team');
    });

    it('copies a typed team name onto the "Other" row only, which the save sends', () => {
      const body = setAreas([area(18), area(12)]);
      fixture.detectChanges();
      expect(body().research_areas[0].custom_lever_name).toBeUndefined();

      component.getCustomNameSignal(area(18)).set({ custom_lever_name: 'Accelerate team' });
      fixture.detectChanges();

      expect(body().research_areas[0].custom_lever_name).toBe('Accelerate team');
      expect(body().research_areas[1].custom_lever_name).toBeUndefined();
    });

    it('keeps the team name when "Other" is removed and picked again', () => {
      const body = setAreas([area(18, { custom_lever_name: 'Kept' })]);
      fixture.detectChanges();

      body.set({ ...body(), research_areas: [] });
      fixture.detectChanges();
      body.set({ ...body(), research_areas: [area(18)] });
      fixture.detectChanges();

      expect(body().research_areas[0].custom_lever_name).toBe('Kept');
    });
  });

  it('should use default input callbacks', () => {
    expect(component.getShortDescription('A long description')).toBe('A long description');
    expect(component.canRemove({ id: 1 })).toBe(true);
    expect(() => component.markAsPrimary({ is_primary: false, contract_id: '1' }, 'contract')).not.toThrow();
  });
});
