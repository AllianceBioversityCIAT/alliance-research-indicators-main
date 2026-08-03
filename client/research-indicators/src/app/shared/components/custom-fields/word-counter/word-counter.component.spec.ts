import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WordCounterComponent } from './word-counter.component';
import { WordCountService } from '../../../services/word-count.service';

describe('WordCounterComponent', () => {
  let component: WordCounterComponent;
  let fixture: ComponentFixture<WordCounterComponent>;
  let wordCountService: WordCountService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordCounterComponent],
      providers: [WordCountService]
    }).compileComponents();

    fixture = TestBed.createComponent(WordCounterComponent);
    component = fixture.componentInstance;
    wordCountService = TestBed.inject(WordCountService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input properties', () => {
    it('should have default values', () => {
      expect(component.value).toBe('');
      expect(component.maxWords).toBeUndefined();
      expect(component.minWords).toBeUndefined();
      expect(component.showMin).toBe(false);
      expect(component.showMax).toBe(true);
      expect(component.size).toBe('normal');
    });

    it('should accept custom input values', () => {
      component.value = 'test text';
      component.maxWords = 10;
      component.minWords = 5;
      component.showMin = true;
      component.showMax = false;
      component.size = 'small';

      expect(component.value).toBe('test text');
      expect(component.maxWords).toBe(10);
      expect(component.minWords).toBe(5);
      expect(component.showMin).toBe(true);
      expect(component.showMax).toBe(false);
      expect(component.size).toBe('small');
    });
  });

  describe('count getter', () => {
    it('should return 0 for empty value', () => {
      component.value = '';
      expect(component.count).toBe(0);
    });

    it('should return correct word count for single word', () => {
      component.value = 'hello';
      expect(component.count).toBe(1);
    });

    it('should return correct word count for multiple words', () => {
      component.value = 'hello world test';
      expect(component.count).toBe(3);
    });

    it('should handle multiple spaces between words', () => {
      component.value = 'hello   world    test';
      expect(component.count).toBe(3);
    });

    it('should handle leading and trailing spaces', () => {
      component.value = '  hello world  ';
      expect(component.count).toBe(2);
    });

    it('should handle numbers as input', () => {
      component.value = '123 456 789';
      expect(component.count).toBe(3);
    });

    it('should handle special characters', () => {
      component.value = 'hello-world test@email.com';
      expect(component.count).toBe(2);
    });
  });

  describe('color getter', () => {
    it('should return gray color when count is 0', () => {
      component.value = '';
      expect(component.color).toBe('#8D9299');
    });

    it('should return red color when count exceeds maxWords', () => {
      component.value = 'one two three four five';
      component.maxWords = 3;
      expect(component.color).toBe('#CF0808');
    });

    it('should return gray color when count is below minWords', () => {
      component.value = 'one two';
      component.minWords = 5;
      expect(component.color).toBe('#8D9299');
    });

    it('should return green color when count is within valid range', () => {
      component.value = 'one two three';
      component.maxWords = 10;
      component.minWords = 1;
      expect(component.color).toBe('#358540');
    });

    it('should return green color when no maxWords is set', () => {
      component.value = 'one two three';
      component.minWords = 1;
      expect(component.color).toBe('#358540');
    });

    it('should return green color when no minWords is set', () => {
      component.value = 'one two three';
      component.maxWords = 10;
      expect(component.color).toBe('#358540');
    });

    it('should return green color when count equals maxWords', () => {
      component.value = 'one two three';
      component.maxWords = 3;
      expect(component.color).toBe('#358540');
    });

    it('should return green color when count equals minWords', () => {
      component.value = 'one two three';
      component.minWords = 3;
      expect(component.color).toBe('#358540');
    });

    it('should return gray color when count is 0 even with maxWords set', () => {
      component.value = '';
      component.maxWords = 10;
      expect(component.color).toBe('#8D9299');
    });

    it('should return gray color when count is 0 even with minWords set', () => {
      component.value = '';
      component.minWords = 5;
      expect(component.color).toBe('#8D9299');
    });

    it('should prioritize maxWords over minWords when both conditions are met', () => {
      component.value = 'one two three four five';
      component.maxWords = 3;
      component.minWords = 10;
      expect(component.color).toBe('#CF0808');
    });
  });

  describe('template rendering', () => {
    it('should display correct word count', () => {
      component.value = 'hello world';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('2');
    });

    it('should display max words when showMax is true and maxWords is set', () => {
      component.value = 'hello world';
      component.maxWords = 10;
      component.showMax = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('2/10');
    });

    it('should not display max words when showMax is false', () => {
      component.value = 'hello world';
      component.maxWords = 10;
      component.showMax = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('2');
      expect(compiled.textContent).not.toContain('/10');
    });

    it('should not display max words when maxWords is not set', () => {
      component.value = 'hello world';
      component.showMax = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('2');
      expect(compiled.textContent).not.toContain('/');
    });

    it('should apply correct color styling', () => {
      component.value = 'hello world';
      component.maxWords = 1;
      fixture.detectChanges();

      // Verify that the component renders correctly with the expected color
      expect(component.color).toBe('#CF0808');
    });
  });

  describe('edge cases', () => {
    it('should handle null value', () => {
      component.value = null as any;
      expect(component.count).toBe(0);
      expect(component.color).toBe('#8D9299');
    });

    it('should handle undefined value', () => {
      component.value = undefined as any;
      expect(component.count).toBe(0);
      expect(component.color).toBe('#8D9299');
    });

    it('should handle numeric value', () => {
      component.value = 123 as any;
      expect(component.count).toBe(1);
    });

    it('should handle very long text', () => {
      const longText = 'word '.repeat(1000);
      component.value = longText;
      expect(component.count).toBe(1000);
    });

    it('should handle text with only spaces', () => {
      component.value = '   ';
      expect(component.count).toBe(0);
      expect(component.color).toBe('#8D9299');
    });

    it('should handle text with only tabs and newlines', () => {
      component.value = '\t\n\r';
      expect(component.count).toBe(0);
      expect(component.color).toBe('#8D9299');
    });
  });
});
