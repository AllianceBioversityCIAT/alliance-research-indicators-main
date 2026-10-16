import { Injectable } from '@nestjs/common';

/**
 * The ONE place that knows "the current year" (tasks.md clock seam). Every
 * rule that says "current year" (back-date gate, physical vs logical delete,
 * defaults, year range) reads it from this provider, so a test can fix today
 * at 2026 or 2027 by overriding the provider, never by the machine date.
 * An abstract class doubles as the DI token.
 */
export abstract class OrgStructureClock {
  abstract currentYear(): number;
}

/** Server UTC calendar year (requirements section 11, design 5.1). */
@Injectable()
export class SystemOrgStructureClock extends OrgStructureClock {
  currentYear(): number {
    return new Date().getUTCFullYear();
  }
}
