import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllianceLeverCardComponent } from './alliance-lever-card.component';

describe('AllianceLeverCardComponent', () => {
  let fixture: ComponentFixture<AllianceLeverCardComponent>;
  let component: AllianceLeverCardComponent;

  const baseLever = {
    lever_id: 1,
    result_lever_id: 0,
    result_id: 0,
    lever_role_id: 1,
    is_primary: true,
    short_name: 'L',
    other_names: '',
    result_lever_sdgs: [],
    result_lever_sdg_targets: [],
    result_lever_strategic_outcomes: []
  } as const;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllianceLeverCardComponent]
    })
      .overrideComponent(AllianceLeverCardComponent, {
        set: {
          template:
            '<button type="button" data-testid="remove" (click)="removeLever.emit()">remove</button>',
          imports: []
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AllianceLeverCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('lever', { ...baseLever });
    fixture.componentRef.setInput(
      'sdgSignal',
      signal({ result_lever_sdgs: [], result_lever_sdg_targets: [] })
    );
    fixture.componentRef.setInput('outcomeSignal', signal({ result_lever_strategic_outcomes: [] }));
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should expose allowRemove and selectedItemsSurfaceColor', () => {
    expect(component.allowRemove()).toBe(true);
    expect(component.selectedItemsSurfaceColor).toBe('#E8EBED');
  });

  it('should emit removeLever when remove is clicked', () => {
    jest.spyOn(component.removeLever, 'emit');
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('[data-testid="remove"]')?.dispatchEvent(new Event('click'));
    expect(component.removeLever.emit).toHaveBeenCalled();
  });

  it('should identify Other lever by CLARISA lever id 9', () => {
    fixture.componentRef.setInput('lever', { ...baseLever, lever_id: 9 });
    expect(component.isOtherLever()).toBe(true);
  });

  it('should return false when lever is not Other', () => {
    fixture.componentRef.setInput('lever', { ...baseLever, lever_id: 1 });
    expect(component.isOtherLever()).toBe(false);
  });
});
