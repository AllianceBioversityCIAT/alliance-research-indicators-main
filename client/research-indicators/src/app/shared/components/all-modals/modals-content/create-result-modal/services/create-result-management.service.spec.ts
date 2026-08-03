import { TestBed } from '@angular/core/testing';
import { CreateResultManagementService } from './create-result-management.service';
import { AIAssistantResult } from '../models/AIAssistantResult';

describe('CreateResultManagementService', () => {
  let service: CreateResultManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreateResultManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(service.resultPageStep()).toBe(0);
    expect(service.expandedItem()).toBeNull();
    expect(service.items()).toEqual([]);
    expect(service.contractId()).toBeNull();
    expect(service.resultTitle()).toBeNull();
    expect(service.year()).toBeNull();
    expect(service.modalTitle()).toBe('Create A Result');
  });

  it('should have correct step constants', () => {
    expect(service.STEPS.CREATE_RESULT).toBe(0);
    expect(service.STEPS.UPLOAD_FILE).toBe(1);
    expect(service.STEPS.CREATE_OICR).toBe(2);
  });

  it('should reset modal to default values', () => {
    // Set some values first
    service.resultPageStep.set(2);
    service.expandedItem.set({} as AIAssistantResult);
    service.items.set([{} as AIAssistantResult]);
    service.contractId.set(123);
    service.resultTitle.set('Test Title');
    service.modalTitle.set('Test Modal');

    // Reset
    service.resetModal();

    // Verify reset
    expect(service.resultPageStep()).toBe(0);
    expect(service.expandedItem()).toBeNull();
    expect(service.items()).toEqual([]);
    expect(service.contractId()).toBeNull();
    expect(service.resultTitle()).toBeNull();
    expect(service.modalTitle()).toBe('Create A Result');
  });

  it('should set contract ID', () => {
    service.setContractId(456);
    expect(service.contractId()).toBe(456);
    
    service.setContractId(null);
    expect(service.contractId()).toBeNull();
  });

  it('should set result title', () => {
    service.setResultTitle('New Title');
    expect(service.resultTitle()).toBe('New Title');
    
    service.setResultTitle(null);
    expect(service.resultTitle()).toBeNull();
  });

  it('should set year', () => {
    service.setYear(2024);
    expect(service.year()).toBe(2024);
    
    service.setYear(null);
    expect(service.year()).toBeNull();
  });

  it('should set modal title', () => {
    service.setModalTitle('New Modal Title');
    expect(service.modalTitle()).toBe('New Modal Title');
  });

  it('should clear OICR body', () => {
    // First set some values to the OICR body
    const customBody = {
      step_one: {
        main_contact_person: {
          result_user_id: 'test',
          result_id: 1,
          user_id: 'user',
          user_role_id: 1
        },
        tagging: {
          tag_id: 1
        },
        link_result: {
          external_oicr_id: 1
        },
        outcome_impact_statement: 'test statement'
      },
      step_two: {
        primary_lever: [],
        contributor_lever: []
      },
      step_three: {
        geo_scope_id: 1,
        countries: [],
        regions: [],
        comment_geo_scope: 'test comment'
      },
      step_four: {
        general_comment: 'test comment'
      },
      base_information: {
        indicator_id: 1,
        contract_id: 'test',
        title: 'test title',
        description: 'test description',
        year: '2024',
        is_ai: true
      }
    };
    
    service.createOicrBody.set(customBody);
    
    // Clear the body
    service.clearOicrBody();
    
    // Verify it was reset to default values
    const defaultBody = service.createOicrBody();
    expect(defaultBody.step_one.outcome_impact_statement).toBe('');
    expect(defaultBody.step_two.primary_lever).toEqual([]);
    expect(defaultBody.step_three.geo_scope_id).toBeUndefined();
    expect(defaultBody.step_four.general_comment).toBe('');
    expect(defaultBody.base_information.indicator_id).toBe(5);
    expect(defaultBody.base_information.is_ai).toBe(false);
  });

  it('should set preset from project results table', () => {
    service.setPresetFromProjectResultsTable(true);
    expect(service.presetFromProjectResultsTable()).toBe(true);
    
    service.setPresetFromProjectResultsTable(false);
    expect(service.presetFromProjectResultsTable()).toBe(false);
  });

  it('should set and clear result creation entry context', () => {
    service.setResultCreationEntryContext('results-center');
    expect(service.resultCreationEntryContext()).toBe('results-center');
    service.resetModal();
    expect(service.resultCreationEntryContext()).toBeNull();
  });

  it('should set status ID', () => {
    service.setStatusId(5);
    expect(service.statusId()).toBe(5);
    
    service.setStatusId(null);
    expect(service.statusId()).toBeNull();
  });
});
