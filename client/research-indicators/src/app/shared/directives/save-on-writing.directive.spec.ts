import { TestBed } from '@angular/core/testing';
import { SaveOnWritingDirective } from './save-on-writing.directive';
import { ElementRef } from '@angular/core';
import { ActionsService } from '../services/actions.service';

describe('SaveOnWritingDirective', () => {
  let mockElementRef: ElementRef;
  let mockActionsService: Partial<ActionsService>;

  beforeEach(() => {
    mockElementRef = new ElementRef(document.createElement('input'));
    mockActionsService = {
      saveCurrentSection: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: mockElementRef },
        { provide: ActionsService, useValue: mockActionsService }
      ]
    });
  });

  it('should create an instance', () => {
    const directive = TestBed.runInInjectionContext(() => new SaveOnWritingDirective(mockElementRef));
    expect(directive).toBeTruthy();
  });

  it('should call autosave after delay when input changes', done => {
    const directive = TestBed.runInInjectionContext(() => new SaveOnWritingDirective(mockElementRef));
    directive.delay = 100;

    const autosaveSpy = jest.spyOn(directive as any, 'autosave');

    directive.onInputChange();

    setTimeout(() => {
      expect(autosaveSpy).toHaveBeenCalled();
      done();
    }, 150);
  });

  it('should clear timeout on multiple input changes', done => {
    const directive = TestBed.runInInjectionContext(() => new SaveOnWritingDirective(mockElementRef));
    directive.delay = 100;

    const autosaveSpy = jest.spyOn(directive as any, 'autosave');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    directive.onInputChange();
    directive.onInputChange();
    directive.onInputChange();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);

    setTimeout(() => {
      expect(autosaveSpy).toHaveBeenCalledTimes(1);
      clearTimeoutSpy.mockRestore();
      done();
    }, 150);
  });

  it('should call autosave method', () => {
    const directive = TestBed.runInInjectionContext(() => new SaveOnWritingDirective(mockElementRef));

    expect(() => (directive as any).autosave()).not.toThrow();
  });

  it('should have default delay of 2000ms', () => {
    const directive = TestBed.runInInjectionContext(() => new SaveOnWritingDirective(mockElementRef));
    expect(directive.delay).toBe(2000);
  });

  it('should allow custom delay', () => {
    const directive = TestBed.runInInjectionContext(() => new SaveOnWritingDirective(mockElementRef));
    directive.delay = 5000;
    expect(directive.delay).toBe(5000);
  });
});
