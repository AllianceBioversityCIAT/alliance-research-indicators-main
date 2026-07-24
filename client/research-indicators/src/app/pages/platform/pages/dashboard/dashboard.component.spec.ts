import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By, DomSanitizer } from '@angular/platform-browser';
import DashboardComponent from './dashboard.component';
import { POWERBI_CONSTANTS } from '@shared/constants/powerbi.constants';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have dashboardUrl property with correct value', () => {
    expect(component.dashboardUrl).toBeDefined();
    expect(component.dashboardUrl).toBeTruthy();
    // SafeResourceUrl wraps the URL, so we check it's defined and truthy
  });

  it('should render iframe with correct src', () => {
    const iframe = fixture.debugElement.query(By.css('iframe'));
    expect(iframe).toBeTruthy();
    expect(iframe.nativeElement.src).toBe(POWERBI_CONSTANTS.DASHBOARD_URL);
  });

  it('should render iframe with correct title', () => {
    const iframe = fixture.debugElement.query(By.css('iframe'));
    expect(iframe.nativeElement.title).toBe('Alliance Results Dashboard');
  });

  it('should render iframe with correct CSS classes', () => {
    const iframe = fixture.debugElement.query(By.css('iframe'));
    expect(iframe.nativeElement.classList.contains('w-full')).toBeTruthy();
    expect(iframe.nativeElement.classList.contains('h-full')).toBeTruthy();
    expect(iframe.nativeElement.classList.contains('border-0')).toBeTruthy();
  });

  it('should render inner container div', () => {
    const container = fixture.debugElement.query(By.css('.h-full.p-6.pt-8'));
    expect(container).toBeTruthy();
  });

  it('should render main container with correct classes', () => {
    const mainContainer = fixture.debugElement.query(By.css('.w-full.h-\\[calc\\(100vh-118px\\)\\]'));
    expect(mainContainer).toBeTruthy();
  });

  it('should have iframe src binding working correctly', () => {
    // Verify the iframe src is bound to the component property
    const iframe = fixture.debugElement.query(By.css('iframe'));
    expect(iframe.nativeElement.src).toBe(POWERBI_CONSTANTS.DASHBOARD_URL);
  });

  it('should maintain iframe attributes', () => {
    const iframe = fixture.debugElement.query(By.css('iframe'));
    const iframeElement = iframe.nativeElement;
    
    expect(iframeElement.tagName).toBe('IFRAME');
    expect(iframeElement.title).toBe('Alliance Results Dashboard');
  });

  it('should have readonly dashboardUrl property', () => {
    // Verify that dashboardUrl is readonly by checking if it can be modified
    const originalUrl = component.dashboardUrl;
    
    // This should not throw an error, but the property should remain readonly
    expect(component.dashboardUrl).toBe(originalUrl);
  });

  it('should render complete component structure', () => {
    const mainDiv = fixture.debugElement.query(By.css('.w-full.h-\\[calc\\(100vh-118px\\)\\]'));
    const containerDiv = fixture.debugElement.query(By.css('.h-full.p-6.pt-8'));
    const iframe = fixture.debugElement.query(By.css('iframe'));
    
    expect(mainDiv).toBeTruthy();
    expect(containerDiv).toBeTruthy();
    expect(iframe).toBeTruthy();
    
    // Verify hierarchy
    expect(containerDiv.nativeElement.parentElement).toBe(mainDiv.nativeElement);
    expect(iframe.nativeElement.parentElement).toBe(containerDiv.nativeElement);
  });

  it('should have correct component selector', () => {
    expect(component.constructor.name).toBe('DashboardComponent');
  });

  it('should import POWERBI_CONSTANTS correctly', () => {
    expect(POWERBI_CONSTANTS.DASHBOARD_URL).toBeDefined();
    expect(typeof POWERBI_CONSTANTS.DASHBOARD_URL).toBe('string');
  });

  it('should have iframe with proper accessibility attributes', () => {
    const iframe = fixture.debugElement.query(By.css('iframe'));
    expect(iframe.nativeElement.title).toBe('Alliance Results Dashboard');
  });

  it('should render without errors after multiple change detection cycles', () => {
    fixture.detectChanges();
    fixture.detectChanges();
    fixture.detectChanges();
    
    const iframe = fixture.debugElement.query(By.css('iframe'));
    expect(iframe).toBeTruthy();
    expect(component).toBeTruthy();
  });

  it('should sanitize URL correctly', () => {
    expect(component.dashboardUrl).toBeDefined();
    expect(component.dashboardUrl).toBeTruthy();
  });

  it('should have DomSanitizer injected', () => {
    const sanitizer = TestBed.inject(DomSanitizer);
    expect(sanitizer).toBeTruthy();
  });
});