import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomTagComponent } from './custom-tag.component';
import { STATUS_COLOR_MAP } from '@shared/constants/status-colors';

describe('CustomTagComponent', () => {
  let component: CustomTagComponent;
  let fixture: ComponentFixture<CustomTagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTagComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomTagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the 45px label minimum by default and drops it with fitContent', () => {
    const label = () => fixture.nativeElement.querySelector('span') as HTMLElement;
    fixture.componentRef.setInput('statusName', 'SP09');
    fixture.detectChanges();
    expect(label().className).toContain('min-w-[45px]');
    fixture.componentRef.setInput('fitContent', true);
    fixture.detectChanges();
    expect(label().className).not.toContain('min-w-[45px]');
  });

  it('renders no trailing icon by default, and renders it after the label when trailingIconName is set', () => {
    const trailing = () => fixture.nativeElement.querySelector('[data-testid="custom-tag-trailing-icon"]') as HTMLElement | null;
    expect(trailing()).toBeNull();
    fixture.componentRef.setInput('statusName', 'SP06');
    fixture.componentRef.setInput('trailingIconName', 'pi-star-fill');
    fixture.componentRef.setInput('trailingIconColor', 'rgb(1, 2, 3)');
    fixture.detectChanges();
    const icon = trailing();
    expect(icon).not.toBeNull();
    expect(icon!.classList).toContain('pi-star-fill');
    expect(icon!.getAttribute('aria-hidden')).toBe('true');
    expect(icon!.style.color).toBe('rgb(1, 2, 3)');
    // after the label span, inside the pill
    expect(icon!.previousElementSibling?.textContent?.trim()).toBe('SP06');
    // the label drops its 45px minimum so the icon sits right next to it
    expect((icon!.previousElementSibling as HTMLElement).className).not.toContain('min-w-[45px]');
  });

  it('should have default statusId and statusName', () => {
    expect(component.statusId).toBe('');
    expect(component.statusName).toBe('');
  });

  it('should set statusId and statusName from inputs', () => {
    component.statusId = '1';
    component.statusName = 'Active';
    fixture.detectChanges();
    expect(component.statusId).toBe('1');
    expect(component.statusName).toBe('Active');
  });

  it('getColors should return correct color for existing statusId', () => {
    component.statusId = '2';
    expect(component.getColors()).toEqual(STATUS_COLOR_MAP['2']);
  });

  it('getColors should return default color for non-existent statusId', () => {
    component.statusId = 'no-existe';
    expect(component.getColors()).toEqual(STATUS_COLOR_MAP['']);
  });

  it('getColors should work with numeric statusId', () => {
    component.statusId = 3;
    expect(component.getColors()).toEqual(STATUS_COLOR_MAP['3']);
  });

  it('should apply correct class when tiny is true', () => {
    component.tiny = true;
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('div');
    expect(el.className).toContain('text-[9px]');
  });

  it('should apply correct class when tiny is false', () => {
    component.tiny = false;
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('div');
    expect(el.className).toContain('text-[12px]');
  });

  it('should truncate label when maxWidth is set and multiline is false', () => {
    component.maxWidth = '80px';
    component.multiline = false;
    component.statusName = 'Very long status name';
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('truncate');
    expect(span.className).not.toContain('whitespace-normal');
  });

  it('should wrap label when multiline is true', () => {
    component.maxWidth = '80px';
    component.multiline = true;
    component.statusName = 'OICR REQUESTED';
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('whitespace-normal');
    expect(span.className).toContain('break-words');
    expect(span.className).toContain('line-clamp-2');
    expect(span.className).not.toContain('truncate');
  });
});
