import { TestBed } from '@angular/core/testing';
import { GetAnticipatedUsersService } from './get-anticipated-users.service';

describe('GetAnticipatedUsersService', () => {
  let service: GetAnticipatedUsersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GetAnticipatedUsersService]
    });
    service = TestBed.inject(GetAnticipatedUsersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with correct anticipated users data', () => {
    const expectedData = [
      { name: 'This is yet to be determined', value: 1 },
      { name: 'User have been determined', value: 2 }
    ];

    expect(service.list()).toEqual(expectedData);
  });

  it('should have exactly 2 anticipated users', () => {
    expect(service.list().length).toBe(2);
  });

  it('should have first user with correct properties', () => {
    const firstUser = service.list()[0];

    expect(firstUser.name).toBe('This is yet to be determined');
    expect(firstUser.value).toBe(1);
    expect(typeof firstUser.name).toBe('string');
    expect(typeof firstUser.value).toBe('number');
  });

  it('should have second user with correct properties', () => {
    const secondUser = service.list()[1];

    expect(secondUser.name).toBe('User have been determined');
    expect(secondUser.value).toBe(2);
    expect(typeof secondUser.name).toBe('string');
    expect(typeof secondUser.value).toBe('number');
  });

  it('should initialize with loading set to false', () => {
    expect(service.loading()).toBe(false);
  });

  it('should have list as a signal with correct type', () => {
    expect(service.list).toBeDefined();
    expect(typeof service.list).toBe('function');
    expect(Array.isArray(service.list())).toBe(true);
  });

  it('should have loading as a signal with correct type', () => {
    expect(service.loading).toBeDefined();
    expect(typeof service.loading).toBe('function');
    expect(typeof service.loading()).toBe('boolean');
  });

  it('should maintain data consistency after multiple accesses', () => {
    const firstAccess = service.list();
    const secondAccess = service.list();

    expect(firstAccess).toEqual(secondAccess);
    expect(firstAccess).toBe(secondAccess); // Signals return the same reference
  });
});
