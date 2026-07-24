export function isStatusChangeValidationRequired(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}
