import { TestBed } from '@angular/core/testing';
import { GetAllianceStaffByGroupService } from './get-alliance-staff-by-group.service';
import { ApiService } from '../api.service';

describe('GetAllianceStaffByGroupService', () => {
  let service: GetAllianceStaffByGroupService;
  let apiMock: { GET_AllianceStaff: jest.Mock };

  beforeEach(() => {
    apiMock = {
      GET_AllianceStaff: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        GetAllianceStaffByGroupService,
        { provide: ApiService, useValue: apiMock }
      ]
    });
  });

  it('should create and normalize list on success', async () => {
    apiMock.GET_AllianceStaff.mockResolvedValue({
      data: [
        { user_id: 10, first_name: 'jUaN', last_name: 'péRez', email: 'juan@example.com' },
        { carnet: 20, first_name: 'mARIA', last_name: 'LOPEZ', email: 'maria@example.com' },
        { id: 30, first_name: 'luis', last_name: 'gomez' },
        { email: 'only@mail.com', first_name: 'ONLY', last_name: 'MAIL' },
        { first_name: '', last_name: '' }
      ]
    });

    service = TestBed.inject(GetAllianceStaffByGroupService);

    // Wait for constructor-triggered main() to resolve
    await Promise.resolve();
    await Promise.resolve();

    const list = service.list();

    expect(service.loading()).toBe(false);
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(5);

    // Title-case and full_name concatenation
    expect(list[0]).toMatchObject({ user_id: 10, full_name: 'Juan Pérez - juan@example.com' });
    expect(list[1]).toMatchObject({ user_id: 20, full_name: 'Maria Lopez - maria@example.com' });
    expect(list[2]).toMatchObject({ user_id: '', full_name: 'Luis Gomez' });
    expect(list[3]).toMatchObject({ user_id: '', full_name: 'Only Mail - only@mail.com' });
    // Empty names should not add stray spaces
    expect(list[4]).toMatchObject({ user_id: '', full_name: '' });
  });

  it('should handle non-array responses by setting empty list', async () => {
    apiMock.GET_AllianceStaff.mockResolvedValue({ data: null });
    service = TestBed.inject(GetAllianceStaffByGroupService);
    await Promise.resolve();
    await Promise.resolve();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should normalize when first_name/last_name are undefined (nullish fallback) and email only', async () => {
    apiMock.GET_AllianceStaff.mockResolvedValue({
      data: [
        { email: 'no-name@example.com' } // first_name and last_name undefined
      ]
    });

    service = TestBed.inject(GetAllianceStaffByGroupService);
    await Promise.resolve();
    await Promise.resolve();

    const [item] = service.list();
    expect(item.user_id).toBe('');
    // When no names, only email should appear prefixed with separator
    expect(item.full_name).toBe(' - no-name@example.com');
  });

  it('should title-case and collapse extra spaces in names', async () => {
    apiMock.GET_AllianceStaff.mockResolvedValue({
      data: [
        { user_id: 40, first_name: '  aNA   mArIa  ', last_name: '  del   carMen ' }
      ]
    });

    service = TestBed.inject(GetAllianceStaffByGroupService);
    await Promise.resolve();
    await Promise.resolve();

    const [item] = service.list();
    expect(item.user_id).toBe(40);
    // Expected: words are trimmed, multiple spaces collapsed, and capitalized
    expect(item.full_name).toBe('Ana Maria Del Carmen');
  });

  it('should handle thrown errors by setting empty list and loading false', async () => {
    apiMock.GET_AllianceStaff.mockRejectedValue(new Error('Network error'));
    service = TestBed.inject(GetAllianceStaffByGroupService);
    await Promise.resolve();
    await Promise.resolve();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should set loading true while fetching and false afterwards', async () => {
    let resolveFn: (v: unknown) => void;
    const pending = new Promise(res => {
      resolveFn = res;
    });
    apiMock.GET_AllianceStaff.mockReturnValue(pending);

    service = TestBed.inject(GetAllianceStaffByGroupService);
    // Immediately after construction, main() has started
    expect(service.loading()).toBe(true);

    // Resolve the pending request
    resolveFn!({ data: [] });
    await pending;
    await Promise.resolve();

    expect(service.loading()).toBe(false);
    expect(service.list()).toEqual([]);
  });

  it('should expose isOpenSearch as false by default', () => {
    apiMock.GET_AllianceStaff.mockResolvedValue({ data: [] });
    service = TestBed.inject(GetAllianceStaffByGroupService);
    expect(service.isOpenSearch()).toBe(false);
  });
});


