import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import fetch from 'node-fetch'; 
import 'dotenv/config';

const app = express();
app.use(express.json());
const port = 8080;
const getDocument = pdfjsLib.getDocument || pdfjsLib.default.getDocument;
const uploadDir = path.resolve('uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Manejo de la carga de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage: storage });

app.post('/ingest', upload.array('files', 10), (req, res) => {
    console.log(req.files);
    res.send('Archivos cargados con éxito');
});

//Manejo de caracteres sensibles a tildes y ñ 
function normalizeText(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9ñÑ\s]/g, '')
        .toLowerCase();
}

// Lectura del contenido de los archivos
const readFileContent = async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Archivo no encontrado: ${fullPath}`);
    }

    if (ext === '.pdf') {
        const data = new Uint8Array(fs.readFileSync(fullPath));
        const pdf = await getDocument({ data }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join('');
        }

        text = text.replace(/\s+/g, ' ').trim();
        return text;
    } else if (ext === '.txt') {
        return fs.readFileSync(fullPath, 'utf8').replace(/\s+/g, ' ').trim();
    } else {
        throw new Error(`Formato de archivo: ${ext}, no es correcto, solo se aceptan .pdf y .txt`);
    }
};

// Endpoint de busqueda
app.get('/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Ingrese una consulta de búsqueda.' });
        }

        console.log(`Buscando: "${q}"`);

        const uploadsPath = path.resolve('uploads');
        if (!fs.existsSync(uploadsPath)) {
            return res.json({ message: 'Aún no hay archivos en la carpeta.' });
        }

        const files = fs.readdirSync(uploadsPath);
        let results = [];

        for (let file of files) {
            const filePath = path.join('uploads', file);
            const content = await readFileContent(filePath);
            const normalizedContent = normalizeText(content);
            const normalizedQuery = normalizeText(q);

            const matchIndex = normalizedContent.indexOf(normalizedQuery);

            if (matchIndex !== -1) {
                const startFrag = Math.max(0, matchIndex - 30);
                const endFrag = Math.min(normalizedContent.length, matchIndex + normalizedQuery.length + 30);
                const fragmentNormalized = normalizedContent.substring(startFrag, endFrag);
                const origStart = Math.max(0, matchIndex - 30);
                const origEnd = Math.min(content.length, matchIndex + normalizedQuery.length + 30);
                const fragmentOriginal = content.substring(origStart, origEnd);

                results.push({
                    fragment: fragmentOriginal,
                    fragment_normalized: fragmentNormalized,
                    document: file,
                    relevance: 1,
                });
            }
        }

        if (results.length > 0) {
            return res.json(results);
        } else {
            return res.json({ message: 'No se encontraron resultados para la búsqueda.' });
        }
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        return res.status(500).json({ error: 'Hubo un problema al procesar la búsqueda.' });
    }
});

// Endpoint de preguntas
app.post('/ask', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Debe enviar una pregunta.' });
        }

        const uploadsPath = path.resolve('uploads');
        if (!fs.existsSync(uploadsPath)) {
            return res.json({ answer: 'No encuentro esa información en los documentos cargados.' });
        }

        const files = fs.readdirSync(uploadsPath);
        let passages = [];

        for (let file of files) {
            const filePath = path.join('uploads', file);
            const content = await readFileContent(filePath);
            const normalizedContent = normalizeText(content);
            const normalizedQuery = normalizeText(question);
            const keywords = normalizedQuery.split(/\s+/).filter(w => w.length > 2); //palabras clave

            let maxCount = 0;
            let bestFragment = '';
            let bestIndex = -1;

            for (let i = 0; i < normalizedContent.length - 100; i += 50) {
                const fragment = normalizedContent.substring(i, i + 200);
                let count = 0;
                for (const word of keywords) {
                    if (fragment.includes(word)) count++;
                }
                if (count > maxCount) {
                    maxCount = count;
                    bestFragment = content.substring(i, i + 200);
                    bestIndex = i;
                }
            }

            if (maxCount >= Math.max(2, Math.floor(keywords.length / 2))) {
                passages.push({
                    fragment: bestFragment,
                    document: file,
                });
            }
        }

        if (passages.length === 0) {
            return res.json({ answer: 'No encuentro esa información en los documentos cargados.' });
        }

        const context = passages.slice(0, 3).map(
            (p, i) => `[${i + 1}] (${p.document}): ${p.fragment}`
        ).join('\n\n');

        const prompt = `
            Responde la siguiente pregunta en 3 a 4 líneas, citando 1 a 3 fuentes entre corchetes según el contexto proporcionado.
            Si no tienes suficiente información, puedes responder: "Esa información no existe en los archivos cargados".

            ${context}
            Contexto:

            Pregunta: ${question}
            Respuesta:
        `;

        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
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
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
