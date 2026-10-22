import { formatPersonName } from './person-name.util';

describe('formatPersonName', () => {
  it.each([
    ['ZUNIGA PINO, DANIELA', 'Daniela Zuniga Pino'],
    ['ZÚÑIGA PINO, DANIELA', 'Daniela Zúñiga Pino'],
    ['  SMITH ,  JOHN  PAUL ', 'John Paul Smith'],
    ["O'BRIEN, MARY-ANNE", "Mary-Anne O'Brien"],
    ['JANE DOE', 'Jane Doe'],
    ['dE la cruz, ana', 'Ana De La Cruz']
  ])('%p -> %p', (raw, expected) => {
    expect(formatPersonName(raw)).toBe(expected);
  });

  it.each([null, undefined, '', '   '])('%p -> empty', raw => {
    expect(formatPersonName(raw)).toBe('');
  });
});
