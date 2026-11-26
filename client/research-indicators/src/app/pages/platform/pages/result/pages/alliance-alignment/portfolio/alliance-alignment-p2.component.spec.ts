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

  describe('OICR primary and contributing Research Areas', () => {
    const area = (lever_id: number, is_primary?: boolean | number) => ({ lever_id, full_name: `Area ${lever_id}`, is_primary }) as never;
    // The parent passes `body` once and then updates it, so the load updates the same signal.
    const body = () => component.body() as unknown as Record<string, unknown>;
    const load = (research_areas: unknown[]) => {
      component.body.update(current => ({ ...current, research_areas: research_areas as never }));
      fixture.detectChanges();
    };
    const ids = (list: { lever_id?: number | string }[]) => list.map(item => Number(item.lever_id));

    it('splits the saved areas by their flag, a missing flag counting as primary', () => {
      load([area(1, true), area(2, 0), area(3), area(4, false)]);

      expect(ids(component.primaryAreas().research_areas)).toEqual([1, 3]);
      expect(ids(component.contributingAreas().research_areas)).toEqual([2, 4]);
    });

    it('disables in each field what the other one holds', () => {
      load([area(1, true), area(2, false)]);

      expect(ids(component.contributingAreasDisabled())).toEqual([1]);
      expect(ids(component.primaryAreasDisabled())).toEqual([2]);
    });

    it('writes a contributing pick back to the saved list as not primary, keeping the primary one', () => {
      load([area(1, true)]);

      component.contributingAreas.set({ research_areas: [area(5)] });
      fixture.detectChanges();

      const saved = body()['research_areas'] as { lever_id: number; is_primary: boolean }[];
      expect(saved.map(row => [row.lever_id, row.is_primary])).toEqual([
        [1, true],
        [5, false]
      ]);
      expect(ids(component.primaryAreasDisabled())).toEqual([5]);
    });

    it('removing an area from a field removes it from the saved list', () => {
      load([area(1, true), area(2, false)]);

      component.primaryAreas.set({ research_areas: [] });
      fixture.detectChanges();

      expect(ids(body()['research_areas'] as never[])).toEqual([2]);
    });

    it('keeps the "Other" team name when the area moves through a field', () => {
      load([{ lever_id: 18, full_name: 'Other', is_primary: true, custom_lever_name: 'My team' } as never]);

      component.contributingAreas.set({ research_areas: [area(2)] });
      fixture.detectChanges();

      const other = (body()['research_areas'] as { lever_id: number; custom_lever_name?: string }[]).find(row => row.lever_id === 18);
      expect(other?.custom_lever_name).toBe('My team');
    });

    it('leaves the single Research Areas list alone outside OICRs', () => {
      metadata.set({ indicator_id: 4 });
      load([area(1, false), area(2, true)]);

      component.contributingAreas.set({ research_areas: [] });
      fixture.detectChanges();

      expect(ids(body()['research_areas'] as never[])).toEqual([1, 2]);
    });
  });
});
