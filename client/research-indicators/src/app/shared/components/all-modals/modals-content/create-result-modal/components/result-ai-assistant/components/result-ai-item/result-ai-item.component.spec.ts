import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultAiItemComponent } from './result-ai-item.component';
import { signal } from '@angular/core';
import { CreateResultManagementService } from '../../../../services/create-result-management.service';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { AIAssistantResult } from '../../../../models/AIAssistantResult';

describe('ResultAiItemComponent', () => {
  let component: ResultAiItemComponent;
  let fixture: ComponentFixture<ResultAiItemComponent>;

  let createResultManagementServiceMock: any;
  let apiServiceMock: any;
  let actionsServiceMock: any;
  let allModalsServiceMock: any;

  const baseItem: AIAssistantResult = {
    indicator: 'i',
    title: 'My Title',
    description: 'desc',
    keywords: [],
    geoscope_level: 'global',
    regions: [],
    countries: [],
    training_type: 'tt',
    length_of_training: '1',
    start_date: 's',
    end_date: 'e',
    degree: 'deg',
    delivery_modality: 'dm',
    total_participants: 10,
    evidence_for_stage: 'ev',
    policy_type: 'pol',
    main_contact_person: { name: 'n l', code: 'c', similarity_score: 0.8 },
    stage_in_policy_process: 'st',
    male_participants: 0,
    female_participants: 0,
    non_binary_participants: '0',
    contract_code: 'C-1',
    result_official_code: 'R-1',
    innovation_nature: 'in',
    innovation_type: 'it',
    assess_readiness: 1,
    anticipated_users: 'au',
    organization_type: ['org'],
    organization_sub_type: 'ost',
    organizations: ['o1'],
    innovation_actors_detailed: []
  };

  beforeEach(async () => {
    createResultManagementServiceMock = {
      expandedItem: signal<AIAssistantResult | null>(null),
      items: signal<AIAssistantResult[]>([ { ...baseItem } ])
    } as Partial<CreateResultManagementService>;

    apiServiceMock = {
      POST_CreateResult: jest.fn().mockResolvedValue({ successfulRequest: true, data: { result_official_code: 'R-NEW' } })
    } as Partial<ApiService>;

    actionsServiceMock = {
      handleBadRequest: jest.fn(),
      showToast: jest.fn(),
      showGlobalAlert: jest.fn()
    } as Partial<ActionsService>;

    allModalsServiceMock = {
      setModalWidth: jest.fn(),
      setGoBackFunction: jest.fn()
    } as Partial<AllModalsService>;

    await TestBed.configureTestingModule({
      imports: [ResultAiItemComponent],
      providers: [
        { provide: CreateResultManagementService, useValue: createResultManagementServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ActionsService, useValue: actionsServiceMock },
        { provide: AllModalsService, useValue: allModalsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultAiItemComponent);
    component = fixture.componentInstance;
    component.item = { ...baseItem };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggleExpand should toggle expanded item', () => {
    component.toggleExpand(component.item as AIAssistantResult);
    expect(createResultManagementServiceMock.expandedItem()).toBe(component.item);
    component.toggleExpand(component.item as AIAssistantResult);
    expect(createResultManagementServiceMock.expandedItem()).toBeNull();
  });

  it('discardResult should remove item from list', () => {
    const item2 = { ...baseItem, result_official_code: 'R-2', title: 'Other' };
    createResultManagementServiceMock.items.set([component.item, item2]);
    component.discardResult(component.item as AIAssistantResult);
    expect(createResultManagementServiceMock.items()).toEqual([item2]);
  });

  it('createResult should set isCreated true and update official code on success', async () => {
    component.isEditingTitle.set(true);
    jest.spyOn(component , 'finishEditingTitle');
    await component.createResult(component.item as AIAssistantResult);
    expect((component).finishEditingTitle).toHaveBeenCalled();
    expect(component.isCreated()).toBe(true);
    expect((component.item as AIAssistantResult).result_official_code).toBe('R-NEW');
  });

  it('createResult should call handleBadRequest on unsuccessfulRequest', async () => {
    (apiServiceMock.POST_CreateResult as jest.Mock).mockResolvedValueOnce({ successfulRequest: false });
    await component.createResult(component.item as AIAssistantResult);
    expect(component.isCreated()).toBe(false);
    expect(actionsServiceMock.handleBadRequest).toHaveBeenCalled();
  });

  it('createResult should catch and log errors', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiServiceMock.POST_CreateResult as jest.Mock).mockRejectedValueOnce(new Error('x'));
    await component.createResult(component.item as AIAssistantResult);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('openResult should open new tab with result url', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    component.openResult(component.item as AIAssistantResult);
    expect(openSpy).toHaveBeenCalledWith(`/result/${component.item.result_official_code}/general-information`, '_blank');
    openSpy.mockRestore();
  });

  it('isAIAssistantResult type guard', () => {
    expect(component.isAIAssistantResult(component.item)).toBe(true);
    expect(component.isAIAssistantResult({ title: 'x' } as any)).toBe(false);
  });

  it('autoGrow should adjust height when titleInput exists', () => {
    const el = document.createElement('textarea');
    Object.defineProperty(el, 'scrollHeight', { value: 123, configurable: true });
    (component ).titleInput = { nativeElement: el };
    component.autoGrow();
    expect(el.style.height).toBe('123px');
  });

  it('editing title flow: start, finish, cancel, and onDocumentClick outside', () => {
    jest.useFakeTimers();
    const el = document.createElement('textarea');
    (el).focus = jest.fn();
    Object.defineProperty(el, 'scrollHeight', { value: 77, configurable: true });
    (component ).titleInput = { nativeElement: el };
    const growSpy = jest.spyOn(component, 'autoGrow');
    component.startEditingTitle();
    jest.runOnlyPendingTimers();
    expect(component.isEditingTitle()).toBe(true);
    expect(growSpy).toHaveBeenCalled();
    expect((el).focus).toHaveBeenCalled();

    component.tempTitle = 'New Title';
    expect(growSpy).toHaveBeenCalled();
    expect(component.tempTitle).toBe('New Title');

    component.finishEditingTitle();
    expect(component.item.title).toBe('New Title');

    component.startEditingTitle();
    component.tempTitle = 'Another';
    component.cancelEditingTitle();
    expect(component.isEditingTitle()).toBe(false);

    component.startEditingTitle();
    component.tempTitle = 'Final';
    const finishSpy = jest.spyOn(component, 'finishEditingTitle');
    const container = document.createElement('div');
    (component).editTitleContainer = { nativeElement: container };
    const outside = document.createElement('div');
    document.body.appendChild(container);
    document.body.appendChild(outside);
    component.onDocumentClick({ target: outside } as unknown as Event);
    expect(finishSpy).toHaveBeenCalled();
    container.remove();
    outside.remove();
    jest.useRealTimers();
  });

  it('collections getters should normalize non-array inputs', () => {
    const item: any = { ...baseItem, organization_type: 'x', organizations: 'y', innovation_actors_detailed: 'z' };
    expect(component.getOrganizationType(item)).toEqual([]);
    expect(component.getOrganizations(item)).toEqual([]);
    expect(component.getInnovationActorsDetailed(item)).toEqual([]);
  });

  it('autoGrow should safely no-op when titleInput is missing', () => {
    (component as any).titleInput = undefined;
    expect(() => component.autoGrow()).not.toThrow();
  });

  it('onDocumentClick should early-return when not editing', () => {
    const finishSpy = jest.spyOn(component, 'finishEditingTitle');
    component.isEditingTitle.set(false);
    component.onDocumentClick({ target: document.body } as any);
    expect(finishSpy).not.toHaveBeenCalled();
  });

  it('collections getters should return arrays when arrays provided', () => {
    const item: any = { ...baseItem, organization_type: ['A'], organizations: ['B'], innovation_actors_detailed: [{ name: 'n', role: 'r' }] };
    expect(component.getOrganizationType(item)).toEqual(['A']);
    expect(component.getOrganizations(item)).toEqual(['B']);
    expect(component.getInnovationActorsDetailed(item)).toEqual([{ name: 'n', role: 'r' }]);
  });

  it('ngOnChanges should set isCreated to true when item has result_official_code', () => {
    const itemWithCode = { ...baseItem, result_official_code: 'R-123' };
    component.item = itemWithCode;
    
    component.ngOnChanges({
      item: {
        currentValue: itemWithCode,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    
    expect(component.isCreated()).toBe(true);
  });

  it('ngOnChanges should set isCreated to false when item has no result_official_code', () => {
    const itemWithoutCode = { ...baseItem, result_official_code: undefined };
    component.item = itemWithoutCode;
    
    component.ngOnChanges({
      item: {
        currentValue: itemWithoutCode,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    
    expect(component.isCreated()).toBe(false);
  });

  it('ngOnChanges should handle non-AI assistant result items', () => {
    const nonAiItem = { name: 'test', type: 'other' };
    component.item = nonAiItem as any;
    
    component.ngOnChanges({
      item: {
        currentValue: nonAiItem,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    
    expect(component.isCreated()).toBe(false);
  });
});


