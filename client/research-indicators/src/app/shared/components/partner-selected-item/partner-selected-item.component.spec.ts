import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartnerSelectedItemComponent } from './partner-selected-item.component';
import { environment } from '../../../../environments/environment';

describe('PartnerSelectedItemComponent', () => {
  let component: PartnerSelectedItemComponent;
  let fixture: ComponentFixture<PartnerSelectedItemComponent>;

  const mockInstitution = {
    acronym: 'TEST',
    name: 'Test Institution',
    institution_type: {
      name: 'Research'
    },
    isoAlpha2: 'US'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerSelectedItemComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PartnerSelectedItemComponent);
    component = fixture.componentInstance;
    component.institution = mockInstitution;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display institution acronym and name', () => {
    const compiled = fixture.nativeElement;
    const content = compiled.textContent;
    expect(content).toContain(mockInstitution.acronym);
    expect(content).toContain(mockInstitution.name);
  });

  it('should display institution type', () => {
    const compiled = fixture.nativeElement;
    const content = compiled.textContent;
    expect(content).toContain(mockInstitution.institution_type.name);
  });

  it('should have correct flag image source', () => {
    const compiled = fixture.nativeElement;
    const flagImg = compiled.querySelector('img');
    expect(flagImg.src).toContain(environment.flagsUrl + mockInstitution.isoAlpha2 + '.svg');
    expect(flagImg.alt).toContain(mockInstitution.institution_type.name);
  });

  it('should handle missing institution data gracefully', () => {
    component.institution = {};
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });
});
