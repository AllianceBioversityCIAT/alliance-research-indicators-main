import { isEmpty } from './object.utils';

/**
 * Formats a person name using title case for each word.
 * Example: "JOHN DOE" -> "John Doe"
 */
export const formatPersonName = (name?: string | null): string => {
  if (isEmpty(name)) {
    return '';
  }

  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Formats a "LAST, FIRST" name (as Agresso stores the project lead) in reading order.
 * Example: "VAN ETTEN, JACOB" -> "Jacob Van Etten". A name without a comma is only title-cased.
 */
export const formatLastFirstName = (name?: string | null): string => {
  const [last, ...rest] = String(name ?? '').split(',');
  const first = rest.join(' ');
  return formatPersonName(first.trim() ? `${first} ${last}` : last);
};
