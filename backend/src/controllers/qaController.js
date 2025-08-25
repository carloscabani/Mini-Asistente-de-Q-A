import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { normalizeText, readFileContent } from '../utils/documentUtils.js';

// Controlador para subida de archivos
export const ingestController = (req, res) => {
    console.log(req.files);
    res.status(200).send('Archivos cargados con éxito');
};

// Controlador para la búsqueda
export const searchController = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Ingrese una consulta de búsqueda.' });
        }

        const uploadsPath = path.resolve('uploads');
        if (!fs.existsSync(uploadsPath)) {
            return res.json({ message: 'Aún no hay archivos en la carpeta.' });
        }

        const files = fs.readdirSync(uploadsPath);
        let results = [];

        for (let file of files) {
            const filePath = path.join(uploadsPath, file);
            const content = await readFileContent(filePath);
            const normalizedContent = normalizeText(content);
            const normalizedQuery = normalizeText(q);
            const matchIndex = normalizedContent.indexOf(normalizedQuery);

            if (matchIndex !== -1) {
                const start = Math.max(0, matchIndex - 50);
                const end = Math.min(content.length, matchIndex + normalizedQuery.length + 50);
                results.push({
                    document: file,
                    fragment: content.substring(start, end),
                });
            }
        }
        
        return res.json(results.length > 0 ? results : { message: 'No se encontraron resultados.' });

    } catch (error) {
        console.error('Error en la búsqueda:', error);
        return res.status(500).json({ error: 'Hubo un problema al procesar la búsqueda.' });
    }
};

// Controlador para preguntas y respuestas
export const askController = async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Debe enviar una pregunta.' });
        }

        const uploadsPath = path.resolve('uploads');
        if (!fs.existsSync(uploadsPath) || fs.readdirSync(uploadsPath).length === 0) {
            return res.json({ answer: 'No encuentro esa información, no hay documentos cargados.' });
        }

        const files = fs.readdirSync(uploadsPath);
        let passages = [];

        for (let file of files) {
             const filePath = path.join(uploadsPath, file);
             const content = await readFileContent(filePath);
             const normalizedContent = normalizeText(content);
             const normalizedQuery = normalizeText(question);
             const keywords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

             let maxCount = 0;
             let bestFragment = '';

             for (let i = 0; i < normalizedContent.length - 100; i += 50) {
                 const fragment = normalizedContent.substring(i, i + 200);
                 let count = 0;
                 for (const word of keywords) {
                     if (fragment.includes(word)) count++;
                 }
                 if (count > maxCount) {
                     maxCount = count;
                     bestFragment = content.substring(i, i + 200);
                 }
             }

             if (maxCount >= Math.max(2, Math.floor(keywords.length / 2))) {
                 passages.push({ fragment: bestFragment, document: file });
             }
        }
        
        if (passages.length === 0) {
            return res.json({ answer: 'No encuentro esa información en los documentos cargados.' });
        }

        const context = passages.slice(0, 3).map((p, i) => `[${i + 1}] (${p.document}): ${p.fragment}`).join('\n\n');
        
        const prompt = `Responde la siguiente pregunta en 3 a 4 líneas, 
        citando las fuentes según el contexto. Contexto: ${context} Pregunta: ${question} Respuesta:`;
        
        const ollamaResponse = await fetch(process.env.OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                prompt: prompt,
                stream: false
            })
        });

        const ollamaData = await ollamaResponse.json();
        const answer = ollamaData.response.trim();

        res.json({ answer, citations: passages.slice(0, 3).map(p => p.document) });

    } catch (error) {
        console.error('Error en /ask:', error);
        res.status(500).json({ error: 'Error procesando la pregunta.' });
    }
};