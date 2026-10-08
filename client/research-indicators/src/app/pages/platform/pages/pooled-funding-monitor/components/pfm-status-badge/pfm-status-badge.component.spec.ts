import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PfmBadgeKind, PfmStatusBadgeComponent } from './pfm-status-badge.component';

describe('PfmStatusBadgeComponent', () => {
  let fixture: ComponentFixture<PfmStatusBadgeComponent>;

  const render = (kind: PfmBadgeKind, value: string, color?: string) => {
    fixture = TestBed.createComponent(PfmStatusBadgeComponent);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('value', value);
    if (color !== undefined) fixture.componentRef.setInput('color', color);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PfmStatusBadgeComponent] }).compileComponents();
  });

  const star: [string, string][] = [
    ['Draft', 'neutral'],
    ['Submitted', 'info'],
    ['Under review', 'review'],
    ['Approved', 'success'],
    ['Returned', 'danger']
  ];
  it.each(star)('star "%s" renders its label with the %s token', (value, tone) => {
    const el = render('star', value).querySelector('[data-testid="pfm-badge"]') as HTMLElement;
    expect(el.textContent?.trim()).toBe(value);
    expect(el.className).toContain(`--ac-pfm-${tone}-bg`);
    expect(el.className).toContain('rounded-md');
  });

  const mapping: [string, string][] = [
    ['Not started', 'neutral'],
    ['Incomplete', 'warning'],
    ['Complete', 'success'],
    ['No SP contribution', 'success']
  ];
  it.each(mapping)('mapping "%s" renders its label with the %s token', (value, tone) => {
    const el = render('mapping', value).querySelector('[data-testid="pfm-badge"]') as HTMLElement;
    expect(el.textContent?.trim()).toBe(value);
    expect(el.className).toContain(`--ac-pfm-${tone}-bg`);
  });

  const prms: [string, string][] = [
    ['Pending Review', 'warning'],
    ['Approved', 'success'],
    ['Rejected', 'danger']
  ];
  it.each(prms)('prms "%s" renders a pill with the %s token', (value, tone) => {
    const el = render('prms', value).querySelector('[data-testid="pfm-badge"]') as HTMLElement;
    expect(el.textContent?.trim()).toBe(value);
    expect(el.className).toContain(`--ac-pfm-${tone}-bg`);
    expect(el.className).toContain('rounded-full');
  });

  it('prms "Not sent" renders a plain dash and no badge', () => {
    const root = render('prms', 'Not sent');
    expect(root.querySelector('[data-testid="pfm-badge"]')).toBeNull();
    expect(root.textContent?.trim()).toBe('—');
  });

  it('"Not sent" outside the prms kind is an ordinary labelled badge', () => {
    const el = render('star', 'Not sent').querySelector('[data-testid="pfm-badge"]') as HTMLElement;
    expect(el.textContent?.trim()).toBe('Not sent');
  });

  it('unknown value falls back to the neutral style with its label', () => {
    for (const kind of ['star', 'mapping', 'prms'] as PfmBadgeKind[]) {
      const el = render(kind, 'Weird').querySelector('[data-testid="pfm-badge"]') as HTMLElement;
      expect(el.textContent?.trim()).toBe('Weird');
      expect(el.className).toContain('--ac-pfm-neutral-bg');
    }
  });

  it('sp badge shows the name and binds the runtime color as --sp with color-mix background', () => {
    const el = render('sp', 'SP01', 'rgb(10, 20, 30)').querySelector('[data-testid="pfm-badge"]') as HTMLElement;
    expect(el.textContent?.trim()).toBe('SP01');
    expect(el.style.getPropertyValue('--sp')).toBe('rgb(10, 20, 30)');
    expect(el.className).toContain('color-mix(in_srgb,var(--sp)_14%,transparent)');
  });

  it('sp badge without a color falls back to neutral and sets no --sp', () => {
    const el = render('sp', 'SP02').querySelector('[data-testid="pfm-badge"]') as HTMLElement;
    expect(el.textContent?.trim()).toBe('SP02');
    expect(el.style.getPropertyValue('--sp')).toBe('');
    expect(el.className).toContain('--ac-pfm-neutral-bg');
  });
});
