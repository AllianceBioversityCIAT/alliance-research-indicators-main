import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { DenyMachineTokenGuard } from '../../shared/guards/deny-machine-token.guard';
import { ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { DuplicateResolutionController } from './duplicate-resolution.controller';
import { DuplicateResolutionStatus } from './dto/duplicate-resolution.dto';

const buildController = (plan: Record<string, unknown>) => {
  const service = {
    plan: jest.fn(async (_filters: Record<string, unknown>) => plan),
    apply: jest.fn(async (_params: Record<string, unknown>) => plan),
  };
  return {
    controller: new DuplicateResolutionController(service as never),
    service,
  };
};

const okPlan = {
  runId: 'run-1',
  status: DuplicateResolutionStatus.OK,
  confirmationDigest: 'd'.repeat(64),
  filters: {},
  groupCount: 3,
  rowsToDelete: 4,
  byClassification: { RESOLVED: 3 },
  groups: [],
};

describe('DuplicateResolutionController — authorization surface', () => {
  it('requires SYSTEM_ADMIN on both handlers', () => {
    // Both endpoints, asserted separately: a role decorator on only one of them is
    // the shape that leaves the destructive verb open.
    for (const handler of [
      DuplicateResolutionController.prototype.plan,
      DuplicateResolutionController.prototype.apply,
    ]) {
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
        SecRolesEnum.SYSTEM_ADMIN,
      ]);
    }
  });

  it('attaches RolesGuard AND DenyMachineTokenGuard', () => {
    // Roles alone are not enough: a machine token whose responsible user holds
    // SYSTEM_ADMIN satisfies @Roles from any origin, because a secret with zero
    // app_secret_host_list rows skips the origin check entirely.
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      DuplicateResolutionController,
    );
    expect(guards).toContain(RolesGuard);
    expect(guards).toContain(DenyMachineTokenGuard);
  });
});

describe('DuplicateResolutionController — envelope and wiring', () => {
  it('wraps the plan in the standard response envelope', async () => {
    const { controller } = buildController(okPlan);

    const response = await controller.plan({});

    expect(response.status).toBe(200);
    expect(response.data).toBe(okPlan);
    expect(response.description).toContain('3 duplicate group');
  });

  it('says so plainly when the scan matched nothing', async () => {
    const { controller } = buildController({
      ...okPlan,
      status: DuplicateResolutionStatus.INCONCLUSIVE,
      groupCount: 0,
    });

    const response = await controller.plan({});

    expect(response.description).toContain('No duplicate groups matched');
  });

  it('passes the filter through to the service', async () => {
    const { controller, service } = buildController(okPlan);

    await controller.plan({ reportYear: 2024, limit: 10 });

    expect(service.plan).toHaveBeenCalledWith({ reportYear: 2024, limit: 10 });
  });

  it('forwards the run id and digest on apply, defaulting the filter', async () => {
    const { controller, service } = buildController(okPlan);

    await controller.apply({
      runId: 'run-1',
      confirmationDigest: 'd'.repeat(64),
    });

    expect(service.apply).toHaveBeenCalledWith({
      runId: 'run-1',
      confirmationDigest: 'd'.repeat(64),
      filters: {},
    });
  });

  it('reports how much was deleted in the apply description', async () => {
    const { controller } = buildController(okPlan);

    const response = await controller.apply({
      runId: 'run-1',
      confirmationDigest: 'd'.repeat(64),
    });

    expect(response.description).toContain('4 row(s)');
  });
});
