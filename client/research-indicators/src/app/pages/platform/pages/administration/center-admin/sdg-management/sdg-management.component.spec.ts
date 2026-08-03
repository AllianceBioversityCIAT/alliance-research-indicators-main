import { CommonModule } from '@angular/common';
import { Component, ContentChild, Input, NO_ERRORS_SCHEMA, TemplateRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import SdgManagementComponent from './sdg-management.component';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { GetLevers } from '@shared/interfaces/get-levers.interface';
import { ApiService } from '@shared/services/api.service';
import { environment } from '@envs/environment';
import * as leverSdg from '@shared/interfaces/lever-sdg-target.interface';

@Component({
  selector: 'app-multiselect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container
      *ngIf="selectedTempl"
      [ngTemplateOutlet]="selectedTempl"
      [ngTemplateOutletContext]="{ $implicit: selectedCtx }" />
    <ng-container
      *ngIf="itemTempl"
      [ngTemplateOutlet]="itemTempl"
      [ngTemplateOutletContext]="{ $implicit: itemCtx }" />
    <ng-container
      *ngIf="rowsTempl"
      [ngTemplateOutlet]="rowsTempl"
      [ngTemplateOutletContext]="{ $implicit: rowsCtx }" />
  `
})
class MultiselectStubComponent {
  @Input() label = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() signal: any;
  @Input() optionLabel = '';
  @Input() optionLabel2 = '';
  @Input() optionValue = '';
  @Input() signalOptionValue = '';
  @Input() disabled = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() removeCondition: (row: any) => boolean = () => true;
  @Input() columnsOnXl = false;
  @Input() selectedItemsSurfaceColor = '';
  @Input() isRequired = false;
  @Input() serviceName = '';
  @Input() filterBy = '';
  @Input() enableVirtualScroll = false;
  @Input() scrollHeight = '200px';
  @Input() placeholder = '';

  @ContentChild('selectedItems') selectedTempl!: TemplateRef<unknown> | null;
  @ContentChild('item') itemTempl!: TemplateRef<unknown> | null;
  @ContentChild('rows') rowsTempl!: TemplateRef<unknown> | null;

  selectedCtx: unknown[] = [];
  itemCtx: Record<string, unknown> = {};
  rowsCtx: Record<string, unknown> = {};
}

function baseLever(overrides: Partial<GetLevers> = {}): GetLevers {
  return {
    id: 1,
    created_at: '',
    updated_at: '',
    is_active: true,
    name: 'n',
    full_name: 'f',
    short_name: 'Alpha',
    other_names: '',
    ...overrides
  } as GetLevers;
}

describe('SdgManagementComponent', () => {
  const mockGetLevers = jest.fn();
  const mockGetMappings = jest.fn();
  const mockGetLeverSdgTargets = jest.fn();
  const mockPatch = jest.fn();
  const api = {
    GET_Levers: mockGetLevers,
    GET_LeverSdgTargetMappings: mockGetMappings,
    GET_LeverSdgTargets: mockGetLeverSdgTargets,
    PATCH_LeverSdgTargets: mockPatch
  };

  async function configureBed(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [SdgManagementComponent, MultiselectStubComponent],
      providers: [{ provide: ApiService, useValue: api as unknown as ApiService }],
      schemas: [NO_ERRORS_SCHEMA]
    }).overrideComponent(SdgManagementComponent, {
      remove: { imports: [MultiselectComponent] } as never,
      add: { imports: [MultiselectStubComponent] }
    });
    await TestBed.compileComponents();
  }

  beforeEach(() => {
    void TestBed.resetTestingModule();
    mockGetLevers.mockReset();
    mockGetMappings.mockReset();
    mockGetLeverSdgTargets.mockReset();
    mockPatch.mockReset();
  });

  function delayMs(ms = 0): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  it('loads, applies mappings, toggles row, and saves (PATCH) then reloads', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({
      data: [
        baseLever({ short_name: 'Z' }),
        baseLever({
          id: 2,
          short_name: 'A',
          other_names: 'x',
          lever_id: 2,
          icon: 'https://example.com/img.png'
        })
      ]
    });
    mockGetMappings.mockResolvedValue({
      data: [
        { id: 10, lever_id: 1, sdg_target_id: 3 },
        {
          id: 11,
          lever: { id: 2, short_name: 'L' },
          sdg_target: { id: 4, sdg_target: 't', sdg_target_code: '1' }
        }
      ]
    });
    mockPatch.mockResolvedValue({ data: {} });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.loading()).toBe(false);
    expect(c.loadError()).toBe(false);
    const levers = c.levers();
    expect(levers).toHaveLength(2);
    const first = levers[0]!;
    const second = levers[1]!;
    const notLoadedLever = { ...baseLever(), id: 99, short_name: 'N', lever_id: 99 };
    const newSig = c.sdgSignalFor(notLoadedLever);
    expect(c.sdgSignalFor(notLoadedLever)).toBe(newSig);
    expect(c.sdgSignalFor(second)).toBe(c.sdgSignalFor(second));
    expect(c.sdgSignalFor(first)).toBe(c.sdgSignalFor(first));
    c.toggleRow(first);
    f.detectChanges();
    expect(c.isExpanded(first)).toBe(true);
    const multiselectDe = f.debugElement.query(By.css('app-multiselect'));
    const multiselect = multiselectDe?.componentInstance as MultiselectStubComponent;
    if (multiselect) {
      multiselect.selectedCtx = [1];
      multiselect.itemCtx = {
        sdg_target_code: '1.1',
        sdg_target: 'x',
        clarisa_sdg: { icon: 'u', short_name: 'N' }
      };
      multiselect.rowsCtx = { sdg_target_code: '1.2', sdg_target: 'y', clarisa_sdg: { icon: 'i' } };
    }
    f.detectChanges();
    c.toggleRow(first);
    f.detectChanges();
    c.toggleRow(first);
    f.detectChanges();
    if (multiselect) {
      multiselect.selectedCtx = [1, 2];
      f.detectChanges();
    }
    const sig0 = c.sdgSignalFor(first)();
    expect(sig0.result_lever_sdg_targets.map(t => t.sdg_target_id)).toEqual([4]);
    c.leverNumericId(baseLever());
    c.leverNumericId(baseLever({ id: 9, lever_id: 99 }));
    c.leverImageSrc(baseLever());
    c.leverImageSrc(baseLever({ icon: 'https://a/b.png' }));
    c.leverImageSrc(baseLever({ lever_url: 'http://a/b' }));
    expect(c.leverImageSrc(baseLever({ icon: '/k.png' }))).toBe(environment.s3Folder + 'k.png');
    expect(c.leverImageSrc(baseLever({ icon: 'rel.png' }))).toBe(environment.s3Folder + 'rel.png');
    expect(c.allowRemoveSdg()).toBe(true);
    expect(c.selectedItemsSurfaceColor).toBe('#F4F7F9');
    await c.saveForLever(first);
    expect(mockPatch).toHaveBeenCalled();
    const body = (mockPatch as jest.Mock).mock.calls[0][0] as { leverSdgTargetList: unknown[] };
    expect(body.leverSdgTargetList).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 11, lever_id: 2, sdg_target_id: 4 })])
    );
    expect(c.saveSuccess()).toBe(true);
  });

  it('sets loadError when GET_Levers throws; shows error copy', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockImplementation(() => {
      throw new Error('lever-fail');
    });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    expect(f.componentInstance.loadError()).toBe(true);
    expect(f.nativeElement.textContent).toMatch(/We could not load/);
  });

  it('shows loading, then no levers when the list is empty', async () => {
    let resolve: (v: { data: GetLevers[] }) => void;
    const pending = new Promise<{ data: GetLevers[] }>(r => {
      resolve = r;
    });
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockReturnValue(pending);
    mockGetMappings.mockResolvedValue({ data: [] });
    mockGetLeverSdgTargets.mockResolvedValue({ data: [] });
    f.detectChanges();
    expect(f.componentInstance.loading()).toBe(true);
    expect(f.nativeElement.textContent).toMatch(/Loading/);
    resolve!({ data: [] });
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    expect(f.componentInstance.levers().length).toBe(0);
    expect(f.nativeElement.textContent).toMatch(/No levers/);
  });

  it('uses per-lever GET when global mappings are empty and applies row', async () => {
    await configureBed();
    const lever = baseLever();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({ data: [lever] });
    mockGetMappings.mockResolvedValue({ data: [] });
    mockGetLeverSdgTargets.mockResolvedValue({
      data: [
        { id: 1, lever: { id: 1, short_name: 'x' }, sdg_target: { id: 5, sdg_target: 'a', sdg_target_code: '1' } }
      ]
    });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    const s = f.componentInstance.sdgSignalFor(lever)();
    expect(s.result_lever_sdg_targets).toEqual([{ sdg_target_id: 5 }]);
    expect(mockGetLeverSdgTargets).toHaveBeenCalledWith(1, false);
  });

  it('when GET_LeverSdgTargetMappings fails, uses per-lever path', async () => {
    await configureBed();
    const lever = baseLever();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({ data: [lever] });
    mockGetMappings.mockRejectedValue(new Error('mappings-fail'));
    mockGetLeverSdgTargets.mockResolvedValue({ data: [] });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    expect(f.componentInstance.loadError()).toBe(false);
    expect(mockGetLeverSdgTargets).toHaveBeenCalledWith(1, false);
  });

  it('saveForLever: skips when loadError; no PATCH', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockImplementation(() => {
      throw new Error('lever-fail-2');
    });
    f.detectChanges();
    await f.whenStable();
    await f.componentInstance.saveForLever(baseLever());
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('saveForLever: skips when loading; no PATCH', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({ data: [baseLever({ short_name: 'S' })] });
    mockGetMappings.mockResolvedValue({ data: [] });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    f.componentInstance.loading.set(true);
    await f.componentInstance.saveForLever(f.componentInstance.levers()[0]!);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('saveForLever: PATCH error sets saveError and clears saving state', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({ data: [baseLever({ short_name: 'S' })] });
    mockGetMappings.mockResolvedValue({ data: [{ id: 1, lever_id: 1, sdg_target_id: 1 }] });
    mockPatch.mockRejectedValue(new Error('f'));
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    const c = f.componentInstance;
    await c.saveForLever(c.levers()[0]!);
    await f.whenStable();
    await delayMs(0);
    expect(c.saveError()).toBe('Failed to save. Please try again.');
    expect(c.savingLeverId()).toBe(null);
  });

  it('buildFullPatchList skips NaN sdg_target_id; keeps valid ids', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({ data: [baseLever({ short_name: 'S' })] });
    mockGetMappings.mockResolvedValue({ data: [{ id: 1, lever_id: 1, sdg_target_id: 1 }] });
    mockPatch.mockResolvedValue({ data: {} });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    const c = f.componentInstance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = (c as any).leverSdgSignals as Map<number, { set: (v: object) => void }>;
    const sig = m.get(1);
    if (!sig) throw new Error('expected signal');
    sig.set({ result_lever_sdgs: [], result_lever_sdg_targets: [{ sdg_target_id: Number.NaN }, { sdg_target_id: 2 }] });
    c.toggleRow(baseLever());
    f.detectChanges();
    await c.saveForLever(c.levers()[0]!);
    await f.whenStable();
    await delayMs(0);
    const body = (mockPatch as jest.Mock).mock.calls.at(-1)![0] as { leverSdgTargetList: { sdg_target_id: number }[] };
    expect(body.leverSdgTargetList.some(x => x.sdg_target_id === 2)).toBe(true);
    expect(body.leverSdgTargetList.find(x => Number.isNaN(x.sdg_target_id))).toBeUndefined();
  });

  it('load: GET_Levers resolves to undefined; optional chaining on response', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue(undefined as unknown as { data: GetLevers[] });
    mockGetMappings.mockResolvedValue({ data: [] });
    mockGetLeverSdgTargets.mockResolvedValue({ data: [] });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    expect(f.componentInstance.levers()).toEqual([]);
  });

  it('load: GET_Levers response without data uses empty levers', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({} as { data?: GetLevers[] });
    mockGetMappings.mockResolvedValue({ data: [] });
    mockGetLeverSdgTargets.mockResolvedValue({ data: [] });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    expect(f.componentInstance.levers()).toEqual([]);
  });

  it('load: sorts levers by short_name with empty string fallback', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({
      data: [
        baseLever({ id: 2, short_name: 'B' }),
        baseLever({ id: 1, short_name: '' }),
        baseLever({ id: 3, short_name: null as unknown as string })
      ]
    });
    mockGetMappings.mockResolvedValue({ data: [] });
    mockGetLeverSdgTargets.mockResolvedValue({ data: [] });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    const names = f.componentInstance.levers().map(l => l.short_name);
    expect(names[2]).toBe('B');
  });

  it('buildFullPatchList: continues when a lever has no signal in the map', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({ data: [baseLever({ short_name: 'S' })] });
    mockGetMappings.mockResolvedValue({ data: [{ id: 1, lever_id: 1, sdg_target_id: 1 }] });
    mockPatch.mockResolvedValue({ data: {} });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (f.componentInstance as any).leverSdgSignals.delete(1);
    await f.componentInstance.saveForLever(f.componentInstance.levers()[0]!);
    const body = (mockPatch as jest.Mock).mock.calls.at(-1)![0] as { leverSdgTargetList: unknown[] };
    expect(body.leverSdgTargetList).toEqual([]);
  });

  it('fetchMappingRows: uses lid when normalize returns row with lever_id 0', async () => {
    const actual = jest.requireActual<typeof leverSdg>('@shared/interfaces/lever-sdg-target.interface');
    const spy = jest.spyOn(leverSdg, 'normalizeLeverSdgTargetMappingList').mockImplementation((raw: unknown) => {
      if (Array.isArray(raw) && (raw[0] as { mark?: string } | undefined)?.mark === 'zeroLid') {
        return [{ id: 1, lever_id: 0, sdg_target_id: 5 }];
      }
      return actual.normalizeLeverSdgTargetMappingList(raw);
    });
    try {
      await configureBed();
      const f = TestBed.createComponent(SdgManagementComponent);
      const lever = baseLever();
      mockGetLevers.mockResolvedValue({ data: [lever] });
      mockGetMappings.mockResolvedValue({ data: [] });
      mockGetLeverSdgTargets.mockResolvedValue({ data: [{ mark: 'zeroLid' }] as unknown[] });
      f.detectChanges();
      await f.whenStable();
      await delayMs(0);
      f.detectChanges();
      const s = f.componentInstance.sdgSignalFor(lever)();
      expect(s.result_lever_sdg_targets).toEqual([{ sdg_target_id: 5 }]);
    } finally {
      spy.mockRestore();
    }
  });
});
