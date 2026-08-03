import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { VersionWatcherService } from './version-watcher.service';

describe('VersionWatcherService', () => {
  let service: VersionWatcherService;
  let mockActivatedRoute: { queryParams: BehaviorSubject<any> };

  beforeEach(() => {
    mockActivatedRoute = {
      queryParams: new BehaviorSubject({})
    };

    TestBed.configureTestingModule({
      providers: [VersionWatcherService, { provide: ActivatedRoute, useValue: mockActivatedRoute }]
    });
    service = TestBed.inject(VersionWatcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with null version', () => {
    expect(service.version()).toBe(null);
  });

  it('should update version when query params change with version', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      // Wait for the effect to run
      setTimeout(() => {
        expect(service.version()).toBe('v1.0');
        done();
      }, 0);
    });
  });

  it('should update version when query params change without version', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      setTimeout(() => {
        expect(service.version()).toBe('v1.0');

        mockActivatedRoute.queryParams.next({ otherParam: 'value' });

        setTimeout(() => {
          expect(service.version()).toBe(null);
          done();
        }, 0);
      }, 0);
    });
  });

  it('should not update version when same version is received', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      setTimeout(() => {
        expect(service.version()).toBe('v1.0');

        // Same version again
        mockActivatedRoute.queryParams.next({ version: 'v1.0' });

        setTimeout(() => {
          expect(service.version()).toBe('v1.0');
          done();
        }, 0);
      }, 0);
    });
  });

  it('should update version when different version is received', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      setTimeout(() => {
        expect(service.version()).toBe('v1.0');

        // Different version
        mockActivatedRoute.queryParams.next({ version: 'v2.0' });

        setTimeout(() => {
          expect(service.version()).toBe('v2.0');
          done();
        }, 0);
      }, 0);
    });
  });

  it('should handle version change from null to value', done => {
    TestBed.runInInjectionContext(() => {
      expect(service.version()).toBe(null);

      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      setTimeout(() => {
        expect(service.version()).toBe('v1.0');
        done();
      }, 0);
    });
  });

  it('should handle version change from value to null', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      setTimeout(() => {
        expect(service.version()).toBe('v1.0');

        mockActivatedRoute.queryParams.next({});

        setTimeout(() => {
          expect(service.version()).toBe(null);
          done();
        }, 0);
      }, 0);
    });
  });

  it('should call callback when version changes', done => {
    const mockCallback = jest.fn();

    TestBed.runInInjectionContext(() => {
      service.onVersionChange(mockCallback);

      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      setTimeout(() => {
        expect(mockCallback).toHaveBeenCalledWith('v1.0');
        done();
      }, 0);
    });
  });

  it('should call callback multiple times when version changes multiple times', done => {
    const mockCallback = jest.fn();

    TestBed.runInInjectionContext(() => {
      service.onVersionChange(mockCallback);

      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      setTimeout(() => {
        mockActivatedRoute.queryParams.next({ version: 'v2.0' });

        setTimeout(() => {
          mockActivatedRoute.queryParams.next({ version: 'v3.0' });

          setTimeout(() => {
            expect(mockCallback).toHaveBeenCalledTimes(3);
            expect(mockCallback).toHaveBeenNthCalledWith(1, 'v1.0');
            expect(mockCallback).toHaveBeenNthCalledWith(2, 'v2.0');
            expect(mockCallback).toHaveBeenNthCalledWith(3, 'v3.0');
            done();
          }, 0);
        }, 0);
      }, 0);
    });
  });

  it('should call callback with null when version is removed', done => {
    const mockCallback = jest.fn();

    TestBed.runInInjectionContext(() => {
      service.onVersionChange(mockCallback);

      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      setTimeout(() => {
        mockActivatedRoute.queryParams.next({});

        setTimeout(() => {
          expect(mockCallback).toHaveBeenCalledTimes(2);
          expect(mockCallback).toHaveBeenNthCalledWith(1, 'v1.0');
          expect(mockCallback).toHaveBeenNthCalledWith(2, null);
          done();
        }, 0);
      }, 0);
    });
  });

  it('should handle multiple callbacks', done => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    TestBed.runInInjectionContext(() => {
      service.onVersionChange(mockCallback1);
      service.onVersionChange(mockCallback2);

      mockActivatedRoute.queryParams.next({ version: 'v1.0' });

      setTimeout(() => {
        expect(mockCallback1).toHaveBeenCalledWith('v1.0');
        expect(mockCallback2).toHaveBeenCalledWith('v1.0');
        done();
      }, 0);
    });
  });

  it('should handle empty query params', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({});

      setTimeout(() => {
        expect(service.version()).toBe(null);
        done();
      }, 0);
    });
  });

  it('should handle query params with other parameters but no version', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({
        otherParam: 'value',
        anotherParam: 'anotherValue'
      });

      setTimeout(() => {
        expect(service.version()).toBe(null);
        done();
      }, 0);
    });
  });

  it('should handle version with special characters', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: 'v1.0-beta' });

      setTimeout(() => {
        expect(service.version()).toBe('v1.0-beta');
        done();
      }, 0);
    });
  });

  it('should handle version with spaces', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: 'v1.0 beta' });

      setTimeout(() => {
        expect(service.version()).toBe('v1.0 beta');
        done();
      }, 0);
    });
  });

  it('should handle empty string version', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: '' });

      setTimeout(() => {
        expect(service.version()).toBe('');
        done();
      }, 0);
    });
  });

  it('should handle undefined version in query params', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: undefined });

      setTimeout(() => {
        expect(service.version()).toBe(null);
        done();
      }, 0);
    });
  });

  it('should handle null version in query params', done => {
    TestBed.runInInjectionContext(() => {
      mockActivatedRoute.queryParams.next({ version: null });

      setTimeout(() => {
        expect(service.version()).toBe(null);
        done();
      }, 0);
    });
  });
});
