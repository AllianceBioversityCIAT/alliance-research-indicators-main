import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { WasmService } from './wasm.service';

describe('WasmService', () => {
  let service: WasmService;
  let http: jest.Mocked<HttpClient>;

  beforeEach(() => {
    http = { get: jest.fn() } as any;

    TestBed.configureTestingModule({
      providers: [WasmService, { provide: HttpClient, useValue: http }]
    });
    service = TestBed.inject(WasmService);
  });

  describe('loadWasm', () => {
    const originalFetch = global.fetch;
    const originalGo = (window as any).Go;

    beforeEach(() => {
      (window as any).Go = function () {
        return {
          importObject: {},
          run: () => {}
        } as any;
      } as any;
      global.fetch = jest.fn();
      (global as any).WebAssembly = {
        instantiateStreaming: jest.fn().mockResolvedValue({ instance: {} })
      } as any;
      // provide wasm function so waitForWasmFunctions resolves
      (window as any).processDocxWasm = () => ({ success: true });
    });

    afterEach(() => {
      global.fetch = originalFetch as any;
      (window as any).Go = originalGo;
    });

    it('returns false if Go is not present', async () => {
      (window as any).Go = undefined;
      expect(await service.loadWasm()).toBe(false);
    });

    it('returns true when already loaded', async () => {
      (window as any).Go = function () {
        return { importObject: {}, run: () => {} } as any;
      } as any;
      (global.fetch as any) = jest.fn().mockResolvedValue({ ok: true });
      await service.loadWasm();
      expect(await service.loadWasm()).toBe(true);
    });

    it('returns false when fetch not ok', async () => {
      (global.fetch as any) = jest.fn().mockResolvedValue({ ok: false });
      expect(await service.loadWasm()).toBe(false);
    });

    it('returns true on successful load', async () => {
      (global.fetch as any) = jest.fn().mockResolvedValue({ ok: true });
      expect(await service.loadWasm()).toBe(true);
    });

    it('returns false on exception', async () => {
      (global.fetch as any) = jest.fn().mockRejectedValue(new Error('net'));
      expect(await service.loadWasm()).toBe(false);
    });
  });

  describe('processDocx', () => {
    it('fails when wasm not loaded', async () => {
      const res = await service.processDocx([]);
      expect(res.success).toBe(false);
      expect(res.error).toContain('WASM is not loaded');
    });

    it('fails when wasm function missing', async () => {
      // mark service as loaded
      (service as any).wasmLoaded = true;
      (window as any).processDocxWasm = undefined;
      const res = await service.processDocx([]);
      expect(res.success).toBe(false);
      expect(res.error).toContain('not available');
    });

    it('returns result from wasm function', async () => {
      (service as any).wasmLoaded = true;
      (window as any).processDocxWasm = jest.fn().mockReturnValue({ success: true });
      jest.spyOn(service as any, 'downloadTemplate').mockResolvedValue(new Uint8Array([1, 2]));
      const res = await service.processDocx([]);
      expect(res.success).toBe(true);
    });

    it('handles exception', async () => {
      (service as any).wasmLoaded = true;
      jest.spyOn(service as any, 'downloadTemplate').mockRejectedValue(new Error('boom'));
      (window as any).processDocxWasm = jest.fn();
      const res = await service.processDocx([]);
      expect(res.success).toBe(false);
      expect(res.error).toBe('boom');
    });

    it('handles non-Error exception as Unknown error', async () => {
      (service as any).wasmLoaded = true;
      jest.spyOn(service as any, 'downloadTemplate').mockRejectedValue('bad');
      (window as any).processDocxWasm = jest.fn();
      const res = await service.processDocx([]);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Unknown error');
    });
  });

  describe('downloadFile', () => {
    it('creates link and revokes URL', () => {
      const originalURL = (global as any).URL;
      (global as any).URL = {
        createObjectURL: jest.fn().mockReturnValue('blob:mock'),
        revokeObjectURL: jest.fn()
      } as any;

      const a = document.createElement('a');
      const clickSpy = jest.spyOn(a, 'click').mockImplementation(() => {});
      const createSpy = jest.spyOn(document, 'createElement').mockReturnValue(a);
      const appendSpy = jest.spyOn(document.body, 'appendChild');
      const removeSpy = jest.spyOn(document.body, 'removeChild');

      jest.useFakeTimers();
      service.downloadFile(new Uint8Array([1, 2, 3]), 'f.docx');
      expect(appendSpy).toHaveBeenCalledWith(a);
      expect(clickSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(100);
      expect(removeSpy).toHaveBeenCalledWith(a);
      expect((global as any).URL.revokeObjectURL).toHaveBeenCalled();
      jest.useRealTimers();

      createSpy.mockRestore();
      (global as any).URL = originalURL;
    });

    it('creates link when input is ArrayBuffer (covers ternary branch)', () => {
      const originalURL = (global as any).URL;
      (global as any).URL = {
        createObjectURL: jest.fn().mockReturnValue('blob:mock'),
        revokeObjectURL: jest.fn()
      } as any;

      const a = document.createElement('a');
      const clickSpy = jest.spyOn(a, 'click').mockImplementation(() => {});
      const createSpy = jest.spyOn(document, 'createElement').mockReturnValue(a);
      const appendSpy = jest.spyOn(document.body, 'appendChild');
      const removeSpy = jest.spyOn(document.body, 'removeChild');

      jest.useFakeTimers();
      service.downloadFile(new ArrayBuffer(4), 'g.docx');
      expect(appendSpy).toHaveBeenCalledWith(a);
      expect(clickSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(100);
      expect(removeSpy).toHaveBeenCalledWith(a);
      expect((global as any).URL.revokeObjectURL).toHaveBeenCalled();
      jest.useRealTimers();

      createSpy.mockRestore();
      (global as any).URL = originalURL;
    });
  });

  describe('downloadTemplate', () => {
    it('returns bytes from http', async () => {
      (http.get as jest.Mock).mockReturnValue(of(new ArrayBuffer(2)));
      const res = await (service as any).downloadTemplate();
      expect(res).toBeInstanceOf(Uint8Array);
    });

    it('throws on http error', async () => {
      (http.get as jest.Mock).mockReturnValue(throwError(() => new Error('http')));
      await expect((service as any).downloadTemplate()).rejects.toThrow('Error downloading template');
    });
  });

  describe('waitForWasmFunctions', () => {
    it('resolves when function appears', async () => {
      setTimeout(() => ((window as any).processDocxWasm = () => ({})), 10);
      await (service as any).waitForWasmFunctions(2);
      expect(typeof (window as any).processDocxWasm).toBe('function');
    });

    it('rejects on timeout', async () => {
      (window as any).processDocxWasm = undefined;
      await expect((service as any).waitForWasmFunctions(1)).rejects.toThrow('Timeout');
    });
  });

  describe('isWasmLoaded getter', () => {
    it('returns false initially and true after successful load', async () => {
      expect(service.isWasmLoaded).toBe(false);
      // prepare successful load environment
      (window as any).Go = function () {
        return { importObject: {}, run: () => {} } as any;
      } as any;
      (global as any).fetch = jest.fn().mockResolvedValue({ ok: true });
      (global as any).WebAssembly = { instantiateStreaming: jest.fn().mockResolvedValue({ instance: {} }) } as any;
      (window as any).processDocxWasm = () => ({ success: true });

      await service.loadWasm();
      expect(service.isWasmLoaded).toBe(true);
    });
  });
});


