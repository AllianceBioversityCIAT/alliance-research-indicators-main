import { MultiControlListResponse, User } from './responses.interface';

describe('MultiControlListResponse', () => {
  it('should create an instance with default values', () => {
    const res = new MultiControlListResponse<number>();
    expect(res.list).toEqual([]);
    expect(res.loading).toBe(true);
  });

  it('should allow assigning values to properties', () => {
    const res = new MultiControlListResponse<string>();
    res.list = ['a', 'b'];
    res.loading = false;
    expect(res.list).toEqual(['a', 'b']);
    expect(res.loading).toBe(false);
  });
});

describe('User', () => {
  it('should create an instance with default values', () => {
    const user = new User();
    expect(user.is_active).toBe(false);
    expect(user.sec_user_id).toBe(0);
    expect(user.first_name).toBe('');
    expect(user.last_name).toBe('');
    expect(user.email).toBe('');
    expect(user.status_id).toBe(0);
    expect(user.roleName).toBe('');
    expect(user.user_role_list).toEqual([]);
  });

  it('should allow assigning values to properties', () => {
    const user = new User();
    user.is_active = true;
    user.sec_user_id = 123;
    user.first_name = 'John';
    user.last_name = 'Doe';
    user.email = 'john@doe.com';
    user.status_id = 2;
    user.roleName = 'admin';
    user.user_role_list = [
      {
        is_active: true,
        user_id: 1,
        role_id: 2,
        role: {
          is_active: true,
          justification_update: null,
          sec_role_id: 3,
          name: 'role',
          focus_id: 4,
          role_id: 2
        }
      }
    ];
    expect(user.is_active).toBe(true);
    expect(user.sec_user_id).toBe(123);
    expect(user.first_name).toBe('John');
    expect(user.last_name).toBe('Doe');
    expect(user.email).toBe('john@doe.com');
    expect(user.status_id).toBe(2);
    expect(user.roleName).toBe('admin');
    expect(user.user_role_list.length).toBe(1);
    expect(user.user_role_list[0].role.name).toBe('role');
  });
});
