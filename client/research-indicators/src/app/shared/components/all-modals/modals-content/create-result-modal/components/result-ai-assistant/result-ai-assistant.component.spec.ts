import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultAiAssistantComponent } from './result-ai-assistant.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { FileManagerService } from '@shared/services/file-manager.service';
import { TextMiningService } from '@shared/services/text-mining.service';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { GetContractsService } from '@shared/services/control-list/get-contracts.service';
import { CreateResultManagementService } from '../../services/create-result-management.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { signal } from '@angular/core';
import { OrganizationDetailed } from '../../models/AIAssistantResult';

jest.mock('pdfjs-dist', () => {
  return {
    getDocument: jest.fn().mockImplementation(() => ({ promise: Promise.resolve({ numPages: 5 }) })),
    GlobalWorkerOptions: { workerSrc: '' }
  };
});

describe('ResultAiAssistantComponent', () => {
  let component: ResultAiAssistantComponent;
  let fixture: ComponentFixture<ResultAiAssistantComponent>;

  let allModalsServiceMock: any;
  let fileManagerServiceMock: any;
  let textMiningServiceMock: any;
  let actionsServiceMock: any;
  let apiServiceMock: any;
  let getContractsServiceMock: any;
  let createResultManagementServiceMock: any;
  let cacheServiceMock: any;

  function createFile(name: string, sizeBytes = 1000, content = 'dummy') {
    const file = new File([content], name, { type: 'application/octet-stream' });
    Object.defineProperty(file, 'size', { value: sizeBytes });
    file.arrayBuffer = jest.fn().mockResolvedValue(new TextEncoder().encode(content).buffer);
    return file;
  }

  beforeEach(async () => {
    allModalsServiceMock = {
      setGoBackFunction: jest.fn(),
      setModalWidth: jest.fn(),
      modalConfig: jest.fn().mockReturnValue({ createResult: { isWide: false } }),
      isModalOpen: jest.fn().mockReturnValue({ isOpen: false })
    };

    fileManagerServiceMock = {
      uploadFile: jest.fn().mockResolvedValue({ data: { filename: 'file.pdf' } })
    } as Partial<FileManagerService>;

    textMiningServiceMock = {
      executeTextMining: jest.fn().mockResolvedValue({ content: [{ text: JSON.stringify({ results: [{ title: 't' }] }) }] })
    } as Partial<TextMiningService>;

    actionsServiceMock = {
      showGlobalAlert: jest.fn(),
      showToast: jest.fn()
    } as Partial<ActionsService>;

    apiServiceMock = {
      GET_IssueCategories: jest.fn().mockResolvedValue({ data: [] }),
      POST_feedback: jest.fn().mockResolvedValue({})
    } as Partial<ApiService>;

    getContractsServiceMock = {
      list: signal([]),
      aiAssistantList: signal([]),
      mainForAiAssistant: jest.fn().mockResolvedValue(undefined)
    };

    createResultManagementServiceMock = {
      items: signal<[]>([]),
      resultPageStep: signal(0),
      resetModal: jest.fn()
    } as Partial<CreateResultManagementService>;

    cacheServiceMock = {
      dataCache: signal({ user: { id: 1, email: 'user@test.com' } })
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ResultAiAssistantComponent],
      providers: [
        { provide: AllModalsService, useValue: allModalsServiceMock },
        { provide: FileManagerService, useValue: fileManagerServiceMock },
        { provide: TextMiningService, useValue: textMiningServiceMock },
        { provide: ActionsService, useValue: actionsServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: GetContractsService, useValue: getContractsServiceMock },
        { provide: CreateResultManagementService, useValue: createResultManagementServiceMock },
        { provide: CacheService, useValue: cacheServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultAiAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load badTypes from GET_IssueCategories in constructor', async () => {
    const categories = [
      { id: 1, name: 'Category A' },
      { id: 2, name: 'Category B' }
    ];
    (apiServiceMock.GET_IssueCategories as jest.Mock).mockResolvedValue({ data: categories });
    const f = TestBed.createComponent(ResultAiAssistantComponent);
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.badTypes).toEqual(categories);
  });

  it('should execute goBack function registered in constructor', () => {
    const registered = allModalsServiceMock.setGoBackFunction.mock.calls[0][0] as () => void;
    component.analyzingDocument.set(false);
    registered();
    expect(createResultManagementServiceMock.resultPageStep()).toBe(0);
  });

  it('isValidFileType and isValidFileSize should work', () => {
    expect(component.isValidFileType(createFile('a.pdf'))).toBe(true);
    expect(component.isValidFileType(createFile('a.exe'))).toBe(false);
    expect(component.isValidFileSize(createFile('a.pdf', 1024))).toBe(true);
    expect(component.isValidFileSize(createFile('a.pdf', 20 * 1024 * 1024))).toBe(false);
  });

  it('handleFile should alert on invalid type and size', async () => {
    const badType = createFile('a.exe');
    await component.handleFile(badType);
    expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalled();

    const bigFile = createFile('a.pdf', 11 * 1024 * 1024);
    await component.handleFile(bigFile);
    expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalledTimes(2);
  });

  it('isValidPageCount should detect password and page overflow', async () => {
    const { getDocument } = jest.requireMock('pdfjs-dist');
    (getDocument as jest.Mock).mockImplementationOnce(() => ({ promise: Promise.reject({ name: 'PasswordException' }) }));
    const res1 = await component.isValidPageCount(createFile('a.pdf'));
    expect(['password', false]).toContain(res1);
    (getDocument as jest.Mock).mockImplementationOnce(() => ({ promise: Promise.resolve({ numPages: 999 }) }));
    const res2 = await component.isValidPageCount(createFile('a.pdf'));
    expect(res2).toBe(false);
  });

  it('isValidPageCount should log error and return false on non-password failure', async () => {
    const { getDocument } = jest.requireMock('pdfjs-dist');
    (getDocument as jest.Mock).mockImplementationOnce(() => ({ promise: Promise.reject({ name: 'Other', message: 'Some error' }) }));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await component.isValidPageCount(createFile('a.pdf'));
    expect(res).toBe(false);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('isValidPageCount should return password when error message includes Password', async () => {
    const { getDocument } = jest.requireMock('pdfjs-dist');
    (getDocument as jest.Mock).mockImplementationOnce(() => ({ promise: Promise.reject({ message: 'Document is Password protected' }) }));
    const res = await component.isValidPageCount(createFile('a.pdf'));
    expect(res).toBe('password');
  });

  it('handleFile should accept valid file and set selectedFile', async () => {
    const file = createFile('a.txt', 1000);
    await component.handleFile(file);
    expect(component.selectedFile).toBe(file);
  });

  it('handleFile should show protected doc alert and not set file when password', async () => {
    const { getDocument } = jest.requireMock('pdfjs-dist');
    (getDocument as jest.Mock).mockImplementationOnce(() => ({ promise: Promise.reject({ name: 'PasswordException' }) }));
    const file = createFile('a.pdf', 1000);
    await component.handleFile(file);
    expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalledWith(expect.objectContaining({ summary: 'PROTECTED DOCUMENT' }));
    expect(component.selectedFile).toBeNull();
  });

  it('handleFile should show PAGE LIMIT EXCEEDED alert when PDF exceeds limit', async () => {
    const { getDocument } = jest.requireMock('pdfjs-dist');
    (getDocument as jest.Mock).mockImplementationOnce(() => ({ promise: Promise.resolve({ numPages: 999 }) }));
    const file = createFile('huge.pdf', 1000);
    await component.handleFile(file);
    expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalledWith(expect.objectContaining({ summary: 'PAGE LIMIT EXCEEDED' }));
    expect(component.selectedFile).toBeNull();
  });

  it('goBack should reset states when analyzed and not when analyzing', () => {
    component.analyzingDocument.set(true);
    component.goBack();
    expect(createResultManagementServiceMock.items()).toEqual([]);

    component.analyzingDocument.set(false);
    component.documentAnalyzed.set(true);
    component.selectedFile = {} as File;
    component.goBack();
    expect(component.selectedFile).toBeNull();
    expect(allModalsServiceMock.setModalWidth).toHaveBeenCalledWith('createResult', false);
    // when not analyzing and not analyzed, it should go to step 0
    component.documentAnalyzed.set(false);
    component.goBack();
    expect(createResultManagementServiceMock.resultPageStep()).toBe(0);
  });

  it('onPageChange should set first and rows', () => {
    component.onPageChange({ first: 10, rows: 20 });
    expect(component.first()).toBe(10);
    expect(component.rows()).toBe(20);
  });

  it('onPageChange should default first=0 and rows=5 when undefined', () => {
    // set to non-defaults first
    component.first.set(99);
    component.rows.set(99);
    component.onPageChange({});
    expect(component.first()).toBe(0);
    expect(component.rows()).toBe(5);
  });

  it('drag events should toggle isDragging', () => {
    const evt = new Event('drag') as DragEvent;
    jest.spyOn(evt, 'preventDefault');
    jest.spyOn(evt, 'stopPropagation');
    component.onDragOver(evt);
    expect(component.isDragging).toBe(true);
    component.onDragLeave(evt);
    expect(component.isDragging).toBe(false);
  });

  it('onDrop should call handleFile', async () => {
    const file = createFile('a.pdf');
    const dt = { files: [file] } as unknown as DataTransfer;
    const evt = { preventDefault: jest.fn(), stopPropagation: jest.fn(), dataTransfer: dt } as unknown as DragEvent;
    const spy = jest.spyOn(component, 'handleFile');
    component.onDrop(evt);
    expect(spy).toHaveBeenCalled();
  });

  it('handleAnalyzingDocument success path should set items and documentAnalyzed', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    await component.handleAnalyzingDocument();
    expect(component.documentAnalyzed()).toBe(true);
    expect(createResultManagementServiceMock.items().length).toBeGreaterThan(0);
  });

  it('handleAnalyzingDocument no results should set noResults and not set analyzed', async () => {
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({ content: [{ text: JSON.stringify({ results: [] }) }] });
    const file = createFile('a.pdf');
    component.selectedFile = file;
    await component.handleAnalyzingDocument();
    expect(component.noResults()).toBe(true);
    expect(component.documentAnalyzed()).toBe(false);
  });

  it('handleAnalyzingDocument with empty content should toast error and not analyze', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({ content: [] });
    await component.handleAnalyzingDocument();
    expect(actionsServiceMock.showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Something went wrong. Please try again.'
    });
    expect(component.documentAnalyzed()).toBe(false);
  });

  it('handleAnalyzingDocument should warn and return when no file selected', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await component.handleAnalyzingDocument();
    expect(warnSpy).toHaveBeenCalledWith('No file selected.');
    expect(component.analyzingDocument()).toBe(false);
    warnSpy.mockRestore();
  });

  it('handleAnalyzingDocument with items missing text should set noResults', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({ content: [{}, { text: '' }] });
    await component.handleAnalyzingDocument();
    expect(component.noResults()).toBe(true);
  });

  it('handleAnalyzingDocument with non-array results should set noResults', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({ content: [{ text: JSON.stringify({ results: { foo: 'bar' } }) }] });
    await component.handleAnalyzingDocument();
    expect(component.noResults()).toBe(true);
  });

  it('getContractStatusClasses should map statuses', () => {
    expect(component.getContractStatusClasses('ONGOING')).toContain('153C71');
    expect(component.getContractStatusClasses('unknown')).toContain('235B2D');
  });

  it('getContractStatusClasses should handle undefined and empty status', () => {
    expect(component.getContractStatusClasses(undefined as unknown as string)).toContain('235B2D');
    expect(component.getContractStatusClasses('')).toContain('235B2D');
  });

  it('feedback panel flow and submitFeedback', async () => {
    // open negative feedback
    component.toggleFeedback('negative');
    expect(component.showFeedbackPanel()).toBe(true);
    expect(component.feedbackType()).toBe('negative');
    expect(component.isRequired()).toBe(true);
    component.selectType('t1');
    component.body.update(b => ({ ...b, feedbackText: 'desc' }));
    component.miningResponse = [{ text: 'x' }];
    await component.submitFeedback();
    expect(apiServiceMock.POST_feedback).toHaveBeenCalled();
    expect(actionsServiceMock.showToast).toHaveBeenCalled();
    expect(component.feedbackSent).toBe(true);
    expect(component.lastFeedbackType).toBe('negative');
    expect(component.showFeedbackPanel()).toBe(false);
  });

  it('toggleFeedback should close when same type clicked and reopen when switching type', () => {
    jest.useFakeTimers();
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    // open positive
    component.toggleFeedback('positive');
    jest.runOnlyPendingTimers();
    expect(component.showFeedbackPanel()).toBe(true);
    // click same type -> close
    component.toggleFeedback('positive');
    expect(component.showFeedbackPanel()).toBe(false);
    expect(removeSpy).toHaveBeenCalledWith('click', component.handleOutsideClick);
    // switch to negative -> close then reopen with delay
    component.toggleFeedback('negative');
    jest.advanceTimersByTime(200);
    expect(component.showFeedbackPanel()).toBe(true);
    jest.useRealTimers();
  });

  it('toggleFeedback switch case should reattach outside listener after delay', () => {
    jest.useFakeTimers();
    const addSpy = jest.spyOn(document, 'addEventListener');
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    // open with positive
    component.toggleFeedback('positive');
    jest.runOnlyPendingTimers();
    // switch to negative triggers close then reopen after 100ms and then inner attach
    component.toggleFeedback('negative');
    // first close removes listener
    expect(removeSpy).toHaveBeenCalledWith('click', component.handleOutsideClick);
    // advance to trigger reopen and inner attach
    jest.advanceTimersByTime(150);
    expect(component.showFeedbackPanel()).toBe(true);
    expect(addSpy).toHaveBeenCalledWith('click', component.handleOutsideClick);
    jest.useRealTimers();
  });

  it('toggleFeedback initial open should attach outside click listener', () => {
    jest.useFakeTimers();
    const addSpy = jest.spyOn(document, 'addEventListener');
    component.toggleFeedback('positive');
    jest.runOnlyPendingTimers();
    expect(component.showFeedbackPanel()).toBe(true);
    expect(addSpy).toHaveBeenCalledWith('click', component.handleOutsideClick);
    jest.useRealTimers();
  });

  it('closeFeedbackPanel should reset state and remove listener', () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    component.showFeedbackPanel.set(true);
    component.feedbackType.set('negative');
    component.body.update(b => ({ ...b, feedbackText: 'x' }));
    component.closeFeedbackPanel();
    expect(component.showFeedbackPanel()).toBe(false);
    expect(component.feedbackType()).toBeNull();
    expect(component.body().feedbackText).toBe('');
    expect(removeSpy).toHaveBeenCalledWith('click', component.handleOutsideClick);
  });

  it('selectType should toggle values', () => {
    component.selectedType = [];
    component.selectType('1');
    expect(component.selectedType).toEqual(['1']);
    component.selectType('1');
    expect(component.selectedType).toEqual([]);
  });

  it('handleOutsideClick should close when click is outside panel', () => {
    component.showFeedbackPanel.set(true);
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const fakePanel = document.createElement('div');
    fakePanel.id = 'feedbackPanelRef';
    document.body.appendChild(fakePanel);
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    component.handleOutsideClick({ target: outside } as any);
    expect(component.showFeedbackPanel()).toBe(false);
    expect(removeSpy).toHaveBeenCalledWith('click', component.handleOutsideClick);
    fakePanel.remove();
    outside.remove();
  });

  it('handleOutsideClick should not close when feedbackPanelRef is not in DOM', () => {
    component.showFeedbackPanel.set(true);
    const closeSpy = jest.spyOn(component, 'closeFeedbackPanel');
    const existingPanel = document.getElementById('feedbackPanelRef');
    existingPanel?.remove();
    component.handleOutsideClick({ target: document.body } as MouseEvent);
    expect(closeSpy).not.toHaveBeenCalled();
    expect(component.showFeedbackPanel()).toBe(true);
    closeSpy.mockRestore();
    if (existingPanel) document.body.appendChild(existingPanel);
  });

  it('startProgress, runStep and timers should progress through steps', () => {
    jest.useFakeTimers();
    jest.spyOn(component, 'getRandomInterval').mockReturnValue(100);
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      (cb as FrameRequestCallback)(0);
      return 1;
    });
    component.startProgress();
    jest.advanceTimersByTime(5000);
    const steps = component.steps();
    expect(steps.some(s => s.completed)).toBe(true);
    rafSpy.mockRestore();
    jest.useRealTimers();
  });

  it('runStep should complete single step through animation and finishStep timers', () => {
    jest.useFakeTimers();
    jest.spyOn(component, 'getRandomInterval').mockReturnValue(100);
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      (cb as FrameRequestCallback)(0);
      return 1;
    });
    component.runStep(0);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(150);
    jest.advanceTimersByTime(100);
    const s = component.steps()[0];
    expect(s.completed).toBe(true);
    expect(s.inProgress).toBe(false);
    rafSpy.mockRestore();
    jest.useRealTimers();
  });

  it('onFileSelected should call handleFile with selected file', async () => {
    const spy = jest.spyOn(component, 'handleFile').mockResolvedValue();
    const input = document.createElement('input');
    const file = createFile('z.pdf');
    Object.defineProperty(input, 'files', { value: [file] });
    const evt = { target: input } as unknown as Event;
    component.onFileSelected(evt);
    expect(spy).toHaveBeenCalledWith(file);
  });

  it('goBackToCreateResult and goBackToUploadNewFile should reset state and call services', () => {
    component.selectedFile = createFile('a.pdf');
    component.documentAnalyzed.set(true);
    component.noResults.set(true);
    component.feedbackSent = true;
    component.lastFeedbackType = 'positive';
    component.goBackToCreateResult();
    expect(component.selectedFile).toBeNull();
    expect(component.documentAnalyzed()).toBe(false);
    expect(component.noResults()).toBe(false);
    expect(component.feedbackSent).toBe(false);
    expect(component.lastFeedbackType).toBeNull();
    expect(allModalsServiceMock.setModalWidth).toHaveBeenCalledWith('createResult', false);

    component.goBackToUploadNewFile();
    expect(createResultManagementServiceMock.resultPageStep()).toBe(1);
  });

  it('getRandomInterval should be within expected bounds', () => {
    for (let i = 0; i < 5; i++) {
      const v = component.getRandomInterval();
      expect(v).toBeGreaterThanOrEqual(3000);
      expect(v).toBeLessThanOrEqual(5000);
    }
  });

  it('isRequired false when type is positive', () => {
    component.toggleFeedback('positive');
    expect(component.isRequired()).toBe(false);
  });

  it('mapResultRawAiToAIAssistantResult should coalesce optional fields and contract_code', () => {
    component.body.update(b => ({ ...b, contract_id: '123' }));
    const input = [
      {
        indicator: 'i',
        title: 't',
        description: 'd',
        keywords: [],
        geoscope_level: 'global',
        regions: [],
        countries: [],
        training_type: 'tt',
        length_of_training: 1,
        start_date: 's',
        end_date: 'e',
        degree: 'deg',
        delivery_modality: 'dm',
        total_participants: 10,
        evidence_for_stage: 'ev',
        policy_type: 'pol',
        main_contact_person: { name: 'n l', code: 'c', similarity_score: 0.8 },
        stage_in_policy_process: 'st',
        male_participants: undefined,
        female_participants: undefined,
        non_binary_participants: undefined,
        innovation_nature: 'in',
        innovation_type: 'it',
        assess_readiness: 'ar',
        anticipated_users: 'au',
        organization_type: 'ot',
        organization_sub_type: 'ost',
        organizations: [],
        innovation_actors_detailed: []
      }
    ];
    const out = (component as any).mapResultRawAiToAIAssistantResult(input);
    expect(out[0].geoscope_level).toBe('global');
    expect(out[0].regions).toEqual([]);
    expect(out[0].countries).toEqual([]);
    expect(out[0].male_participants).toBe(0);
    expect(out[0].female_participants).toBe(0);
    expect(out[0].non_binary_participants).toBe('0');
    expect(out[0].contract_code).toBe('123');
  });

  describe('organization extraction helpers', () => {
    it('extractOrganizationTypes should return [] when missing or empty and unique types when present', () => {
      expect((component as any).extractOrganizationTypes(undefined)).toEqual([]);
      expect((component as any).extractOrganizationTypes([])).toEqual([]);
      const orgs: OrganizationDetailed[] = [
        { type: 'Gov', institution_name: 'a' },
        { type: 'Gov', institution_name: 'b' },
        { type: undefined, institution_name: 'c' },
        { type: 'NGO', institution_name: 'd' }
      ];
      expect((component as any).extractOrganizationTypes(orgs)).toEqual(['Gov', 'NGO']);
    });

    it('extractOrganizationSubTypes should return undefined when empty or no subtypes', () => {
      expect((component as any).extractOrganizationSubTypes(undefined)).toBeUndefined();
      expect((component as any).extractOrganizationSubTypes([])).toBeUndefined();
      expect((component as any).extractOrganizationSubTypes([{ type: 't', institution_name: 'n' }])).toBeUndefined();
    });

    it('extractOrganizationSubTypes should join sub_type and other_type', () => {
      const orgs: OrganizationDetailed[] = [
        { sub_type: 's1', institution_name: 'a' },
        { other_type: 'o2', institution_name: 'b' }
      ];
      expect((component as any).extractOrganizationSubTypes(orgs)).toBe('s1, o2');
    });

    it('extractOrganizationNames should return [] when missing or empty and filter empty names', () => {
      expect((component as any).extractOrganizationNames(undefined)).toEqual([]);
      expect((component as any).extractOrganizationNames([])).toEqual([]);
      expect((component as any).extractOrganizationNames([{ institution_name: 'A' }, { institution_name: '' }, { institution_name: 'B' }])).toEqual([
        'A',
        'B'
      ]);
    });

    it('mapResultRawAiToAIAssistantResult should derive org fields from organizations_detailed when omitted', () => {
      component.body.update(b => ({ ...b, contract_id: 'CID' }));
      const base = {
        indicator: 'Innovation Development',
        title: 't',
        description: 'd',
        keywords: [] as string[],
        geoscope_level: 'g',
        regions: [] as string[],
        countries: [],
        training_type: '',
        length_of_training: '',
        start_date: '',
        end_date: '',
        degree: '',
        delivery_modality: '',
        total_participants: 0,
        evidence_for_stage: '',
        policy_type: '',
        main_contact_person: { name: 'n', code: '', similarity_score: 0 },
        stage_in_policy_process: '',
        innovation_nature: 'in',
        innovation_type: 'it',
        assess_readiness: 1,
        anticipated_users: 'au',
        innovation_actors_detailed: [] as []
      };
      const input = [
        {
          ...base,
          organizations_detailed: [
            { type: 'Univ', sub_type: 'Dept', institution_name: 'U1' },
            { type: 'Univ', other_type: 'Lab', institution_name: 'U2' }
          ]
        }
      ];
      const out = (component as any).mapResultRawAiToAIAssistantResult(input);
      expect(out[0].organization_type).toEqual(['Univ']);
      expect(out[0].organization_sub_type).toBe('Dept, Lab');
      expect(out[0].organizations).toEqual(['U1', 'U2']);
    });
  });

  it('handleAnalyzingDocument should throw and toast on upload missing filename', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    fileManagerServiceMock.uploadFile.mockResolvedValueOnce({ data: { filename: '' } });
    await expect(component.handleAnalyzingDocument()).rejects.toBeInstanceOf(Error);
    expect(actionsServiceMock.showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Something went wrong. Please try again.'
    });
  });

  it('handleAnalyzingDocument should ignore parse errors and continue', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({ content: [{ text: '{invalid json' }] });
    await component.handleAnalyzingDocument();
    expect(component.noResults() || component.documentAnalyzed()).toBe(true);
  });

  it('onContractIdChange should update contractId and body', () => {
    const newContractId = 'contract-123';
    component.onContractIdChange(newContractId);

    expect(component.contractId).toBe(newContractId);
    expect(component.body().contract_id).toBe(newContractId);
  });

  it('onContractIdChange should handle null contractId', () => {
    component.onContractIdChange(null);

    expect(component.contractId).toBe(null);
    expect(component.body().contract_id).toBe(null);
  });

  it('extractResultsFromMiningResponse should set interactionId when present', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    const interactionId = 'interaction-123';
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({
      content: [{ text: JSON.stringify({ interaction_id: interactionId, json_content: { results: [{ title: 'test' }] } }) }]
    });
    await component.handleAnalyzingDocument();
    expect(component.interactionId).toBe(interactionId);
  });

  it('extractResultsFromMiningResponse should aggregate json_content when present', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({
      content: [
        { text: JSON.stringify({ json_content: { results: [{ title: 'first' }] } }) },
        { text: JSON.stringify({ json_content: { results: [{ title: 'second' }] } }) }
      ]
    });
    await component.handleAnalyzingDocument();
    expect(component.documentAnalyzed()).toBe(true);
    expect(createResultManagementServiceMock.items().length).toBeGreaterThan(0);
  });

  it('aggregateJsonContent should return existing aggregatedJsonContent when currentResults is empty', () => {
    const existing = { results: [{ title: 'existing' }], other: 'data' };
    const jsonContent = { results: [] };
    const result = (component as any).aggregateJsonContent(jsonContent, existing);
    expect(result).toBe(existing);
    expect(result.results).toEqual([{ title: 'existing' }]);
  });

  it('extractResultsFromParsedData should use parsedText results when jsonContent has no results', () => {
    const jsonContent = { other: 'data' };
    const parsedText = { results: [{ title: 'from parsed' }] };
    const result = (component as any).extractResultsFromParsedData(jsonContent, parsedText);
    expect(result).toEqual([{ title: 'from parsed' }]);
  });

  it('extractResultsFromParsedData should return empty array when both jsonContent and parsedText have no results', () => {
    const jsonContent = { other: 'data' };
    const parsedText = { other: 'data' };
    const result = (component as any).extractResultsFromParsedData(jsonContent, parsedText);
    expect(result).toEqual([]);
  });

  it('extractResultsFromParsedData should handle null jsonContent and parsedText', () => {
    const result = (component as any).extractResultsFromParsedData(null, {});
    expect(result).toEqual([]);
  });

  it('submitFeedback should handle positive feedback without selected types', async () => {
    component.feedbackType.set('positive');
    component.body.update(b => ({ ...b, feedbackText: 'Great job!' }));
    component.miningResponse = [{ text: 'x' }];
    component.interactionId = 'test-id';
    await component.submitFeedback();
    expect(apiServiceMock.POST_feedback).toHaveBeenCalledWith(
      expect.objectContaining({
        feedback_type: 'positive',
        feedback_comment: 'Great job!'
      })
    );
    expect(component.feedbackSent).toBe(true);
    expect(component.lastFeedbackType).toBe('positive');
  });

  it('goBack should return early when analyzingDocument is true', () => {
    component.analyzingDocument.set(true);
    component.documentAnalyzed.set(true);
    component.selectedFile = createFile('a.pdf');
    component.goBack();
    // Should not reset anything when analyzing
    expect(component.selectedFile).not.toBeNull();
    expect(component.documentAnalyzed()).toBe(true);
  });

  it('goBack should reset feedback state when navigating back', () => {
    component.feedbackSent = true;
    component.lastFeedbackType = 'positive';
    component.analyzingDocument.set(false);
    component.documentAnalyzed.set(false);
    component.goBack();
    expect(component.feedbackSent).toBe(false);
    expect(component.lastFeedbackType).toBeNull();
  });

  it('handleAnalyzingDocument should handle error and show toast', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    fileManagerServiceMock.uploadFile.mockRejectedValueOnce(new Error('Upload failed'));
    try {
      await component.handleAnalyzingDocument();
    } catch (error) {
      // Error is expected to be thrown
    }
    expect(actionsServiceMock.showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Something went wrong. Please try again.'
    });
    expect(component.analyzingDocument()).toBe(false);
  });

  it('extractResultsFromMiningResponse should handle items without text property', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({
      content: [{ text: JSON.stringify({ json_content: { results: [{ title: 'valid' }] } }) }, { notext: 'should be skipped' }]
    });
    await component.handleAnalyzingDocument();
    expect(component.documentAnalyzed()).toBe(true);
  });

  it('extractResultsFromMiningResponse should handle jsonContent that is not an object', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({
      content: [{ text: JSON.stringify({ json_content: 'not an object', results: [{ title: 'test' }] }) }]
    });
    await component.handleAnalyzingDocument();
    expect(component.documentAnalyzed()).toBe(true);
  });

  it('aggregateJsonContent should merge results when both aggregatedJsonContent and currentResults exist', () => {
    const existing = { results: [{ title: 'existing' }] };
    const jsonContent = { results: [{ title: 'new' }] };
    const result = (component as any).aggregateJsonContent(jsonContent, existing);
    expect(result.results).toEqual([{ title: 'existing' }, { title: 'new' }]);
    expect(result).toBe(existing); // Should return the same object reference
  });

  it('aggregateJsonContent should merge results when aggregatedJsonContent has no results property', () => {
    const existing = { other: 'data' };
    const jsonContent = { results: [{ title: 'new' }] };
    const result = (component as any).aggregateJsonContent(jsonContent, existing);
    expect(result.results).toEqual([{ title: 'new' }]);
    expect(result).toBe(existing);
  });

  it('extractResultsFromParsedData should return empty array when results is not an array', () => {
    const jsonContent = { results: 'not an array' };
    const parsedText = {};
    const result = (component as any).extractResultsFromParsedData(jsonContent, parsedText);
    expect(result).toEqual([]);
  });

  it('extractResultsFromParsedData should return empty array when results array is empty', () => {
    const jsonContent = { results: [] };
    const parsedText = {};
    const result = (component as any).extractResultsFromParsedData(jsonContent, parsedText);
    expect(result).toEqual([]);
  });

  it('extractResultsFromMiningResponse should not set interactionId if already set', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    component.interactionId = 'existing-id';
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({
      content: [{ text: JSON.stringify({ interaction_id: 'new-id', json_content: { results: [{ title: 'test' }] } }) }]
    });
    await component.handleAnalyzingDocument();
    expect(component.interactionId).toBe('existing-id');
  });

  it('extractResultsFromMiningResponse should handle jsonContent that is null', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({
      content: [{ text: JSON.stringify({ json_content: null, results: [{ title: 'test' }] }) }]
    });
    await component.handleAnalyzingDocument();
    expect(component.documentAnalyzed()).toBe(true);
  });

  it('extractResultsFromMiningResponse should handle jsonContent that is not an object type', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    textMiningServiceMock.executeTextMining.mockResolvedValueOnce({
      content: [{ text: JSON.stringify({ json_content: 123, results: [{ title: 'test' }] }) }]
    });
    await component.handleAnalyzingDocument();
    expect(component.documentAnalyzed()).toBe(true);
  });

  it('aggregateJsonContent should create new object when aggregatedJsonContent is null', () => {
    const jsonContent = { results: [{ title: 'new' }], other: 'data' };
    const result = (component as any).aggregateJsonContent(jsonContent, null);
    expect(result).toEqual({
      results: [{ title: 'new' }],
      other: 'data'
    });
  });

  it('submitFeedback should handle negative feedback without selected types', async () => {
    component.feedbackType.set('negative');
    component.selectedType = [];
    component.body.update(b => ({ ...b, feedbackText: 'Not good' }));
    component.miningResponse = [{ text: 'x' }];
    component.interactionId = 'test-id';
    await component.submitFeedback();
    expect(apiServiceMock.POST_feedback).toHaveBeenCalledWith(
      expect.objectContaining({
        feedback_type: 'negative',
        feedback_comment: 'Not good'
      })
    );
  });

  it('submitFeedback should include selected issue category names in comment when negative', async () => {
    component.badTypes = [
      { id: 1, name: 'Wrong format' },
      { id: 2, name: 'Incomplete data' }
    ];
    component.feedbackType.set('negative');
    component.selectedType = ['1', '2'];
    component.body.update(b => ({ ...b, feedbackText: 'Extra notes' }));
    component.interactionId = 'test-id';
    await component.submitFeedback();
    expect(apiServiceMock.POST_feedback).toHaveBeenCalledWith(
      expect.objectContaining({
        feedback_type: 'negative',
        feedback_comment: expect.stringContaining('Wrong format')
      })
    );
    expect(apiServiceMock.POST_feedback).toHaveBeenCalledWith(
      expect.objectContaining({
        feedback_comment: expect.stringContaining('Extra notes')
      })
    );
  });

  it('handleAnalyzingDocument should handle upload error', async () => {
    const file = createFile('a.pdf');
    component.selectedFile = file;
    fileManagerServiceMock.uploadFile.mockRejectedValueOnce(new Error('Upload error'));
    await expect(component.handleAnalyzingDocument()).rejects.toThrow();
    expect(component.analyzingDocument()).toBe(false);
  });

  it('effect should set modal width when documentAnalyzed is true', () => {
    allModalsServiceMock.setModalWidth.mockClear();
    component.documentAnalyzed.set(false);
    component.noResults.set(false);
    fixture.detectChanges();
    allModalsServiceMock.setModalWidth.mockClear();
    component.documentAnalyzed.set(true);
    fixture.detectChanges();
    expect(allModalsServiceMock.setModalWidth).toHaveBeenCalledWith('createResult', true);
  });

  it('effect should set modal width when noResults is true', () => {
    allModalsServiceMock.setModalWidth.mockClear();
    component.documentAnalyzed.set(false);
    component.noResults.set(false);
    fixture.detectChanges();
    allModalsServiceMock.setModalWidth.mockClear();
    component.noResults.set(true);
    fixture.detectChanges();
    expect(allModalsServiceMock.setModalWidth).toHaveBeenCalledWith('createResult', true);
  });

  it('loadContractsOnStepChange effect should call mainForAiAssistant when modal opens and step is 1', () => {
    allModalsServiceMock.isModalOpen.mockReturnValue({ isOpen: true });
    createResultManagementServiceMock.resultPageStep.set(0);
    fixture.detectChanges();
    getContractsServiceMock.mainForAiAssistant.mockClear();
    createResultManagementServiceMock.resultPageStep.set(1);
    fixture.detectChanges();
    expect(getContractsServiceMock.mainForAiAssistant).toHaveBeenCalled();
  });

  it('loadContractsOnStepChange effect should handle null modalConfig', () => {
    allModalsServiceMock.isModalOpen.mockReturnValue(null);
    createResultManagementServiceMock.resultPageStep.set(1);
    fixture.detectChanges();
    // Should not throw error
    expect(component).toBeTruthy();
  });

  it('aggregateJsonContent should handle jsonContent with non-array results', () => {
    const jsonContent = { results: 'not an array', other: 'data' };
    const result = (component as any).aggregateJsonContent(jsonContent, null);
    expect(result.results).toEqual([]);
  });

  it('aggregateJsonContent should handle jsonContent without results property', () => {
    const jsonContent = { other: 'data' };
    const result = (component as any).aggregateJsonContent(jsonContent, null);
    expect(result.results).toEqual([]);
  });

  it('aggregateJsonContent should not merge when currentResults is empty but aggregatedJsonContent exists', () => {
    const existing = { results: [{ title: 'existing' }], other: 'data' };
    const jsonContent = { results: [] };
    const result = (component as any).aggregateJsonContent(jsonContent, existing);
    expect(result).toBe(existing);
    expect(result.results).toEqual([{ title: 'existing' }]);
  });
});
