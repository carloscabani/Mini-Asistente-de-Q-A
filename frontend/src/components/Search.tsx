import React, { useState } from 'react';
import { SearchResult } from '../types';

interface SearchProps {
  onSearch: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
}

export const Search: React.FC<SearchProps> = ({ onSearch, results, isSearching }) => {
  const [query, setQuery] = useState('');

  const handleSearchClick = () => {
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <section className="search-section">
      <h2>Buscador</h2>
      <div className="search-input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en los documentos..."
          onKeyPress={(e) => e.key === 'Enter' && handleSearchClick()}
        />
        <button onClick={handleSearchClick} disabled={isSearching || !query.trim()}>
          {isSearching ? 'Buscando...' : 'Buscar'}
        </button>
      </div>
      {results.length > 0 && (
        <div className="search-results">
          <h3>Resultados encontrados:</h3>
          {results.map((result, index) => (
            <div key={index} className="result-item">
              <strong>{result.document}</strong>
              <p>...{result.fragment}...</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};