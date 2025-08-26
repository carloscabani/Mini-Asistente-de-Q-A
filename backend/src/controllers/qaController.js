import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { readFileContentBasic as readFileContent, normalizeText } from '../utils/documentUtils.js';

// Calcular relevancia
const calculateRelevanceScore = (content, query) => {
    const normalizedContent = normalizeText(content);
    const normalizedQuery = normalizeText(query);
    const keywords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

    let score = 0;
    let matchedKeywords = 0;

    for (const keyword of keywords) {
        const matches = (normalizedContent.match(new RegExp(keyword, 'g')) || []).length;
        if (matches > 0) {
            score += matches;
            matchedKeywords++;
        }
    }

    const keywordCoverage = matchedKeywords / keywords.length;
    score = score * (1 + keywordCoverage);

    return Math.round(score * 10) / 10;
};

const findRelevantFragments = (content, query, fragmentSize = 400) => {
    const normalizedContent = normalizeText(content);
    const normalizedQuery = normalizeText(query);
    const keywords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

    let fragments = [];
    
    if (keywords.length === 0) {
        return [{
            fragment: content.substring(0, Math.min(fragmentSize, content.length)).trim(),
            score: 1,
            startIndex: 0
        }];
    }

    const stepSize = Math.floor(fragmentSize / 4);
    
    for (let i = 0; i <= content.length - fragmentSize; i += stepSize) {
        const fragment = content.substring(i, i + fragmentSize);
        const normalizedFragment = normalizeText(fragment);

        let score = 0;
        let matchedKeywords = 0;
        
        for (const keyword of keywords) {
            const matches = (normalizedFragment.match(new RegExp(keyword, 'g')) || []).length;
            if (matches > 0) {
                score += matches;
                matchedKeywords++;
            }
        }

        if (score > 0) {
            fragments.push({
                fragment: fragment.trim(),
                score: score,
                startIndex: i,
                matchedKeywords: matchedKeywords
            });
        }
    }

    if (fragments.length === 0 && content.length > 0) {
        fragments.push({
            fragment: content.substring(0, Math.min(fragmentSize, content.length)).trim(),
            score: 0.1,
            startIndex: 0,
            matchedKeywords: 0
        });
    }

    fragments.sort((a, b) => b.score - a.score);
    
    const selectedFragments = [];
    for (const fragment of fragments) {
        const hasSignificantOverlap = selectedFragments.some(selected => 
            Math.abs(fragment.startIndex - selected.startIndex) < fragmentSize * 0.5
        );
        
        if (!hasSignificantOverlap && selectedFragments.length < 2) {
            selectedFragments.push(fragment);
        }
    }

    return selectedFragments.length > 0 ? selectedFragments : fragments.slice(0, 1);
};

export const ingestController = (req, res) => {
    try {
        console.log(req.files);
        res.status(200).send('Archivos cargados con éxito');
    } catch (error) {
        console.error('Error en ingestController:', error);
        res.status(500).json({ error: 'Hubo un problema al cargar los archivos.' });
    }
};

// Search controller
export const searchController = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Ingrese una consulta de búsqueda.' });
        }
        console.log(`Búsqueda iniciada para: "${q}"`);
        const uploadsPath = path.resolve('uploads');
        if (!fs.existsSync(uploadsPath)) {
            return res.json({ message: 'Aún no hay archivos en la carpeta.' });
        }
        const files = fs.readdirSync(uploadsPath);
        let results = [];

        for (let file of files) {
            const filePath = path.join(uploadsPath, file);
            const content = await readFileContent(filePath);
            console.log(`Analizando archivo: ${file}`);
            const relevanceScore = calculateRelevanceScore(content, q);

            if (relevanceScore > 0) {
                const bestFragments = findRelevantFragments(content, q);
                const bestMatch = bestFragments[0];
                results.push({
                    document: file,
                    fragment: bestMatch.fragment,
                    relevanceScore: relevanceScore
                });
                console.log(`  - Score: ${relevanceScore}`);
            }
        }

        results.sort((a, b) => b.relevanceScore - a.relevanceScore);

        console.log(`Resultados encontrados: ${results.length}`);

        return res.json(results.length > 0 ? results : { message: 'No se encontraron resultados.' });

    } catch (error) {
        console.error('Error en la búsqueda:', error);
        return res.status(500).json({ error: 'Hubo un problema al procesar la búsqueda.' });
    }
};

//Ask controller
export const askController = async (req, res) => {
    try {
        console.log('1. Iniciando askController...');
        const { question } = req.body;
        if (!question) {
            console.log('2. Pregunta no enviada, devolviendo error 400.');
            return res.status(400).json({ error: 'Debe enviar una pregunta.' });
        }

        console.log(`3. Pregunta recibida: "${question}"`);
        const uploadsPath = path.resolve('uploads');
        if (!fs.existsSync(uploadsPath) || fs.readdirSync(uploadsPath).length === 0) {
            console.log('4. No hay documentos cargados.');
            return res.json({ answer: 'No encuentro esa información, no hay documentos cargados.', citations: [] });
        }

        const files = fs.readdirSync(uploadsPath);
        console.log(`5. Archivos encontrados: ${files.join(', ')}`);
        
        let passages = [];
        const normalizedQuery = normalizeText(question);
        const keywords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
        
        console.log(`6. Keywords extraídas: [${keywords.join(', ')}]`);
        
        for (let file of files) {
            const filePath = path.join(uploadsPath, file);
            const content = await readFileContent(filePath);
            
            console.log(`7. Analizando archivo: ${file} (${content.length} caracteres)`);
            
            if (!content || content.length === 0) {
                console.log(`   - Archivo vacío o no se pudo leer`);
                continue;
            }
            
            const relevantFragments = findRelevantFragments(content, question, 500);
            
            for (const fragmentData of relevantFragments) {
                console.log(`   - Fragmento encontrado (score: ${fragmentData.score})`);
                console.log(`   - Vista previa: "${fragmentData.fragment.substring(0, 100)}..."`);
                
                const normalizedFragment = normalizeText(fragmentData.fragment);
                let matchedKeywordsCount = 0;
                let matchedKeywords = [];
                
                for (const keyword of keywords) {
                    if (normalizedFragment.includes(keyword)) {
                        matchedKeywordsCount++;
                        matchedKeywords.push(keyword);
                    }
                }
                
                const keywordCoverage = keywords.length > 0 ? matchedKeywordsCount / keywords.length : 0;
                
                console.log(`   - Keywords encontradas: [${matchedKeywords.join(', ')}] (${matchedKeywordsCount}/${keywords.length})`);
                console.log(`   - Cobertura: ${(keywordCoverage * 100).toFixed(1)}%`);
                
                const commonWords = ['cuales', 'son', 'las', 'que', 'como', 'para', 'con', 'una', 'del', 'por', 'esta', 'los', 'cuando', 'sobre'];
                const specificKeywords = matchedKeywords.filter(kw => !commonWords.includes(kw.toLowerCase()));
                const specificKeywordScore = specificKeywords.length * 10; // Bonus alto para keywords específicas
                const commonWordPenalty = matchedKeywords.filter(kw => commonWords.includes(kw.toLowerCase())).length * 0.5;
                
                const finalScore = fragmentData.score + specificKeywordScore - commonWordPenalty + (keywordCoverage * 2);
                
                console.log(`   - Keywords específicas: [${specificKeywords.join(', ')}] (+${specificKeywordScore})`);
                console.log(`   - Penalización por palabras comunes: -${commonWordPenalty}`);
                
                if (specificKeywords.length > 0 || finalScore > 8) {
                    passages.push({
                        document: file,
                        fragment: fragmentData.fragment,
                        score: finalScore,
                        keywordCoverage: keywordCoverage,
                        matchedKeywords: matchedKeywords
                    });
                    console.log(`   ✓ Fragmento INCLUIDO (score final: ${finalScore})`);
                } else {
                    console.log(`   ✗ Fragmento RECHAZADO (score final: ${finalScore}, muy baja relevancia)`);
                }
            }
        }

        console.log(`8. Total de pasajes encontrados: ${passages.length}`);
        
        if (passages.length === 0) {
            console.log('9. No se encontraron pasajes relevantes.');
            return res.json({ 
                answer: 'No encuentro información relevante sobre esa pregunta en los documentos cargados.', 
                citations: [] 
            });
        }

        // Ordenar por relevancia combinada
        passages.sort((a, b) => b.score - a.score);
        
        // Para evitar confusión solo usar los 3 mejores pasajes
        passages = passages.slice(0, 3);
        
        //Incluimos documentos con keywords específicas relevantes
        const minScoreForInclusion = Math.max(2.0, passages[0]?.score * 0.5 || 2.0);
        const filteredPassages = passages.filter(p => {
            const commonWords = ['cuales', 'son', 'las', 'que', 'como', 'para', 'con', 'una', 'del', 'por', 'esta', 'los', 'cuando', 'sobre'];
            const specificKeywords = p.matchedKeywords.filter(kw => !commonWords.includes(kw.toLowerCase()));
            
            return (specificKeywords.length > 0 || p.score >= 8) && p.score >= minScoreForInclusion;
        });
        
        if (filteredPassages.length === 0 && passages.length > 0) {
            filteredPassages.push(passages[0]);
        }
        
        passages = filteredPassages;
        
        console.log(`10a. Después del filtro de relevancia: ${passages.length} pasajes`);
        
        if (passages.length === 0) {
            console.log('10a. No se encontraron pasajes suficientemente relevantes después del filtro.');
            return res.json({ 
                answer: 'Los documentos no contienen información específica sobre tu pregunta.', 
                citations: [] 
            });
        }
        
        console.log('10b. Pasajes seleccionados:');
        passages.forEach((p, i) => {
            console.log(`    ${i+1}. ${p.document} - Score: ${p.score.toFixed(2)}, Keywords: [${p.matchedKeywords.join(',')}], Coverage: ${(p.keywordCoverage * 100).toFixed(1)}%`);
            console.log(`        Fragmento: "${p.fragment.substring(0, 150)}..."`);
        });

        const context = passages.map((p, i) =>
            `[Documento ${i + 1}: ${p.document}]\n${p.fragment}` 
        ).join('\n\n---\n\n');

        // Prompt
        const prompt = `Analiza ÚNICAMENTE los siguientes fragmentos de documentos y responde la pregunta específica.

        FRAGMENTOS DE DOCUMENTOS:
        ${context}

        PREGUNTA ESPECÍFICA: ${question}

        INSTRUCCIONES CRÍTICAS:
        1. Lee CUIDADOSAMENTE cada fragmento de documento
        2. Identifica QUÉ FRAGMENTO contiene información relevante para la pregunta "${question}"
        3. Si encuentras información sobre "${question.toLowerCase()}", úsala para responder
        4. Si NO encuentras información específica sobre "${question.toLowerCase()}", di "No encontré información específica sobre esto en los documentos"
        5. NO mezcles información de diferentes temas
        6. NO hables de temas que no están relacionados con la pregunta

        Analiza y responde:`;

        console.log('11. Preparando llamada a la API de Ollama...');
        console.log(`    Contexto: ${context.length} caracteres`);
        
        const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
        console.log(`    URL: ${ollamaUrl}`);
        
        const modelToUse = 'llama3';
        console.log(`    Modelo: ${modelToUse}`);

        const ollamaResponse = await fetch(ollamaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelToUse,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.1, 
                    num_predict: 200, 
                    top_p: 0.8,
                    repeat_penalty: 1.2,
                    stop: ['\n\nPREGUNTA:', '\n\nFRAGMENTOS:', '\n\nINSTRUCCIONES:'] 
                }
            })
        });

        console.log(`12. Respuesta de Ollama recibida. Estado: ${ollamaResponse.status}`);
        
        if (!ollamaResponse.ok) {
            const errorText = await ollamaResponse.text();
            console.error('Error de la API de Ollama:', ollamaResponse.status, errorText);
            
            const bestPassage = passages[0];
            console.log('13. Usando fallback sin LLM');
            return res.json({
                answer: `Encontré información relevante en ${bestPassage.document}. El documento menciona: ${bestPassage.fragment.substring(0, 300)}${bestPassage.fragment.length > 300 ? '...' : ''}`,
                citations: passages.filter(p => {
                    const commonWords = ['cuales', 'son', 'las', 'que', 'como', 'para', 'con', 'una', 'del', 'por', 'esta', 'los', 'cuando', 'sobre'];
                    const specificKeywords = p.matchedKeywords.filter(kw => !commonWords.includes(kw.toLowerCase()));
                    return specificKeywords.length > 0 && p.score >= 2.0;
                }).map(p => p.document)
            });
        }

        const ollamaData = await ollamaResponse.json();
        
        if (!ollamaData.response) {
            console.error('Respuesta de Ollama inesperada:', ollamaData);
            return res.status(500).json({ error: 'Respuesta inválida del modelo de IA.' });
        }

        let answer = ollamaData.response.trim();
        
        answer = answer.replace(/^(Respuesta:|RESPUESTA:)\s*/i, '');
        answer = answer.replace(/\n\n+/g, '\n');
        
        console.log('14. Respuesta generada:', answer.substring(0, 100) + '...');
        console.log('15. Enviando respuesta al frontend.');

        const commonWords = ['cuales', 'son', 'las', 'que', 'como', 'para', 'con', 'una', 'del', 'por', 'esta', 'los', 'cuando', 'sobre'];
        const relevantCitations = passages
            .filter(p => {
                const specificKeywords = p.matchedKeywords.filter(kw => !commonWords.includes(kw.toLowerCase()));
                return specificKeywords.length > 0 && p.score >= 2.0;
            })
            .map(p => p.document);
        
        res.json({
            answer,
            citations: [...new Set(relevantCitations)]
        });

    } catch (error) {
        console.error('ERROR COMPLETO en /ask:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Error procesando la pregunta.',
            details: error.message,
            citations: [] 
        });
    }
};