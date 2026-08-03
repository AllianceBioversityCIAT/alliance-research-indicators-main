import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ImpactAreasComponent } from './impact-areas.component';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { signal } from '@angular/core';
import { ImpactAreasBody, BaseService } from '@shared/interfaces/impact-area.interface';
import { GlobalTargetsService } from '@shared/services/short-control-list/global-targets.service';
import { ImpactAreasService } from '@shared/services/short-control-list/impact-areas.service';
import { GlobalTarget } from '@shared/interfaces/global-target.interface';
import { MultiSelect } from 'primeng/multiselect';

describe('ImpactAreasComponent', () => {
  let component: ImpactAreasComponent;
  let fixture: ComponentFixture<ImpactAreasComponent>;
  let serviceLocatorMock: jest.Mocked<ServiceLocatorService>;
  let mockImpactAreasService: jest.Mocked<BaseService>;
  let listSignalForArea1: ReturnType<typeof signal<GlobalTarget[]>>;
  let loadingSignalForArea1: ReturnType<typeof signal<boolean>>;
  let mockGlobalTargetsService: {
    main: jest.Mock;
    getList: jest.Mock;
    getLoading: jest.Mock;
  };

  beforeEach(async () => {
    listSignalForArea1 = signal<GlobalTarget[]>([]);
    loadingSignalForArea1 = signal(false);

    mockGlobalTargetsService = {
      main: jest.fn().mockResolvedValue(undefined),
      getList: jest.fn((areaId?: number) => {
        if (areaId === 1) {
          return listSignalForArea1;
        }
        return signal<GlobalTarget[]>([]);
      }),
      getLoading: jest.fn((areaId?: number) => {
        if (areaId === 1) {
          return loadingSignalForArea1;
        }
        return signal(false);
      })
    };

    mockImpactAreasService = {
      list: signal([
        { id: 1, name: 'Impact Area 1', icon: 'icon1.png' },
        { id: 2, name: 'Impact Area 2', icon: 'icon2.png' }
      ]),
      loading: signal(false),
      isOpenSearch: signal(false)
    } as any;

    serviceLocatorMock = {
      getService: jest.fn().mockReturnValue(mockImpactAreasService)
    } as any;

    await TestBed.configureTestingModule({
      imports: [ImpactAreasComponent, HttpClientTestingModule],
      providers: [
        { provide: ServiceLocatorService, useValue: serviceLocatorMock },
        { provide: GlobalTargetsService, useValue: mockGlobalTargetsService },
        {
          provide: ImpactAreasService,
          useValue: {
            list: mockImpactAreasService.list
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ImpactAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should trigger globalTargetsService.main for each impact area in list', () => {
    expect(mockGlobalTargetsService.main).toHaveBeenCalledWith(1);
    expect(mockGlobalTargetsService.main).toHaveBeenCalledWith(2);
  });

  describe('Input properties', () => {
    it('should have default body signal', () => {
      expect(component.body).toBeDefined();
      expect(component.body()).toEqual({});
    });

    it('should accept body input', () => {
      const newBody: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 2,
            result_impact_area_global_targets: [{ global_target_id: 3 }]
          }
        ]
      };
      component.body = signal(newBody);
      fixture.detectChanges();
      expect(component.body()).toEqual(newBody);
    });

    it('should have default disabled as false', () => {
      expect(component.disabled).toBe(false);
    });

    it('should accept disabled input', () => {
      component.disabled = true;
      fixture.detectChanges();
      expect(component.disabled).toBe(true);
    });
  });

  describe('globalTargetPanelStyle', () => {
    it('returns only boxSizing when no width was recorded for the area', () => {
      expect(component.globalTargetPanelStyle(999)).toEqual({ boxSizing: 'border-box' });
    });

    it('returns only boxSizing when stored width is zero or negative', () => {
      (component as any).globalTargetPanelWidthsPx.set({ 701: 0 });
      expect(component.globalTargetPanelStyle(701)).toEqual({ boxSizing: 'border-box' });
      (component as any).globalTargetPanelWidthsPx.set({ 701: -3 });
      expect(component.globalTargetPanelStyle(701)).toEqual({ boxSizing: 'border-box' });
    });

    it('returns width, maxWidth and minWidth when stored width is positive', () => {
      (component as any).globalTargetPanelWidthsPx.set({ 702: 288 });
      expect(component.globalTargetPanelStyle(702)).toEqual({
        boxSizing: 'border-box',
        width: '288px',
        maxWidth: '288px',
        minWidth: '288px'
      });
    });
  });

  describe('onGlobalTargetPanelOpen', () => {
    it('returns early and does not record width when trigger rect width is zero', () => {
      const trigger = { getBoundingClientRect: () => ({ width: 0 } as DOMRect) } as HTMLElement;
      const ms = { overlayViewChild: { alignOverlay: jest.fn() } } as unknown as MultiSelect;
      component.onGlobalTargetPanelOpen(801, ms, trigger);
      expect(component.globalTargetPanelStyle(801)).toEqual({ boxSizing: 'border-box' });
    });

    it('records rounded width, runs change detection, and calls alignOverlay after timeout', fakeAsync(() => {
      const alignOverlay = jest.fn();
      const trigger = {
        getBoundingClientRect: () => ({ width: 199.4 } as DOMRect)
      } as HTMLElement;
      const ms = { overlayViewChild: { alignOverlay } } as unknown as MultiSelect;
      const cdr = (component as unknown as { cdr: { detectChanges: () => void } }).cdr;
      const detectChangesSpy = jest.spyOn(cdr, 'detectChanges');

      component.onGlobalTargetPanelOpen(802, ms, trigger);

      expect(component.globalTargetPanelStyle(802)).toMatchObject({
        width: '199px',
        maxWidth: '199px',
        minWidth: '199px'
      });
      expect(detectChangesSpy).toHaveBeenCalled();
      expect(alignOverlay).not.toHaveBeenCalled();

      tick();
      expect(alignOverlay).toHaveBeenCalledTimes(1);

      detectChangesSpy.mockRestore();
    }));

    it('does not throw when overlayViewChild is undefined', fakeAsync(() => {
      const trigger = { getBoundingClientRect: () => ({ width: 50 } as DOMRect) } as HTMLElement;
      const ms = { overlayViewChild: undefined } as unknown as MultiSelect;
      expect(() => {
        component.onGlobalTargetPanelOpen(803, ms, trigger);
        tick();
      }).not.toThrow();
    }));
  });

  describe('isGlobalTargetRequired', () => {
    it('should return true when score is 3', () => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 3,
            result_impact_area_global_targets: []
          }
        ]
      };
      component.body.set(body);
      expect(component.isGlobalTargetRequired(1)).toBe(true);
    });

    it('should return false when score is not 3', () => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 2,
            result_impact_area_global_targets: []
          }
        ]
      };
      component.body.set(body);
      expect(component.isGlobalTargetRequired(1)).toBe(false);
    });

    it('should return false when impact area not found', () => {
      component.body.set({});
      expect(component.isGlobalTargetRequired(999)).toBe(false);
    });

    it('should return false when score is undefined', () => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: undefined as any,
            result_impact_area_global_targets: []
          }
        ]
      };
      component.body.set(body);
      expect(component.isGlobalTargetRequired(1)).toBe(false);
    });
  });

  describe('isGlobalTargetInvalid', () => {
    it('returns true when score is 3 and no global targets selected', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 3,
            result_impact_area_global_targets: []
          }
        ]
      };
      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();
      expect(component.isGlobalTargetInvalid(1)).toBe(true);
    }));

    it('returns false when score is 3 but ids are selected', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 3,
            result_impact_area_global_targets: [{ global_target_id: 9 }]
          }
        ]
      };
      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();
      expect(component.isGlobalTargetInvalid(1)).toBe(false);
    }));

    it('returns false when global target is not required', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 2,
            result_impact_area_global_targets: []
          }
        ]
      };
      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();
      expect(component.isGlobalTargetInvalid(1)).toBe(false);
    }));
  });

  describe('getImpactAreaScore', () => {
    it('should return signal for impact area score', () => {
      const scoreSignal = component.getImpactAreaScore(1);
      expect(scoreSignal).toBeDefined();
      expect(scoreSignal().score).toBeNull();
    });

    it('should return existing signal if already created', () => {
      const signal1 = component.getImpactAreaScore(1);
      const signal2 = component.getImpactAreaScore(1);
      expect(signal1).toBe(signal2);
    });

    it('should initialize signal with existing value from body', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 5,
            result_impact_area_global_targets: []
          }
        ]
      };
      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();

      const scoreSignal = component.getImpactAreaScore(1);
      expect(scoreSignal().score).toBe(5);
    }));
  });

  describe('getGlobalTargetIdsSignal', () => {
    it('should return signal for global target ids', () => {
      const idsSignal = component.getGlobalTargetIdsSignal(1);
      expect(idsSignal).toBeDefined();
      expect(idsSignal()).toEqual([]);
    });

    it('should return existing signal if already created', () => {
      const signal1 = component.getGlobalTargetIdsSignal(1);
      const signal2 = component.getGlobalTargetIdsSignal(1);
      expect(signal1).toBe(signal2);
    });

    it('should initialize signal with existing value from body', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: null,
            result_impact_area_global_targets: [{ global_target_id: 10 }]
          }
        ]
      };
      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();

      const idsSignal = component.getGlobalTargetIdsSignal(1);
      expect(idsSignal()).toEqual([10]);
    }));
  });

  describe('globalTargetOptions and globalTargetLoading', () => {
    it('should delegate to GlobalTargetsService', () => {
      listSignalForArea1.set([
        {
          targetId: 1,
          smo_code: 'S',
          target: 'T',
          impactAreaId: 1,
          impactAreaName: 'A'
        }
      ]);
      expect(component.globalTargetOptions(1)).toEqual(listSignalForArea1());
      loadingSignalForArea1.set(true);
      expect(component.globalTargetLoading(1)).toBe(true);
    });
  });

  describe('selectedGlobalTargetRows', () => {
    it('should map ids to options when present', () => {
      const row: GlobalTarget = {
        targetId: 7,
        smo_code: 'x',
        target: 'y',
        impactAreaId: 1,
        impactAreaName: 'n'
      };
      listSignalForArea1.set([row]);
      component.getGlobalTargetIdsSignal(1).set([7]);
      expect(component.selectedGlobalTargetRows(1)).toEqual([row]);
    });

    it('should use placeholder when option is missing', () => {
      listSignalForArea1.set([]);
      component.getGlobalTargetIdsSignal(1).set([99]);
      const rows = component.selectedGlobalTargetRows(1);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        targetId: 99,
        smo_code: '',
        target: '',
        impactAreaId: 1,
        impactAreaName: ''
      });
    });

    it('should treat undefined options from service as empty array', () => {
      mockGlobalTargetsService.getList.mockImplementationOnce(() => signal(undefined as unknown as GlobalTarget[]));
      component.getGlobalTargetIdsSignal(1).set([3]);
      const rows = component.selectedGlobalTargetRows(1);
      expect(rows).toHaveLength(1);
      expect(rows[0].targetId).toBe(3);
    });
  });

  describe('removeGlobalTargetRow', () => {
    it('should remove id and persist to body', () => {
      component.body.set({});
      component.onGlobalTargetIdsChange(1, [5, 9]);
      component.removeGlobalTargetRow(1, 5);
      expect(component.getGlobalTargetIdsSignal(1)()).toEqual([9]);
      expect(component.body().result_impact_areas?.[0].result_impact_area_global_targets).toEqual([{ global_target_id: 9 }]);
    });
  });

  describe('onScoreChange', () => {
    it('should create new impact area if not exists', () => {
      component.body.set({});
      component.onScoreChange(1, 2);

      const body = component.body();
      expect(body.result_impact_areas).toBeDefined();
      expect(body.result_impact_areas?.length).toBe(1);
      expect(body.result_impact_areas?.[0].impact_area_id).toBe(1);
      expect(body.result_impact_areas?.[0].impact_area_score_id).toBe(2);
    });

    it('should update existing impact area score', () => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 2,
            result_impact_area_global_targets: []
          }
        ]
      };
      component.body.set(body);
      component.onScoreChange(1, 5);

      const updatedBody = component.body();
      expect(updatedBody.result_impact_areas?.[0].impact_area_score_id).toBe(5);
    });

    it('should update score signal', () => {
      component.body.set({});
      component.onScoreChange(1, 3);

      const scoreSignal = component.getImpactAreaScore(1);
      expect(scoreSignal().score).toBe(3);
    });

    it('should initialize result_impact_areas if undefined', () => {
      component.body.set({ result_impact_areas: undefined as any });
      component.onScoreChange(1, 2);

      const body = component.body();
      expect(body.result_impact_areas).toBeDefined();
      expect(body.result_impact_areas?.length).toBe(1);
    });
  });

  describe('onGlobalTargetIdsChange', () => {
    it('should create new impact area if not exists', () => {
      component.body.set({});
      component.onGlobalTargetIdsChange(1, [10]);

      const body = component.body();
      expect(body.result_impact_areas).toBeDefined();
      expect(body.result_impact_areas?.length).toBe(1);
      expect(body.result_impact_areas?.[0].impact_area_id).toBe(1);
      expect(body.result_impact_areas?.[0].result_impact_area_global_targets).toEqual([{ global_target_id: 10 }]);
    });

    it('should update existing impact area global targets', () => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: null,
            result_impact_area_global_targets: [{ global_target_id: 5 }]
          }
        ]
      };
      component.body.set(body);
      component.onGlobalTargetIdsChange(1, [15]);

      const updatedBody = component.body();
      expect(updatedBody.result_impact_areas?.[0].result_impact_area_global_targets).toEqual([{ global_target_id: 15 }]);
    });

    it('should update global target ids signal', () => {
      component.body.set({});
      component.onGlobalTargetIdsChange(1, [20]);

      const idsSignal = component.getGlobalTargetIdsSignal(1);
      expect(idsSignal()).toEqual([20]);
    });

    it('should initialize result_impact_areas if undefined', () => {
      component.body.set({ result_impact_areas: undefined as any });
      component.onGlobalTargetIdsChange(1, [10]);

      const body = component.body();
      expect(body.result_impact_areas).toBeDefined();
      expect(body.result_impact_areas?.length).toBe(1);
    });

    it('should treat null as empty selection', () => {
      component.body.set({});
      component.onGlobalTargetIdsChange(1, [7]);
      component.onGlobalTargetIdsChange(1, null);

      expect(component.getGlobalTargetIdsSignal(1)()).toEqual([]);
      expect(component.body().result_impact_areas?.[0].result_impact_area_global_targets).toBeUndefined();
    });

    it('should clear result_impact_area_global_targets when ids empty', () => {
      component.body.set({});
      component.onGlobalTargetIdsChange(1, [1]);
      component.onGlobalTargetIdsChange(1, []);

      expect(component.body().result_impact_areas?.[0].result_impact_area_global_targets).toBeUndefined();
    });
  });

  describe('constructor effect', () => {
    it('should sync body with signals on initialization', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 5,
            result_impact_area_global_targets: [{ global_target_id: 10 }]
          },
          {
            impact_area_id: 2,
            impact_area_score_id: 3,
            result_impact_area_global_targets: []
          }
        ]
      };

      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();

      const scoreSignal1 = component.getImpactAreaScore(1);
      const idsSignal1 = component.getGlobalTargetIdsSignal(1);
      const scoreSignal2 = component.getImpactAreaScore(2);
      const idsSignal2 = component.getGlobalTargetIdsSignal(2);

      expect(scoreSignal1().score).toBe(5);
      expect(idsSignal1()).toEqual([10]);
      expect(scoreSignal2().score).toBe(3);
      expect(idsSignal2()).toEqual([]);
    }));

    it('should handle null values in body', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: null,
            result_impact_area_global_targets: []
          }
        ]
      };

      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();

      const scoreSignal = component.getImpactAreaScore(1);
      const idsSignal = component.getGlobalTargetIdsSignal(1);

      expect(scoreSignal().score).toBeNull();
      expect(idsSignal()).toEqual([]);
    }));

    it('should handle undefined values in body', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: undefined as any,
            result_impact_area_global_targets: undefined
          }
        ]
      };

      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();

      const scoreSignal = component.getImpactAreaScore(1);
      const idsSignal = component.getGlobalTargetIdsSignal(1);

      expect(scoreSignal().score).toBeNull();
      expect(idsSignal()).toEqual([]);
    }));

    it('should handle body without result_impact_areas', fakeAsync(() => {
      component.body.set({});
      tick();
      flush();
      fixture.detectChanges();

      expect(component.body()).toEqual({});
    }));

    it('should handle impact area without areaId', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: undefined as any,
            impact_area_score_id: 5,
            result_impact_area_global_targets: [{ global_target_id: 10 }]
          }
        ]
      };

      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();

      expect(component.body().result_impact_areas?.length).toBe(1);
    }));

    it('should handle multiple impact areas in effect', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 2,
            result_impact_area_global_targets: [{ global_target_id: 5 }]
          },
          {
            impact_area_id: 2,
            impact_area_score_id: 3,
            result_impact_area_global_targets: [{ global_target_id: 10 }]
          },
          {
            impact_area_id: 3,
            impact_area_score_id: 4,
            result_impact_area_global_targets: [{ global_target_id: 15 }]
          }
        ]
      };

      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();

      const scoreSignal1 = component.getImpactAreaScore(1);
      const idsSignal1 = component.getGlobalTargetIdsSignal(1);
      const scoreSignal2 = component.getImpactAreaScore(2);
      const idsSignal2 = component.getGlobalTargetIdsSignal(2);
      const scoreSignal3 = component.getImpactAreaScore(3);
      const idsSignal3 = component.getGlobalTargetIdsSignal(3);

      expect(scoreSignal1().score).toBe(2);
      expect(idsSignal1()).toEqual([5]);
      expect(scoreSignal2().score).toBe(3);
      expect(idsSignal2()).toEqual([10]);
      expect(scoreSignal3().score).toBe(4);
      expect(idsSignal3()).toEqual([15]);
    }));

    it('should sync empty result_impact_area_global_targets to empty ids', fakeAsync(() => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 1,
            result_impact_area_global_targets: []
          }
        ]
      };
      component.body.set(body);
      tick();
      flush();
      fixture.detectChanges();
      expect(component.getGlobalTargetIdsSignal(1)()).toEqual([]);
    }));
  });

  describe('private methods', () => {
    it('should ensure global target ids signal creates new signal if not exists', () => {
      const sig = component.getGlobalTargetIdsSignal(999);
      expect(sig).toBeDefined();
      expect(sig()).toEqual([]);
    });

    it('should ensure impact area score signal creates new signal if not exists', () => {
      const sig = component.getImpactAreaScore(999);
      expect(sig).toBeDefined();
      expect(sig().score).toBeNull();
    });

    it('should update global target ids signal correctly', () => {
      component.onGlobalTargetIdsChange(1, [25]);
      const sig = component.getGlobalTargetIdsSignal(1);
      expect(sig()).toEqual([25]);
    });

    it('should update impact area score signal correctly', () => {
      component.onScoreChange(1, 7);
      const sig = component.getImpactAreaScore(1);
      expect(sig().score).toBe(7);
    });

    it('should handle null value in score update', () => {
      component.onScoreChange(1, 5);
      component.onScoreChange(1, null as any);
      const sig = component.getImpactAreaScore(1);
      expect(sig().score).toBeNull();
    });

    it('should reuse existing global target ids signal if already created', () => {
      const signal1 = component.getGlobalTargetIdsSignal(1);
      const signal2 = component.getGlobalTargetIdsSignal(1);
      expect(signal1).toBe(signal2);
    });

    it('should reuse existing impact area score signal if already created', () => {
      const signal1 = component.getImpactAreaScore(1);
      const signal2 = component.getImpactAreaScore(1);
      expect(signal1).toBe(signal2);
    });
  });

  describe('onScoreChange edge cases', () => {
    it('should preserve global targets when updating score', () => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 2,
            result_impact_area_global_targets: [{ global_target_id: 10 }]
          }
        ]
      };
      component.body.set(body);
      component.onScoreChange(1, 4);

      const updatedBody = component.body();
      expect(updatedBody.result_impact_areas?.[0].impact_area_score_id).toBe(4);
      expect(updatedBody.result_impact_areas?.[0].result_impact_area_global_targets).toEqual([{ global_target_id: 10 }]);
    });
  });

  describe('onGlobalTargetIdsChange edge cases', () => {
    it('should preserve score when updating global targets', () => {
      const body: ImpactAreasBody = {
        result_impact_areas: [
          {
            impact_area_id: 1,
            impact_area_score_id: 3,
            result_impact_area_global_targets: [{ global_target_id: 5 }]
          }
        ]
      };
      component.body.set(body);
      component.onGlobalTargetIdsChange(1, [15]);

      const updatedBody = component.body();
      expect(updatedBody.result_impact_areas?.[0].result_impact_area_global_targets).toEqual([{ global_target_id: 15 }]);
      expect(updatedBody.result_impact_areas?.[0].impact_area_score_id).toBe(3);
    });
  });
});
