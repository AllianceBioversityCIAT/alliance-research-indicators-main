export interface DocumentOverviewRequest {
  bucket_name: string;
  project_folder: string;
  user_id: string;
}

export interface DocumentOverviewSummaryRequest {
  bucket_name: string;
  project_folder: string;
}

export interface DocumentOverviewDeleteFilesRequest {
  bucket_name: string;
  project_folder: string;
  file_names: string[];
}

export interface DocumentOverviewOverview {
  project_title?: string;
  project_summary?: string;
  documents_analyzed?: {
    file_name?: string;
    document_type?: string;
    role_in_project?: string;
  }[];
  key_topics?: string[];
  key_findings?: string[];
  objectives?: string[];
  authors?: string[];
  organizations?: string[];
  methodology?: string;
  recommendations?: string[];
  geographic_scope?: string;
  language?: string;
}

export interface DocumentOverviewResponse {
  overview?: DocumentOverviewOverview;
  time_taken?: string;
  project_folder?: string;
  bucket_name?: string;
  documents_processed?: DocumentOverviewFileEntry[];
  available_files?: DocumentOverviewFileEntry[];
  interaction_id?: string;
  status?: string;
  generated_at?: string;
  cached?: boolean;
}

export interface DocumentOverviewFileEntry {
  file_key?: string;
  file_name?: string;
  extraction_method?: string;
  character_count?: number;
}

function splitTextIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
}

export function parseDocumentOverviewParagraphs(response: DocumentOverviewResponse): string[] {
  const summary = response.overview?.project_summary?.trim();

  if (!summary) {
    return [];
  }

  return splitTextIntoParagraphs(summary);
}

export interface GroundedProjectDocument {
  fileName: string;
  fileKey: string;
}

function mapOverviewFileEntries(
  documents: DocumentOverviewFileEntry[] | undefined
): GroundedProjectDocument[] {
  return (documents ?? [])
    .map(document => {
      const fileKey = document.file_key?.trim() ?? '';
      const fileName = document.file_name?.trim() || fileKey.split('/').pop() || 'Document';

      return { fileName, fileKey };
    })
    .filter(document => document.fileKey);
}

export function mapAvailableOverviewFiles(response: DocumentOverviewResponse): GroundedProjectDocument[] {
  const source =
    (response.available_files?.length ? response.available_files : undefined) ?? response.documents_processed;

  return mapOverviewFileEntries(source);
}

export function mapOverviewSourceDocuments(response: DocumentOverviewResponse): GroundedProjectDocument[] {
  return mapOverviewFileEntries(response.documents_processed);
}

/** @deprecated Use mapAvailableOverviewFiles instead */
export function mapDocumentOverviewFiles(response: DocumentOverviewResponse): GroundedProjectDocument[] {
  return mapAvailableOverviewFiles(response);
}
