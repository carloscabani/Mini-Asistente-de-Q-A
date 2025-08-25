import React, { useState } from 'react';
import { QAResponse } from '../types';

interface QAProps {
  onAsk: (question: string) => void;
  response: QAResponse | null;
  isAsking: boolean;
}

export const QA: React.FC<QAProps> = ({ onAsk, response, isAsking }) => {
  const [question, setQuestion] = useState('');

  const handleAskClick = () => {
    if (question.trim()) {
      onAsk(question);
    }
  };

  return (
    <section className="qa-section">
      <h2>Preguntas y Respuestas</h2>
      <div className="qa-input-group">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Haz una pregunta sobre los documentos..."
          rows={3}
        />
        <button onClick={handleAskClick} disabled={isAsking || !question.trim()}>
          {isAsking ? 'Procesando...' : 'Preguntar'}
        </button>
      </div>
      {response && (
        <div className="qa-response">
          <h3>Respuesta:</h3>
          <p>{response.answer}</p>
          {response.citations.length > 0 && (
            <div className="citations">
              <strong>Fuentes:</strong>
              <ul>
                {response.citations.map((cite, i) => <li key={i}>📄 {cite}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};