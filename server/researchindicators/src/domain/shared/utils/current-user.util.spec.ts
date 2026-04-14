import { CurrentUserUtil, SetAuditEnum } from './current-user.util';

describe('CurrentUserUtil', () => {
  it('uses request user when no system user is set', () => {
    const req = {
      user: {
        sec_user_id: 10,
        email: 'u@x.org',
        roles: [1, 2],
      },
    } as any;
    const util = new CurrentUserUtil(req);
    expect(util.user_id).toBe(10);
    expect(util.email).toBe('u@x.org');
    expect(util.roles).toEqual([1, 2]);
  });

  it('setSystemUser overrides request user', () => {
    const req = { user: { sec_user_id: 1, email: 'a@b.c', roles: [9] } } as any;
    const util = new CurrentUserUtil(req);
    util.setSystemUser(
      { sec_user_id: 99, email: 'sys@local', roles: [3] } as any,
      false,
    );
    expect(util.user_id).toBe(99);
    expect(util.email).toBe('sys@local');
    expect(util.roles).toEqual([3]);
    util.clearSystemUser();
    expect(util.user_id).toBe(1);
  });

  it('audit returns created_by / updated_by from user_id', () => {
    const req = { user: { sec_user_id: 7, roles: [] } } as any;
    const util = new CurrentUserUtil(req);
    expect(util.audit(SetAuditEnum.NEW)).toEqual({ created_by: 7 });
    expect(util.audit(SetAuditEnum.UPDATE)).toEqual({ updated_by: 7 });
    expect(util.audit(SetAuditEnum.BOTH)).toEqual({
      created_by: 7,
      updated_by: 7,
    });
  });
});
