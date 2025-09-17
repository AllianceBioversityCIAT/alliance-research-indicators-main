import { isEmpty } from './object.utils';

export const nextToProcessAiRaw = async <T, R>(
  value: T,
  fn: (data: T) => Promise<R>,
): Promise<R | null> => {
  const NOT_COLECTED_VALUE = 'Not collected';
  if (isEmpty(value) || value === NOT_COLECTED_VALUE) return null;
  return fn(value);
};
