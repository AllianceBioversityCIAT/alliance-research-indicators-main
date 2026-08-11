import { cleanName, cleanText } from '../../../shared/utils/object.utils';
import { CapdevBulkGroupDto } from './dto/capdev-bulk-group.dto';

/**
 * Minimal shape this pure module needs from a file-sourced contact
 * (`metadata.contacts[]` on the AI bulk payload, see
 * `results/dto/result-ai.dto.ts:AiContactDto`). Declared locally rather than
 * importing that class so this module stays dependency-free of the
 * `results` module — the two fields below are the only ones this builder's
 * rules touch (design.md §6.4).
 */
export interface CapdevRecipientFileContact {
  email?: string | null;
  contract_code?: string | null;
}

export interface CapdevRecipients {
  to: string[];
  cc: string[];
  salutation: string;
  /**
   * Trimmed values dropped by {@link buildCc}'s validity check — malformed,
   * non-empty entries (`"n/a"`, `"—"`, `"John Doe"`), never a blank/absent
   * optional source. A **return value**, not a side effect: this module
   * stays pure (T-06's purity disqualifier) and the caller (T-12,
   * `capdev-bulk-notification.service.ts`) is the one that logs it at debug
   * level (design.md §10, R-CBU-004 AC.4).
   */
  dropped: string[];
}

/** Basic RFC-shaped address check — enough to drop "n/a", "—", "John Doe". */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimmed(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Ordered three-tier salutation chain (design.md §6.4 table). Not a
 * coalesce: tier 1 is only skipped when the cleaned staff name is genuinely
 * blank, never merely because tier 2 also has a value (R-CBU-003 AC.4).
 */
function resolveSalutation(group: CapdevBulkGroupDto): string {
  const first = trimmed(group?.pi?.first_name)
    ? cleanName(group.pi.first_name)
    : '';
  const last = trimmed(group?.pi?.last_name)
    ? cleanName(group.pi.last_name)
    : '';
  const tier1 = [first, last]
    .filter((part) => trimmed(part))
    .join(' ')
    .trim();
  if (tier1) return tier1;

  const tier2 = cleanText(group?.project_lead_description ?? '');
  if (trimmed(tier2)) return tier2;

  return 'Colleagues';
}

/**
 * File contacts partition by `contract_code`: an entry naming a contract
 * goes only to that group; an entry with no contract code goes to every
 * group (design.md §6.4, R-CBU-005 AC.3).
 */
function scopedFileContactEmails(
  fileContacts: CapdevRecipientFileContact[],
  agreementId: string,
): (string | null | undefined)[] {
  const groupAgreementId = trimmed(agreementId);
  return (fileContacts ?? [])
    .filter((contact) => {
      const contractCode = trimmed(contact?.contract_code);
      return !contractCode || contractCode === groupAgreementId;
    })
    .map((contact) => contact?.email);
}

/**
 * Sanitisation order (design.md §6.4, R-CBU-004): normalise -> validate ->
 * drop-if-in-`to` -> dedupe. All comparisons case-insensitive and trimmed.
 *
 * **`dropped` is a return value, not a side effect** (tasks.md T-12 orphaned
 * AC, R-CBU-004 AC.4) — it records only the *validate* step's rejects: a
 * non-empty candidate that fails `isValidEmail` (`"n/a"`, `"—"`, `"John
 * Doe"`). A blank/absent optional source (no RA on the contract, no file
 * contacts) is never "malformed" and is never appended here; only the
 * `normalise` step's `!value` short-circuit skips those, silently, same as
 * before. The `drop-if-in-to` and `dedupe` steps are correct-by-design
 * outcomes, not malformation, so they are not reported either — design.md
 * §10's "recipient dropped" debug line is for R-CBU-004 AC.4 specifically.
 */
function buildCc(
  candidates: (string | null | undefined)[],
  piKey: string,
): { cc: string[]; dropped: string[] } {
  const seen = new Set<string>();
  const result: string[] = [];
  const dropped: string[] = [];

  for (const raw of candidates) {
    const value = trimmed(raw); // normalise
    if (!value) continue; // absent/blank — not a malformed entry
    if (!isValidEmail(value)) {
      dropped.push(value); // validate — malformed, non-empty
      continue;
    }

    const key = normalizeKey(value);
    if (key === piKey) continue; // drop-if-in-to
    if (seen.has(key)) continue; // dedupe

    seen.add(key);
    result.push(value);
  }

  return { cc: result, dropped };
}

/**
 * Assembles/sanitises/dedupes the recipient set and salutation for one
 * project group. Returns `null` when the PI address is unresolvable — the
 * caller then skips the group entirely; `to` is never backfilled from CC
 * (design.md §6.4, R-CBU-003).
 */
export function build(
  group: CapdevBulkGroupDto,
  fileContacts: CapdevRecipientFileContact[],
  sprmEmails: string[],
  configuredCc: string[],
): CapdevRecipients | null {
  const piEmail = trimmed(group?.pi?.email);
  if (!piEmail || !isValidEmail(piEmail)) {
    return null;
  }

  const piKey = normalizeKey(piEmail);
  const { cc, dropped } = buildCc(
    [
      group?.ra?.email,
      group?.pa?.email,
      ...scopedFileContactEmails(fileContacts, group?.agreement_id),
      ...(sprmEmails ?? []),
      ...(configuredCc ?? []),
    ],
    piKey,
  );

  return {
    to: [piEmail],
    cc,
    salutation: resolveSalutation(group),
    dropped,
  };
}
