import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from './roles.guard';
import { SecRolesEnum } from '../enum/sec_role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  const createExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createExecutionContext({
        roles: [SecRolesEnum.CONTRIBUTOR],
      });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when no user is present', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([SecRolesEnum.CONTRIBUTOR]);
      const context = createExecutionContext(null);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for GENERAL_ADMIN regardless of required roles', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([SecRolesEnum.CONTRIBUTOR]);
      const context = createExecutionContext({
        roles: [SecRolesEnum.GENERAL_ADMIN],
      });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([SecRolesEnum.CONTRIBUTOR]);
      const context = createExecutionContext({
        roles: [SecRolesEnum.CONTRIBUTOR],
      });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([SecRolesEnum.CONTRIBUTOR]);
      const context = createExecutionContext({
        roles: [SecRolesEnum.IT_SUPPORT],
      });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should work with array of roles - user has one of required roles', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([
        SecRolesEnum.CONTRIBUTOR,
        SecRolesEnum.CONTRACT_CONTRIBUTOR,
      ]);
      const context = createExecutionContext({
        roles: [SecRolesEnum.CONTRACT_CONTRIBUTOR],
      });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should work with user having array of roles', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([SecRolesEnum.CONTRIBUTOR]);
      const context = createExecutionContext({
        roles: [SecRolesEnum.CONTRIBUTOR, SecRolesEnum.IT_SUPPORT],
      });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has GENERAL_ADMIN in roles array', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([SecRolesEnum.CONTRIBUTOR]);
      const context = createExecutionContext({
        roles: [SecRolesEnum.GENERAL_ADMIN, SecRolesEnum.IT_SUPPORT],
      });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user roles array does not include required role', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([SecRolesEnum.CONTRIBUTOR]);
      const context = createExecutionContext({
        roles: [SecRolesEnum.IT_SUPPORT, SecRolesEnum.DEVELOPER],
      });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should call reflector with correct parameters', () => {
      // Arrange
      const mockHandler = jest.fn();
      const mockClass = jest.fn();
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { roles: [SecRolesEnum.CONTRIBUTOR] },
          }),
        }),
        getHandler: () => mockHandler,
        getClass: () => mockClass,
      } as any;

      reflector.getAllAndOverride.mockReturnValue([SecRolesEnum.CONTRIBUTOR]);

      // Act
      guard.canActivate(context);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockHandler,
        mockClass,
      ]);
    });
  });
});
