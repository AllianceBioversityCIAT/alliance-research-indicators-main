import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PfmResultRowComponent } from './components/pfm-result-row/pfm-result-row.component';
import { PFM_PRMS_SLICES, PfmPrmsStatusCardComponent } from './components/pfm-prms-status-card/pfm-prms-status-card.component';
import { PFM_NEXT_STEPS } from './components/pfm-next-steps-card/pfm-next-steps-card.component';
import { PfmQueueTabComponent } from './components/pfm-queue-tab/pfm-queue-tab.component';
import { PfmStoreService } from './services/pfm-store.service';
import { PfmMappingState, PfmPipeline, PfmPrmsStatus, PfmResultRow } from './pfm.interfaces';

// Owner 2026-10-22: a status colour is a PARAMETER. Every surface that stands for a CGIAR Portfolio
// mapping or PRMS status (chart slice, legend dot, card, quick-view dot) must show the colour the
// results table tag shows for that status, read from the same place, never re-chosen per surface.

function tableTag(over: Partial<PfmResultRow>): PfmResultRowComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [PfmResultRowComponent], providers: [provideRouter([])] });
  const f = TestBed.createComponent(PfmResultRowComponent);
  f.componentRef.setInput('row', {
    platform_code: 'STAR',
    official_code: 1,
    report_year: 2026,
    title: 'T',
    science_programs: [],
    mapping_state: 'Pending',
    mapping_note: '',
    prms_status: 'Not sent',
    prms_hint: '',
    ...over
  } as unknown as PfmResultRow);
  return f.componentInstance;
}
const prmsTag = (status: PfmPrmsStatus) => tableTag({ prms_status: status }).prmsTone().fg;
const mappingTag = (state: PfmMappingState) => tableTag({ mapping_state: state }).mappingTone().fg;

function chartColours(): Record<string, string> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [PfmPrmsStatusCardComponent] });
  const f = TestBed.createComponent(PfmPrmsStatusCardComponent);
  f.componentRef.setInput('pipeline', { stages: PFM_PRMS_SLICES.map(s => ({ key: s.stage, value: 1 })) } as unknown as PfmPipeline);
  return Object.fromEntries(f.componentInstance.slices().items.map(i => [i.key, i.fill]));
}

describe('Status colour parity: one parameter per status', () => {
  it('PRMS status chart: every slice (and its legend dot) is the table tag colour of its status', () => {
    const chart = chartColours();
    expect(chart['approved']).toBe(prmsTag('Approved'));
    expect(chart['pending_review']).toBe(prmsTag('Pending Review'));
    expect(chart['rejected']).toBe(prmsTag('Rejected'));
    expect(chart['no_sp']).toBe(mappingTag('No SP contribution'));
  });

  it('Finish the mapping card and the Mapping pending quick view are the table colour of mapping Pending', () => {
    expect(PFM_NEXT_STEPS.find(s => s.chip === 'mapping_incomplete')?.color).toBe(mappingTag('Pending'));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [PfmQueueTabComponent], providers: [{ provide: PfmStoreService, useValue: {} }] });
    const chips = TestBed.createComponent(PfmQueueTabComponent).componentInstance.chips;
    expect(chips.find(c => c.key === 'mapping_incomplete')?.dot).toBe(mappingTag('Pending'));
  });
});
