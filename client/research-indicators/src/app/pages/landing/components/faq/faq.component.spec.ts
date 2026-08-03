import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaqComponent } from './faq.component';
import { LandingTextsService } from '../../services/landing-texts.service';
import { signal } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AccordionModule } from 'primeng/accordion';

const mockFaqList = [
  { question: 'what is the platform?', answer: 'It is a tool to report.' },
  { question: 'how do I login?', answer: 'Click the login button.' }
];

const landingTextsServiceMock = {
  faqList: signal(mockFaqList)
};

describe('FaqComponent', () => {
  let component: FaqComponent;
  let fixture: ComponentFixture<FaqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaqComponent, AccordionModule],
      providers: [{ provide: LandingTextsService, useValue: landingTextsServiceMock }, provideAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(FaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the main title and subtitle', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.faq-header-title')?.textContent).toContain('Asked Questions');
    expect(compiled.querySelector('.faq-header-subtitle')?.textContent).toContain('FRECUENTLY');
  });

  it('should render all FAQ questions', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const preguntas = compiled.querySelectorAll('p-accordion-header');
    expect(preguntas.length).toBe(mockFaqList.length);
    mockFaqList.forEach((faq, idx) => {
      expect(preguntas[idx].textContent).toContain(faq.question);
    });
  });

  it('should render all answers', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const respuestas = compiled.querySelectorAll('p-accordion-content p');
    expect(respuestas.length).toBe(mockFaqList.length);
    mockFaqList.forEach((faq, idx) => {
      expect(respuestas[idx].textContent).toContain(faq.answer);
    });
  });

  it('should update questions when service changes', () => {
    const newFaqList = [
      { question: 'Nueva pregunta 1', answer: 'Nueva respuesta 1' },
      { question: 'Nueva pregunta 2', answer: 'Nueva respuesta 2' }
    ];

    landingTextsServiceMock.faqList.set(newFaqList);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const preguntas = compiled.querySelectorAll('p-accordion-header');
    expect(preguntas.length).toBe(newFaqList.length);
    newFaqList.forEach((faq, idx) => {
      expect(preguntas[idx].textContent).toContain(faq.question);
    });
  });

  it('should handle empty list case correctly', () => {
    landingTextsServiceMock.faqList.set([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const preguntas = compiled.querySelectorAll('p-accordion-header');
    expect(preguntas.length).toBe(0);
  });
});
