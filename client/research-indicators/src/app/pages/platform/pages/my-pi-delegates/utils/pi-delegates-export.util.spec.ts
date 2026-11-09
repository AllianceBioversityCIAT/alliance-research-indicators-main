import { buildPiDelegatesExportFileName, downloadBlob } from './pi-delegates-export.util';

describe('pi-delegates-export.util', () => {
  describe('buildPiDelegatesExportFileName', () => {
    const date = new Date(2026, 0, 5, 7, 3);

    it('builds the name with padded date/time and upper-cased initials', () => {
      expect(buildPiDelegatesExportFileName('by_project', date, { first_name: ' ana ', last_name: 'perez' })).toBe(
        'STAR_pi_delegates_by_project_20260105_0703_AP.xlsx'
      );
    });

    it('falls back to UU when names are missing or null', () => {
      expect(buildPiDelegatesExportFileName('by_person', date, {})).toBe('STAR_pi_delegates_by_person_20260105_0703_UU.xlsx');
      expect(buildPiDelegatesExportFileName('by_person', date, { first_name: null, last_name: null })).toBe(
        'STAR_pi_delegates_by_person_20260105_0703_UU.xlsx'
      );
    });
  });

  describe('downloadBlob', () => {
    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('clicks a temporary link and revokes the object URL afterwards', () => {
      jest.useFakeTimers();
      const createObjectURL = jest.fn(() => 'blob:abc');
      const revokeObjectURL = jest.fn();
      Object.assign(globalThis.URL, { createObjectURL, revokeObjectURL });
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      const blob = new Blob(['x']);

      downloadBlob(blob, 'file.xlsx');

      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      const link = document.querySelector('a[download="file.xlsx"]') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.style.display).toBe('none');
      expect(revokeObjectURL).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(document.querySelector('a[download="file.xlsx"]')).toBeNull();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:abc');
    });
  });
});
