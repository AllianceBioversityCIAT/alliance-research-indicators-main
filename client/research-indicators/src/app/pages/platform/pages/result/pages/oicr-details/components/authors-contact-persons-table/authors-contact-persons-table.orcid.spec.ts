import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthorsContactPersonsTableComponent } from './authors-contact-persons-table.component';

describe('AuthorsContactPersonsTableComponent — ORCID column (OICR Details 2026)', () => {
  let fixture: ComponentFixture<AuthorsContactPersonsTableComponent>;
  let component: AuthorsContactPersonsTableComponent;
  const headers = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th')).map(th => th.textContent?.replace(/\s+/g, ' ').trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AuthorsContactPersonsTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(AuthorsContactPersonsTableComponent);
    component = fixture.componentInstance;
    component.rows = [
      { id: 1, name: 'Ana', position: 'P', affiliation: 'A', email: 'a@x.org', role: 'Author', orcid: '0000-0002-1825-0097' },
      { id: 2, name: 'Ben', position: 'P', affiliation: 'A', email: 'b@x.org', role: 'Contact' }
    ];
    fixture.detectChanges();
  });

  it('default (2025): no ORCID column', () => {
    expect(headers()).not.toContain('ORCID');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('0000-0002-1825-0097');
  });

  it('transition: turning showOrcid on adds the column between Email and Role, with a dash when empty', () => {
    component.showOrcid = true;
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const h = headers().filter(Boolean);
    expect(h.indexOf('ORCID')).toBe(h.indexOf('Email') + 1);
    expect(h.indexOf('Role')).toBe(h.indexOf('ORCID') + 1);
    const cells = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).map(tr =>
      Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim())
    );
    expect(cells[0]).toContain('0000-0002-1825-0097');
    expect(cells[1][5]).toBe('-');
  });
});
