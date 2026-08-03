/* eslint-disable @typescript-eslint/no-explicit-any */

export interface NotionQueryResponse {
  object: string;
  results: NotionReleaseNotePage[];
  has_more?: boolean;
  next_cursor?: string;
}

export interface NotionReleaseNotePage {
  id: string;
  created_time?: string;
  last_edited_time?: string;
  cover?: NotionCover;
  properties: Record<string, any>;
}

export interface NotionCover {
  type: 'external' | 'file';
  external?: { url: string };
  file?: { url: string };
}

export interface NotionPageResponse extends NotionReleaseNotePage {
  url?: string;
  public_url?: string;
  error?: boolean;
  status?: number;
  message?: string;
}

export interface NotionBlockChildrenResponse {
  results: any[];
}

export interface NotionDataError {
  error: boolean;
  status: number;
  message: string;
}
