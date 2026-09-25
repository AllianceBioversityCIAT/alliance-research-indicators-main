import { CommonModule } from '@angular/common';
import { Component, ContentChild, Input, NO_ERRORS_SCHEMA, TemplateRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import SdgManagementComponent from './sdg-management.component';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { GetLevers } from '@shared/interfaces/get-levers.interface';
import { ApiService } from '@shared/services/api.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
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

@Component({
  selector: 'app-modal',
  standalone: true,
  template: '<ng-content></ng-content>'
})
class ModalStubComponent {
  @Input() modalName = '';
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
  const mockGetPortfolio2026 = jest.fn();
  const mockPatchPortfolio2026 = jest.fn();
  const mockGetClarisa = jest.fn();
  const modalConfig = signal<Record<string, { isOpen: boolean; title: string; confirmAction?: () => void }>>({
    portfolio2026SdgTargets: { isOpen: false, title: 'Portfolio 2026 SDG targets' }
  });
  const modals = {
    modalConfig,
    openModal: jest.fn(),
    closeModal: jest.fn()
  };
  const api = {
    GET_Levers: mockGetLevers,
    GET_LeverSdgTargetMappings: mockGetMappings,
    GET_LeverSdgTargets: mockGetLeverSdgTargets,
    PATCH_LeverSdgTargets: mockPatch,
    GET_ClarisaSdgTargets: mockGetClarisa,
    GET_Portfolio2026SdgTargets: mockGetPortfolio2026,
    PATCH_Portfolio2026SdgTargets: mockPatchPortfolio2026
  };

  async function configureBed(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [SdgManagementComponent, MultiselectStubComponent, ModalStubComponent],
      providers: [
        { provide: ApiService, useValue: api as unknown as ApiService },
        { provide: AllModalsService, useValue: modals }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).overrideComponent(SdgManagementComponent, {
      remove: { imports: [MultiselectComponent, ModalComponent] } as never,
      add: { imports: [MultiselectStubComponent, ModalStubComponent] }
    });
    await TestBed.compileComponents();
  }

  beforeEach(() => {
    void TestBed.resetTestingModule();
    mockGetLevers.mockReset();
    mockGetMappings.mockReset();
    mockGetLeverSdgTargets.mockReset();
    mockPatch.mockReset();
    mockGetClarisa.mockReset();
    mockGetPortfolio2026.mockReset();
    mockPatchPortfolio2026.mockReset();
    modals.openModal.mockReset();
    modals.closeModal.mockReset();
    mockGetClarisa.mockResolvedValue({ data: [] });
    mockGetPortfolio2026.mockResolvedValue(null);
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
    c.selectLever(second);
    f.detectChanges();
    expect(c.selectedLeverId()).toBe(c.leverNumericId(second));
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
    c.selectLever(first);
    f.detectChanges();
    c.selectLever(first);
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
    c.selectLever(baseLever());
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

  it('opens the portfolio 2026 editor with the saved targets preselected and saves the new selection', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    mockGetLevers.mockResolvedValue({ data: [baseLever({ short_name: 'Lever 1' })] });
    mockGetMappings.mockResolvedValue({ data: [] });
    mockGetClarisa.mockResolvedValue({
      data: [
        { id: 12, sdg_target_code: '1.1', sdg_target: 'Target 1.1' },
        { id: 40, sdg_target_code: '3.1', sdg_target: 'Target 3.1' }
      ]
    });
    mockGetPortfolio2026.mockResolvedValue({ data: { codes: ['1.1'] } });
    mockPatchPortfolio2026.mockResolvedValue({ data: { codes: ['1.1', '3.1'] } });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();

    expect(f.componentInstance.portfolio2026Targets().map(target => target.sdg_target_code)).toEqual(['1.1']);

    f.componentInstance.openPortfolio2026Editor();
    expect(modals.openModal).toHaveBeenCalledWith('portfolio2026SdgTargets');
    expect(f.componentInstance.portfolio2026EditSignal().result_lever_sdg_targets.map(target => target.sdg_target_id)).toEqual([12]);

    f.componentInstance.portfolio2026EditSignal.set({
      result_lever_sdg_targets: [
        { id: 12, sdg_target_id: 12, sdg_target_code: '1.1', sdg_target: 'Target 1.1', select_label: '1.1 — Target 1.1' },
        { id: 40, sdg_target_id: 40, sdg_target_code: '3.1', sdg_target: 'Target 3.1', select_label: '3.1 — Target 3.1' }
      ]
    });
    await f.componentInstance.savePortfolio2026();

    expect(mockPatchPortfolio2026).toHaveBeenCalledWith({ sdg_target_ids: [12, 40] });
    expect(modals.closeModal).toHaveBeenCalledWith('portfolio2026SdgTargets');
  });

  it('selects a lever of the portfolio and falls back to the first one', async () => {
    await configureBed();
    const c = TestBed.createComponent(SdgManagementComponent).componentInstance;
    const a = baseLever({ id: 1, lever_id: 1, short_name: 'A', portfolio_id: 1 });
    const b = baseLever({ id: 2, lever_id: 2, short_name: 'B', portfolio_id: 1 });
    c.levers.set([a, b]);
    expect(c.isSelected(a)).toBe(true);
    c.selectLever(b);
    expect(c.isSelected(b)).toBe(true);
    expect(c.isSelected(a)).toBe(false);
    c.levers.set([a]);
    expect(c.selectedLever()).toBe(a);
  });

  it('lists portfolio 2025 lever targets as a list and saves the modal selection', async () => {
    await configureBed();
    const f = TestBed.createComponent(SdgManagementComponent);
    const lever = baseLever({ short_name: 'Lever 1', other_names: 'Climate', portfolio_id: 1 });
    mockGetLevers.mockResolvedValue({ data: [lever, baseLever({ id: 8, short_name: 'Research area', portfolio_id: 2 })] });
    mockGetMappings.mockResolvedValue({
      data: [
        { id: 10, lever_id: 1, sdg_target_id: 12 },
        { id: 11, lever_id: 1, sdg_target_id: 40 }
      ]
    });
    mockGetClarisa.mockResolvedValue({
      data: [
        { id: 40, sdg_target_code: '2.2', sdg_target: 'Target 2.2' },
        {
          id: 12,
          sdg_target_code: '1.1',
          sdg_target: 'Target 1.1',
          clarisa_sdg: { id: 1, short_name: 'SDG 1', icon: 'sdg-1.png' }
        },
        { id: 7, sdg_target_code: '9.9', sdg_target: 'Other' }
      ]
    });
    mockPatch.mockResolvedValue({ data: {} });
    f.detectChanges();
    await f.whenStable();
    await delayMs(0);
    f.detectChanges();

    // Both portfolio groups start collapsed: only their headers are visible.
    expect(f.nativeElement.textContent).toContain('Levers');
    expect(f.nativeElement.textContent).toContain('1 lever');
    expect(f.nativeElement.textContent).not.toContain('Lever 1');
    expect(f.nativeElement.querySelectorAll('.sdg-target-list')).toHaveLength(0);

    f.componentInstance.toggleLeversGroup();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Lever 1');
    expect(f.nativeElement.textContent).toContain('Climate');
    expect(f.nativeElement.textContent).toContain('2 targets');
    expect(f.nativeElement.textContent).not.toContain('Research area');
    // The first lever is selected by default, so its targets show without another click.
    expect(f.componentInstance.isSelected(lever)).toBe(true);
    expect(f.nativeElement.querySelectorAll('.sdg-target-list')).toHaveLength(1);
    expect(f.nativeElement.querySelector('.sdg-target-list img')?.getAttribute('src')).toBe('sdg-1.png');

    f.componentInstance.toggleSdgList();
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.sdg-target-list')).toHaveLength(2);
    expect(f.nativeElement.textContent).toContain('1.1');
    expect(f.nativeElement.textContent).toContain('2.2');

    f.componentInstance.openPortfolio2025Editor(lever);
    expect(modals.openModal).toHaveBeenCalledWith('portfolio2025LeverSdgs');
    expect(f.componentInstance.portfolio2025EditSignal().result_lever_sdg_targets.map(target => target.sdg_target_id)).toEqual([
      12, 40
    ]);

    f.componentInstance.portfolio2025EditSignal.set({
      result_lever_sdg_targets: [
        { id: 12, sdg_target_id: 12, sdg_target_code: '1.1', sdg_target: 'Target 1.1', select_label: '1.1 — Target 1.1' }
      ]
    });
    await f.componentInstance.savePortfolio2025();

    expect(mockPatch).toHaveBeenCalledWith({
      leverSdgTargetList: [expect.objectContaining({ id: 10, lever_id: 1, sdg_target_id: 12 })]
    });
    expect(modals.closeModal).toHaveBeenCalledWith('portfolio2025LeverSdgs');
  });

  it('orders portfolio sections most recent first', async () => {
    await configureBed();
    const c = TestBed.createComponent(SdgManagementComponent).componentInstance;
    c.portfolios.set([
      { id: 1, name: 'Portfolio 1', description: '', start_year: 2010, end_year: 2025 },
      { id: 2, name: 'Portfolio 2', description: '', start_year: 2026, end_year: 2030 }
    ]);
    expect(c.portfolioSections()).toEqual([2, 1]);

    c.portfolios.set([
      { id: 1, name: 'Portfolio 1', description: '', start_year: 2027, end_year: 2032 },
      { id: 2, name: 'Portfolio 2', description: '', start_year: 2026, end_year: 2030 }
    ]);
    expect(c.portfolioSections()).toEqual([1, 2]);
  });

  it('labels a portfolio by its year range without the portfolio number', async () => {
    await configureBed();
    const c = TestBed.createComponent(SdgManagementComponent).componentInstance;
    c.portfolios.set([{ id: 2, name: 'Portfolio 2', description: '', start_year: 2026, end_year: 2030 }]);
    expect(c.portfolioLabel(2)).toBe('Portfolio (2026–2030)');
    expect(c.portfolioLabel(1)).toBe('Portfolio');
  });
});
