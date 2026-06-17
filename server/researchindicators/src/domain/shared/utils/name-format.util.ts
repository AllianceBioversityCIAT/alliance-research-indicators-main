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
