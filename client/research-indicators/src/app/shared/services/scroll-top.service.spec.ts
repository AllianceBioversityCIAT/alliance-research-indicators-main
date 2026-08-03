import { TestBed } from '@angular/core/testing';
import { ScrollToTopService } from './scroll-top.service';

describe('ScrollToTopService', () => {
  let service: ScrollToTopService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScrollToTopService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should scroll to top if element exists', () => {
    const scrollToMock = jest.fn();
    const fakeElement = { scrollTo: scrollToMock };

    jest.spyOn(document, 'getElementById').mockReturnValue(fakeElement as any);

    service.scrollContentToTop('content');

    expect(document.getElementById).toHaveBeenCalledWith('content');
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('should warn if element does not exist', () => {
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    service.scrollContentToTop('nonexistent');

    expect(warnSpy).toHaveBeenCalledWith('Element with id "nonexistent" not found');
  });
});