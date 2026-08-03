import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ProjectGeneralInfoComponent } from './project-general-info.component';

describe('ProjectGeneralInfoComponent', () => {
  let component: ProjectGeneralInfoComponent;
  let fixture: ComponentFixture<ProjectGeneralInfoComponent>;
  let projectUtilsService: { getLeverName: jest.Mock; hasField: jest.Mock };

  beforeEach(async () => {
    projectUtilsService = {
      getLeverName: jest.fn(() => 'Digital Inclusion'),
      hasField: jest.fn(() => true)
    };

    await TestBed.configureTestingModule({
      imports: [ProjectGeneralInfoComponent],
      providers: [{ provide: ProjectUtilsService, useValue: projectUtilsService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectGeneralInfoComponent);
    component = fixture.componentInstance;
    component.project = {
      project_lead_description: 'Jane Doe',
      lever: 'Digital Inclusion',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    };
  });

  it('should create', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should delegate lever name resolution to ProjectUtilsService', () => {
    expect(component.getLeverName()).toBe('Digital Inclusion');
    expect(projectUtilsService.getLeverName).toHaveBeenCalledWith(component.project);
  });

  it('should delegate field availability checks to ProjectUtilsService', () => {
    expect(component.hasField('lever')).toBe(true);
    expect(projectUtilsService.hasField).toHaveBeenCalledWith(component.project, 'lever');
  });
});
