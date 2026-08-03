import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TextareaValidationService } from './textarea-validation.service';
import { WordCountService } from './word-count.service';
import { UtilsService } from './utils.service';
import { signal } from '@angular/core';

describe('TextareaValidationService', () => {
  let service: TextareaValidationService;
  let wordCountMock: { getWordCount: jest.Mock };
  let utilsMock: { setNestedPropertyWithReduceSignal: jest.Mock };

  beforeEach(() => {
    wordCountMock = {
      getWordCount: jest.fn()
    };
    utilsMock = {
      setNestedPropertyWithReduceSignal: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [TextareaValidationService, { provide: WordCountService, useValue: wordCountMock }, { provide: UtilsService, useValue: utilsMock }]
    });
    service = TestBed.inject(TextareaValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return maxLength', () => {
    expect(service.maxLength).toBe(40000);
  });

  describe('handlePasteText', () => {
    let mockEvent: ClipboardEvent;
    let mockSignal: any;
    let mockBodySignal: any;
    let mockShowMaxReachedSignal: any;
    let mockInput: HTMLInputElement;

    beforeEach(() => {
      mockInput = {
        value: 'Hello World',
        selectionStart: 5,
        selectionEnd: 5,
        setSelectionRange: jest.fn()
      } as any;

      mockEvent = {
        preventDefault: jest.fn(),
        clipboardData: {
          getData: jest.fn().mockReturnValue('pasted text')
        },
        target: mockInput
      } as any;

      mockSignal = signal({});
      mockBodySignal = signal({ value: '' });
      mockShowMaxReachedSignal = signal(false);
    });

    it('should handle paste when new value is within limit', fakeAsync(() => {
      mockInput.value = 'Hello';
      mockInput.selectionStart = 5;
      mockInput.selectionEnd = 5;

      service.handlePasteText(mockEvent, mockSignal, 'testOption', mockBodySignal, mockShowMaxReachedSignal);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockBodySignal().value).toBe('Hellopasted text');
      expect(utilsMock.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(mockSignal, 'testOption', 'Hellopasted text');
      expect(mockShowMaxReachedSignal()).toBe(false);

      tick();
      expect(mockInput.setSelectionRange).toHaveBeenCalledWith(16, 16);
    }));

    it('should handle paste when new value exceeds limit', fakeAsync(() => {
      const longText = 'a'.repeat(40000);
      mockInput.value = longText;
      mockInput.selectionStart = 0;
      mockInput.selectionEnd = 0;

      service.handlePasteText(mockEvent, mockSignal, 'testOption', mockBodySignal, mockShowMaxReachedSignal);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockBodySignal().value).toBe(longText);
      expect(mockShowMaxReachedSignal()).toBe(true);

      tick();
      expect(mockInput.setSelectionRange).toHaveBeenCalledWith(0, 0);
    }));

    it('should handle paste with no clipboard data', () => {
      mockEvent.clipboardData = null;

      service.handlePasteText(mockEvent, mockSignal, 'testOption', mockBodySignal, mockShowMaxReachedSignal);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockBodySignal().value).toBe('');
    });

    it('should handle paste with selection', () => {
      mockInput.value = 'Hello World';
      mockInput.selectionStart = 0;
      mockInput.selectionEnd = 5;

      service.handlePasteText(mockEvent, mockSignal, 'testOption', mockBodySignal, mockShowMaxReachedSignal);

      expect(mockBodySignal().value).toBe('pasted text World');
    });

    it('should handle paste with null selectionStart', () => {
      mockInput.value = 'Hello World';
      mockInput.selectionStart = null;
      mockInput.selectionEnd = 5;

      service.handlePasteText(mockEvent, mockSignal, 'testOption', mockBodySignal, mockShowMaxReachedSignal);

      expect(mockBodySignal().value).toBe('pasted text World');
    });

    it('should handle paste with null selectionEnd', () => {
      mockInput.value = 'Hello World';
      mockInput.selectionStart = 0;
      mockInput.selectionEnd = null;

      service.handlePasteText(mockEvent, mockSignal, 'testOption', mockBodySignal, mockShowMaxReachedSignal);

      expect(mockBodySignal().value).toBe('pasted textHello World');
    });
  });

  describe('shouldPreventInput', () => {
    let mockEvent: KeyboardEvent;
    let mockInput: HTMLInputElement;

    beforeEach(() => {
      mockInput = {
        selectionStart: 5
      } as any;

      mockEvent = {
        key: 'a',
        ctrlKey: false,
        metaKey: false,
        target: mockInput
      } as any;
    });

    it('should return false when no MAX_LENGTH or currentValue', () => {
      expect(service.shouldPreventInput(mockEvent, null)).toBe(false);
    });

    it('should return false when word count is below limit', () => {
      wordCountMock.getWordCount.mockReturnValue(10);
      expect(service.shouldPreventInput(mockEvent, 'test text')).toBe(false);
    });

    it('should return false for allowed keys', () => {
      wordCountMock.getWordCount.mockReturnValue(40001);
      const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', ' '];

      allowedKeys.forEach(key => {
        mockEvent.key = key;
        expect(service.shouldPreventInput(mockEvent, 'test text')).toBe(false);
      });
    });

    it('should return false for ctrl/meta key combinations', () => {
      wordCountMock.getWordCount.mockReturnValue(40001);
      mockEvent.ctrlKey = true;
      expect(service.shouldPreventInput(mockEvent, 'test text')).toBe(false);
    });

    it('should return true when cursor position is null', () => {
      wordCountMock.getWordCount.mockReturnValue(40001);
      mockInput.selectionStart = null;
      expect(service.shouldPreventInput(mockEvent, 'test text')).toBe(true);
    });

    it('should return false when current word index is below limit', () => {
      wordCountMock.getWordCount.mockReturnValue(40001);
      expect(service.shouldPreventInput(mockEvent, 'short text')).toBe(false);
    });

    it('should return true when word limit is exceeded', () => {
      wordCountMock.getWordCount.mockReturnValue(40001);
      const longText = 'word '.repeat(40001);
      mockInput.selectionStart = longText.length;
      expect(service.shouldPreventInput(mockEvent, longText)).toBe(true);
    });
  });

  describe('shouldPreventTextInput', () => {
    let mockEvent: KeyboardEvent;
    let mockInput: HTMLInputElement;
    let mockShowMaxReachedSignal: any;

    beforeEach(() => {
      mockInput = {
        value: 'Hello World',
        selectionStart: 5
      } as any;

      mockEvent = {
        key: 'a',
        ctrlKey: false,
        metaKey: false,
        target: mockInput
      } as any;

      mockShowMaxReachedSignal = signal(false);
    });

    it('should return false for ctrl/meta key combinations', () => {
      mockEvent.ctrlKey = true;
      expect(service.shouldPreventTextInput(mockEvent, mockShowMaxReachedSignal)).toBe(false);
    });

    it('should return false for allowed keys', () => {
      const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];

      allowedKeys.forEach(key => {
        mockEvent.key = key;
        expect(service.shouldPreventTextInput(mockEvent, mockShowMaxReachedSignal)).toBe(false);
      });
    });

    it('should return true when cursor position is null', () => {
      mockInput.selectionStart = null;
      expect(service.shouldPreventTextInput(mockEvent, mockShowMaxReachedSignal)).toBe(true);
    });

    it('should return true and set signal when new value exceeds limit', () => {
      mockInput.value = 'a'.repeat(40000);
      mockInput.selectionStart = 40000;
      mockEvent.key = 'a';

      expect(service.shouldPreventTextInput(mockEvent, mockShowMaxReachedSignal)).toBe(true);
      expect(mockShowMaxReachedSignal()).toBe(true);
    });

    it('should return false and clear signal when new value is within limit', () => {
      mockInput.value = 'Hello';
      mockInput.selectionStart = 5;
      mockEvent.key = 'a';

      expect(service.shouldPreventTextInput(mockEvent, mockShowMaxReachedSignal)).toBe(false);
      expect(mockShowMaxReachedSignal()).toBe(false);
    });
  });
});
