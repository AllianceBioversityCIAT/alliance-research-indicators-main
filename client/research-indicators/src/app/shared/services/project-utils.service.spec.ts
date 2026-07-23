import { TestBed } from '@angular/core/testing';
import { ProjectUtilsService } from './project-utils.service';
import { GetContractsByUser } from '@shared/interfaces/get-contracts-by-user.interface';
import { GetProjectDetail } from '@shared/interfaces/get-project-detail.interface';
import { FindContracts } from '@shared/interfaces/find-contracts.interface';

describe('ProjectUtilsService', () => {
  let service: ProjectUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProjectUtilsService]
    });
    service = TestBed.inject(ProjectUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getStatusDisplay', () => {
    it('should return status from status_id and status_name', () => {
      const project = {
        status_id: 2,
        status_name: 'Completed'
      } as GetContractsByUser;

      const result = service.getStatusDisplay(project);

      expect(result).toEqual({ statusId: 2, statusName: 'Completed' });
    });

    it('should return status from contract_status ongoing', () => {
      const project = {
        contract_status: 'ongoing'
      } as FindContracts;

      const result = service.getStatusDisplay(project);

      expect(result).toEqual({ statusId: 1, statusName: 'Ongoing' });
    });

    it('should return status from contract_status completed', () => {
      const project = {
        contract_status: 'completed'
      } as FindContracts;

      const result = service.getStatusDisplay(project);

      expect(result).toEqual({ statusId: 2, statusName: 'Completed' });
    });

    it('should return status from contract_status suspended', () => {
      const project = {
        contract_status: 'suspended'
      } as FindContracts;

      const result = service.getStatusDisplay(project);

      expect(result).toEqual({ statusId: 3, statusName: 'Suspended' });
    });

    it('should return status from contract_status approved', () => {
      const project = {
        contract_status: 'approved'
      } as FindContracts;

      const result = service.getStatusDisplay(project);

      expect(result).toEqual({ statusId: 6, statusName: 'Approved' });
    });

    it('should return default status when no status information', () => {
      const project = {} as GetProjectDetail;

      const result = service.getStatusDisplay(project);

      expect(result).toEqual({ statusId: 1, statusName: 'Ongoing' });
    });

    it('should return Unknown when status_id exists but no status_name', () => {
      const project = {
        status_id: 5
      } as GetContractsByUser;

      const result = service.getStatusDisplay(project);

      expect(result).toEqual({ statusId: 5, statusName: 'Unknown' });
    });
  });

  describe('getLeverName', () => {
    it('should return lever name from lever object with short_name', () => {
      const project = {
        lever: {
          short_name: 'Test Lever',
          name: 'Test Lever Full Name'
        }
      } as GetProjectDetail;

      const result = service.getLeverName(project);

      expect(result).toBe('Test Lever');
    });

    it('should return lever name from lever object with name when no short_name', () => {
      const project = {
        lever: {
          name: 'Test Lever Full Name'
        }
      } as GetProjectDetail;

      const result = service.getLeverName(project);

      expect(result).toBe('Test Lever Full Name');
    });

    it('should return lever name from lever string', () => {
      const project = {
        lever: 'Test Lever String'
      } as GetProjectDetail;

      const result = service.getLeverName(project);

      expect(result).toBe('Test Lever String');
    });

    it('should return lever_name when available', () => {
      const project = {
        lever_name: 'Test Lever Name'
      } as FindContracts;

      const result = service.getLeverName(project);

      expect(result).toBe('Test Lever Name');
    });

    it('should return dash when no lever information', () => {
      const project = {} as GetContractsByUser;

      const result = service.getLeverName(project);

      expect(result).toBe('-');
    });

    it('should return dash when lever object has no name properties', () => {
      const project = {
        lever: {}
      } as GetProjectDetail;

      const result = service.getLeverName(project);

      expect(result).toBe('-');
    });

    it('should return joined names from levers array', () => {
      const project = {
        levers: [
          { short_name: 'Lever A' },
          { short_name: 'Lever B' }
        ]
      } as FindContracts;

      const result = service.getLeverName(project);

      expect(result).toBe('Lever A, Lever B');
    });

    it('should return name from single levers object (non-array)', () => {
      const project = {
        levers: { short_name: 'Single Lever' }
      } as FindContracts;

      const result = service.getLeverName(project);

      expect(result).toBe('Single Lever');
    });

    it('should filter out falsy short_name values from levers array', () => {
      const project = {
        levers: [
          { short_name: 'Lever A' },
          { short_name: '' },
          { short_name: 'Lever C' }
        ]
      } as FindContracts;

      const result = service.getLeverName(project);

      expect(result).toBe('Lever A, Lever C');
    });

    it('should fall through to lever when levers has no valid short_names', () => {
      const project = {
        levers: [{ short_name: '' }],
        lever: 'Fallback Lever'
      } as unknown as FindContracts;

      const result = service.getLeverName(project);

      expect(result).toBe('Fallback Lever');
    });
  });

  describe('hasField', () => {
    it('should return true when field exists and has value', () => {
      const project = {
        description: 'Test Description',
        start_date: '2023-01-01'
      } as GetProjectDetail;

      expect(service.hasField(project, 'description')).toBe(true);
      expect(service.hasField(project, 'start_date')).toBe(true);
    });

    it('should return false when field does not exist', () => {
      const project = {
        description: 'Test Description'
      } as GetProjectDetail;

      expect(service.hasField(project, 'nonexistent_field')).toBe(false);
    });
  });

  describe('sortIndicators', () => {
    it('should return empty array when no indicators', () => {
      const result = service.sortIndicators([]);

      expect(result).toEqual([]);
    });

    it('should return empty array when indicators is null', () => {
      const result = service.sortIndicators(null as any);

      expect(result).toEqual([]);
    });

    it('should return empty array when indicators is undefined', () => {
      const result = service.sortIndicators(undefined as any);

      expect(result).toEqual([]);
    });

    it('should filter out indicators without indicator.name', () => {
      const indicators = [
        { indicator: { name: 'Capacity Sharing for Development' }, count_results: 5 },
        { indicator: null, count_results: 3 },
        { indicator: { name: 'Innovation Development' }, count_results: 2 }
      ] as any[];

      const result = service.sortIndicators(indicators);

      expect(result).toHaveLength(2);
      expect(result[0].indicator.name).toBe('Capacity Sharing for Development');
      expect(result[1].indicator.name).toBe('Innovation Development');
    });

    it('should sum count_results for duplicate indicator names', () => {
      const indicators = [
        { indicator: { name: 'Capacity Sharing for Development' }, count_results: 5 },
        { indicator: { name: 'Capacity Sharing for Development' }, count_results: 3 },
        { indicator: { name: 'Innovation Development' }, count_results: 2 }
      ] as any[];

      const result = service.sortIndicators(indicators);

      expect(result).toHaveLength(2);
      expect(result[0].indicator.name).toBe('Capacity Sharing for Development');
      expect(result[0].count_results).toBe(8);
      expect(result[1].indicator.name).toBe('Innovation Development');
      expect(result[1].count_results).toBe(2);
    });

    it('should sort indicators according to predefined order', () => {
      const indicators = [
        { indicator: { name: 'Innovation Development' }, count_results: 2 },
        { indicator: { name: 'Capacity Sharing for Development' }, count_results: 5 },
        { indicator: { name: 'Policy Change' }, count_results: 1 }
      ] as any[];

      const result = service.sortIndicators(indicators);

      expect(result).toHaveLength(3);
      expect(result[0].indicator.name).toBe('Capacity Sharing for Development');
      expect(result[1].indicator.name).toBe('Innovation Development');
      expect(result[2].indicator.name).toBe('Policy Change');
    });

    it('should handle indicators not in predefined order', () => {
      const indicators = [
        { indicator: { name: 'Unknown Indicator' }, count_results: 1 },
        { indicator: { name: 'Capacity Sharing for Development' }, count_results: 5 }
      ] as any[];

      const result = service.sortIndicators(indicators);

      expect(result).toHaveLength(2);
      // Unknown Indicator comes first because indexOf returns -1 (before any valid index)
      expect(result[0].indicator.name).toBe('Unknown Indicator');
      expect(result[1].indicator.name).toBe('Capacity Sharing for Development');
    });

    it('should handle empty indicator array with length check', () => {
      const indicators = [] as any[];

      const result = service.sortIndicators(indicators);

      expect(result).toEqual([]);
    });
  });

  describe('getProjectTitle', () => {
    it('should build the project title with the project description prefix', () => {
      const project = {
        projectDescription: 'Portfolio project',
        description: 'Research indicators'
      } as GetProjectDetail;

      expect(service.getProjectTitle(project)).toBe('Portfolio project - Research indicators');
    });

    it('should build the project title without a prefix when the project description is missing', () => {
      const project = {
        description: 'Research indicators'
      } as GetProjectDetail;

      expect(service.getProjectTitle(project)).toBe('Research indicators');
    });

    it('should return an empty string when description is missing', () => {
      const project = {} as GetProjectDetail;

      expect(service.getProjectTitle(project)).toBe('');
    });
  });
});
