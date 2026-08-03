import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface GoInstance {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): void;
}

type GoConstructor = new () => GoInstance;

declare global {
  interface Window {
    processDocxWasm: (templateData: Uint8Array, dropdowns: { dropdownId: string; selectedValue: string; type: string }[]) => ProcessResult;
    Go: GoConstructor;
  }
}

export interface ProcessResult {
  success: boolean;
  message?: string;
  error?: string;
  fileData?: ArrayBuffer | Uint8Array;
}

@Injectable({
  providedIn: 'root'
})
export class WasmService {
  private wasmLoaded = false;
  private go: GoInstance | null = null;

  private readonly WASM_BASE_URL = 'go/';
  private readonly TEMPLATE_URL = `${environment.filesStorageUrl}templates/${environment.oicrTemplateName}`;

  constructor(private http: HttpClient) {}

  get isWasmLoaded(): boolean {
    return this.wasmLoaded;
  }

  async loadWasm(): Promise<boolean> {
    try {
      if (this.wasmLoaded) {
        return true;
      }

      if (!window.Go) {
        return false;
      }

      this.go = new window.Go();
      const wasmResponse = await fetch(`${this.WASM_BASE_URL}main.wasm`);

      if (!wasmResponse.ok) {
        return false;
      }

      const result = await WebAssembly.instantiateStreaming(wasmResponse, this.go.importObject);
      this.go.run(result.instance);
      await this.waitForWasmFunctions();
      this.wasmLoaded = true;
      return true;
    } catch {
      return false;
    }
  }

  async processDocx(dropdowns: { dropdownId: string; selectedValue: string; type: string }[]): Promise<ProcessResult> {
    try {
      if (!this.wasmLoaded) {
        return {
          success: false,
          error: 'WASM is not loaded. Call loadWasm() first.'
        };
      }

      if (typeof window.processDocxWasm !== 'function') {
        return {
          success: false,
          error: 'WASM function is not available'
        };
      }

      const templateData = await this.downloadTemplate();
      const result = window.processDocxWasm(templateData, dropdowns);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  downloadFile(data: ArrayBuffer | Uint8Array, filename: string): void {
    const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data);

    const blob = new Blob([uint8Array], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  private async downloadTemplate(): Promise<Uint8Array> {
    try {
      const response = await firstValueFrom(this.http.get(this.TEMPLATE_URL, { responseType: 'arraybuffer' }));

      return new Uint8Array(response);
    } catch (error) {
      throw new Error(`Error downloading template: ${error}`);
    }
  }

  private async waitForWasmFunctions(maxAttempts = 50): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      if (typeof window.processDocxWasm === 'function') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timeout waiting for WASM function');
  }
}
