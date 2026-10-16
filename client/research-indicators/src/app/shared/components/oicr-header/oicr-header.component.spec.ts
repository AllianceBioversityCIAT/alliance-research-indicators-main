import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { OicrHeaderComponent } from './oicr-header.component';
import { OicrHeaderData } from '@shared/interfaces/oicr-header-data.interface';
import { SubmissionService } from '@shared/services/submission.service';
import { CustomTagComponent } from '../custom-tag/custom-tag.component';
import { OicrWorkflowStatusComponent } from '../oicr-workflow-status/oicr-workflow-status.component';
import { CacheService } from '@services/cache/cache.service';

/** Stands in for the real download button so the header's own template can render. */
@Component({ selector: 'app-download-oicr-template', standalone: true, template: '' })
class StubDownloadOicrTemplateComponent {
  @Input() onlyIcon = false;
}

describe('OicrHeaderComponent', () => {
  let component: OicrHeaderComponent;
  let fixture: ComponentFixture<OicrHeaderComponent>;
  let mockSubmissionService: jest.Mocked<SubmissionService>;

  beforeEach(async () => {
    mockSubmissionService = {
      getStatusNameById: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [OicrHeaderComponent],
      providers: [
        { provide: SubmissionService, useValue: mockSubmissionService }
      ]
    })
      // avoid rendering dependencies; template rendering isn't required for TS coverage
      .overrideComponent(OicrHeaderComponent, { set: { template: '<div></div>' } })
      .compileComponents();

    fixture = TestBed.createComponent(OicrHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with defaults', () => {
    expect(component).toBeTruthy();
    expect(component.showDownload).toBe(false);
    expect(component.data).toBeNull();
  });

  it('should accept inputs for data and showDownload', () => {
    const mockData: OicrHeaderData = {
      title: 'Test OICR',
      agreement_id: 'AG123',
      description: 'Test description',
      project_lead_description: 'Lead description',
      start_date: '2024-01-01',
      endDateGlobal: '2024-12-31',
      lever: 'Test lever',
      leverUrl: 'https://example.com',
      leverFirst: 'First lever',
      leverSecond: 'Second lever',
      status_id: '1',
      status_name: 'Active'
    };
    
    component.data = mockData;
    component.showDownload = true;
    fixture.detectChanges();
    
    expect(component.data).toBe(mockData);
    expect(component.showDownload).toBe(true);
  });

  it('should handle null data input', () => {
    component.data = null;
    component.showDownload = false;
    fixture.detectChanges();
    
    expect(component.data).toBeNull();
    expect(component.showDownload).toBe(false);
  });

  it('should handle partial data input', () => {
    const partialData: OicrHeaderData = {
      title: 'Partial OICR',
      status_name: 'Draft'
    };
    
    component.data = partialData;
    fixture.detectChanges();
    
    expect(component.data).toBe(partialData);
    expect(component.data.title).toBe('Partial OICR');
    expect(component.data.status_name).toBe('Draft');
    expect(component.data.agreement_id).toBeUndefined();
  });

  it('should handle date inputs as strings', () => {
    const dataWithStringDates: OicrHeaderData = {
      start_date: '2024-01-01',
      endDateGlobal: '2024-12-31'
    };
    
    component.data = dataWithStringDates;
    fixture.detectChanges();
    
    expect(component.data.start_date).toBe('2024-01-01');
    expect(component.data.endDateGlobal).toBe('2024-12-31');
  });

  it('should handle date inputs as Date objects', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    const dataWithDateObjects: OicrHeaderData = {
      start_date: startDate,
      endDateGlobal: endDate
    };
    
    component.data = dataWithDateObjects;
    fixture.detectChanges();
    
    expect(component.data.start_date).toBe(startDate);
    expect(component.data.endDateGlobal).toBe(endDate);
  });

  it('should handle showDownload toggle', () => {
    expect(component.showDownload).toBe(false);
    
    component.showDownload = true;
    fixture.detectChanges();
    expect(component.showDownload).toBe(true);
    
    component.showDownload = false;
    fixture.detectChanges();
    expect(component.showDownload).toBe(false);
  });

  it('should handle showTag input', () => {
    expect(component.showTag).toBe(false);
    
    component.showTag = true;
    fixture.detectChanges();
    expect(component.showTag).toBe(true);
    
    component.showTag = false;
    fixture.detectChanges();
    expect(component.showTag).toBe(false);
  });


  it('should handle data with all properties', () => {
    const completeData: OicrHeaderData = {
      title: 'Complete OICR',
      agreement_id: 'AG-123',
      description: 'Complete description',
      project_lead_description: 'Complete lead description',
      start_date: '2024-01-01',
      endDateGlobal: '2024-12-31',
      lever: 'Complete lever',
      leverUrl: 'https://complete.example.com',
      leverFirst: 'Complete first',
      leverSecond: 'Complete second'
    };
    
    component.data = completeData;
    fixture.detectChanges();
    
    expect(component.data).toBe(completeData);
    expect(component.data.title).toBe('Complete OICR');
    expect(component.data.agreement_id).toBe('AG-123');
    expect(component.data.description).toBe('Complete description');
    expect(component.data.project_lead_description).toBe('Complete lead description');
    expect(component.data.start_date).toBe('2024-01-01');
    expect(component.data.endDateGlobal).toBe('2024-12-31');
    expect(component.data.lever).toBe('Complete lever');
    expect(component.data.leverUrl).toBe('https://complete.example.com');
    expect(component.data.leverFirst).toBe('Complete first');
    expect(component.data.leverSecond).toBe('Complete second');
  });

  it('should handle data with undefined properties', () => {
    const dataWithUndefined: OicrHeaderData = {
      title: 'Undefined Test',
      agreement_id: undefined,
      description: undefined,
      project_lead_description: undefined,
      start_date: undefined,
      endDateGlobal: undefined,
      lever: undefined,
      leverUrl: undefined,
      leverFirst: undefined,
      leverSecond: undefined
    };
    
    component.data = dataWithUndefined;
    fixture.detectChanges();
    
    expect(component.data).toBe(dataWithUndefined);
    expect(component.data.title).toBe('Undefined Test');
    expect(component.data.agreement_id).toBeUndefined();
    expect(component.data.description).toBeUndefined();
    expect(component.data.project_lead_description).toBeUndefined();
    expect(component.data.start_date).toBeUndefined();
    expect(component.data.endDateGlobal).toBeUndefined();
    expect(component.data.lever).toBeUndefined();
    expect(component.data.leverUrl).toBeUndefined();
    expect(component.data.leverFirst).toBeUndefined();
    expect(component.data.leverSecond).toBeUndefined();
  });

  describe('shouldShowWorkflow', () => {
    it('should return false when data is null', () => {
      expect(component.shouldShowWorkflow()).toBe(false);
    });

    it('should return false when data has no status_id', () => {
      const f = TestBed.createComponent(OicrHeaderComponent);
      const c = f.componentInstance;
      c.data = { title: 'No status' } as OicrHeaderData;
      f.detectChanges();
      expect(c.shouldShowWorkflow()).toBe(false);
    });

    it('should return true when status_id is in intermediateStatusIds', () => {
      const f = TestBed.createComponent(OicrHeaderComponent);
      const c = f.componentInstance;
      c.data = { status_id: 12 } as OicrHeaderData;
      f.detectChanges();
      expect(c.shouldShowWorkflow()).toBe(true);
    });

    it('should return true when status_id is string and in intermediateStatusIds', () => {
      const f = TestBed.createComponent(OicrHeaderComponent);
      const c = f.componentInstance;
      c.data = { status_id: '14' } as OicrHeaderData;
      f.detectChanges();
      expect(c.shouldShowWorkflow()).toBe(true);
    });

    it('should return false when status_id is not in intermediateStatusIds', () => {
      const f = TestBed.createComponent(OicrHeaderComponent);
      const c = f.componentInstance;
      c.data = { status_id: 99 } as OicrHeaderData;
      f.detectChanges();
      expect(c.shouldShowWorkflow()).toBe(false);
    });
  });

  describe('handle link button', () => {
    it('showHandleLinkButton should be true when published and cgspace_link is set', () => {
      component.showDownload = true;
      component.data = { status_id: '14' } as OicrHeaderData;
      component.cgspaceLink = 'https://hdl.handle.net/10568/182058';
      fixture.detectChanges();
      expect(component.showHandleLinkButton()).toBe(true);
      expect(component.canDownloadTemplate()).toBe(false);
      expect(component.showDownloadTemplate()).toBe(false);
    });

    it('showHandleLinkButton should be false when not published', () => {
      component.showDownload = true;
      component.data = { status_id: '11' } as OicrHeaderData;
      component.cgspaceLink = 'https://hdl.handle.net/10568/182058';
      fixture.detectChanges();
      expect(component.showHandleLinkButton()).toBe(false);
      expect(component.canDownloadTemplate()).toBe(true);
      // No portfolio in the cache, so the Portfolio 2 rule does not apply.
      expect(component.showDownloadTemplate()).toBe(true);
    });

    it('showDownloadTemplate should be false when published even without link', () => {
      component.showDownload = true;
      component.data = { status_id: '14' } as OicrHeaderData;
      component.cgspaceLink = null;
      fixture.detectChanges();
      expect(component.showHandleLinkButton()).toBe(false);
      expect(component.canDownloadTemplate()).toBe(false);
      expect(component.showDownloadTemplate()).toBe(false);
    });

    it('hides the download for a Portfolio 2 OICR, in every status the rule would allow', () => {
      const cache = TestBed.inject(CacheService);
      cache.currentMetadata.set({ portfolio: { id: 2 } });

      for (const statusId of ['10', '11', '12', '13']) {
        component.showDownload = true;
        component.data = { status_id: statusId } as OicrHeaderData;
        fixture.detectChanges();
        expect(component.canDownloadTemplate()).toBe(true);
        expect(component.isTemplateDownloadHidden()).toBe(true);
        expect(component.showDownloadTemplate()).toBe(false);
      }
    });

    it('keeps the download for a Portfolio 1 OICR', () => {
      const cache = TestBed.inject(CacheService);
      cache.currentMetadata.set({ portfolio: { id: 1 } });
      component.showDownload = true;
      component.data = { status_id: '11' } as OicrHeaderData;
      fixture.detectChanges();

      expect(component.isTemplateDownloadHidden()).toBe(false);
      expect(component.showDownloadTemplate()).toBe(true);
    });

    it('openHandleLink should open cgspace link in a new tab', () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
      component.cgspaceLink = 'https://hdl.handle.net/10568/182058';
      component.openHandleLink();
      expect(openSpy).toHaveBeenCalledWith('https://hdl.handle.net/10568/182058', '_blank', 'noopener,noreferrer');
      openSpy.mockRestore();
    });

    it('cgspacePublicationHref should return empty string when link is null', () => {
      component.cgspaceLink = null;
      fixture.detectChanges();
      expect(component.cgspacePublicationHref()).toBe('');
    });

    it('cgspacePublicationHref should trim whitespace from link', () => {
      component.cgspaceLink = '  https://hdl.handle.net/10568/182058  ';
      fixture.detectChanges();
      expect(component.cgspacePublicationHref()).toBe('https://hdl.handle.net/10568/182058');
    });

    it('openHandleLink should no-op when href is empty', () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
      component.cgspaceLink = null;
      component.openHandleLink();
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });
});

/**
 * The button is temporarily hidden (DOWNLOAD_TEMPLATE_VISIBLE). These render the header's
 * REAL template — the suite above replaces it with '<div></div>', which cannot prove
 * anything about what the template puts on the page.
 */
describe('OicrHeaderComponent — Download OICR Template button visibility', () => {
  let fixture: ComponentFixture<OicrHeaderComponent>;
  let component: OicrHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OicrHeaderComponent],
      providers: [{ provide: SubmissionService, useValue: { getStatusNameById: jest.fn() } }]
    })
      .overrideComponent(OicrHeaderComponent, {
        set: {
          imports: [
            DatePipe,
            ButtonModule,
            StubDownloadOicrTemplateComponent,
            CustomTagComponent,
            OicrWorkflowStatusComponent
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(OicrHeaderComponent);
    component = fixture.componentInstance;
  });

  const downloadButtons = () => fixture.debugElement.queryAll(By.directive(StubDownloadOicrTemplateComponent));

  it('renders no app-download-oicr-template for a Portfolio 2 OICR', () => {
    TestBed.inject(CacheService).currentMetadata.set({ portfolio: { id: 2 } });
    component.showDownload = true;
    component.data = { status_id: '11' } as OicrHeaderData;
    fixture.detectChanges();

    expect(component.canDownloadTemplate()).toBe(true);
    expect(downloadButtons().length).toBe(0);
  });

  it('still renders app-download-oicr-template for a Portfolio 1 OICR', () => {
    TestBed.inject(CacheService).currentMetadata.set({ portfolio: { id: 1 } });
    component.showDownload = true;
    component.data = { status_id: '11' } as OicrHeaderData;
    fixture.detectChanges();

    expect(downloadButtons().length).toBeGreaterThan(0);
  });

  it('still renders the CGSpace link button for a published Portfolio 2 OICR', () => {
    TestBed.inject(CacheService).currentMetadata.set({ portfolio: { id: 2 } });
    component.showDownload = true;
    component.data = { status_id: '14' } as OicrHeaderData;
    component.cgspaceLink = 'https://hdl.handle.net/10568/182058';
    fixture.detectChanges();

    expect(downloadButtons().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('CGSpace link');
  });
});
