import React, { useState } from 'react';
import { Uploader } from './components/Uploader';
import { Search } from './components/Search';
import { QA } from './components/QA';
import * as qaService from './api/qaService';
import { UploadedFile, SearchResult, QAResponse } from './types';
import './App.css';

const App: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [qaResponse, setQAResponse] = useState<QAResponse | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setError('');
    try {
      await qaService.uploadFiles(files);
      const newFiles = files.map(f => ({ name: f.name, size: f.size }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      setError('Error al cargar archivos.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setError('');
    setSearchResults([]);
    try {
      const results = await qaService.searchDocuments(query);
      if (Array.isArray(results)) {
         setSearchResults(results);
      } else {
         setError((results as any).message || 'No se encontraron resultados.');
      }
    } catch (err) {
      setError('Error al realizar la búsqueda.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAsk = async (question: string) => {
    setIsAsking(true);
    setError('');
    setQAResponse(null);
    try {
      const response = await qaService.askQuestion(question);
      setQAResponse(response);
    } catch (err) {
      setError('Error al procesar la pregunta.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mini Asistente Q&A</h1>
        <p>Carga, busca y pregunta a tus documentos</p>
      </header>

      <main className="app-main">
        <Uploader onUpload={handleUpload} uploadedFiles={uploadedFiles} isUploading={isUploading} />
        <Search onSearch={handleSearch} results={searchResults} isSearching={isSearching} />
        <QA onAsk={handleAsk} response={qaResponse} isAsking={isAsking} />
        
        {error && <div className="error-message">{error}</div>}
      </main>

      <footer className="app-footer">
        <p>Carlos Cabanilla</p>
      </footer>
    </div>
  );
};

export default App;