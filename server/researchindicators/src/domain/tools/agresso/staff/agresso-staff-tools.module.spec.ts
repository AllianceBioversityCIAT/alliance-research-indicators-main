// @akili-spec changes/agresso-staff-sec-users-sync (T-07 — module registration)
import { AgressoStaffModule } from './agresso-staff-tools.module';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { SecUserReconcilerRepository } from './sec-user-reconciler.repository';
import { SecUserReconcilerService } from './sec-user-reconciler.service';

describe('AgressoStaffModule registration', () => {
  // CORRECTED AFTER REVIEW. An earlier version of this comment claimed the SILENT-404 failure
  // class from `server/researchindicators/src/CLAUDE.md` §4. That was a misapplication: the silent
  // class applies to a missing ROUTE-TREE IMPORT (`Reflect.getMetadata('imports', ParentModule)`),
  // where `RouterModule.register()` returns silently and every handler 404s with no boot error.
  // A missing PROVIDER is a different animal — Nest fails LOUDLY at boot with
  // `UnknownElementException`. This assertion is still worth keeping (it pins the registration at
  // the metadata level and was observed red when the provider was removed), but it guards a loud
  // failure, not a silent one, and the comment should not have said otherwise.
  it('registers every provider `cloneAllAgressoStaff` resolves at runtime', () => {
    const providers = Reflect.getMetadata('providers', AgressoStaffModule);

    expect(providers).toContain(AgressoStaffToolsService);
    // T-07 wires the reconciler into the sync; without these two it cannot be constructed.
    expect(providers).toContain(SecUserReconcilerService);
    expect(providers).toContain(SecUserReconcilerRepository);
  });
});
