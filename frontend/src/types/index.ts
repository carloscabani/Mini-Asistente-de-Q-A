export interface SearchResult {
  document: string;
  fragment: string;
}

export interface QAResponse {
  answer: string;
  citations: string[];
}

export interface UploadedFile {
  name: string;
  size: number;
}