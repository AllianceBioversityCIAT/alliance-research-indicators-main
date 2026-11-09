import { ComponentFixture, TestBed } from '@angular/core/testing';
import ReportingComponent from './reporting.component';

describe('ReportingComponent', () => {
  let component: ReportingComponent;
  let fixture: ComponentFixture<ReportingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('starts on question 1 with no trail', () => {
      expect(component.showQ1()).toBe(true);
      expect(component.showQ2()).toBe(false);
      expect(component.showResult()).toBe(false);
      expect(component.showTrail()).toBe(false);
      expect(component.stepLabel()).toBe('');
    });
  });

  describe('fixed indicators (no funding question)', () => {
    it('routes Knowledge Product straight to TIP', () => {
      component.setIndicator('kp');

      expect(component.showQ2()).toBe(false);
      expect(component.showResult()).toBe(true);
      expect(component.resultName()).toBe('TIP');
      expect(component.resultUrl()).toBe('https://tip.alliance.cgiar.org/');
      expect(component.resultSupport()).toBe('DMOS');
    });

    it('routes Outcome Impact Case Report straight to STAR', () => {
      component.setIndicator('oicr');

      expect(component.showResult()).toBe(true);
      expect(component.resultName()).toBe('STAR');
      expect(component.resultUrl()).toBe('https://star.alliance.cgiar.org/');
    });
  });

  describe('funding indicators (ask funding source)', () => {
    it('asks for funding after a funding-type indicator', () => {
      component.setIndicator('cap');

      expect(component.showResult()).toBe(false);
      expect(component.showQ2()).toBe(true);
      expect(component.stepLabel()).toBe('Step 2 of 2');
    });

    it('W3/bilateral funding routes to STAR', () => {
      component.setIndicator('innovDev');
      component.setFunding('w3');

      expect(component.showResult()).toBe(true);
      expect(component.resultName()).toBe('STAR');
    });

    it('CGIAR Program/Accelerator funding routes to PRMS', () => {
      component.setIndicator('policy');
      component.setFunding('program');

      expect(component.showResult()).toBe(true);
      expect(component.resultName()).toBe('PRMS');
      expect(component.resultUrl()).toBe('https://reporting.cgiar.org/');
      expect(component.resultSupport()).toBe('CGIAR Reporting Support Team');
    });
  });

  describe('breadcrumb trail', () => {
    it('shows the indicator chip after Q1', () => {
      component.setIndicator('cap');

      expect(component.showTrail()).toBe(true);
      expect(component.chips().map(c => c.label)).toEqual(['Capacity Sharing for Development']);
    });

    it('shows indicator + funding chips after Q2', () => {
      component.setIndicator('innovUse');
      component.setFunding('w3');

      expect(component.chips().map(c => c.label)).toEqual(['Innovation Use', 'W3 or bilateral project']);
    });

    it('indicator chip edit resets to the start', () => {
      component.setIndicator('cap');
      component.chips()[0].edit();

      expect(component.showQ1()).toBe(true);
      expect(component.showTrail()).toBe(false);
    });

    it('funding chip edit clears only the funding answer', () => {
      component.setIndicator('cap');
      component.setFunding('program');
      component.chips()[1].edit();

      expect(component.showQ2()).toBe(true);
      expect(component.showResult()).toBe(false);
    });
  });

  describe('navigation', () => {
    it('goBack from the result clears funding first', () => {
      component.setIndicator('cap');
      component.setFunding('program');
      expect(component.showResult()).toBe(true);

      component.goBack();

      expect(component.showQ2()).toBe(true);
      expect(component.showResult()).toBe(false);
    });

    it('goBack from the funding question returns to Q1', () => {
      component.setIndicator('cap');
      component.goBack();

      expect(component.showQ1()).toBe(true);
    });

    it('startOver clears everything', () => {
      component.setIndicator('cap');
      component.setFunding('w3');
      component.startOver();

      expect(component.showQ1()).toBe(true);
      expect(component.showTrail()).toBe(false);
    });

    it('picking a new indicator clears a previous funding answer', () => {
      component.setIndicator('cap');
      component.setFunding('program');
      component.setIndicator('kp');

      expect(component.funding()).toBeNull();
      expect(component.resultName()).toBe('TIP');
    });
  });

  describe('why-reporting intro and platform cards', () => {
    it('toggleWhy flips the expanded flag', () => {
      expect(component.whyExpanded()).toBe(false);
      component.toggleWhy();
      expect(component.whyExpanded()).toBe(true);
      component.toggleWhy();
      expect(component.whyExpanded()).toBe(false);
    });

    it('togglePlatform expands and collapses each card independently', () => {
      expect(component.isPlatformExpanded('TIP')).toBe(false);
      component.togglePlatform('TIP');
      component.togglePlatform('STAR');
      expect(component.isPlatformExpanded('TIP')).toBe(true);
      expect(component.isPlatformExpanded('STAR')).toBe(true);
      component.togglePlatform('TIP');
      expect(component.isPlatformExpanded('TIP')).toBe(false);
      expect(component.isPlatformExpanded('STAR')).toBe(true);
    });
  });

  describe('faqs and responsibility per step', () => {
    it('shows the landing FAQs on Q1', () => {
      expect(component.faqsTitle()).toBe('Common questions');
      expect(component.faqs()[0].q).toBe('Who is responsible for reporting?');
    });

    it('shows the funding FAQs on Q2', () => {
      component.setIndicator('cap');
      expect(component.faqsTitle()).toBe('Common questions — funding sources');
      expect(component.faqs()[0].q).toBe('What are the CGIAR funding streams and what do they mean?');
    });

    it('shows the platform FAQs on the result screen', () => {
      component.setIndicator('kp');
      expect(component.faqsTitle()).toBe('Common questions — reporting platforms');
      expect(component.faqs()[0].q).toBe('How does reporting contribute to performance monitoring?');
    });

    it('names the responsible team by platform', () => {
      component.setIndicator('kp');
      expect(component.resultResponsibility()).toBe('PI and research team');
      component.setIndicator('cap');
      component.setFunding('program');
      expect(component.resultResponsibility()).toBe('PI and the Science Program/Accelerator team');
    });

    it('exposes result details of the chosen platform and indicator', () => {
      component.setIndicator('kp');
      expect(component.resultWhy()).toContain('TIP');
      expect(component.resultLogo()).toBe('images/tracking.svg');
      expect(component.resultTopBorder()).toBe('border-t-[#E8862A]');
      expect(component.resultInk()).toBe('text-[#94500F]');
      expect(component.resultBtn()).toContain('bg-[#94500F]');
      expect(component.resultEvidence()).toContain('DOI');
      expect(component.resultPitfall()).toContain('Drafts');
    });

    it('returns empty/default result details before a result exists', () => {
      expect(component.resultName()).toBe('');
      expect(component.resultUrl()).toBe('#');
      expect(component.resultSupport()).toBe('');
      expect(component.resultWhy()).toBe('');
      expect(component.resultLogo()).toBe('');
      expect(component.resultTopBorder()).toBe('');
      expect(component.resultInk()).toBe('');
      expect(component.resultBtn()).toBe('');
      expect(component.resultEvidence()).toBe('');
      expect(component.resultPitfall()).toBe('');
    });

    it('yields no outcome for an unknown funding id', () => {
      component.setIndicator('cap');
      component.funding.set('unknown' as never);
      expect(component.showResult()).toBe(false);
    });
  });
});
