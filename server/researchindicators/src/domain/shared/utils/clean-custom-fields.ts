export function cleanCustomFields(customFields: any) {
  return Object.fromEntries(
    Object.entries(customFields).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  );
}