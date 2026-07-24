import { TestBed } from '@angular/core/testing';
import { PolicyStagesService } from './policy-stages.service';
import { ApiService } from '../api.service';

describe('PolicyStagesService', () => {
  let service: PolicyStagesService;

  const apiMock = {} as unknown as ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiMock }]
    });
  });

  it('should call main in constructor', () => {
    const mainSpy = jest.spyOn(PolicyStagesService.prototype as any, 'main');
    service = TestBed.inject(PolicyStagesService);
    expect(service).toBeTruthy();
    expect(mainSpy).toHaveBeenCalled();
    mainSpy.mockRestore();
  });

  it('should initialize list and set loading to false after main', async () => {
    service = TestBed.inject(PolicyStagesService);
    await service.main();
    expect(service.loading()).toBe(false);
    const list = service.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(3);
    expect(list[0].id).toBe(1);
    expect(list[1].id).toBe(2);
    expect(list[2].id).toBe(3);
  });

  it('should set loading to false even if list.set throws', async () => {
    service = TestBed.inject(PolicyStagesService);
    const originalSet = service.list.set.bind(service.list);
    const setSpy = jest.spyOn(service.list, 'set').mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(service.main()).rejects.toThrow('boom');
    expect(service.loading()).toBe(false);

    setSpy.mockImplementation(originalSet);
  });

  it('should have api injected', () => {
    service = TestBed.inject(PolicyStagesService);
    expect(service.api).toBeDefined();
  });
});

import { TestBed } from '@angular/core/testing';

import { PolicyStagesService } from './policy-stages.service';

describe('PolicyStagesService', () => {
  let service: PolicyStagesService;
  let listMock: any;
  let loadingMock: any;

  beforeEach(() => {
    listMock = Object.assign(() => [], { set: jest.fn() });
    loadingMock = Object.assign(() => false, { set: jest.fn() });
    service = Object.create(PolicyStagesService.prototype);
    service.list = listMock;
    service.loading = loadingMock;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('main should set loading and list correctly', async () => {
    await service.main();
    expect(loadingMock.set).toHaveBeenCalledWith(true);
    expect(listMock.set).toHaveBeenCalledWith([
      { id: 1, name: 'Stage 1: Research taken up by next user, policy change not yet enacted' },
      { id: 2, name: 'Stage 2: Policy enacted' },
      { id: 3, name: 'Stage 3: Evidence of impact of policy' }
    ]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main should set loading to false even if list.set fails', async () => {
    listMock.set = jest.fn(() => {
      throw new Error('fail');
    });
    await expect(service.main()).rejects.toThrow('fail');
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });
});
