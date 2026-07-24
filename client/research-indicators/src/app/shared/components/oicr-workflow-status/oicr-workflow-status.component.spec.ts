import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OicrWorkflowStatusComponent } from './oicr-workflow-status.component';

describe('OicrWorkflowStatusComponent', () => {
  let component: OicrWorkflowStatusComponent;
  let fixture: ComponentFixture<OicrWorkflowStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OicrWorkflowStatusComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(OicrWorkflowStatusComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should have workflowSteps with 4 steps', () => {
    fixture.detectChanges();
    expect(component.workflowSteps).toHaveLength(4);
    expect(component.workflowSteps.map(s => s.id)).toEqual([10, 12, 13, 14]);
    expect(component.workflowSteps.map(s => s.name)).toEqual(['ACCEPTED', 'SCIENCE EDITION', 'KM CURATION', 'PUBLISHED']);
  });

  describe('currentStatusIdNumber', () => {
    it('should return number when currentStatusId is number', () => {
      component.currentStatusId = 12;
      fixture.detectChanges();
      expect(component.currentStatusIdNumber()).toBe(12);
    });

    it('should return number when currentStatusId is string', () => {
      component.currentStatusId = '13';
      fixture.detectChanges();
      expect(component.currentStatusIdNumber()).toBe(13);
    });

    it('should return null when currentStatusId is null', () => {
      component.currentStatusId = null;
      fixture.detectChanges();
      expect(component.currentStatusIdNumber()).toBeNull();
    });
  });

  describe('isCurrentStep', () => {
    it('should return true when stepId matches currentStatusIdNumber', () => {
      component.currentStatusId = 14;
      fixture.detectChanges();
      expect(component.isCurrentStep(14)).toBe(true);
    });

    it('should return false when stepId does not match currentStatusIdNumber', () => {
      component.currentStatusId = 12;
      fixture.detectChanges();
      expect(component.isCurrentStep(10)).toBe(false);
      expect(component.isCurrentStep(13)).toBe(false);
    });

    it('should return false when currentStatusId is null', () => {
      component.currentStatusId = null;
      fixture.detectChanges();
      expect(component.isCurrentStep(10)).toBe(false);
    });
  });
});
