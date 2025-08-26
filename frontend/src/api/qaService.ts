import axios, { AxiosInstance } from 'axios';
import { SearchResult, QAResponse } from '../types';
import API_CONFIG from '../config/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_CONFIG.baseURL}${API_CONFIG.apiPath}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadFiles = async (files: File[]): Promise<void> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  try {
    await apiClient.post('/ingest', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Ocurrió un error al cargar los archivos.');
    }
    throw new Error('Ocurrió un error de red o un error desconocido.');
  }
};

export const searchDocuments = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await apiClient.get<SearchResult[]>('/search', {
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Error al realizar la búsqueda.');
    }
    throw new Error('Ocurrió un error de red o un error desconocido.');
  }
};

export const askQuestion = async (question: string): Promise<QAResponse> => {
  try {
    const response = await apiClient.post<QAResponse>('/ask', { question });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Error al procesar la pregunta.');
    }
    throw new Error('Ocurrió un error de red o un error desconocido.');
  }
};