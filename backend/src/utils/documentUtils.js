import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

const getDocument = pdfjsLib.getDocument || pdfjsLib.default.getDocument;

export function normalizeText(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9ñÑ\s]/g, '')
        .toLowerCase();
}

export const readFileContentBasic = async (filePath) => {
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
            
            let pageText = content.items.map(item => item.str).join('');
            
            pageText = pageText
                .replace(/([a-záéíóúñA-ZÁÉÍÓÚÑ0-9])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')                 
                .replace(/([.,;:!?])([a-záéíóúñA-ZÁÉÍÓÚÑ0-9])/g, '$1 $2') 
                .replace(/(\d)([a-záéíóúñA-ZÁÉÍÓÚÑ])/g, '$1 $2') 
                .replace(/([a-záéíóúñA-ZÁÉÍÓÚÑ])(\d)/g, '$1 $2') 
                .replace(/\s+/g, ' ') 
                .trim();
            
            text += pageText + ' ';
        }
        
        return text.trim();
            
    } else if (ext === '.txt') {
        return fs.readFileSync(fullPath, 'utf8').replace(/\s+/g, ' ').trim();
    } else {
        throw new Error(`Formato de archivo no soportado: ${ext}`);
    }
};