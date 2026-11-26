import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { AddContactPersonModalComponent } from './add-contact-person-modal.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CacheService } from '@shared/services/cache/cache.service';

describe('AddContactPersonModalComponent — ORCID (OICR Details 2026)', () => {
  let fixture: ComponentFixture<AddContactPersonModalComponent>;
  let component: AddContactPersonModalComponent;
  let cache: CacheService;
  const isOpen = signal(false);

  const orcidInput = () => (fixture.nativeElement as HTMLElement).querySelector('input[placeholder="0000-0002-1825-0097"]');

  beforeEach(async () => {
    isOpen.set(false);
    await TestBed.configureTestingModule({
      imports: [AddContactPersonModalComponent, HttpClientTestingModule],
      providers: [
        {
          provide: AllModalsService,
          useValue: {
            setContactPersonModalData: jest.fn(),
            addContactPersonConfirm: jest.fn(),
            toggleModal: jest.fn(),
            isModalOpen: jest.fn(() => ({ isOpen: isOpen() }))
          }
        }
      ]
    }).compileComponents();

    cache = TestBed.inject(CacheService);
    fixture = TestBed.createComponent(AddContactPersonModalComponent);
    component = fixture.componentInstance;
  });

  it('2025 (and no year): the modal has no ORCID input', () => {
    cache.currentMetadata.set({ report_year: 2025 });
    fixture.detectChanges();
    expect(component.showOrcid()).toBe(false);
    expect(orcidInput()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('ORCID');
  });

  it('transition: renders without ORCID, then the year becomes 2026 and the optional ORCID input appears', () => {
    cache.currentMetadata.set({ report_year: 2025 });
    fixture.detectChanges();
    expect(orcidInput()).toBeNull();

    cache.currentMetadata.set({ report_year: 2026 });
    fixture.detectChanges();
    expect(component.showOrcid()).toBe(true);
    expect(orcidInput()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Optional. Add the author's ORCID iD; it is shown in the table of people involved.");
  });

  it('carries the typed ORCID in the confirm data and clears it when the modal closes', () => {
    cache.currentMetadata.set({ report_year: 2026 });
    isOpen.set(true);
    fixture.detectChanges();
    component.body.update(b => ({ ...b, orcid: '0000-0002-1825-0097' }));
    expect(component.getBodyData().orcid).toBe('0000-0002-1825-0097');

    isOpen.set(false);
    fixture.detectChanges();
    expect(component.getBodyData().orcid).toBe('');
  });
});
