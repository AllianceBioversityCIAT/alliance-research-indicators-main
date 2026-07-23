import { User } from './User';

describe('User', () => {
  it('should create an instance correctly with valid values', () => {
    const user = new User('Juan', 123);
    expect(user.name).toBe('Juan');
    expect(user.userId).toBe(123);
  });

  it('should allow null userId', () => {
    const user = new User('Ana', null as any);
    expect(user.name).toBe('Ana');
    expect(user.userId).toBeNull();
  });

  it('should allow userId 0', () => {
    const user = new User('Cero', 0);
    expect(user.name).toBe('Cero');
    expect(user.userId).toBe(0);
  });
});
