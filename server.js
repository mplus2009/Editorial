require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PDFDocument = require('pdfkit');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- CONFIGURACIÓN DE GEMINI ---
// Sustituye 'TU_NUEVA_API_KEY' por la clave que generes en Google AI Studio
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "TU_NUEVA_API_KEY");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

// --- 1. RUTA: GENERAR ESQUEMA DE CAPÍTULOS ---
app.post('/api/generate-outline', async (req, res) => {
    const { idea } = req.body;
    
    const prompt = `Actúa como un editor literario de prestigio. 
    Dada la siguiente idea de un usuario: "${idea}"
    Crea una estructura de 5 a 10 capítulos. 
    Para cada capítulo dame un título creativo y una descripción de la trama.
    
    IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON puro, sin texto extra, con este formato:
    [{"title": "Título", "desc": "Descripción del capítulo"}]`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const chapters = JSON.parse(text);
        res.json({ chapters });
    } catch (error) {
        console.error("Error en Outline:", error);
        res.status(500).json({ error: "No se pudo generar el esquema." });
    }
});

// --- 2. RUTA: ESCRIBIR UN CAPÍTULO INDIVIDUAL ---
app.post('/api/write-chapter', async (req, res) => {
    const { chapterInfo, settings, context } = req.body;

    // Ajuste de longitud según el plan/opción
    let wordCount = "500"; 
    if(settings.length === 'normal') wordCount = "1000";
    if(settings.length === 'largo') wordCount = "2000";
    if(settings.length === 'epico') wordCount = "4000";

    const prompt = `
    Escribe el capítulo de una novela.
    TÍTULO: ${chapterInfo.title}
    RESUMEN DEL CAPÍTULO: ${chapterInfo.desc}
    
    REQUISITOS DE ESTILO:
    - Narrador: ${settings.pov}
    - Estilo de escritura: ${settings.style}
    - Público objetivo: ${settings.audience}
    - Extensión aproximada: ${wordCount} palabras.
    
    CONTEXTO ANTERIOR (para continuidad): ${context || "Este es el comienzo del libro."}
    
    Escribe el contenido de forma fluida y literaria. No añadas notas de autor.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ content: response.text() });
    } catch (error) {
        console.error("Error al escribir capítulo:", error);
        res.status(500).json({ error: "Error al generar el texto del capítulo." });
    }
});

// --- 3. RUTA: MODIFICAR CONTEXTO (IA EDITORIAL) ---
app.post('/api/modify-content', async (req, res) => {
    const { originalText, instructions } = req.body;

    const prompt = `Tengo este fragmento de mi libro: "${originalText}"
    El usuario quiere hacer el siguiente cambio: "${instructions}"
    Reescribe el texto aplicando la modificación pero manteniendo el estilo narrativo.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ newContent: response.text() });
    } catch (error) {
        res.status(500).json({ error: "No se pudo modificar el texto." });
    }
});

// --- 4. RUTA: EXPORTAR A PDF ---
app.post('/api/export/pdf', (req, res) => {
    const { title, content } = req.body;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=libro.pdf`);

    doc.pipe(res);
    
    // Título Principal
    doc.fontSize(30).text(title.toUpperCase(), { align: 'center' });
    doc.moveDown(2);
    
    // Contenido del libro (limpiando etiquetas HTML básicas)
    const cleanText = content.replace(/<[^>]*>?/gm, '\n');
    doc.fontSize(12).text(cleanText, {
        align: 'justify',
        lineGap: 5
    });

    doc.end();
});

// --- LANZAMIENTO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ========================================
    🚀 Servidor Editorial IA activo
    📍 Puerto: ${PORT}
    🤖 Gemini: Conectado
    💳 PayPal: ballstefanie7@gmail.com
    ========================================
    `);
});
