import {
  DocumentOverviewResponse,
  mapAvailableOverviewFiles,
  mapDocumentOverviewFiles,
  mapOverviewSourceDocuments,
  parseDocumentOverviewParagraphs
} from './document-overview.interface';

describe('parseDocumentOverviewParagraphs', () => {
  it('should split overview.project_summary into paragraphs', () => {
    const response: DocumentOverviewResponse = {
      overview: {
        project_title: 'Accelerated Variety Turnover (ACCELERATE)',
        project_summary: 'Summary paragraph one.\n\nSummary paragraph two.'
      }
    };

    expect(parseDocumentOverviewParagraphs(response)).toEqual(['Summary paragraph one.', 'Summary paragraph two.']);
  });

  it('should ignore project_title and only return project_summary paragraphs', () => {
    const response: DocumentOverviewResponse = {
      overview: {
        project_title: 'Project title only'
      }
    };

    expect(parseDocumentOverviewParagraphs(response)).toEqual([]);
  });

  it('should return an empty array when project_summary is missing', () => {
    expect(parseDocumentOverviewParagraphs({})).toEqual([]);
    expect(parseDocumentOverviewParagraphs({ overview: {} })).toEqual([]);
    expect(parseDocumentOverviewParagraphs({ overview: { project_summary: '   ' } })).toEqual([]);
  });
});

describe('mapDocumentOverviewFiles', () => {
  it('should map documents_processed into grounded project documents', () => {
    const response: DocumentOverviewResponse = {
      documents_processed: [
        {
          file_name: 'proposal.pdf',
          file_key: 'star/ai-insights/test/project-overview/projects/A1578/proposal.pdf'
        },
        {
          file_key: 'star/ai-insights/test/project-overview/projects/A1578/report.docx'
        },
        {
          file_name: '   ',
          file_key: '   '
        }
      ]
    };

    expect(mapDocumentOverviewFiles(response)).toEqual([
      {
        fileName: 'proposal.pdf',
        fileKey: 'star/ai-insights/test/project-overview/projects/A1578/proposal.pdf'
      },
      {
        fileName: 'report.docx',
        fileKey: 'star/ai-insights/test/project-overview/projects/A1578/report.docx'
      }
    ]);
  });
});

describe('mapAvailableOverviewFiles', () => {
  it('should prefer available_files over documents_processed', () => {
    const response: DocumentOverviewResponse = {
      available_files: [
        {
          file_name: 'available.pdf',
          file_key: 'folder/available.pdf'
        }
      ],
      documents_processed: [
        {
          file_name: 'processed.pdf',
          file_key: 'folder/processed.pdf'
        }
      ]
    };

    expect(mapAvailableOverviewFiles(response)).toEqual([
      {
        fileName: 'available.pdf',
        fileKey: 'folder/available.pdf'
      }
    ]);
  });

  it('should fall back to documents_processed when available_files is empty', () => {
    const response: DocumentOverviewResponse = {
      available_files: [],
      documents_processed: [
        {
          file_name: 'processed.pdf',
          file_key: 'folder/processed.pdf'
        }
      ]
    };

    expect(mapAvailableOverviewFiles(response)).toEqual([
      {
        fileName: 'processed.pdf',
        fileKey: 'folder/processed.pdf'
      }
    ]);
  });
});

describe('mapOverviewSourceDocuments', () => {
  it('should map only documents_processed', () => {
    const response: DocumentOverviewResponse = {
      available_files: [
        {
          file_name: 'available.pdf',
          file_key: 'folder/available.pdf'
        }
      ],
      documents_processed: [
        {
          file_name: 'processed.pdf',
          file_key: 'folder/processed.pdf'
        }
      ]
    };

    expect(mapOverviewSourceDocuments(response)).toEqual([
      {
        fileName: 'processed.pdf',
        fileKey: 'folder/processed.pdf'
      }
    ]);
  });

  it('should derive the file name from file key when file name is blank', () => {
    const response: DocumentOverviewResponse = {
      documents_processed: [
        {
          file_name: '   ',
          file_key: 'folder/report.pdf'
        }
      ]
    };

    expect(mapOverviewSourceDocuments(response)).toEqual([
      {
        fileName: 'report.pdf',
        fileKey: 'folder/report.pdf'
      }
    ]);
  });

  it('should return an empty list when no document entries are provided', () => {
    expect(mapOverviewSourceDocuments({})).toEqual([]);
    expect(mapAvailableOverviewFiles({})).toEqual([]);
  });

  it('should ignore entries without a file key', () => {
    const response: DocumentOverviewResponse = {
      documents_processed: [{ file_name: 'orphan.pdf' }]
    };

    expect(mapOverviewSourceDocuments(response)).toEqual([]);
  });

  it('should fall back to Document when file name cannot be derived from file key', () => {
    const response: DocumentOverviewResponse = {
      documents_processed: [
        {
          file_key: 'folder/'
        }
      ]
    };

    expect(mapOverviewSourceDocuments(response)).toEqual([
      {
        fileName: 'Document',
        fileKey: 'folder/'
      }
    ]);
  });
});
