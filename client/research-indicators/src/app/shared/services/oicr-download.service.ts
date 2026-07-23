import { Injectable, inject } from '@angular/core';
import { WasmService, ProcessResult } from './go/wasm.service';
import { ApiService } from './api.service';
import { GetOICRDetails, Region, Country } from '@shared/interfaces/gets/get-oicr-details.interface';

export interface FieldToProcess {
  dropdownId: string;
  selectedValue: string;
  attribute: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class OicrDownloadService {
  private wasm = inject(WasmService);
  private api = inject(ApiService);

  // Field configuration with minimal duplication
  private readonly fieldConfig = [
    ['2132273794', 'tag_name_text', 'text'],
    ['-1191449392', 'title', 'text'],
    ['-1815635536', 'main_project', 'text'],
    ['1376114886', 'outcome_impact_statement', 'text'],
    ['-547993178', 'geographic_scope', 'dropdown'],
    ['-515767717', 'geographic_scope_comments', 'text'],
    ['1209379648', 'other_projects_text', 'text'],
    ['-504483', 'regions_countries_text', 'text'],
    ['1308358992', 'main_levers_text', 'text'],
    ['539860219', 'others_levers_text', 'text'],
    ['-264317297', 'handle_link', 'text']
  ] as const;

  private fieldsToProcess: FieldToProcess[] = this.fieldConfig.map(([dropdownId, attribute, type]) => ({
    dropdownId,
    selectedValue: '',
    attribute,
    type
  }));

  private getTagAsText(tagId: string): string {
    const tags = {
      '1': 'New OICR',
      '2': 'Updated OICR (Same Level of Maturity)',
      '3': 'Updated OICR (New Level of Maturity)'
    };
    return tags[tagId as keyof typeof tags];
  }

  private formatRegionsAndCountries(regions: Region[], countries: Country[]): string {
    let result = '';

    // Add regions section if there are regions
    if (regions && regions.length > 0) {
      result += 'Regions:\n';
      const regionNames = regions.map(region => region.region_name).join(', ');
      result += regionNames;
    }

    // Add countries section if there are countries
    if (countries && countries.length > 0) {
      // Add line break between sections if we have both
      if (result.length > 0) {
        result += '\n\n';
      }
      result += 'Countries:\n';
      const countryNames = countries.map(country => country.country_name).join(', ');
      result += countryNames;
    }

    return result;
  }

  private mapFieldsToProcess(oicrDetails: GetOICRDetails): void {
    this.fieldsToProcess.forEach(field => {
      field.selectedValue = oicrDetails[field.attribute as keyof GetOICRDetails] as string;
    });
  }

  private async getOicrDetails(resultCode: number | string): Promise<void> {
    const response = await this.api.GET_OICRDetails(resultCode);
    response.data.other_projects_text = response.data.other_projects.map(project => project.project_id + ' - ' + project.project_title).join('\n\n');

    // Use the new method to format regions and countries
    response.data.regions_countries_text = this.formatRegionsAndCountries(response.data.regions, response.data.countries);
    response.data.tag_name_text = this.getTagAsText(response.data.tag_id.toString());
    response.data.others_levers_text = response.data.other_levers?.map(lever => lever.lever_full).join('\n\n');
    response.data.main_levers_text = response.data.main_levers?.map(lever => lever.main_lever_name).join('\n\n');

    this.mapFieldsToProcess(response.data);
  }

  async generateAndDownload(resultCode: string | number): Promise<ProcessResult> {
    // Ensure WASM is loaded
    const wasmLoaded = await this.wasm.loadWasm();
    if (!wasmLoaded) {
      return {
        success: false,
        error: 'Failed to load WASM. Please try again.'
      };
    }

    await this.getOicrDetails(resultCode);

    try {
      // call the WASM service
      const result = await this.wasm.processDocx(this.fieldsToProcess.filter(field => field.selectedValue));
      const { success, fileData } = result;
      // if success and fileData, download the file
      if (success && fileData) {
        const now = new Date();
        const dateTimeString =
          now.getFullYear().toString() +
          (now.getMonth() + 1).toString().padStart(2, '0') +
          now.getDate().toString().padStart(2, '0') +
          '_' +
          now.getHours().toString().padStart(2, '0') +
          now.getMinutes().toString().padStart(2, '0');
        this.wasm.downloadFile(fileData, `STAR_OICR_${resultCode}_${dateTimeString}.docx`);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Error inesperado: ${error}`
      };
    }
  }
}

