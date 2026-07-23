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
  });

  it('should render impact outcomes for Policy Change and Investments', () => {
    metadata.set({ indicator_id: 4 });
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
    expect(fixture.nativeElement.textContent).not.toContain('Contribution to SDG');
  });

  it('should use default input callbacks', () => {
    expect(component.getShortDescription('A long description')).toBe('A long description');
    expect(component.canRemove({ id: 1 })).toBe(true);
    expect(() => component.markAsPrimary({ is_primary: false, contract_id: '1' }, 'contract')).not.toThrow();
  });
});
