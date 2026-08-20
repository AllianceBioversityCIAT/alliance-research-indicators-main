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
});
