import { Component, inject, Input, signal, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { WasmService, ProcessResult } from '../../services/go/wasm.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { OicrDownloadService } from '@shared/services/oicr-download.service';

@Component({
  selector: 'app-download-oicr-template',
  imports: [ButtonModule, TooltipModule],
  templateUrl: './download-oicr-template.component.html'
})
export class DownloadOicrTemplateComponent implements OnInit {
  @Input() onlyIcon = false;
  wasm = inject(WasmService);
  oicrDownloadService = inject(OicrDownloadService);
  processing = signal(false);
  result: ProcessResult | null = null;
  wasmLoaded = signal(false);
  cache = inject(CacheService);

  ngOnInit(): void {
    this.wasm.loadWasm().then(loaded => {
      this.wasmLoaded.set(loaded);
    });
  }

  async generateAndDownload(resultCode: string | number) {
    this.processing.set(true);
    this.result = null;

    try {
      this.result = await this.oicrDownloadService.generateAndDownload(resultCode);
      if (this.result.success) {
        this.wasmLoaded.set(true);
      }
    } finally {
      this.processing.set(false);
    }
  }

  async downloadOicrTemplate() {
    await this.generateAndDownload(this.cache.getCurrentNumericResultId());
  }
}
