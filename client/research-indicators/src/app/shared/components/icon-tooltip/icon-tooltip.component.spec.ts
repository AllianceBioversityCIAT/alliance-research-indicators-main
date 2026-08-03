import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconTooltipComponent } from './icon-tooltip.component';

describe('IconTooltipComponent', () => {
  let component: IconTooltipComponent;
  let fixture: ComponentFixture<IconTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconTooltipComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IconTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use default icon name', () => {
    expect(component.iconName).toBe('pi-exclamation-circle');
    const icon = fixture.nativeElement.querySelector('i');
    expect(icon.className).toContain('pi-exclamation-circle');
  });

  it('should apply custom icon name', () => {
    component.iconName = 'pi-info-circle';
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('i');
    expect(icon.className).toContain('pi-info-circle');
  });

  it('should apply icon color when provided', () => {
    component.iconColor = '#FF0000';
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('i');
    expect(icon.style.color).toBe('rgb(255, 0, 0)');
  });

  it('should apply rotation by default', () => {
    const icon = fixture.nativeElement.querySelector('i');
    expect(icon.style.transform).toBe('rotate(180deg)');
  });

  it('should not rotate when rotate is false', () => {
    component.rotate = false;
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('i');
    expect(icon.style.transform).toBe('');
  });
});
