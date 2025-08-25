import axios from 'axios';
import { SearchResult, QAResponse } from '../types';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadFiles = (files: File[]): Promise<void> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  return apiClient.post('/ingest', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const searchDocuments = (query: string): Promise<SearchResult[]> => {
  return apiClient.get<SearchResult[]>('/search', { params: { q: query } })
    .then(response => response.data);
};

export const askQuestion = (question: string): Promise<QAResponse> => {
  return apiClient.post<QAResponse>('/ask', { question })
    .then(response => response.data);
};