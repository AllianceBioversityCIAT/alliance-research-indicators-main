import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectContextStripComponent } from './project-context-strip.component';
import { GetProjectDetail } from '@shared/interfaces/get-project-detail.interface';

describe('ProjectContextStripComponent', () => {
  let component: ProjectContextStripComponent;
  let fixture: ComponentFixture<ProjectContextStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectContextStripComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectContextStripComponent);
    component = fixture.componentInstance;
  });

  it('creates component in initial empty state', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.hasAnyContext()).toBe(false);
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  describe('Full context rendering', () => {
    const fullProject: GetProjectDetail = {
      agreement_id: 'AG-100',
      grant_amount_usd: 1500000,
      center_amount_usd: 500000,
      funding_type: 'Bilateral',
      contract_status: 'Active',
      start_date: '2023-01-01',
      end_date: '2025-12-31',
      extension_date: '2026-06-30',
      sdgs: [1, 2, 13],
      cgiar_entities: [
        { code: 'CIAT', name: 'International Center for Tropical Agriculture' },
        { code: 'CIP', name: 'International Potato Center' }
      ]
    };

    it('renders all context chips when full project data is provided', () => {
      fixture.componentRef.setInput('project', fullProject);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(component.hasAnyContext()).toBe(true);
      expect(text).toContain('Project Context');
      expect(text).toContain('$1,500,000 USD');
      expect(text).toContain('$500,000 USD');
      expect(text).toContain('Bilateral');
      expect(text).toContain('Active');
      expect(text).toContain('SDG 1');
      expect(text).toContain('SDG 2');
      expect(text).toContain('SDG 13');
      expect(text).toContain('CIAT');
      expect(text).toContain('CIP');

      const progressBar = fixture.nativeElement.querySelector('[role="progressbar"]');
      expect(progressBar).not.toBeNull();
      expect(text).toContain('Extension:');
    });
  });

  describe('S2 No-fabrication rule', () => {
    it('does not render chips or placeholders (0, N/A, -) when fields are null', () => {
      const nullFieldsProject: GetProjectDetail = {
        agreement_id: 'AG-200',
        grant_amount: null as any,
        grant_amount_usd: null,
        center_amount_usd: null,
        funding_type: null,
        contract_status: null,
        status_name: undefined,
        start_date: undefined,
        end_date: undefined,
        extension_date: null,
        sdgs: null as any,
        cgiar_entities: null as any
      };

      fixture.componentRef.setInput('project', nullFieldsProject);
      fixture.detectChanges();

      expect(component.hasAnyContext()).toBe(false);
      expect(component.grantAmount()).toBeNull();
      expect(component.centerAmount()).toBeNull();
      expect(component.fundingType()).toBeNull();
      expect(component.contractStatus()).toBeNull();
      expect(component.timeline()).toBeNull();
      expect(component.sdgs()).toEqual([]);
      expect(component.cgiarEntities()).toEqual([]);
      expect(fixture.nativeElement.querySelector('section')).toBeNull();
    });

    it('renders only present fields for partial data without placeholder chips', () => {
      const partialProject: GetProjectDetail = {
        agreement_id: 'AG-300',
        grant_amount_usd: 2500000,
        funding_type: 'Pool Funding',
        center_amount_usd: null,
        contract_status: undefined,
        start_date: undefined,
        end_date: undefined,
        sdgs: [],
        cgiar_entities: []
      };

      fixture.componentRef.setInput('project', partialProject);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(component.hasAnyContext()).toBe(true);
      expect(text).toContain('$2,500,000 USD');
      expect(text).toContain('Pool Funding');
      expect(text).not.toContain('Center Budget');
      expect(text).not.toContain('Status');
      expect(text).not.toContain('Timeline');
      expect(text).not.toContain('SDGs:');
      expect(text).not.toContain('Entities:');
      expect(text).not.toContain('N/A');
      expect(text).not.toContain('$0');
    });
  });

  describe('Timeline computation and clamping', () => {
    it('clamps elapsed percent to 0 for future dates', () => {
      const futureProject: GetProjectDetail = {
        start_date: '2090-01-01',
        end_date: '2095-01-01'
      };

      fixture.componentRef.setInput('project', futureProject);
      fixture.detectChanges();

      const tl = component.timeline();
      expect(tl).not.toBeNull();
      expect(tl!.elapsedPercent).toBe(0);
      expect(tl!.isExtended).toBe(false);
      expect(tl!.extensionDate).toBeNull();
    });

    it('clamps elapsed percent to 100 for past dates', () => {
      const pastProject: GetProjectDetail = {
        start_date: '2010-01-01',
        end_date: '2015-01-01'
      };

      fixture.componentRef.setInput('project', pastProject);
      fixture.detectChanges();

      const tl = component.timeline();
      expect(tl).not.toBeNull();
      expect(tl!.elapsedPercent).toBe(100);
      expect(tl!.isExtended).toBe(false);
    });

    it('returns null timeline if start or end date is invalid or missing', () => {
      fixture.componentRef.setInput('project', { start_date: 'invalid-date', end_date: '2025-01-01' });
      fixture.detectChanges();
      expect(component.timeline()).toBeNull();

      fixture.componentRef.setInput('project', { start_date: '2023-01-01', end_date: undefined });
      fixture.detectChanges();
      expect(component.timeline()).toBeNull();
    });

    it('renders extension date distinctly when extension_date is present', () => {
      const extendedProject: GetProjectDetail = {
        start_date: '2020-01-01',
        end_date: '2024-12-31',
        extension_date: '2025-12-31'
      };

      fixture.componentRef.setInput('project', extendedProject);
      fixture.detectChanges();

      const tl = component.timeline();
      expect(tl).not.toBeNull();
      expect(tl!.isExtended).toBe(true);
      expect(tl!.extensionDate).toBe('2025-12-31');

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Extension: 31/12/2025');
    });
  });

  describe('Currency formatting', () => {
    it('formats numeric values and valid numeric strings with USD unit', () => {
      fixture.componentRef.setInput('project', { grant_amount_usd: 1250000, center_amount_usd: '450000' });
      fixture.detectChanges();

      expect(component.grantAmount()).toBe('$1,250,000 USD');
      expect(component.centerAmount()).toBe('$450,000 USD');
    });

    it('falls back to grant_amount if grant_amount_usd is not provided', () => {
      fixture.componentRef.setInput('project', { grant_amount: 800000 });
      fixture.detectChanges();

      expect(component.grantAmount()).toBe('$800,000 USD');
    });

    it('returns null for unparseable amounts', () => {
      fixture.componentRef.setInput('project', { grant_amount_usd: 'not-a-number' });
      fixture.detectChanges();

      expect(component.grantAmount()).toBeNull();
    });
  });

  describe('SDG and CGIAR entity chips', () => {
    it('maps SDG numbers and strings to SDG labels', () => {
      fixture.componentRef.setInput('project', { sdgs: [1, '2', 'SDG 13', 'sdg 15'] });
      fixture.detectChanges();

      expect(component.sdgs()).toEqual(['SDG 1', 'SDG 2', 'SDG 13', 'SDG 15']);
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('SDG 1');
      expect(text).toContain('SDG 15');
    });

    it('filters out empty SDG entries', () => {
      fixture.componentRef.setInput('project', { sdgs: [null as any, '', '  ', 4] });
      fixture.detectChanges();

      expect(component.sdgs()).toEqual(['SDG 4']);
    });

    // Regression — validation F-1 (2026-08-22): the server sends ClarisaSdg OBJECTS
    // (agresso_contracts.sdgs json column); String(object) rendered "SDG [object Object]".
    it('maps ClarisaSdg objects to their short_name, never "[object Object]"', () => {
      fixture.componentRef.setInput('project', {
        sdgs: [
          { id: 2, short_name: 'SDG 2', full_name: 'Zero Hunger' },
          { id: 13, short_name: 'SDG 13', full_name: 'Climate Action' },
          { id: 7, full_name: 'Affordable and Clean Energy' },
          { id: 5 }
        ] as any
      });
      fixture.detectChanges();

      expect(component.sdgs()).toEqual(['SDG 2', 'SDG 13', 'SDG 7', 'SDG 5']);
      const text = fixture.nativeElement.textContent;
      expect(text).not.toContain('[object Object]');
      expect(text).toContain('SDG 13');
    });

    it('renders CGIAR entities with code or name', () => {
      fixture.componentRef.setInput('project', {
        cgiar_entities: [
          { code: 'CIAT', name: 'International Center for Tropical Agriculture' },
          { name: 'Bioversity' }
        ]
      });
      fixture.detectChanges();

      expect(component.cgiarEntities().length).toBe(2);
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('CIAT');
      expect(text).toContain('Bioversity');
    });

    it('renders secondary context without primary context or gap artifacts when only SDGs exist (layout stability)', () => {
      fixture.componentRef.setInput('project', {
        sdgs: [1, 2]
      });
      fixture.detectChanges();

      expect(component.hasPrimaryContext()).toBe(false);
      expect(component.hasSecondaryContext()).toBe(true);
      expect(component.hasAnyContext()).toBe(true);

      const section = fixture.nativeElement.querySelector('section');
      expect(section).toBeTruthy();

      // Primary container should not exist in DOM
      const primaryContainer = section.querySelector('.flex.flex-wrap.items-stretch.gap-3');
      expect(primaryContainer).toBeNull();

      // Secondary container should exist without border-t
      const secondaryContainer = section.querySelector('[aria-label="Sustainable Development Goals"]')?.parentElement;
      expect(secondaryContainer).toBeTruthy();
      expect(secondaryContainer?.classList.contains('border-t')).toBe(false);
    });
  });
});
